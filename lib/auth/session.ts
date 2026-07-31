import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { sql } from "../../db";

export type AppUser={id:string;email:string;displayName:string;role:"customer"|"sub_admin"|"super_admin";status:string};
const accessCookie="nexora_access";
const refreshCookie="nexora_refresh";
const encoder=new TextEncoder();
function secret(){const value=process.env.AUTH_SECRET;if(!value||value.length<32)throw new Error("AUTH_SECRET must be at least 32 characters.");return encoder.encode(value)}
function tokenHash(value:string){return createHash("sha256").update(value).digest("hex")}
const cookieBase={httpOnly:true,sameSite:"lax" as const,secure:process.env.NODE_ENV==="production",path:"/"};

export async function createSession(user:AppUser,request?:Request){
  const access=await new SignJWT({email:user.email,name:user.displayName,role:user.role})
    .setProtectedHeader({alg:"HS256"}).setSubject(user.id).setIssuedAt().setExpirationTime("1h").setIssuer("nexora").setAudience("nexora-web").sign(secret());
  const refresh=randomBytes(48).toString("base64url");
  const expires=new Date(Date.now()+30*24*60*60*1000).toISOString();
  await sql`insert into sessions (user_id,token_hash,user_agent,ip_hash,expires_at)
    values (${user.id},${tokenHash(refresh)},${request?.headers.get("user-agent")??null},${"local-or-proxy"},${expires})`;
  const jar=await cookies();
  jar.set(accessCookie,access,{...cookieBase,maxAge:60*60});
  jar.set(refreshCookie,refresh,{...cookieBase,maxAge:30*24*60*60});
}

export async function currentUser():Promise<AppUser|null>{
  const token=(await cookies()).get(accessCookie)?.value;if(!token)return null;
  try{
    const {payload}=await jwtVerify(token,secret(),{issuer:"nexora",audience:"nexora-web"});
    if(!payload.sub||!payload.email||!payload.role)return null;
    const rows=await sql<AppUser[]>`select id,email,coalesce(display_name,email) as "displayName",role,status from users where id=${payload.sub} limit 1`;
    const user=rows[0];return user?.status==="active"?user:null;
  }catch{return null}
}

export async function revokeSession(){
  const jar=await cookies();const refresh=jar.get(refreshCookie)?.value;
  if(refresh)await sql`update sessions set revoked_at=now() where token_hash=${tokenHash(refresh)} and revoked_at is null`;
  jar.set(accessCookie,"",{...cookieBase,maxAge:0});jar.set(refreshCookie,"",{...cookieBase,maxAge:0});
}

export async function refreshSession(request?:Request){
  const jar=await cookies();const refresh=jar.get(refreshCookie)?.value;if(!refresh)return null;
  const rows=await sql<(AppUser&{sessionId:string})[]>`select u.id,u.email,coalesce(u.display_name,u.email) as "displayName",u.role,u.status,s.id as "sessionId"
    from sessions s join users u on u.id=s.user_id where s.token_hash=${tokenHash(refresh)} and s.revoked_at is null and s.expires_at>now() limit 1`;
  const user=rows[0];if(!user||user.status!=="active"){await revokeSession();return null}
  await sql`update sessions set revoked_at=now() where id=${user.sessionId}`;
  await createSession(user,request);return user;
}

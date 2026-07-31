import { sql } from "../../../../db";
import { verifyPassword } from "../../../../lib/auth/password";
import { createSession,type AppUser } from "../../../../lib/auth/session";
import { z } from "zod";

const input=z.object({email:z.string().email().transform(v=>v.toLowerCase().trim()),password:z.string().min(1).max(128),scope:z.enum(["admin","customer"]).default("customer")});
export async function POST(request:Request){
  try{
    const parsed=input.safeParse(await request.json());if(!parsed.success)return Response.json({error:"Invalid credentials."},{status:400});
    const rows=await sql<(AppUser&{passwordHash:string|null;failedLoginAttempts:number;lockedUntil:Date|null;emailVerified:boolean})[]>`select id,email,coalesce(display_name,email) as "displayName",role,status,password_hash as "passwordHash",failed_login_attempts as "failedLoginAttempts",locked_until as "lockedUntil",email_verified as "emailVerified" from users where email=${parsed.data.email} limit 1`;
    const user=rows[0];const generic=()=>Response.json({error:"Email or password is incorrect."},{status:401});
    if(!user||!user.passwordHash)return generic();
    if(user.lockedUntil&&user.lockedUntil>new Date())return Response.json({error:"Account temporarily locked. Try again later."},{status:429});
    const valid=await verifyPassword(parsed.data.password,user.passwordHash);
    if(!valid){const attempts=user.failedLoginAttempts+1;await sql`update users set failed_login_attempts=${attempts},locked_until=${attempts>=5?new Date(Date.now()+15*60*1000).toISOString():null} where id=${user.id}`;return generic()}
    if(user.status!=="active")return Response.json({error:"This account is not active."},{status:403});
    if(parsed.data.scope==="admin"&&!["super_admin","sub_admin"].includes(user.role))return Response.json({error:"Administrator access is not assigned to this account."},{status:403});
    if(parsed.data.scope==="admin"&&user.role==="sub_admin"&&!user.emailVerified)return Response.json({error:"Please verify your email before signing in."},{status:403});
    if(parsed.data.scope==="customer"&&user.role==="customer"&&!user.emailVerified)return Response.json({error:"Please verify your email before signing in."},{status:403});
    await sql`update users set failed_login_attempts=0,locked_until=null,updated_at=now() where id=${user.id}`;
    await createSession(user,request);return Response.json({user:{email:user.email,displayName:user.displayName,role:user.role}});
  }catch(error){
    console.error("Sign-in failed",error);
    return Response.json({error:"Sign-in failed. Please check the database and try again."},{status:500});
  }
}

import { currentUser, type AppUser } from "../lib/auth/session";
import { sql } from "./index";

export type AdminIdentity=AppUser&{role:"super_admin"|"sub_admin"};
const permanentlyRestricted=new Set(["admin_users","roles","permissions","payment_secrets","security_secrets"]);

export async function requireAdmin(permission="dashboard"):Promise<AdminIdentity>{
  const user=await currentUser();
  if(!user)throw new Response("Authentication required",{status:401});
  if(!["super_admin","sub_admin"].includes(user.role))throw new Response("Administrator access required",{status:403});
  if(user.role==="sub_admin"&&permanentlyRestricted.has(permission))throw new Response("This action is restricted to the Super Admin",{status:403});
  if(user.role==="sub_admin"&&permission!=="dashboard"){
    const rows=await sql<{granted:boolean}[]>`select granted from permissions where user_id=${user.id} and permission=${permission} limit 1`;
    if(rows[0]&&!rows[0].granted)throw new Response("Permission denied",{status:403});
  }
  return user as AdminIdentity;
}
export async function writeAudit(actor:AdminIdentity,action:string,resourceType:string,resourceId:string,metadata:Record<string,unknown>){
  await sql`insert into audit_log (actor_id,action,resource_type,resource_id,metadata,ip_hash) values (${actor.id},${action},${resourceType},${resourceId},${JSON.stringify(metadata)}::jsonb,${"local-or-proxy"})`;
}
export async function errorResponse(error:unknown){
  if(error instanceof Response){
    const text=await error.text();
    return Response.json({error:text||"Request failed"},{status:error.status});
  }
  return Response.json({error:error instanceof Error?error.message:"Unexpected server error"},{status:500})
}

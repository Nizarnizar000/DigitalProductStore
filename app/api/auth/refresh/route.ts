import { refreshSession } from "../../../../lib/auth/session";
export async function POST(request:Request){const user=await refreshSession(request);return user?Response.json({user}):Response.json({error:"Session expired"},{status:401})}

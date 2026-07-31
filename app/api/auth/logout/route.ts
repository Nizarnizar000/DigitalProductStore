import { revokeSession } from "../../../../lib/auth/session";
export async function POST(){await revokeSession();return Response.json({ok:true})}

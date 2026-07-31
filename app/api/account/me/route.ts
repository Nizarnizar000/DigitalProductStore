import { currentUser } from "../../../../lib/auth/session";

export async function GET() {
  const user = await currentUser();
  if (!user || user.role !== "customer") return Response.json({ user:null });
  return Response.json({ user:{ email:user.email, displayName:user.displayName } });
}

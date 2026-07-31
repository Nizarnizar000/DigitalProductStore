import { currentUser } from "../../../lib/auth/session";
import { redirect } from "next/navigation";
import { TeamManager } from "./team-manager";

export const dynamic = "force-dynamic";

export default async function AdminTeamPage() {
  const viewer=await currentUser();
  if(!viewer)redirect("/admin/login");
  if(viewer.role!=="super_admin")redirect("/admin");
  return <TeamManager viewer={viewer.email}/>;
}

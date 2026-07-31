import { currentUser } from "../../lib/auth/session";
import { redirect } from "next/navigation";
import { AdminDashboard } from "./admin-dashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const viewer = await currentUser();
  if (!viewer) redirect("/admin/login");
  if (!["super_admin","sub_admin"].includes(viewer.role)) redirect("/account");
  return <AdminDashboard viewer={{ email: viewer.email, displayName: viewer.displayName }} />;
}

import { currentUser } from "../../lib/auth/session";
import { redirect } from "next/navigation";
import { AccountDashboard } from "./account-dashboard";
export const dynamic="force-dynamic";
export default async function AccountPage(){const user=await currentUser();if(!user)redirect("/login?next=/account");return <AccountDashboard user={user}/>}

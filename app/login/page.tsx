import { currentUser } from "../../lib/auth/session";
import { redirect } from "next/navigation";
import { CustomerAuthForm } from "./customer-auth-form";
export const dynamic="force-dynamic";
export default async function LoginPage({searchParams}:{searchParams:Promise<{next?:string}>}){const user=await currentUser();const{next}=await searchParams;if(user)redirect(next?.startsWith("/")?next:"/account");return <CustomerAuthForm mode="login" next={next}/>}

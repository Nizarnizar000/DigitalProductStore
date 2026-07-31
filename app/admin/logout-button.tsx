"use client";
export function LogoutButton(){return <button onClick={async()=>{await fetch("/api/auth/logout",{method:"POST"});window.location.assign("/admin/login")}}>Sign out</button>}

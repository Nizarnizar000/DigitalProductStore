"use client";

import { useEffect, useState } from "react";
import type { AppUser } from "../../lib/auth/session";

type Data = { orders:Array<{id:string;status:string;totalCents:number;currency:string;createdAt:string}>; library:Array<{name:string;slug:string;version:string;licenseType:string}> };

export function AccountDashboard({ user }: { user:AppUser }) {
  const [data,setData] = useState<Data|null>(null);
  const [error,setError] = useState("");

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const response = await fetch("/api/account/overview");
        const text = await response.text();
        const body = text ? JSON.parse(text) as Data & { error?:string } : null;
        if (!response.ok) throw new Error(body?.error ?? "Account data could not be loaded.");
        if (mounted) setData(body);
      } catch {
        if (mounted) setError("Account data could not be loaded.");
      }
    }
    void load();
    return () => { mounted = false; };
  }, []);

  return <main className="dashboard"><aside><a className="mark" href="/"><span>N</span>Nexora</a><p>MY NEXORA</p><a className="active-side" href="/account">Overview</a><a href="/account">Library</a><a href="/account">Orders</a><hr/><button onClick={async()=>{await fetch("/api/auth/logout",{method:"POST"});location.assign("/")}}>Sign out</button></aside><section><div className="dash-head"><div><span className="overline">CUSTOMER SPACE</span><h1>Hello, {user.displayName}.</h1><p className="admin-viewer">{user.email}</p></div></div>{error&&<div className="admin-alert" role="alert">{error}</div>}<div className="metrics"><div><span>Products</span><b>{data?.library.length??"-"}</b><small>In your library</small></div><div><span>Orders</span><b>{data?.orders.length??"-"}</b><small>Purchase history</small></div></div><div className="admin-table-card"><h2>Your library</h2>{data?.library.length?data.library.map(item=><div className="audit-row" key={item.slug}><b>{item.name}</b><span>Version {item.version} · {item.licenseType}</span><a href={`/api/downloads/${item.slug}`}>Download securely</a></div>):<div className="admin-empty"><p>No purchases yet.</p><a className="button dark" href="/products">Browse products</a></div>}</div></section></main>;
}

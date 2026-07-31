"use client";

import { useEffect, useState } from "react";
import type { AppUser } from "../../lib/auth/session";

type Data = {
  orders:Array<{id:string;status:string;totalCents:number;currency:string;createdAt:string}>;
  library:Array<{name:string;slug:string;version:string;licenseType:string}>;
};

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
        if (!response.ok) throw new Error(body?.error ?? "Impossible de charger le compte.");
        if (mounted) setData(body);
      } catch {
        if (mounted) setError("Impossible de charger le compte.");
      }
    }
    void load();
    return () => { mounted = false; };
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method:"POST" });
    location.assign("/");
  }

  return <main className="dashboard"><aside><a className="mark" href="/"><span>N</span>Nexora</a><p>MON NEXORA</p><a className="active-side" href="/account">Vue d&apos;ensemble</a><a href="/account">Bibliothèque</a><a href="/account">Commandes</a><hr/><button onClick={logout}>Déconnexion</button></aside><section><div className="dash-head"><div><span className="overline">COMPTE CONNECTE</span><h1>Bonjour, {user.displayName}.</h1><p className="admin-viewer">{user.email}</p></div><span className="avatar">{user.displayName.slice(0,2).toUpperCase()}</span></div>{error&&<div className="admin-alert" role="alert">{error}</div>}<div className="metrics"><div><span>Produits</span><b>{data?.library.length??"-"}</b><small>Dans votre bibliothèque</small></div><div><span>Commandes</span><b>{data?.orders.length??"-"}</b><small>Historique d&apos;achat</small></div></div><div className="admin-table-card"><h2>Votre bibliothèque</h2>{data?.library.length?data.library.map(item=><div className="audit-row" key={item.slug}><b>{item.name}</b><span>Version {item.version} · {item.licenseType}</span><a href={`/api/downloads/${item.slug}`}>Télécharger</a></div>):<div className="admin-empty"><p>Aucun achat pour le moment.</p><a className="button dark" href="/products">Voir les produits</a></div>}</div></section></main>;
}

"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { LogoutButton } from "./logout-button";

type Product = { id:string; slug:string; name:string; description:string; productType:string; status:"draft"|"published"|"archived"; priceCents:number; currency:string; version:string; downloadLimit:number; updatedAt:string };
type Order = { id:string; email:string; status:string; totalCents:number; currency:string; createdAt:string };
type Audit = { action:string; resourceType:string; resourceId:string; createdAt:string };
type Customer = { id:string; email:string; displayName:string; emailVerified:boolean; createdAt:string };
type Subscriber = { id:string; email:string; status:string; createdAt:string };
type Contact = { id:string; name:string; email:string; subject:string; message:string; status:string; createdAt:string };
type Overview = { admin:{displayName:string;email:string;role:"super_admin"|"sub_admin"}; metrics:{revenueCents:number;orders:number;customers:number;products:number}; orders:Order[]; audit:Audit[]; customers:Customer[]; subscribers:Subscriber[]; contacts:Contact[] };
type ApiError = { error?: string };

const money = (cents:number,currency="mad") => new Intl.NumberFormat("fr-MA",{style:"currency",currency:currency.toUpperCase()}).format(cents/100);
const date = (value:string) => new Intl.DateTimeFormat("fr-MA",{dateStyle:"medium",timeStyle:"short"}).format(new Date(value));

async function readApi<T extends ApiError>(response:Response):Promise<T> {
  const text = await response.text();
  if (!text) return {} as T;
  try { return JSON.parse(text) as T; } catch { return { error:text } as T; }
}

export function AdminDashboard({viewer}:{viewer:{email:string;displayName:string}}) {
  const [section,setSection]=useState("Vue d'ensemble");
  const [overview,setOverview]=useState<Overview|null>(null);
  const [products,setProducts]=useState<Product[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [showCreate,setShowCreate]=useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [overviewResponse,productsResponse] = await Promise.all([fetch("/api/admin/overview"),fetch("/api/admin/products")]);
      const overviewBody = await readApi<Overview&ApiError>(overviewResponse);
      const productData = await readApi<{products?:Product[];error?:string}>(productsResponse);
      if (!overviewResponse.ok) throw new Error(overviewBody.error ?? "Impossible de charger le tableau de bord.");
      if (!productsResponse.ok) throw new Error(productData.error ?? "Impossible de charger les produits.");
      setOverview(overviewBody);
      setProducts(productData.products ?? []);
    } catch (cause) { setError(cause instanceof Error?cause.message:"Impossible de charger l'administration."); }
    finally { setLoading(false); }
  },[]);
  useEffect(()=>{void load()},[load]);

  async function createProduct(event:FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    const formElement = event.currentTarget;
    const values = Object.fromEntries(new FormData(formElement));
    try {
      const response = await fetch("/api/admin/products",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(values)});
      const body = await readApi<ApiError>(response);
      if (!response.ok) { setError(body.error ?? "Le produit n'a pas pu être créé."); return; }
      formElement.reset(); setShowCreate(false); await load(); setSection("Produits");
    } catch { setError("Le produit n'a pas pu être créé."); }
  }

  async function setProductStatus(product:Product,status:Product["status"]) {
    try {
      const response = await fetch(`/api/admin/products/${product.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status})});
      const body = await readApi<ApiError>(response);
      if (!response.ok) { setError(body.error ?? "Le produit n'a pas pu être modifié."); return; }
      await load();
    } catch { setError("Le produit n'a pas pu être modifié."); }
  }

  async function refund(order:Order) {
    if (!window.confirm(`Rembourser ${money(order.totalCents,order.currency)} à ${order.email} ?`)) return;
    const response = await fetch(`/api/admin/orders/${order.id}/refund`,{method:"POST"});
    const body = await readApi<ApiError>(response);
    if (!response.ok) { setError(body.error ?? "Remboursement impossible."); return; }
    await load();
  }

  const roleLabel = !overview ? "Vérification" : overview.admin.role==="super_admin" ? "Super Admin" : "Sub-Admin";
  const menu = ["Vue d'ensemble","Produits","Commandes","Clients","Abonnés","Contacts","Journal"];

  return <main className="dashboard admin live-admin">
    <aside>
      <a className="mark" href="/"><span>N</span>Nexora</a><p>ADMINISTRATION</p>
      {menu.map(item=><button className={section===item?"active":""} onClick={()=>setSection(item)} key={item}>{item}</button>)}
      {overview?.admin.role==="super_admin"&&<a href="/admin/team">Equipe admin</a>}
      <hr/><a href="/">Voir la boutique</a><LogoutButton/>
    </aside>
    <section>
      <div className="dash-head"><div><span className="overline">{roleLabel}</span><h1>{section}</h1><p className="admin-viewer">Connecté avec {overview?.admin.email??viewer.email}</p></div>{section==="Produits"&&<button className="button dark" onClick={()=>setShowCreate(true)}>+ Nouveau produit</button>}</div>
      {error&&<div className="admin-alert" role="alert">{error}</div>}
      {loading?<div className="admin-loading" role="status">Chargement...</div>:<>
        {section==="Vue d'ensemble"&&overview&&<><div className="metrics"><div><span>Revenu payé</span><b>{money(overview.metrics.revenueCents)}</b><small>Commandes validées</small></div><div><span>Commandes</span><b>{overview.metrics.orders}</b><small>Tous les statuts</small></div><div><span>Clients</span><b>{overview.metrics.customers}</b><small>Comptes actifs</small></div><div><span>Produits live</span><b>{overview.metrics.products}</b><small>Catalogue publié</small></div></div><div className="admin-grid"><article><h2>Commandes récentes</h2><OrderTable orders={overview.orders} onRefund={refund}/></article><article><h2>Contacts récents</h2>{overview.contacts.length?overview.contacts.slice(0,5).map(item=><div className="audit-row" key={item.id}><b>{item.subject}</b><span>{item.name} · {item.email}</span><small>{date(item.createdAt)}</small></div>):<Empty title="Aucun message contact."/>}</article></div></>}
        {section==="Produits"&&<ProductTable products={products} onReload={load} onStatus={setProductStatus}/>}
        {section==="Commandes"&&overview&&<div className="admin-table-card"><h2>Commandes et remboursements</h2><OrderTable orders={overview.orders} onRefund={refund}/></div>}
        {section==="Clients"&&overview&&<div className="admin-table-card"><h2>Clients inscrits</h2><table><thead><tr><th>Nom</th><th>Email</th><th>Vérifié</th><th>Date</th></tr></thead><tbody>{overview.customers.map(c=><tr key={c.id}><td>{c.displayName}</td><td>{c.email}</td><td>{c.emailVerified?"Oui":"Non"}</td><td>{date(c.createdAt)}</td></tr>)}</tbody></table></div>}
        {section==="Abonnés"&&overview&&<div className="admin-table-card"><h2>Abonnés newsletter</h2><table><thead><tr><th>Email</th><th>Statut</th><th>Date</th></tr></thead><tbody>{overview.subscribers.map(s=><tr key={s.id}><td>{s.email}</td><td>{s.status}</td><td>{date(s.createdAt)}</td></tr>)}</tbody></table></div>}
        {section==="Contacts"&&overview&&<div className="admin-table-card"><h2>Messages contact</h2>{overview.contacts.length?overview.contacts.map(item=><div className="audit-row wide" key={item.id}><b>{item.subject}</b><span>{item.name} · {item.email}</span><p>{item.message}</p><small>{date(item.createdAt)}</small></div>):<Empty title="Aucun message contact."/>}</div>}
        {section==="Journal"&&overview&&<div className="admin-table-card"><h2>Journal</h2>{overview.audit.length?overview.audit.map((item,index)=><div className="audit-row wide" key={`${item.resourceId}-${index}`}><b>{item.action}</b><span>{item.resourceType} · {item.resourceId}</span><small>{date(item.createdAt)}</small></div>):<Empty title="Aucune activité."/>}</div>}
      </>}
    </section>
    {showCreate&&<div className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="create-title"><form onSubmit={createProduct}><div className="modal-head"><h2 id="create-title">Créer un produit</h2><button type="button" onClick={()=>setShowCreate(false)} aria-label="Fermer">×</button></div><label>Nom<input name="name" required minLength={2}/></label><label>Slug URL<input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="carte-ps-plus"/></label><label>Description<textarea name="description" required minLength={10}/></label><div className="form-grid"><label>Type<select name="productType"><option>PS Plus</option><option>Xbox</option><option>Netflix</option><option>Carte cadeau</option><option>Gaming</option><option>Streaming</option></select></label><label>Prix (MAD)<input name="price" required type="number" min="0" step=".01"/></label><label>Version<input name="version" required defaultValue="Code digital"/></label></div><button className="button dark wide">Enregistrer en brouillon</button></form></div>}
  </main>;
}

function ProductTable({products,onReload,onStatus}:{products:Product[];onReload:()=>void;onStatus:(product:Product,status:Product["status"])=>void}) {
  return <div className="admin-table-card"><div className="table-head"><div><h2>Catalogue produits</h2><p>{products.length} produits en base</p></div><button onClick={()=>void onReload()}>Actualiser</button></div><table><thead><tr><th>Produit</th><th>Type</th><th>Prix</th><th>Version</th><th>Statut</th><th>Action</th></tr></thead><tbody>{products.map(product=><tr key={product.id}><td><b>{product.name}</b><small>/{product.slug}</small></td><td>{product.productType}</td><td>{money(product.priceCents,product.currency)}</td><td>{product.version}</td><td><span className={`status ${product.status}`}>{product.status}</span></td><td><select aria-label={`Changer ${product.name}`} value={product.status} onChange={event=>void onStatus(product,event.target.value as Product["status"])}><option value="draft">Brouillon</option><option value="published">Publié</option><option value="archived">Archivé</option></select></td></tr>)}</tbody></table></div>;
}

function OrderTable({orders,onRefund}:{orders:Order[];onRefund:(order:Order)=>void}) {
  return orders.length?<div className="table-scroll"><table><thead><tr><th>Commande</th><th>Client</th><th>Statut</th><th>Total</th><th>Date</th><th/></tr></thead><tbody>{orders.map(order=><tr key={order.id}><td>{order.id.slice(0,8)}</td><td>{order.email}</td><td><span className={`status ${order.status}`}>{order.status}</span></td><td>{money(order.totalCents,order.currency)}</td><td>{date(order.createdAt)}</td><td>{order.status==="paid"&&<button className="table-action danger" onClick={()=>onRefund(order)}>Rembourser</button>}</td></tr>)}</tbody></table></div>:<Empty title="Aucune commande."/>;
}

function Empty({title}:{title:string}){return <div className="admin-empty"><p>{title}</p></div>}

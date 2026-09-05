"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { LogoutButton } from "./logout-button";

type Product = { id:string; slug:string; name:string; description:string; productType:string; status:"draft"|"published"|"archived"|"out_of_stock"; priceCents:number; currency:string; version:string; downloadLimit:number; updatedAt:string };
type Order = { id:string; email:string; status:string; totalCents:number; currency:string; createdAt:string };
type Audit = { action:string; resourceType:string; resourceId:string; createdAt:string };
type Customer = { id:string; email:string; displayName:string; emailVerified:boolean; createdAt:string };
type Subscriber = { id:string; email:string; status:string; createdAt:string };
type Contact = { id:string; name:string; email:string; subject:string; message:string; status:string; createdAt:string };
type Overview = { admin:{displayName:string;email:string;role:"super_admin"|"sub_admin"}; metrics:{revenueCents:number;orders:number;customers:number;products:number}; orders:Order[]; audit:Audit[]; customers:Customer[]; subscribers:Subscriber[]; contacts:Contact[] };
type ApiError = { error?: string };

const money = (cents:number,currency="mad") => new Intl.NumberFormat("fr-MA",{style:"currency",currency:currency.toUpperCase()}).format(cents/100);
const date = (value:string) => new Intl.DateTimeFormat("fr-MA",{dateStyle:"medium",timeStyle:"short"}).format(new Date(value));
const productCategories = [
  "Instagram","Adobe Creative Cloud","Headspace","Picsart","n8n Starter","Surfshark VPN","ChatGPT",
  "Amazon Prime Video","Kling AI","QuillBot","ExpressVPN","Dreamina","Codex","Canva",
  "LinkedIn Career","Spotify","Apple Music","Cursor Pro","Grok","CapCut Pro","LinkedIn Business",
  "Telegram Premium","Suno Premier","Perplexity Pro","HMA VPN","Claude","Lovable AI","YouTube Premium",
  "Gamma Pro","HeyGen Creator","Proton VPN","ElevenLabs","Manus","Xbox Game Pass Ultimate",
  "Microsoft 365","Meitu SVIP","Google AI / Gemini","Figma","Netflix","Paramount+","TikTok US",
  "Google AI Pro","Fortnite","Gmail","NordVPN","Duolingo Super","Adobe Full Apps","Veo 3 Ultra",
  "Microsoft Office 365","Hotmail","Notion","OpenArt","Supabase Pro","Outlook","Antigravity",
];

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
  const [editing,setEditing]=useState<Product|null>(null);

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

  async function updateProduct(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const response = await fetch(`/api/admin/products/${editing.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(values)});
      const body = await readApi<ApiError>(response);
      if (!response.ok) { setError(body.error ?? "Le produit n'a pas pu être modifié."); return; }
      setEditing(null);
      await load();
    } catch { setError("Le produit n'a pas pu être modifié."); }
  }

  async function deleteProduct(product:Product) {
    if (!window.confirm(`Supprimer ${product.name} de la boutique ?`)) return;
    const response = await fetch(`/api/admin/products/${product.id}`,{method:"DELETE"});
    const body = await readApi<ApiError>(response);
    if (!response.ok) { setError(body.error ?? "Le produit n'a pas pu être supprimé."); return; }
    await load();
  }

  async function refund(order:Order) {
    if (!window.confirm(`Rembourser ${money(order.totalCents,order.currency)} à ${order.email} ?`)) return;
    const response = await fetch(`/api/admin/orders/${order.id}/refund`,{method:"POST"});
    const body = await readApi<ApiError>(response);
    if (!response.ok) { setError(body.error ?? "Remboursement impossible."); return; }
    await load();
  }

  const roleLabel = !overview ? "Vérification" : overview.admin.role==="super_admin" ? "Super Admin" : "Sub-Admin";
  const menu = ["Vue d'ensemble","Produits","Commandes","Abonnés","Contacts","Journal"];

  return <main className="dashboard admin live-admin">
    <aside>
      <a className="mark" href="/"><span>N</span>Nexora</a><p>ADMINISTRATION</p>
      {menu.map(item=><button className={section===item?"active":""} onClick={()=>setSection(item)} key={item}>{item}</button>)}
      {overview?.admin.role==="super_admin"&&<a href="/admin/team">Equipe admin</a>}
      <hr/><a href="/">Voir la boutique</a><LogoutButton/>
    </aside>
    <section>
      <div className="dash-head"><div><span className="overline">{roleLabel}</span><h1>{section}</h1><p className="admin-viewer">Connecté avec {overview?.admin.email??viewer.email}</p></div>{section==="Produits"&&<button className="button dark" onClick={()=>setShowCreate(true)}>Ajouter</button>}</div>
      {error&&<div className="admin-alert" role="alert">{error}</div>}
      {loading?<div className="admin-loading" role="status">Chargement...</div>:<>
        {section==="Vue d'ensemble"&&overview&&<><div className="metrics"><div><span>Revenu payé</span><b>{money(overview.metrics.revenueCents)}</b><small>Commandes validées</small></div><div><span>Commandes</span><b>{overview.metrics.orders}</b><small>Tous les statuts</small></div><div><span>Abonnés</span><b>{overview.metrics.customers}</b><small>Newsletter active</small></div><div><span>Produits live</span><b>{overview.metrics.products}</b><small>Catalogue publié</small></div></div><div className="admin-grid"><article><h2>Commandes récentes</h2><OrderTable orders={overview.orders} onRefund={refund}/></article><article><h2>Contacts récents</h2>{overview.contacts.length?overview.contacts.slice(0,5).map(item=><div className="audit-row" key={item.id}><b>{item.subject}</b><span>{item.name} · {item.email}</span><small>{date(item.createdAt)}</small></div>):<Empty title="Aucun message contact."/>}</article></div></>}
        {section==="Produits"&&<ProductTable products={products} onReload={load} onEdit={setEditing} onDelete={deleteProduct}/>}
        {section==="Commandes"&&overview&&<div className="admin-table-card"><h2>Commandes et remboursements</h2><OrderTable orders={overview.orders} onRefund={refund}/></div>}
        {section==="Abonnés"&&overview&&<div className="admin-table-card"><h2>Abonnés newsletter</h2><table><thead><tr><th>Email</th><th>Statut</th><th>Date</th></tr></thead><tbody>{overview.subscribers.map(s=><tr key={s.id}><td>{s.email}</td><td>{s.status}</td><td>{date(s.createdAt)}</td></tr>)}</tbody></table></div>}
        {section==="Contacts"&&overview&&<div className="admin-table-card"><h2>Messages contact</h2>{overview.contacts.length?overview.contacts.map(item=><div className="audit-row wide" key={item.id}><b>{item.subject}</b><span>{item.name} · {item.email}</span><p>{item.message}</p><small>{date(item.createdAt)}</small></div>):<Empty title="Aucun message contact."/>}</div>}
        {section==="Journal"&&overview&&<div className="admin-table-card"><h2>Journal</h2>{overview.audit.length?overview.audit.map((item,index)=><div className="audit-row wide" key={`${item.resourceId}-${index}`}><b>{item.action}</b><span>{item.resourceType} · {item.resourceId}</span><small>{date(item.createdAt)}</small></div>):<Empty title="Aucune activité."/>}</div>}
      </>}
    </section>
    {showCreate&&<ProductModal title="Ajouter un produit" submitLabel="Ajouter à la boutique" onSubmit={createProduct} close={()=>setShowCreate(false)}/>}
    {editing&&<ProductModal title={`Modifier ${editing.name}`} submitLabel="Enregistrer" product={editing} onSubmit={updateProduct} close={()=>setEditing(null)}/>}
  </main>;
}

function ProductTable({products,onReload,onEdit,onDelete}:{products:Product[];onReload:()=>void;onEdit:(product:Product)=>void;onDelete:(product:Product)=>void}) {
  return <div className="admin-table-card"><div className="table-head"><div><h2>Catalogue produits</h2><p>{products.length} produits visibles dans l&apos;administration</p></div><button onClick={()=>void onReload()}>Actualiser</button></div>{products.length?<table><thead><tr><th>Produit</th><th>Catégorie</th><th>Prix</th><th>Statut</th><th>Actions</th></tr></thead><tbody>{products.map(product=><tr key={product.id}><td><b>{product.name}</b><small>/{product.slug}</small></td><td>{product.productType}</td><td>{money(product.priceCents,product.currency)}</td><td><span className={`status ${product.status}`}>{product.status}</span></td><td><button className="table-action" onClick={()=>onEdit(product)}>Modifier</button> <button className="table-action danger" onClick={()=>void onDelete(product)}>Supprimer</button></td></tr>)}</tbody></table>:<Empty title="Aucun produit. Cliquez sur Ajouter pour créer la première carte."/>}</div>;
}

function ProductModal({title,submitLabel,product,onSubmit,close}:{title:string;submitLabel:string;product?:Product;onSubmit:(event:FormEvent<HTMLFormElement>)=>void;close:()=>void}) {
  return <div className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="product-title"><form onSubmit={onSubmit}><div className="modal-head"><h2 id="product-title">{title}</h2><button type="button" onClick={close} aria-label="Fermer">×</button></div><label>Nom du produit<input name="name" required minLength={2} defaultValue={product?.name} placeholder="ChatGPT Plus 1 mois"/></label><div className="form-grid"><label>Catégorie<select name="productType" defaultValue={product?.productType??"ChatGPT"}>{productCategories.map(category=><option key={category}>{category}</option>)}</select></label><label>Prix (MAD)<input name="price" required type="number" min="0" step=".01" defaultValue={product?String(product.priceCents/100):""} placeholder="199"/></label><label>Stock<select name="status" defaultValue={product?.status==="out_of_stock"?"out_of_stock":"published"}><option value="published">Disponible</option><option value="out_of_stock">Out of stock</option></select></label></div><div className="restricted-note"><b>Exemples rapides</b><p>ChatGPT Plus 1 mois, YouTube Premium 1 mois, Netflix Premium 1 mois, Canva Pro 1 mois. Entrez votre prix final en MAD.</p></div><button className="button dark wide">{submitLabel}</button></form></div>;
}

function OrderTable({orders,onRefund}:{orders:Order[];onRefund:(order:Order)=>void}) {
  return orders.length?<div className="table-scroll"><table><thead><tr><th>Commande</th><th>Client</th><th>Statut</th><th>Total</th><th>Date</th><th/></tr></thead><tbody>{orders.map(order=><tr key={order.id}><td>{order.id.slice(0,8)}</td><td>{order.email}</td><td><span className={`status ${order.status}`}>{order.status}</span></td><td>{money(order.totalCents,order.currency)}</td><td>{date(order.createdAt)}</td><td>{order.status==="paid"&&<button className="table-action danger" onClick={()=>onRefund(order)}>Rembourser</button>}</td></tr>)}</tbody></table></div>:<Empty title="Aucune commande."/>;
}

function Empty({title}:{title:string}){return <div className="admin-empty"><p>{title}</p></div>}

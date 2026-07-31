"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { LogoutButton } from "./logout-button";

type Product = {
  id:string; slug:string; name:string; description:string; productType:string;
  status:"draft"|"published"|"archived"; priceCents:number; currency:string;
  version:string; downloadLimit:number; updatedAt:string;
};
type Order = { id:string; email:string; status:string; totalCents:number; currency:string; createdAt:string };
type Audit = { action:string; resourceType:string; resourceId:string; createdAt:string };
type Overview = {
  admin:{displayName:string;email:string;role:"super_admin"|"sub_admin"};
  metrics:{revenueCents:number;orders:number;customers:number;products:number};
  orders:Order[]; audit:Audit[];
};
type ApiError = { error?: string };

const money = (cents:number,currency="usd") => new Intl.NumberFormat("en-US",{style:"currency",currency:currency.toUpperCase()}).format(cents/100);
const date = (value:string) => new Intl.DateTimeFormat("en-US",{dateStyle:"medium",timeStyle:"short"}).format(new Date(value));
async function readApi<T extends ApiError>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) return {} as T;
  try { return JSON.parse(text) as T; }
  catch { return { error:text } as T; }
}

export function AdminDashboard({viewer}:{viewer:{email:string;displayName:string}}) {
  const [section,setSection]=useState("Overview");
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
      if (!overviewResponse.ok) throw new Error(overviewBody.error ?? "Overview could not be loaded.");
      if (!productsResponse.ok) throw new Error(productData.error ?? "Products could not be loaded.");
      setOverview(overviewBody);
      setProducts(productData.products ?? []);
    } catch (cause) { setError(cause instanceof Error?cause.message:"Admin data could not be loaded"); }
    finally { setLoading(false); }
  },[]);
  useEffect(()=>{void load()},[load]);

  async function createProduct(event:FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    const formElement = event.currentTarget;
    const values=Object.fromEntries(new FormData(formElement));
    try {
      const response=await fetch("/api/admin/products",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(values)});
      const body=await readApi<ApiError>(response);
      if(!response.ok){setError(body.error??"Product could not be created");return}
      formElement.reset(); setShowCreate(false); await load(); setSection("Products");
    } catch { setError("Product could not be created. Please try again."); }
  }
  async function setProductStatus(product:Product,status:Product["status"]) {
    try {
      const response=await fetch(`/api/admin/products/${product.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status})});
      const body=await readApi<ApiError>(response);
      if(!response.ok){setError(body.error??"Product could not be updated");return}
      await load();
    } catch { setError("Product could not be updated. Please try again."); }
  }
  async function refund(order:Order) {
    if(!window.confirm(`Refund ${money(order.totalCents,order.currency)} to ${order.email}? This revokes download access.`))return;
    try {
      const response=await fetch(`/api/admin/orders/${order.id}/refund`,{method:"POST"});
      const body=await readApi<ApiError>(response);
      if(!response.ok){setError(body.error??"Refund failed");return}
      await load();
    } catch { setError("Refund failed. Please try again."); }
  }

  const roleLabel=!overview?"Verifying access":overview.admin.role==="super_admin"?"Super Admin":"Sub-Admin";
  return <main className="dashboard admin live-admin">
    <aside>
      <a className="mark" href="/"><span>N</span>Nexora</a><p>ADMINISTRATION</p>
      {["Overview","Products","Orders","Customers","Audit log"].map(item=><button className={section===item?"active":""} onClick={()=>setSection(item)} key={item}>{item}</button>)}
      {overview?.admin.role==="super_admin"&&<a href="/admin/team">Admin team</a>}
      <hr/><a href="/">View storefront ↗</a><LogoutButton/>
    </aside>
    <section>
      <div className="dash-head"><div><span className="overline">{roleLabel||"VERIFYING ACCESS"}</span><h1>{section}</h1><p className="admin-viewer">Signed in as {overview?.admin.email??viewer.email}</p></div>{section==="Products"&&<button className="button dark" onClick={()=>setShowCreate(true)}>+ New product</button>}</div>
      {error&&<div className="admin-alert" role="alert">{error}</div>}
      {loading?<div className="admin-loading" role="status">Loading verified store data…</div>:<>
        {section==="Overview"&&overview&&<>
          <div className="metrics">
            <div><span>Paid revenue</span><b>{money(overview.metrics.revenueCents)}</b><small>Verified orders only</small></div>
            <div><span>Orders</span><b>{overview.metrics.orders}</b><small>All payment states</small></div>
            <div><span>Customers</span><b>{overview.metrics.customers}</b><small>Active accounts</small></div>
            <div><span>Live products</span><b>{overview.metrics.products}</b><small>Published in catalog</small></div>
          </div>
          <div className="admin-grid">
            <article><h2>Recent orders</h2><OrderTable orders={overview.orders} onRefund={refund}/></article>
            <article><h2>Recent activity</h2>{overview.audit.length?overview.audit.map((item,index)=><div className="audit-row" key={`${item.resourceId}-${index}`}><b>{item.action}</b><span>{item.resourceType} · {item.resourceId.slice(0,8)}</span><small>{date(item.createdAt)}</small></div>):<Empty title="No recorded activity yet."/>}</article>
          </div>
        </>}
        {section==="Products"&&<div className="admin-table-card"><div className="table-head"><div><h2>Product catalog</h2><p>{products.length} database records</p></div><button onClick={()=>void load()}>Refresh</button></div><table><thead><tr><th>Product</th><th>Type</th><th>Price</th><th>Version</th><th>Status</th><th>Action</th></tr></thead><tbody>{products.map(product=><tr key={product.id}><td><b>{product.name}</b><small>/{product.slug}</small></td><td>{product.productType}</td><td>{money(product.priceCents,product.currency)}</td><td>{product.version}</td><td><span className={`status ${product.status}`}>{product.status}</span></td><td><select aria-label={`Change status for ${product.name}`} value={product.status} onChange={event=>void setProductStatus(product,event.target.value as Product["status"])}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></td></tr>)}</tbody></table></div>}
        {section==="Orders"&&overview&&<div className="admin-table-card"><h2>Orders and refunds</h2><OrderTable orders={overview.orders} onRefund={refund}/></div>}
        {section==="Customers"&&overview&&<div className="panel-state"><span>◎</span><h2>{overview.metrics.customers} active customers</h2><p>Customer accounts are created from verified checkout and identity events. Personal data stays server-controlled and is never exposed through an unguarded endpoint.</p></div>}
        {section==="Audit log"&&overview&&<div className="admin-table-card"><h2>Immutable activity trail</h2>{overview.audit.map((item,index)=><div className="audit-row wide" key={`${item.resourceId}-${index}`}><b>{item.action}</b><span>{item.resourceType} · {item.resourceId}</span><small>{date(item.createdAt)}</small></div>)}</div>}
      </>}
    </section>
    {showCreate&&<div className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="create-title"><form onSubmit={createProduct}><div className="modal-head"><h2 id="create-title">Create product</h2><button type="button" onClick={()=>setShowCreate(false)} aria-label="Close">×</button></div><label>Name<input name="name" required minLength={2}/></label><label>URL slug<input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="my-digital-product"/></label><label>Description<textarea name="description" required minLength={10}/></label><div className="form-grid"><label>Type<select name="productType"><option>Software</option><option>Template</option><option>Ebook</option><option>Course</option><option>Creative assets</option><option>Design system</option></select></label><label>Price (USD)<input name="price" required type="number" min="0" step=".01"/></label><label>Version<input name="version" required defaultValue="1.0.0"/></label></div><button className="button dark wide">Save as draft</button></form></div>}
  </main>
}

function OrderTable({orders,onRefund}:{orders:Order[];onRefund:(order:Order)=>void}) {
  return orders.length?<div className="table-scroll"><table><thead><tr><th>Order</th><th>Customer</th><th>Status</th><th>Total</th><th>Date</th><th/></tr></thead><tbody>{orders.map(order=><tr key={order.id}><td>{order.id.slice(0,8)}</td><td>{order.email}</td><td><span className={`status ${order.status}`}>{order.status}</span></td><td>{money(order.totalCents,order.currency)}</td><td>{date(order.createdAt)}</td><td>{order.status==="paid"&&<button className="table-action danger" onClick={()=>onRefund(order)}>Refund</button>}</td></tr>)}</tbody></table></div>:<Empty title="No orders yet."/>
}
function Empty({title}:{title:string}){return <div className="admin-empty"><p>{title}</p></div>}

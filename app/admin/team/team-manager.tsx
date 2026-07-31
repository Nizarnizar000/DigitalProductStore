"use client";

import { ChangeEvent, ClipboardEvent, FormEvent, KeyboardEvent, useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { LogoutButton } from "../logout-button";

type Member = { id:string; email:string; displayName:string|null; role:"super_admin"|"sub_admin"; status:string; twoFactorEnabled:boolean; createdAt:string };
type Permission = { userId:string; permission:string; granted:boolean };
type ApiBody = { error?:string; members?:Member[]; permissions?:Permission[]; permissionNames?:string[]; needsVerification?:boolean; email?:string };

const labels:Record<string,string> = { products:"Products", orders:"Orders", refunds:"Refunds", customers:"Customers", discounts:"Discounts", reviews:"Reviews", support:"Support", content:"Content", reports:"Reports" };

async function readApi(response: Response): Promise<ApiBody> {
  const text = await response.text();
  if (!text) return {};
  try { return JSON.parse(text) as ApiBody; }
  catch { return { error: text }; }
}

export function TeamManager({ viewer }: { viewer:string }) {
  const [members,setMembers] = useState<Member[]>([]);
  const [rows,setRows] = useState<Permission[]>([]);
  const [names,setNames] = useState<string[]>([]);
  const [loading,setLoading] = useState(true);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const [showInvite,setShowInvite] = useState(false);
  const [passwordMember,setPasswordMember] = useState<Member|null>(null);
  const [pendingSubAdminEmail,setPendingSubAdminEmail] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/team");
      const body = await readApi(response);
      if (!response.ok) {
        setError(body.error ?? "Team access failed.");
        return;
      }
      setMembers(body.members ?? []);
      setRows(body.permissions ?? []);
      setNames(body.permissionNames ?? []);
    } catch {
      setError("Team access failed. Please refresh and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const granted = (id:string) => new Set(rows.filter(row => row.userId === id && row.granted).map(row => row.permission));

  async function invite(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    if (form.get("password") !== form.get("confirmPassword")) {
      setError("Passwords do not match.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/team", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ email:form.get("email"), displayName:form.get("displayName"), password:form.get("password"), permissions:form.getAll("permissions") }),
      });
      const body = await readApi(response);
      if (!response.ok) {
        setError(body.error ?? "Account creation failed.");
        return;
      }
      if (body.needsVerification && body.email) {
        setPendingSubAdminEmail(body.email);
        setError("");
        return;
      }
      formElement.reset();
      setShowInvite(false);
      await load();
    } catch {
      setError("Account creation failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function verifySubAdmin(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const code = Array.from({length:6},(_,index)=>String(form.get(`code-${index}`)??"")).join("");
    try {
      const response = await fetch("/api/auth/verify-email", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ email:pendingSubAdminEmail, code }),
      });
      const body = await readApi(response);
      if (!response.ok) {
        setError(body.error ?? "Verification failed.");
        return;
      }
      setPendingSubAdminEmail("");
      setShowInvite(false);
      await load();
    } catch {
      setError("Verification failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function update(member:Member, patch:{status?:string; permissions?:string[]; password?:string}) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/team/${member.id}`, {
        method:"PATCH",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify(patch),
      });
      const body = await readApi(response);
      if (!response.ok) {
        setError(body.error ?? "Update failed.");
        return false;
      }
      await load();
      return true;
    } catch {
      setError("Update failed. Please try again.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function changePassword(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!passwordMember) return;
    const form = new FormData(event.currentTarget);
    if (form.get("password") !== form.get("confirmPassword")) {
      setError("Passwords do not match.");
      return;
    }
    if (await update(passwordMember,{password:String(form.get("password"))})) setPasswordMember(null);
  }

  async function remove(member:Member) {
    if (!confirm(`Delete access for ${member.email}?`)) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/team/${member.id}`,{method:"DELETE"});
      const body = await readApi(response);
      if (!response.ok) {
        setError(body.error ?? "Delete failed.");
        return;
      }
      await load();
    } catch {
      setError("Delete failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function toggle(member:Member, permission:string) {
    const current = granted(member.id);
    if (current.has(permission)) current.delete(permission);
    else current.add(permission);
    void update(member,{permissions:[...current]});
  }

  return <main className="dashboard admin live-admin"><aside><a className="mark" href="/"><span>N</span>Nexora</a><p>ADMINISTRATION</p><a href="/admin">Overview</a><a className="active-side" href="/admin/team">Admin team</a><hr/><a href="/">View storefront -&gt;</a><LogoutButton/></aside><section><div className="dash-head"><div><span className="overline">SUPER ADMIN ONLY</span><h1>Admin team</h1><p className="admin-viewer">Signed in as {viewer}</p></div><button className="button dark" disabled={busy} onClick={()=>setShowInvite(true)}>+ Add Sub-Admin</button></div>{error&&<div className="admin-alert" role="alert">{error}</div>}{loading?<div className="admin-loading">Loading team...</div>:<div className="team-list">{members.map(member=><article key={member.id}><div className="team-identity"><span className="avatar">{(member.displayName??member.email).slice(0,2).toUpperCase()}</span><div><h2>{member.displayName??member.email}</h2><p>{member.email}</p></div><span className={`status ${member.status}`}>{member.role==="super_admin"?"Super Admin":member.status}</span></div>{member.role==="super_admin"?<div className="super-lock"><b>Full access</b><p>The Super Admin controls team roles, payment configuration, and security.</p></div>:<><div className="permission-grid">{names.map(name=><label key={name}><input type="checkbox" checked={granted(member.id).has(name)} disabled={busy} onChange={()=>toggle(member,name)}/><span>{labels[name]??name}</span></label>)}</div><div className="team-actions"><button disabled={busy} onClick={()=>setPasswordMember(member)}>Change password</button><button disabled={busy} onClick={()=>void update(member,{status:member.status==="active"?"suspended":"active"})}>{member.status==="active"?"Suspend":"Reactivate"}</button><button disabled={busy} className="danger" onClick={()=>void remove(member)}>Delete access</button></div></>}</article>)}</div>}</section>
 {showInvite&&<Modal title="Create Sub-Admin" close={()=>{setShowInvite(false);setPendingSubAdminEmail("")}}>{pendingSubAdminEmail?<form onSubmit={verifySubAdmin}><p className="modal-intro">A verification code was sent to {pendingSubAdminEmail}. Enter it here to activate this Sub-Admin.</p><CodeInputs/><button className="button dark wide" disabled={busy}>{busy?"Verifying...":"Verify Sub-Admin"}</button></form>:<form onSubmit={invite}><p className="modal-intro">Create a private login for this team member. Nexora will send a verification code to their email before they can sign in.</p><label>Display name<input name="displayName" required/></label><label>Email<input name="email" type="email" required/></label><label>Initial password<input name="password" type="password" minLength={12} required/></label><label>Confirm password<input name="confirmPassword" type="password" minLength={12} required/></label><fieldset><legend>Allowed areas</legend><div className="permission-grid">{names.map(name=><label key={name}><input type="checkbox" name="permissions" value={name} defaultChecked/><span>{labels[name]??name}</span></label>)}</div></fieldset><button className="button dark wide" disabled={busy}>{busy?"Creating...":"Create account"}</button></form>}</Modal>}
 {passwordMember&&<Modal title={`Change password - ${passwordMember.displayName??passwordMember.email}`} close={()=>setPasswordMember(null)}><form onSubmit={changePassword}><p className="modal-intro">Changing the password immediately revokes all active sessions for this user.</p><label>New password<input name="password" type="password" minLength={12} required/></label><label>Confirm password<input name="confirmPassword" type="password" minLength={12} required/></label><button className="button dark wide" disabled={busy}>{busy?"Saving...":"Save new password"}</button></form></Modal>}
 </main>
}

function Modal({title,close,children}:{title:string;close:()=>void;children:ReactNode}) {
  return <div className="admin-modal" role="dialog" aria-modal="true"><div className="modal-form"><div className="modal-head"><h2>{title}</h2><button type="button" onClick={close} aria-label="Close">x</button></div>{children}</div></div>;
}

function CodeInputs() {
  function move(event:ChangeEvent<HTMLInputElement>, index:number) {
    event.currentTarget.value = event.currentTarget.value.replace(/\D/g,"").slice(-1);
    if (event.currentTarget.value) event.currentTarget.form?.querySelector<HTMLInputElement>(`input[name="code-${index+1}"]`)?.focus();
  }
  function paste(event:ClipboardEvent<HTMLInputElement>) {
    const digits = event.clipboardData.getData("text").replace(/\D/g,"").slice(0,6);
    if (digits.length < 2) return;
    event.preventDefault();
    digits.split("").forEach((digit,index)=>{
      const input = event.currentTarget.form?.querySelector<HTMLInputElement>(`input[name="code-${index}"]`);
      if (input) input.value = digit;
    });
    event.currentTarget.form?.querySelector<HTMLInputElement>(`input[name="code-${Math.min(digits.length,6)-1}"]`)?.focus();
  }
  function key(event:KeyboardEvent<HTMLInputElement>, index:number) {
    if (event.key === "Backspace" && !event.currentTarget.value && index > 0) event.currentTarget.form?.querySelector<HTMLInputElement>(`input[name="code-${index-1}"]`)?.focus();
  }
  return <div className="code-inputs" aria-label="Verification code">{Array.from({length:6},(_,index)=><input key={index} name={`code-${index}`} inputMode="numeric" pattern="[0-9]" maxLength={1} required aria-label={`Digit ${index+1}`} onChange={event=>move(event,index)} onPaste={paste} onKeyDown={event=>key(event,index)}/>)}</div>;
}

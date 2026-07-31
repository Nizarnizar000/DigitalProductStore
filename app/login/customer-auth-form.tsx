"use client";

import { FormEvent, useState } from "react";

type AuthResponse = { error?: string };

async function readAuthResponse(response: Response): Promise<AuthResponse> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as AuthResponse;
  } catch {
    return { error: text };
  }
}

export function CustomerAuthForm({ mode, next }: { mode:"login"|"register"; next?:string }) {
  const [error,setError] = useState("");
  const [busy,setBusy] = useState(false);

  async function submit(e:FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");

    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({...data, scope:"customer"}),
      });
      const body = await readAuthResponse(response);
      if (!response.ok) {
        setError(body.error ?? "Authentication failed.");
        setBusy(false);
        return;
      }
      window.location.assign(next?.startsWith("/") ? next : "/account");
    } catch {
      setError("Authentication failed. Please try again.");
      setBusy(false);
    }
  }

  return <main className="auth-page"><section><a className="mark" href="/"><span>N</span>Nexora</a><span className="overline">{mode==="login"?"WELCOME BACK":"CREATE YOUR LIBRARY"}</span><h1>{mode==="login"?"Sign in.":"Join Nexora."}</h1><p>{mode==="login"?"Access your purchases, licenses, invoices, and secure downloads.":"Keep every purchase, update, and license in one secure place."}</p><form className="auth-form" onSubmit={submit}>{error&&<div className="admin-alert">{error}</div>}{mode==="register"&&<label>Full name<input name="displayName" autoComplete="name" required/></label>}<label>Email<input name="email" type="email" autoComplete="username" required/></label><label>Password<input name="password" type="password" minLength={12} autoComplete={mode==="login"?"current-password":"new-password"} required/></label><button className="button primary wide" disabled={busy}>{busy?"Please wait...":mode==="login"?"Sign in":"Create account"}</button></form><p className="auth-switch">{mode==="login"?<>New here? <a href="/register">Create an account</a></>:<>Already registered? <a href="/login">Sign in</a></>}</p></section></main>;
}

"use client";

import { FormEvent, useState } from "react";

type VerifyResponse = { error?: string };

async function readVerifyResponse(response:Response):Promise<VerifyResponse> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as VerifyResponse;
  } catch {
    return { error:text };
  }
}

export function VerifyEmailForm({ email = "" }:{ email?:string }) {
  const [error,setError] = useState("");
  const [done,setDone] = useState(false);

  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(""); setDone(false);
    const response = await fetch("/api/auth/verify-email", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({ email:form.get("email"), code:form.get("code") }),
    });
    const body = await readVerifyResponse(response);
    if (!response.ok) setError(body.error ?? "Code invalide.");
    else setDone(true);
  }

  return <form className="auth-form" onSubmit={submit}>{error&&<div className="admin-alert">{error}</div>}{done&&<div className="admin-alert">Email vérifié. Vous pouvez vous connecter.</div>}<label>Email<input name="email" type="email" defaultValue={email} required/></label><label>Code<input name="code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required/></label><button className="button primary wide">Vérifier</button><a className="button outline wide" href="/login">Connexion</a></form>;
}

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
  const [message,setMessage] = useState("");
  const [busy,setBusy] = useState(false);
  const [pendingEmail,setPendingEmail] = useState("");

  async function submit(e:FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");

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
      if (mode === "register") {
        setPendingEmail(String(data.email ?? ""));
        setMessage("Compte créé. Entrez le code reçu par email pour vérifier votre compte.");
        (e.currentTarget as HTMLFormElement).reset();
        setBusy(false);
        return;
      }
      window.location.assign(next?.startsWith("/") ? next : "/account");
    } catch {
      setError("Authentication failed. Please try again.");
      setBusy(false);
    }
  }

  async function verify(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(""); setMessage("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/verify-email", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({ email:pendingEmail, code:form.get("code") }),
    });
    const body = await readAuthResponse(response);
    if (!response.ok) {
      setError(body.error ?? "Code invalide.");
      setBusy(false);
      return;
    }
    setMessage("Email vérifié. Vous pouvez vous connecter maintenant.");
    setPendingEmail("");
    setBusy(false);
  }

  return <main className="auth-page"><section><a className="mark" href="/"><span>N</span>Nexora</a><span className="overline">{mode==="login"?"CONNEXION":"CREER UN COMPTE"}</span><h1>{mode==="login"?"Connectez-vous.":"Rejoignez Nexora."}</h1><p>{mode==="login"?"Accédez à vos cartes, commandes et téléchargements.":"Créez votre compte et vérifiez votre email avec un code."}</p>{pendingEmail?<form className="auth-form" onSubmit={verify}>{error&&<div className="admin-alert">{error}</div>}{message&&<div className="admin-alert">{message}</div>}<label>Code reçu par email<input name="code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required/></label><button className="button primary wide" disabled={busy}>{busy?"Vérification...":"Vérifier mon email"}</button></form>:<form className="auth-form" onSubmit={submit}>{error&&<div className="admin-alert">{error}</div>}{message&&<div className="admin-alert">{message}</div>}{mode==="login"&&<a className="button outline wide" href="/api/auth/google/start">Continuer avec Google</a>}{mode==="register"&&<label>Nom complet<input name="displayName" autoComplete="name" required/></label>}<label>Email<input name="email" type="email" autoComplete="username" required/></label><label>Mot de passe<input name="password" type="password" minLength={12} autoComplete={mode==="login"?"current-password":"new-password"} required/></label><button className="button primary wide" disabled={busy}>{busy?"Patientez...":mode==="login"?"Se connecter":"Créer le compte"}</button></form>}<p className="auth-switch">{mode==="login"?<>Nouveau ici ? <a href="/register">Créer un compte</a> · <a href="/forgot-password?scope=customer">Mot de passe oublié ?</a></>:<>Déjà inscrit ? <a href="/login">Se connecter</a> · <a href="/forgot-password?scope=customer">Mot de passe oublié ?</a></>}</p></section></main>;
}

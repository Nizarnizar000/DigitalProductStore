"use client";

import { ChangeEvent, ClipboardEvent, FormEvent, KeyboardEvent, useState } from "react";

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
        setError(body.error ?? "Authentification impossible.");
        setBusy(false);
        return;
      }
      if (mode === "register") {
        setPendingEmail(String(data.email ?? ""));
        setMessage("Compte créé. Entrez le code reçu par email pour vérifier votre compte.");
        e.currentTarget.reset();
        setBusy(false);
        return;
      }
      window.location.assign(next?.startsWith("/") ? next : "/account");
    } catch {
      setError("Authentification impossible. Réessayez.");
      setBusy(false);
    }
  }

  async function verify(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const form = new FormData(event.currentTarget);
    const code = Array.from({length:6},(_,index)=>String(form.get(`code-${index}`)??"")).join("");
    const response = await fetch("/api/auth/verify-email", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({ email:pendingEmail, code }),
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

  return <main className="auth-page"><section><a className="mark" href="/"><span>N</span>Nexora</a><span className="overline">{mode==="login"?"CONNEXION":"CREER UN COMPTE"}</span><h1>{mode==="login"?"Connectez-vous.":"Rejoignez Nexora."}</h1><p>{mode==="login"?"Accédez à vos cartes, commandes et téléchargements.":"Créez votre compte. Le code de vérification arrive juste après par email."}</p>{pendingEmail?<form className="auth-form" onSubmit={verify}>{error&&<div className="admin-alert">{error}</div>}{message&&<div className="admin-alert">{message}</div>}<p className="code-help">Entrez le code envoyé à {pendingEmail}.</p><CodeInputs/><button className="button primary wide" disabled={busy}>{busy?"Vérification...":"Vérifier mon email"}</button></form>:<form className="auth-form" onSubmit={submit}>{error&&<div className="admin-alert">{error}</div>}{message&&<div className="admin-alert">{message}</div>}{mode==="login"&&<a className="button outline wide" href="/api/auth/google/start">Continuer avec Google</a>}{mode==="register"&&<label>Nom complet<input name="displayName" autoComplete="name" required/></label>}<label>Email<input name="email" type="email" autoComplete="username" required/></label><label>Mot de passe<input name="password" type="password" minLength={12} autoComplete={mode==="login"?"current-password":"new-password"} required/></label><button className="button primary wide" disabled={busy}>{busy?"Patientez...":mode==="login"?"Se connecter":"Créer le compte"}</button></form>}<p className="auth-switch">{mode==="login"?<>Nouveau ici ? <a href="/register">Créer un compte</a> · <a href="/forgot-password?scope=customer">Mot de passe oublié ?</a></>:<>Déjà inscrit ? <a href="/login">Se connecter</a> · <a href="/forgot-password?scope=customer">Mot de passe oublié ?</a></>}</p></section></main>;
}

function CodeInputs() {
  function move(event:ChangeEvent<HTMLInputElement>, index:number) {
    event.currentTarget.value = event.currentTarget.value.replace(/\D/g,"").slice(-1);
    if (event.currentTarget.value) {
      event.currentTarget.form?.querySelector<HTMLInputElement>(`input[name="code-${index+1}"]`)?.focus();
    }
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
    if (event.key === "Backspace" && !event.currentTarget.value && index > 0) {
      event.currentTarget.form?.querySelector<HTMLInputElement>(`input[name="code-${index-1}"]`)?.focus();
    }
  }
  return <div className="code-inputs" aria-label="Code de vérification">{Array.from({length:6},(_,index)=><input key={index} name={`code-${index}`} inputMode="numeric" pattern="[0-9]" maxLength={1} required aria-label={`Chiffre ${index+1}`} onChange={event=>move(event,index)} onPaste={paste} onKeyDown={event=>key(event,index)}/>)}</div>;
}

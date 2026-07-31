"use client";

import { FormEvent, useState } from "react";

export function ForgotPasswordForm({ scope }: { scope:"admin"|"customer" }) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");

    const form = new FormData(event.currentTarget);
    const requestedEmail = String(form.get("email") ?? "");
    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: requestedEmail, scope }),
    });
    setEmail(requestedEmail);
    setMessage("Si ce compte existe, un code a été envoyé. Entrez-le ci-dessous.");
    setBusy(false);
  }

  async function reset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    if (form.get("password") !== form.get("confirmPassword")) {
      setError("Les mots de passe ne correspondent pas.");
      setBusy(false);
      return;
    }
    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code: form.get("code"), password: form.get("password") }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: "Code invalide ou expiré." })) as { error?: string };
      setError(body.error ?? "Code invalide ou expiré.");
      setBusy(false);
      return;
    }
    location.assign(scope === "admin" ? "/admin/login" : "/login");
  }

  if (email) return (
    <form className="auth-form" onSubmit={reset}>
      {message && <div className="admin-alert">{message}</div>}
      {error && <div className="admin-alert">{error}</div>}
      <label>Code reçu par email<input name="code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required /></label>
      <label>Nouveau mot de passe<input name="password" type="password" minLength={12} autoComplete="new-password" required /></label>
      <label>Confirmer le mot de passe<input name="confirmPassword" type="password" minLength={12} autoComplete="new-password" required /></label>
      <button className="button primary wide" disabled={busy}>{busy ? "Validation..." : "Changer le mot de passe"}</button>
    </form>
  );

  return (
    <form className="auth-form" onSubmit={submit}>
      {message && <div className="admin-alert">{message}</div>}
      <label>
        Adresse email
        <input name="email" type="email" autoComplete="username" required />
      </label>
      <button className="button primary wide" disabled={busy}>
        {busy ? "Envoi..." : "Recevoir le code"}
      </button>
    </form>
  );
}

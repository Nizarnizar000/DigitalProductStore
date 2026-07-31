"use client";

import { FormEvent, useState } from "react";

type ResetResponse = { error?: string; role?: string };

async function readResetResponse(response: Response): Promise<ResetResponse> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as ResetResponse;
  } catch {
    return { error: text };
  }
}

export function ResetPasswordForm({ token: _token }: { token: string }) {
  void _token;
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");

    const form = new FormData(event.currentTarget);
    if (form.get("password") !== form.get("confirmPassword")) {
      setError("Passwords do not match.");
      setBusy(false);
      return;
    }

    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.get("email"), code: form.get("code"), password: form.get("password") }),
    });
    const body = await readResetResponse(response);
    if (!response.ok) {
      setError(body.error ?? "Password reset failed.");
      setBusy(false);
      return;
    }
    window.location.assign(body.role === "super_admin" || body.role === "sub_admin" ? "/admin/login" : "/login");
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      {error && <div className="admin-alert">{error}</div>}
      <label>
        Email
        <input name="email" type="email" autoComplete="username" required />
      </label>
      <label>
        Code reçu par email
        <input name="code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required />
      </label>
      <label>
        Nouveau mot de passe
        <input name="password" type="password" minLength={12} autoComplete="new-password" required />
      </label>
      <label>
        Confirmer le mot de passe
        <input name="confirmPassword" type="password" minLength={12} autoComplete="new-password" required />
      </label>
      <button className="button primary wide" disabled={busy}>
        {busy ? "Validation..." : "Changer le mot de passe"}
      </button>
    </form>
  );
}

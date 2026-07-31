"use client";

import { FormEvent, useState } from "react";

export function ForgotPasswordForm() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    const form = new FormData(event.currentTarget);
    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.get("email"), scope: "admin" }),
    });
    setMessage("If that admin account exists, a reset link was sent.");
    setBusy(false);
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      {message && <div className="admin-alert">{message}</div>}
      <label>
        Email address
        <input name="email" type="email" autoComplete="username" required />
      </label>
      <button className="button primary wide" disabled={busy}>
        {busy ? "Sending..." : "Send reset link"}
      </button>
    </form>
  );
}

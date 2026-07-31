"use client";

import { FormEvent, useState } from "react";

type LoginResponse = { error?: string };

async function readLoginResponse(response: Response): Promise<LoginResponse> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as LoginResponse;
  } catch {
    return { error: text };
  }
}

export function AdminLoginForm() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");

    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
          scope: "admin",
        }),
      });
      const body = await readLoginResponse(response);
      if (!response.ok) {
        setError(body.error ?? "Sign-in failed.");
        setBusy(false);
        return;
      }
      window.location.assign("/admin");
    } catch {
      setError("Sign-in failed. Please try again.");
      setBusy(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      {error && (
        <div className="admin-alert" role="alert">
          {error}
        </div>
      )}
      <label>
        Email address
        <input name="email" type="email" autoComplete="username" required />
      </label>
      <label>
        Password
        <input name="password" type="password" autoComplete="current-password" required />
      </label>
      <button className="button primary wide" disabled={busy}>
        {busy ? "Signing in..." : "Sign in securely ->"}
      </button>
      <a href="/forgot-password?scope=admin">Forgot password?</a>
    </form>
  );
}

"use client";

import { FormEvent, useState } from "react";

type ResetResponse = { error?: string };

async function readResetResponse(response: Response): Promise<ResetResponse> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as ResetResponse;
  } catch {
    return { error: text };
  }
}

export function ResetPasswordForm({ token }: { token: string }) {
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
      body: JSON.stringify({ token, password: form.get("password") }),
    });
    const body = await readResetResponse(response);
    if (!response.ok) {
      setError(body.error ?? "Password reset failed.");
      setBusy(false);
      return;
    }
    window.location.assign("/admin/login");
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      {error && <div className="admin-alert">{error}</div>}
      <label>
        New password
        <input name="password" type="password" minLength={12} autoComplete="new-password" required />
      </label>
      <label>
        Confirm password
        <input name="confirmPassword" type="password" minLength={12} autoComplete="new-password" required />
      </label>
      <button className="button primary wide" disabled={busy || !token}>
        {busy ? "Saving..." : "Save new password"}
      </button>
    </form>
  );
}

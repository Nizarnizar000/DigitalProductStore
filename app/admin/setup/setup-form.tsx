"use client";

import { FormEvent, useState } from "react";

type SetupResponse = { error?: string };

async function readSetupResponse(response: Response): Promise<SetupResponse> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as SetupResponse;
  } catch {
    return { error: text };
  }
}

export function SetupForm() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");

    const data = Object.fromEntries(new FormData(e.currentTarget));
    if (data.password !== data.confirmPassword) {
      setError("Passwords do not match.");
      setBusy(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = await readSetupResponse(response);
      if (!response.ok) {
        setError(body.error ?? "Setup failed.");
        setBusy(false);
        return;
      }
      window.location.assign("/admin");
    } catch {
      setError("Setup failed. Please try again.");
      setBusy(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      {error && <div className="admin-alert">{error}</div>}
      <label>
        Full name
        <input name="displayName" required minLength={2} />
      </label>
      <label>
        Email
        <input name="email" type="email" required />
      </label>
      <label>
        Password
        <input name="password" type="password" required minLength={12} />
      </label>
      <label>
        Confirm password
        <input name="confirmPassword" type="password" required minLength={12} />
      </label>
      <button className="button dark wide" disabled={busy}>
        {busy ? "Creating..." : "Create Super Admin"}
      </button>
    </form>
  );
}

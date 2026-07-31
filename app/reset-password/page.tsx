import { ResetPasswordForm } from "./reset-password-form";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;

  return (
    <main className="auth-page">
      <section>
        <a className="mark" href="/">
          <span>N</span>Nexora
        </a>
        <span className="overline">ADMIN RECOVERY</span>
        <h1>Choose a new password.</h1>
        <p>Your new password must be at least 12 characters. Existing sessions for this admin account will be revoked.</p>
        <ResetPasswordForm token={token} />
      </section>
    </main>
  );
}

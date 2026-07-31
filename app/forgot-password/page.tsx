import { ForgotPasswordForm } from "./reset-request-form";

export default function ForgotPasswordPage() {
  return (
    <main className="auth-page">
      <section>
        <a className="mark" href="/">
          <span>N</span>Nexora
        </a>
        <span className="overline">ADMIN RECOVERY</span>
        <h1>Reset your password.</h1>
        <p>Enter the email assigned to your Super Admin or Sub-Admin account. Nexora will send a reset link if the account exists.</p>
        <ForgotPasswordForm />
        <p className="auth-switch">
          <a href="/admin/login">Return to admin sign in</a>
        </p>
      </section>
    </main>
  );
}

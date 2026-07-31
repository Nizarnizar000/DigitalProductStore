import { ForgotPasswordForm } from "./reset-request-form";

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ scope?: string }> }) {
  const { scope } = await searchParams;
  const mode = scope === "admin" ? "admin" : "customer";

  return (
    <main className="auth-page">
      <section>
        <a className="mark" href="/">
          <span>N</span>Nexora
        </a>
        <span className="overline">{mode === "admin" ? "ADMIN RECOVERY" : "ACCOUNT RECOVERY"}</span>
        <h1>Réinitialiser le mot de passe.</h1>
        <p>Entrez votre email. Nexora envoie un code si le compte existe.</p>
        <ForgotPasswordForm scope={mode} />
        <p className="auth-switch">
          <a href={mode === "admin" ? "/admin/login" : "/login"}>Retour à la connexion</a>
        </p>
      </section>
    </main>
  );
}

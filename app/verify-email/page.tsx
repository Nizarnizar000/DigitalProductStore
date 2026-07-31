import { VerifyEmailForm } from "./verify-email-form";

export default async function VerifyEmailPage({ searchParams }:{ searchParams:Promise<{ email?:string }> }) {
  const { email = "" } = await searchParams;

  return (
    <main className="auth-page">
      <section>
        <a className="mark" href="/">
          <span>N</span>Nexora
        </a>
        <span className="overline">VERIFICATION EMAIL</span>
        <h1>Entrez votre code.</h1>
        <p>Le code envoyé par email expire dans 10 minutes.</p>
        <VerifyEmailForm email={email} />
      </section>
    </main>
  );
}

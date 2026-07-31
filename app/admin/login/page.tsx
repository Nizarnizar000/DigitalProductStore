import { currentUser } from "../../../lib/auth/session";
import { AdminLoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const user = await currentUser();

  return (
    <main className="admin-login">
      <section>
        <a className="mark" href="/">
          <span>N</span>Nexora
        </a>
        <div className="admin-login-copy">
          <span className="overline">SECURE ADMINISTRATION</span>
          <h1>
            Run the store.
            <br />
            <em>Protect the trust.</em>
          </h1>
          <p>Sign in with the private credentials assigned to your administrator account.</p>
          {user && ["super_admin", "sub_admin"].includes(user.role) ? (
            <a className="button primary wide" href="/admin">
              Continue to administration -&gt;
            </a>
          ) : (
            <AdminLoginForm />
          )}
          <small>Sessions use short-lived signed access tokens and revocable refresh cookies. Passwords are stored only as salted hashes.</small>
        </div>
      </section>
      <aside>
        <div>
          <span>ADMIN / IDENTITY</span>
          <b>
            One account.
            <br />
            Explicit permissions.
            <br />
            Every action recorded.
          </b>
          <p>Password hashing · JWT sessions · Role isolation · Audit trail</p>
        </div>
      </aside>
    </main>
  );
}

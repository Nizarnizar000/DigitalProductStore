import { sql } from "../../../../../db";
import { createSession,type AppUser } from "../../../../../lib/auth/session";

type TokenResponse = { id_token?:string; error?:string; error_description?:string };
type GoogleProfile = { email?:string; email_verified?:boolean; name?:string };

async function readJson<T>(response:Response):Promise<T> {
  const text = await response.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

export async function GET(request:Request) {
  try {
    const url = new URL(request.url);
    const origin = process.env.APP_URL ?? url.origin;
    const state = url.searchParams.get("state");
    const code = url.searchParams.get("code");
    const expected = request.headers.get("cookie")?.match(/(?:^|;\s*)google_oauth_state=([^;]+)/)?.[1];
    if (!code || !state || !expected || state !== expected) return Response.redirect(`${origin}/login?error=google`);

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method:"POST",
      headers:{"Content-Type":"application/x-www-form-urlencoded"},
      body:new URLSearchParams({
        client_id:process.env.GOOGLE_CLIENT_ID ?? "",
        client_secret:process.env.GOOGLE_CLIENT_SECRET ?? "",
        redirect_uri:`${origin}/api/auth/google/callback`,
        grant_type:"authorization_code",
        code,
      }),
    });
    const tokenBody = await readJson<TokenResponse>(tokenResponse);
    if (!tokenResponse.ok || !tokenBody.id_token) return Response.redirect(`${origin}/login?error=google`);

    const profileResponse = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(tokenBody.id_token)}`);
    const profile = await readJson<GoogleProfile>(profileResponse);
    if (!profileResponse.ok || !profile.email || !profile.email_verified) return Response.redirect(`${origin}/login?error=google`);

    const email = profile.email.toLowerCase();
    const rows = await sql<AppUser[]>`
      insert into users(email,display_name,role,status,email_verified)
      values(${email},${profile.name ?? email},'customer','active',true)
      on conflict(email) do update set email_verified=true,display_name=coalesce(users.display_name,excluded.display_name),updated_at=now()
      returning id,email,coalesce(display_name,email) as "displayName",role,status
    `;
    await createSession(rows[0], request);
    const response = Response.redirect(`${origin}/account`);
    response.headers.append("Set-Cookie", "google_oauth_state=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
    return response;
  } catch (error) {
    console.error("Google sign-in failed", error);
    return Response.redirect(`${new URL(request.url).origin}/login?error=google`);
  }
}

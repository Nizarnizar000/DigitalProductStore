import { randomBytes } from "node:crypto";

export async function GET(request:Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return Response.json({ error:"Google login needs GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local." }, { status:503 });

  const origin = process.env.APP_URL ?? new URL(request.url).origin;
  const state = randomBytes(24).toString("base64url");
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", `${origin}/api/auth/google/callback`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "select_account");

  const response = Response.redirect(url);
  response.headers.append("Set-Cookie", `google_oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`);
  return response;
}

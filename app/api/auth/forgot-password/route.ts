import { createHash, randomBytes } from "node:crypto";
import { sql } from "../../../../db";
import { sendPasswordResetEmail } from "../../../../lib/email";
import { z } from "zod";

const input = z.object({ email: z.string().email().transform(v => v.toLowerCase().trim()), scope: z.enum(["admin"]).default("admin") });
const ok = () => Response.json({ ok: true });

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function POST(request: Request) {
  try {
    const parsed = input.safeParse(await request.json());
    if (!parsed.success) return ok();

    const rows = await sql<{ id: string; email: string; displayName: string; role: string; status: string }[]>`
      select id,email,coalesce(display_name,email) as "displayName",role,status
      from users
      where email=${parsed.data.email} and role in ('super_admin','sub_admin') and status='active'
      limit 1
    `;
    const user = rows[0];
    if (!user) return ok();

    const token = randomBytes(48).toString("base64url");
    const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    await sql`delete from password_reset_tokens where user_id=${user.id} and used_at is null`;
    await sql`insert into password_reset_tokens(user_id,token_hash,expires_at) values(${user.id},${hashToken(token)},${expires})`;
    const baseUrl = process.env.APP_URL ?? new URL(request.url).origin;
    await sendPasswordResetEmail({ to: user.email, name: user.displayName, resetUrl: `${baseUrl}/reset-password?token=${token}` });
    return ok();
  } catch (error) {
    console.error("Password reset request failed", error);
    return ok();
  }
}

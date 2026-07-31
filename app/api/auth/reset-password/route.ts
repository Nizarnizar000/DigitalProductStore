import { createHash } from "node:crypto";
import { sql } from "../../../../db";
import { hashPassword } from "../../../../lib/auth/password";
import { z } from "zod";

const input = z.object({ token: z.string().min(32), password: z.string().min(12).max(128) });

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function POST(request: Request) {
  try {
    const parsed = input.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: "Use a valid reset link and password of at least 12 characters." }, { status: 400 });

    const tokenHash = hashToken(parsed.data.token);
    const rows = await sql<{ id: string; userId: string }[]>`
      select t.id,t.user_id as "userId"
      from password_reset_tokens t
      join users u on u.id=t.user_id
      where t.token_hash=${tokenHash}
        and t.used_at is null
        and t.expires_at>now()
        and u.role in ('super_admin','sub_admin')
        and u.status='active'
      limit 1
    `;
    const token = rows[0];
    if (!token) return Response.json({ error: "This reset link is invalid or expired." }, { status: 400 });

    const passwordHash = await hashPassword(parsed.data.password);
    await sql.begin(async tx => {
      await tx`update users set password_hash=${passwordHash},failed_login_attempts=0,locked_until=null,updated_at=now() where id=${token.userId}`;
      await tx`update password_reset_tokens set used_at=now() where id=${token.id}`;
      await tx`update sessions set revoked_at=now() where user_id=${token.userId} and revoked_at is null`;
    });
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Password reset failed", error);
    return Response.json({ error: "Password reset failed. Please try again." }, { status: 500 });
  }
}

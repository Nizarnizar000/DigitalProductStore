import { createHash } from "node:crypto";
import { sql } from "../../../../db";
import { z } from "zod";

const input = z.object({ email: z.string().email().transform(v=>v.toLowerCase().trim()), code: z.string().regex(/^\d{6}$/) });

function hashToken(token:string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function POST(request:Request) {
  try {
    const parsed = input.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: "Use the email and 6-digit verification code." }, { status: 400 });

    const rows = await sql<{ id:string; userId:string }[]>`
      select t.id,t.user_id as "userId"
      from email_verification_tokens t
      join users u on u.id=t.user_id
      where t.code_hash=${hashToken(parsed.data.code)}
        and u.email=${parsed.data.email}
        and t.used_at is null
        and t.expires_at>now()
        and u.role in ('customer','sub_admin')
        and u.status='active'
      limit 1
    `;
    const token = rows[0];
    if (!token) return Response.json({ error: "This verification link is invalid or expired." }, { status: 400 });

    await sql.begin(async tx => {
      await tx`update users set email_verified=true,updated_at=now() where id=${token.userId}`;
      await tx`update email_verification_tokens set used_at=now() where id=${token.id}`;
    });
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Email verification failed", error);
    return Response.json({ error: "Email verification failed. Please try again." }, { status: 500 });
  }
}

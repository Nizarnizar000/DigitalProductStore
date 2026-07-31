import { sql } from "../../../db";
import { z } from "zod";

const input = z.object({ email:z.string().email().transform(v=>v.toLowerCase().trim()) });

export async function POST(request:Request) {
  try {
    const parsed = input.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error:"Email invalide." }, { status:400 });
    await sql`insert into newsletter_subscribers(email,status) values(${parsed.data.email},'subscribed') on conflict(email) do update set status='subscribed',updated_at=now()`;
    return Response.json({ ok:true });
  } catch (error) {
    console.error("Newsletter subscription failed", error);
    return Response.json({ error:"Inscription impossible." }, { status:500 });
  }
}

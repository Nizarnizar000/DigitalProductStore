import { sql } from "../../../db";
import { sendContactMessageEmail } from "../../../lib/email";
import { z } from "zod";

const input = z.object({
  name:z.string().min(2).max(80),
  email:z.string().email().transform(v=>v.toLowerCase().trim()),
  subject:z.string().min(2).max(120),
  message:z.string().min(10).max(4000),
});

export async function POST(request:Request) {
  try {
    const parsed = input.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error:"Entrez un nom, un email, un sujet et un message valides." }, { status:400 });
    const { name,email,subject,message } = parsed.data;
    await sql`insert into contact_messages(name,email,subject,message) values(${name},${email},${subject},${message})`;
    await sendContactMessageEmail({ name,email,subject,message });
    return Response.json({ ok:true });
  } catch (error) {
    console.error("Contact message failed", error);
    return Response.json({ error:"Le message n'a pas pu être envoyé." }, { status:500 });
  }
}

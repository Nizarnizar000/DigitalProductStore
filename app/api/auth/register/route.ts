import { sql } from "../../../../db";
import { hashPassword } from "../../../../lib/auth/password";
import { createSession,type AppUser } from "../../../../lib/auth/session";
import { z } from "zod";

const input = z.object({email:z.string().email(),displayName:z.string().min(2).max(80),password:z.string().min(12).max(128)});

export async function POST(request:Request) {
  try {
    const parsed = input.safeParse(await request.json());
    if (!parsed.success) return Response.json({error:"Use a valid name, email, and password of at least 12 characters."},{status:400});
    const email = parsed.data.email.toLowerCase().trim();
    const existing = await sql`select id from users where email=${email}`;
    if (existing.length) return Response.json({error:"An account already exists for this email."},{status:409});
    const passwordHash = await hashPassword(parsed.data.password);
    const rows = await sql<AppUser[]>`insert into users(email,display_name,password_hash,role,status,email_verified) values(${email},${parsed.data.displayName},${passwordHash},'customer','active',true) returning id,email,display_name as "displayName",role,status`;
    await createSession(rows[0],request);
    return Response.json({user:rows[0]},{status:201});
  } catch (error) {
    console.error("Registration failed", error);
    return Response.json({error:"Registration failed. Please try again."},{status:500});
  }
}

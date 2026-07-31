import { createHash, randomBytes } from "node:crypto";
import { sql } from "../../../../db";
import { hashPassword } from "../../../../lib/auth/password";
import { sendEmailVerification } from "../../../../lib/email";
import { z } from "zod";

const input = z.object({email:z.string().email(),displayName:z.string().min(2).max(80),password:z.string().min(12).max(128)});

function hashToken(token:string) {
  return createHash("sha256").update(token).digest("hex");
}

function code() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(request:Request) {
  try {
    const parsed = input.safeParse(await request.json());
    if (!parsed.success) return Response.json({error:"Use a valid name, email, and password of at least 12 characters."},{status:400});
    const email = parsed.data.email.toLowerCase().trim();
    const existing = await sql`select id from users where email=${email}`;
    if (existing.length) return Response.json({error:"An account already exists for this email."},{status:409});
    const passwordHash = await hashPassword(parsed.data.password);
    const token = randomBytes(32).toString("base64url");
    const verificationCode = code();
    const tokenHash = hashToken(token);
    const rows = await sql<{id:string;email:string;displayName:string}[]>`insert into users(email,display_name,password_hash,role,status,email_verified) values(${email},${parsed.data.displayName},${passwordHash},'customer','active',false) returning id,email,display_name as "displayName"`;
    await sql`insert into email_verification_tokens(user_id,token_hash,code_hash,expires_at) values(${rows[0].id},${tokenHash},${hashToken(verificationCode)},${new Date(Date.now()+10*60*1000).toISOString()})`;
    await sendEmailVerification({to:rows[0].email,name:rows[0].displayName,code:verificationCode});
    return Response.json({message:"Account created. Check your email to verify your address."},{status:201});
  } catch (error) {
    console.error("Registration failed", error);
    return Response.json({error:"Registration failed. Please try again."},{status:500});
  }
}

import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";
import postgres from "postgres";

const scrypt = promisify(scryptCallback);
const email = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
const displayName = process.env.SUPER_ADMIN_NAME?.trim() || email;
const password = process.env.SUPER_ADMIN_PASSWORD;

if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  throw new Error("Set SUPER_ADMIN_EMAIL to a valid email address.");
}
if (!password || password.length < 12 || password.length > 128) {
  throw new Error("Set SUPER_ADMIN_PASSWORD to 12-128 characters.");
}

async function hashPassword(value) {
  const salt = randomBytes(16);
  const derived = await scrypt(value, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return `scrypt$32768$8$1$${salt.toString("base64url")}$${derived.toString("base64url")}`;
}

const sql = postgres(process.env.DATABASE_URL ?? "postgresql://nexora:nexora@127.0.0.1:5432/nexora", { max: 1 });
try {
  const existing = await sql`select id from users where role='super_admin' limit 1`;
  if (existing.length) {
    console.log("Super Admin already exists; no changes made.");
    process.exit(0);
  }
  const passwordHash = await hashPassword(password);
  await sql`
    insert into users(email,display_name,password_hash,role,status,email_verified)
    values(${email},${displayName},${passwordHash},'super_admin','active',true)
  `;
  console.log(`Super Admin seeded: ${email}`);
} finally {
  await sql.end();
}

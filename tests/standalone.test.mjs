import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
const root=new URL("../",import.meta.url),read=path=>readFile(new URL(path,root),"utf8");

test("uses standard Next.js without Sites or ChatGPT authentication",async()=>{
 const[pkg,admin,login]=await Promise.all([read("package.json"),read("app/admin/page.tsx"),read("app/admin/login/page.tsx")]);
 assert.match(pkg,/"dev": "next dev"/);assert.doesNotMatch(pkg,/vinext|wrangler|cloudflare/i);
 assert.match(admin,/currentUser/);assert.doesNotMatch(`${admin}${login}`,/ChatGPT|signin-with-chatgpt/);
});
test("passwords are salted and sessions are revocable",async()=>{
 const[password,session,login]=await Promise.all([read("lib/auth/password.ts"),read("lib/auth/session.ts"),read("app/api/auth/login/route.ts")]);
 assert.match(password,/randomBytes\(16\)/);assert.match(password,/scrypt/);assert.match(password,/timingSafeEqual/);
 assert.match(session,/SignJWT/);assert.match(session,/httpOnly:true/);assert.match(session,/tokenHash/);assert.match(session,/revoked_at/);
 assert.match(login,/failed_login_attempts/);assert.match(login,/15\*60\*1000/);
});
test("roles, team passwords, payments, and downloads are server protected",async()=>{
 const[guard,team,refund,download]=await Promise.all([read("db/admin-auth.ts"),read("app/api/admin/team/route.ts"),read("app/api/admin/orders/[id]/refund/route.ts"),read("app/api/downloads/[slug]/route.ts")]);
 assert.match(guard,/permanentlyRestricted/);assert.match(team,/hashPassword/);assert.match(refund,/api\.stripe\.com\/v1\/refunds/);
 assert.match(download,/currentUser/);assert.match(download,/downloadLimit/);assert.match(download,/entitlements/);
});

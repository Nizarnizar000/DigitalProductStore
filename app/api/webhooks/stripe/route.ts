import { sql } from "../../../../db";

function safeEqual(a:string,b:string) {
  if (a.length !== b.length) return false;
  let diff = 0; for (let i=0;i<a.length;i++) diff |= a.charCodeAt(i)^b.charCodeAt(i);
  return diff === 0;
}
async function hmacHex(secret:string, payload:string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), {name:"HMAC",hash:"SHA-256"}, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return [...new Uint8Array(signature)].map(x=>x.toString(16).padStart(2,"0")).join("");
}

export async function POST(request:Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return new Response("Webhook unavailable", { status: 503 });
  const raw = await request.text();
  const signature = request.headers.get("stripe-signature") ?? "";
  const fields = Object.fromEntries(signature.split(",").map(x=>x.split("=")));
  if (!fields.t || !fields.v1 || Math.abs(Date.now()/1000-Number(fields.t))>300) return new Response("Invalid signature", {status:400});
  const expected = await hmacHex(secret, `${fields.t}.${raw}`);
  if (!safeEqual(expected, fields.v1)) return new Response("Invalid signature", {status:400});
  const event = JSON.parse(raw) as { id:string; type:string; data:{object:{id:string;payment_status?:string}} };
  const inserted = await sql`insert into payment_events(provider,event_id,event_type) values('stripe',${event.id},${event.type}) on conflict(provider,event_id) do nothing returning event_id`;
  if (!inserted.length) return Response.json({ received:true, duplicate:true });
  if (event.type === "checkout.session.completed" && event.data.object.payment_status === "paid") {
    await sql`update orders set status='paid',updated_at=now() where provider_session_id=${event.data.object.id}`;
  } else if (event.type === "checkout.session.expired") {
    await sql`update orders set status='canceled',updated_at=now() where provider_session_id=${event.data.object.id} and status='pending'`;
  }
  return Response.json({ received:true });
}

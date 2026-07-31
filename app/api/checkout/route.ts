import { sql } from "../../../db";

const catalog:Record<string,{name:string;price:number}> = {
  "atlas-ui-kit": { name: "Atlas UI System", price: 7900 },
  focusflow: { name: "FocusFlow", price: 3900 },
  "launch-playbook": { name: "The Launch Playbook", price: 2900 },
  "motion-foundry": { name: "Motion Foundry", price: 5900 },
  "notion-ops": { name: "Notion Ops HQ", price: 2400 },
  "type-craft": { name: "Type Craft", price: 8900 },
};

async function readJson<T>(response: Response): Promise<T & { error?:{message?:string} }> {
  const text = await response.text();
  if (!text) return {} as T & { error?:{message?:string} };
  try { return JSON.parse(text) as T & { error?:{message?:string} }; }
  catch { return { error:{message:text} } as T & { error?:{message?:string} }; }
}

export async function POST(request:Request) {
  try {
    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret || secret === "sk_test_replace_me") return Response.json({ error: "Payments are not configured." }, { status: 503 });
    const body = await request.json() as { email?:string; items?:Array<{slug:string;quantity?:number}> };
    const email = body.email?.trim().toLowerCase();
    const items = body.items?.slice(0, 20) ?? [];
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !items.length) {
      return Response.json({ error: "A valid email and at least one item are required." }, { status: 400 });
    }
    const form = new URLSearchParams({
      mode: "payment",
      customer_email: email,
      success_url: `${new URL(request.url).origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${new URL(request.url).origin}/payment/canceled`,
      "metadata[email]": email,
    });
    let total = 0;
    items.forEach((item, index) => {
      const product = catalog[item.slug];
      if (!product) throw new Error("Unknown product");
      const quantity = Math.max(1, Math.min(5, item.quantity ?? 1));
      total += product.price * quantity;
      form.set(`line_items[${index}][price_data][currency]`, "usd");
      form.set(`line_items[${index}][price_data][product_data][name]`, product.name);
      form.set(`line_items[${index}][price_data][unit_amount]`, String(product.price));
      form.set(`line_items[${index}][quantity]`, String(quantity));
      form.set(`metadata[item_${index}]`, item.slug);
    });
    const stripe = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
    });
    const session = await readJson<{ id?:string; url?:string }>(stripe);
    if (!stripe.ok || !session.id || !session.url) {
      return Response.json({ error: session.error?.message ?? "Checkout could not be created." }, { status: 502 });
    }
    await sql`insert into orders(email,status,payment_provider,provider_session_id,subtotal_cents,tax_cents,total_cents,currency)
      values(${email},'pending','stripe',${session.id},${total},0,${total},'usd')`;
    return Response.json({ checkoutUrl: session.url });
  } catch (error) {
    return Response.json({ error:error instanceof Error?error.message:"Checkout is unavailable." }, { status: 500 });
  }
}

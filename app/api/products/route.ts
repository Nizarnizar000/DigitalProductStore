import { sql } from "../../../db";

export async function GET() {
  try {
    const products = await sql`
      select id,slug,name,description,product_type as "productType",price_cents as "priceCents",currency,status
      from products
      where status in ('published','out_of_stock')
      order by updated_at desc
    `;
    return Response.json({ products });
  } catch (error) {
    console.error("Products unavailable", error);
    return Response.json({ products: [] });
  }
}

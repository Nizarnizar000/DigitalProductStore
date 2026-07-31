import { sql } from "../../../../db";
import { currentUser } from "../../../../lib/auth/session";

export async function GET() {
  try {
    const user = await currentUser();
    if (!user) return Response.json({error:"Authentication required"},{status:401});
    const [orders,library] = await Promise.all([
      sql`select id,status,total_cents as "totalCents",currency,created_at as "createdAt" from orders where user_id=${user.id} order by created_at desc`,
      sql`select p.name,p.slug,p.version,oi.license_type as "licenseType" from entitlements e join products p on p.id=e.product_id join order_items oi on oi.id=e.order_item_id where e.user_id=${user.id} and e.revoked_at is null order by e.created_at desc`,
    ]);
    return Response.json({orders,library});
  } catch (error) {
    console.error("Account overview failed", error);
    return Response.json({error:"Account data could not be loaded."},{status:500});
  }
}

import { sql } from "../../../../../../db";
import { errorResponse, requireAdmin, writeAudit } from "../../../../../../db/admin-auth";

export async function POST(_request:Request,{params}:{params:Promise<{id:string}>}) {
  try {
    const admin = await requireAdmin("refunds");
    const { id } = await params;
    const orders = await sql<{sessionId:string;status:string}[]>`select provider_session_id as "sessionId",status from orders where id=${id} limit 1`;
    const order=orders[0];
    if (!order) return Response.json({error:"Order not found"},{status:404});
    if (order.status !== "paid") return Response.json({error:"Only paid orders can be refunded"},{status:409});
    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret) return Response.json({error:"Stripe is not configured"},{status:503});
    const sessionResponse = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(order.sessionId)}`,{headers:{Authorization:`Bearer ${secret}`}});
    const session = await sessionResponse.json() as {payment_intent?:string;error?:{message?:string}};
    if (!sessionResponse.ok || !session.payment_intent) return Response.json({error:session.error?.message ?? "Payment could not be found"},{status:502});
    const refundResponse = await fetch("https://api.stripe.com/v1/refunds",{method:"POST",headers:{Authorization:`Bearer ${secret}`,"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({payment_intent:session.payment_intent,reason:"requested_by_customer"})});
    const refund = await refundResponse.json() as {id?:string;error?:{message?:string}};
    if (!refundResponse.ok || !refund.id) return Response.json({error:refund.error?.message ?? "Refund failed"},{status:502});
    await sql.begin(async transaction=>{await transaction`update orders set status='refunded',updated_at=now() where id=${id}`;await transaction`update entitlements set revoked_at=now() where order_item_id in(select id from order_items where order_id=${id})`});
    await writeAudit(admin,"order.refund","order",id,{providerRefundId:refund.id});
    return Response.json({ok:true});
  } catch (error) { return errorResponse(error); }
}

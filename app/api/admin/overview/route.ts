import { sql } from "../../../../db";
import { errorResponse,requireAdmin } from "../../../../db/admin-auth";
export async function GET(){try{const admin=await requireAdmin();const[revenue,orders,subscribersCount,products,recentOrders,audit,subscribers,contacts]=await Promise.all([
 sql<{value:number}[]>`select coalesce(sum(total_cents),0)::int as value from orders where status='paid'`,
 sql<{value:number}[]>`select count(*)::int as value from orders`,
 sql<{value:number}[]>`select count(*)::int as value from newsletter_subscribers where status='subscribed'`,
 sql<{value:number}[]>`select count(*)::int as value from products where status in ('published','out_of_stock')`,
 sql`select id,email,status,total_cents as "totalCents",currency,created_at as "createdAt" from orders order by created_at desc limit 8`,
 sql`select action,resource_type as "resourceType",resource_id as "resourceId",created_at as "createdAt" from audit_log order by created_at desc limit 8`,
 sql`select id,email,status,created_at as "createdAt" from newsletter_subscribers order by created_at desc limit 50`,
 sql`select id,name,email,subject,message,status,created_at as "createdAt" from contact_messages order by created_at desc limit 50`
]);return Response.json({admin,metrics:{revenueCents:revenue[0]?.value??0,orders:orders[0]?.value??0,customers:subscribersCount[0]?.value??0,products:products[0]?.value??0},orders:recentOrders,audit,customers:[],subscribers,contacts})}catch(error){return errorResponse(error)}}

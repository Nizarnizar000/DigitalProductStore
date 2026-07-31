import { sql } from "../../../../db";
import { errorResponse,requireAdmin } from "../../../../db/admin-auth";
export async function GET(){try{const admin=await requireAdmin();const[revenue,orders,customers,products,recentOrders,audit]=await Promise.all([
 sql<{value:number}[]>`select coalesce(sum(total_cents),0)::int as value from orders where status='paid'`,
 sql<{value:number}[]>`select count(*)::int as value from orders`,
 sql<{value:number}[]>`select count(*)::int as value from users where role='customer' and status='active'`,
 sql<{value:number}[]>`select count(*)::int as value from products where status='published'`,
 sql`select id,email,status,total_cents as "totalCents",currency,created_at as "createdAt" from orders order by created_at desc limit 8`,
 sql`select action,resource_type as "resourceType",resource_id as "resourceId",created_at as "createdAt" from audit_log order by created_at desc limit 8`
]);return Response.json({admin,metrics:{revenueCents:revenue[0]?.value??0,orders:orders[0]?.value??0,customers:customers[0]?.value??0,products:products[0]?.value??0},orders:recentOrders,audit})}catch(error){return errorResponse(error)}}

import { boolean, integer, jsonb, pgEnum, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["customer","sub_admin","super_admin"]);
export const userStatus = pgEnum("user_status", ["active","suspended","deleted"]);
export const productStatus = pgEnum("product_status", ["draft","published","archived"]);
export const orderStatus = pgEnum("order_status", ["pending","paid","failed","canceled","refunded"]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone:true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone:true }).notNull().defaultNow(),
};

export const users=pgTable("users",{
  id:uuid("id").primaryKey().defaultRandom(),email:text("email").notNull().unique(),
  displayName:text("display_name"),passwordHash:text("password_hash"),role:userRole("role").notNull().default("customer"),
  status:userStatus("status").notNull().default("active"),emailVerified:boolean("email_verified").notNull().default(false),
  twoFactorEnabled:boolean("two_factor_enabled").notNull().default(false),failedLoginAttempts:integer("failed_login_attempts").notNull().default(0),
  lockedUntil:timestamp("locked_until",{withTimezone:true}),...timestamps,
});
export const sessions=pgTable("sessions",{
  id:uuid("id").primaryKey().defaultRandom(),userId:uuid("user_id").notNull().references(()=>users.id,{onDelete:"cascade"}),
  tokenHash:text("token_hash").notNull().unique(),userAgent:text("user_agent"),ipHash:text("ip_hash"),
  expiresAt:timestamp("expires_at",{withTimezone:true}).notNull(),revokedAt:timestamp("revoked_at",{withTimezone:true}),
  createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow(),
});
export const passwordResetTokens=pgTable("password_reset_tokens",{
  id:uuid("id").primaryKey().defaultRandom(),userId:uuid("user_id").notNull().references(()=>users.id,{onDelete:"cascade"}),
  tokenHash:text("token_hash").notNull().unique(),codeHash:text("code_hash"),expiresAt:timestamp("expires_at",{withTimezone:true}).notNull(),
  usedAt:timestamp("used_at",{withTimezone:true}),createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow(),
});
export const emailVerificationTokens=pgTable("email_verification_tokens",{
  id:uuid("id").primaryKey().defaultRandom(),userId:uuid("user_id").notNull().references(()=>users.id,{onDelete:"cascade"}),
  tokenHash:text("token_hash").notNull().unique(),codeHash:text("code_hash"),expiresAt:timestamp("expires_at",{withTimezone:true}).notNull(),
  usedAt:timestamp("used_at",{withTimezone:true}),createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow(),
});
export const products=pgTable("products",{
  id:uuid("id").primaryKey().defaultRandom(),slug:text("slug").notNull().unique(),name:text("name").notNull(),
  description:text("description").notNull(),productType:text("product_type").notNull(),status:productStatus("status").notNull().default("draft"),
  priceCents:integer("price_cents").notNull(),currency:text("currency").notNull().default("usd"),version:text("version").notNull(),
  downloadLimit:integer("download_limit").notNull().default(5),...timestamps,
});
export const productFiles=pgTable("product_files",{
  id:uuid("id").primaryKey().defaultRandom(),productId:uuid("product_id").notNull().references(()=>products.id),
  version:text("version").notNull(),objectKey:text("object_key").notNull().unique(),fileName:text("file_name").notNull(),
  contentType:text("content_type").notNull(),byteSize:integer("byte_size").notNull(),checksum:text("checksum").notNull(),
  createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow(),
});
export const orders=pgTable("orders",{
  id:uuid("id").primaryKey().defaultRandom(),userId:uuid("user_id").references(()=>users.id),email:text("email").notNull(),
  status:orderStatus("status").notNull().default("pending"),paymentProvider:text("payment_provider").notNull(),
  providerSessionId:text("provider_session_id").notNull().unique(),subtotalCents:integer("subtotal_cents").notNull(),
  taxCents:integer("tax_cents").notNull().default(0),totalCents:integer("total_cents").notNull(),currency:text("currency").notNull().default("usd"),...timestamps,
});
export const orderItems=pgTable("order_items",{
  id:uuid("id").primaryKey().defaultRandom(),orderId:uuid("order_id").notNull().references(()=>orders.id),
  productId:uuid("product_id").notNull().references(()=>products.id),licenseType:text("license_type").notNull(),
  priceCents:integer("price_cents").notNull(),productVersion:text("product_version").notNull(),
});
export const entitlements=pgTable("entitlements",{
  id:uuid("id").primaryKey().defaultRandom(),userId:uuid("user_id").notNull().references(()=>users.id),
  productId:uuid("product_id").notNull().references(()=>products.id),orderItemId:uuid("order_item_id").notNull().references(()=>orderItems.id),
  licenseKeyHash:text("license_key_hash"),downloadLimit:integer("download_limit").notNull(),revokedAt:timestamp("revoked_at",{withTimezone:true}),
  createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow(),
},t=>[uniqueIndex("entitlements_owner_product").on(t.userId,t.productId)]);
export const downloads=pgTable("downloads",{
  id:uuid("id").primaryKey().defaultRandom(),entitlementId:uuid("entitlement_id").notNull().references(()=>entitlements.id),
  productFileId:uuid("product_file_id").notNull().references(()=>productFiles.id),ipHash:text("ip_hash").notNull(),
  userAgent:text("user_agent"),createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow(),
});
export const paymentEvents=pgTable("payment_events",{
  provider:text("provider").notNull(),eventId:text("event_id").notNull(),eventType:text("event_type").notNull(),
  processedAt:timestamp("processed_at",{withTimezone:true}).notNull().defaultNow(),
},t=>[primaryKey({columns:[t.provider,t.eventId]})]);
export const permissions=pgTable("permissions",{
  userId:uuid("user_id").notNull().references(()=>users.id,{onDelete:"cascade"}),permission:text("permission").notNull(),granted:boolean("granted").notNull(),
},t=>[primaryKey({columns:[t.userId,t.permission]})]);
export const auditLog=pgTable("audit_log",{
  id:uuid("id").primaryKey().defaultRandom(),actorId:uuid("actor_id").notNull().references(()=>users.id),
  action:text("action").notNull(),resourceType:text("resource_type").notNull(),resourceId:text("resource_id").notNull(),
  metadata:jsonb("metadata").notNull().default({}),ipHash:text("ip_hash").notNull(),
  createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow(),
});
export const supportTickets=pgTable("support_tickets",{
  id:uuid("id").primaryKey().defaultRandom(),userId:uuid("user_id").notNull().references(()=>users.id),
  subject:text("subject").notNull(),status:text("status").notNull().default("open"),priority:text("priority").notNull().default("normal"),...timestamps,
});
export const contactMessages=pgTable("contact_messages",{
  id:uuid("id").primaryKey().defaultRandom(),name:text("name").notNull(),email:text("email").notNull(),
  subject:text("subject").notNull(),message:text("message").notNull(),status:text("status").notNull().default("new"),...timestamps,
});
export const newsletterSubscribers=pgTable("newsletter_subscribers",{
  id:uuid("id").primaryKey().defaultRandom(),email:text("email").notNull().unique(),status:text("status").notNull().default("subscribed"),...timestamps,
});

CREATE TYPE "user_role" AS ENUM ('customer','sub_admin','super_admin');
CREATE TYPE "user_status" AS ENUM ('active','suspended','deleted');
CREATE TYPE "product_status" AS ENUM ('draft','published','archived');
CREATE TYPE "order_status" AS ENUM ('pending','paid','failed','canceled','refunded');
CREATE TABLE "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "email" text NOT NULL UNIQUE, "display_name" text,
  "password_hash" text, "role" user_role NOT NULL DEFAULT 'customer', "status" user_status NOT NULL DEFAULT 'active',
  "email_verified" boolean NOT NULL DEFAULT false, "two_factor_enabled" boolean NOT NULL DEFAULT false,
  "failed_login_attempts" integer NOT NULL DEFAULT 0, "locked_until" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE "sessions" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),"user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,"token_hash" text NOT NULL UNIQUE,"user_agent" text,"ip_hash" text,"expires_at" timestamptz NOT NULL,"revoked_at" timestamptz,"created_at" timestamptz NOT NULL DEFAULT now());
CREATE TABLE "password_reset_tokens" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),"user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,"token_hash" text NOT NULL UNIQUE,"expires_at" timestamptz NOT NULL,"used_at" timestamptz,"created_at" timestamptz NOT NULL DEFAULT now());
CREATE TABLE "products" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),"slug" text NOT NULL UNIQUE,"name" text NOT NULL,"description" text NOT NULL,"product_type" text NOT NULL,"status" product_status NOT NULL DEFAULT 'draft',"price_cents" integer NOT NULL,"currency" text NOT NULL DEFAULT 'usd',"version" text NOT NULL,"download_limit" integer NOT NULL DEFAULT 5,"created_at" timestamptz NOT NULL DEFAULT now(),"updated_at" timestamptz NOT NULL DEFAULT now());
CREATE TABLE "product_files" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),"product_id" uuid NOT NULL REFERENCES "products"("id"),"version" text NOT NULL,"object_key" text NOT NULL UNIQUE,"file_name" text NOT NULL,"content_type" text NOT NULL,"byte_size" integer NOT NULL,"checksum" text NOT NULL,"created_at" timestamptz NOT NULL DEFAULT now());
CREATE TABLE "orders" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),"user_id" uuid REFERENCES "users"("id"),"email" text NOT NULL,"status" order_status NOT NULL DEFAULT 'pending',"payment_provider" text NOT NULL,"provider_session_id" text NOT NULL UNIQUE,"subtotal_cents" integer NOT NULL,"tax_cents" integer NOT NULL DEFAULT 0,"total_cents" integer NOT NULL,"currency" text NOT NULL DEFAULT 'usd',"created_at" timestamptz NOT NULL DEFAULT now(),"updated_at" timestamptz NOT NULL DEFAULT now());
CREATE TABLE "order_items" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),"order_id" uuid NOT NULL REFERENCES "orders"("id"),"product_id" uuid NOT NULL REFERENCES "products"("id"),"license_type" text NOT NULL,"price_cents" integer NOT NULL,"product_version" text NOT NULL);
CREATE TABLE "entitlements" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),"user_id" uuid NOT NULL REFERENCES "users"("id"),"product_id" uuid NOT NULL REFERENCES "products"("id"),"order_item_id" uuid NOT NULL REFERENCES "order_items"("id"),"license_key_hash" text,"download_limit" integer NOT NULL,"revoked_at" timestamptz,"created_at" timestamptz NOT NULL DEFAULT now());
CREATE UNIQUE INDEX "entitlements_owner_product" ON "entitlements"("user_id","product_id");
CREATE TABLE "downloads" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),"entitlement_id" uuid NOT NULL REFERENCES "entitlements"("id"),"product_file_id" uuid NOT NULL REFERENCES "product_files"("id"),"ip_hash" text NOT NULL,"user_agent" text,"created_at" timestamptz NOT NULL DEFAULT now());
CREATE TABLE "payment_events" ("provider" text NOT NULL,"event_id" text NOT NULL,"event_type" text NOT NULL,"processed_at" timestamptz NOT NULL DEFAULT now(),PRIMARY KEY("provider","event_id"));
CREATE TABLE "permissions" ("user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,"permission" text NOT NULL,"granted" boolean NOT NULL,PRIMARY KEY("user_id","permission"));
CREATE TABLE "audit_log" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),"actor_id" uuid NOT NULL REFERENCES "users"("id"),"action" text NOT NULL,"resource_type" text NOT NULL,"resource_id" text NOT NULL,"metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,"ip_hash" text NOT NULL,"created_at" timestamptz NOT NULL DEFAULT now());
CREATE TABLE "support_tickets" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),"user_id" uuid NOT NULL REFERENCES "users"("id"),"subject" text NOT NULL,"status" text NOT NULL DEFAULT 'open',"priority" text NOT NULL DEFAULT 'normal',"created_at" timestamptz NOT NULL DEFAULT now(),"updated_at" timestamptz NOT NULL DEFAULT now());
CREATE INDEX "sessions_user_idx" ON "sessions"("user_id","expires_at");
CREATE INDEX "orders_user_idx" ON "orders"("user_id","created_at");
CREATE INDEX "downloads_entitlement_idx" ON "downloads"("entitlement_id","created_at");

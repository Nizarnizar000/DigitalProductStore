import "server-only";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString && process.env.NEXT_PHASE !== "phase-production-build") {
  console.warn("DATABASE_URL is not set; database routes will be unavailable.");
}

export const sql = postgres(connectionString ?? "postgresql://nexora:nexora@127.0.0.1:5432/nexora", {
  max: process.env.NODE_ENV === "production" ? 10 : 3,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(sql, { schema });

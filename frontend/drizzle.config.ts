import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // Wir managen das Schema NICHT mit drizzle — die DDL kommt aus
  // ../schema/ddl/. Drizzle nutzen wir nur als Query-Layer.
  out: "./db/migrations",
  schema: "./db/schema.ts",
  schemaFilter: ["catalog", "core", "ops", "audit"],
});

import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";
import * as relations from "@/db/relations";

declare global {
  // eslint-disable-next-line no-var
  var __pgClient: ReturnType<typeof postgres> | undefined;
}

const client =
  globalThis.__pgClient ??
  postgres(process.env.DATABASE_URL!, {
    max: 5,
    prepare: false, // Neon-Pooler verträgt prepared statements schlechter
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__pgClient = client;
}

export const db = drizzle(client, { schema: { ...schema, ...relations } });
export { schema };

import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
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

/**
 * Führt einen Write-Aktion in einer Transaktion aus, mit gesetztem
 * audit.app.user_id für den Audit-Trail. Liest den User aus dem
 * x-app-user-Header (gesetzt durch middleware.ts).
 *
 * Nutzung in Server Actions:
 *
 *     await writeAsUser(user, async (tx) => {
 *         await tx.execute(sql`update core.customer set ... where id = ...`);
 *     });
 */
export async function writeAsUser<T>(
  user: string,
  fn: (tx: typeof db) => Promise<T>,
): Promise<T> {
  return await db.transaction(async (tx) => {
    // SET LOCAL setzt die Variable für die Dauer der Transaktion;
    // der audit-Trigger liest sie via current_setting('app.user_id', true).
    await tx.execute(sql`select set_config('app.user_id', ${user}, true)`);
    // PgTransaction trägt alle Methoden von db (execute, query etc.), aber
    // den $client-Marker nicht — daher Cast.
    return await fn(tx as unknown as typeof db);
  });
}

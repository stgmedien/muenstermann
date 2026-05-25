// Wer ist der eingeloggte User für Audit-Zwecke?
//
// Vorher: Basic Auth → x-app-user-Header. Jetzt: Cookie-Session.
// Server Actions im Backoffice lesen den User via readAdminSession() und
// reichen das Username an writeAsUser weiter.

import { readAdminSession } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

/**
 * Liefert den Username für den Audit-Actor.
 * Wenn kein Admin eingeloggt: "anonymous" (Server-Actions, die das nutzen,
 * sollten ohnehin durch Middleware geschützt sein — das hier ist nur
 * defensiv).
 */
export async function getCurrentUser(): Promise<string> {
  const session = await readAdminSession();
  if (!session) return "anonymous";

  const rows = await db.execute<{ username: string }>(sql`
    select username from core.admin_user where id = ${session.uid} limit 1
  `);
  return rows[0]?.username ?? "anonymous";
}

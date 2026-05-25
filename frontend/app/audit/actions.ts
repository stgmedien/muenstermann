"use server";

import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export type VerifyResult = {
  ok: boolean;
  total: number;
  brokenAtId: number | null;
  reason: string | null;
  verifiedAt: string;
  ms: number;
};

export async function verifyAuditChain(): Promise<VerifyResult> {
  const t0 = Date.now();
  const rows = await db.execute<{
    ok: boolean;
    total_rows: string;
    broken_at_id: string | null;
    broken_reason: string | null;
    verified_at: string;
  }>(sql`select * from audit.verify_chain()`);
  const r = rows[0];
  const result: VerifyResult = {
    ok: r.ok,
    total: Number(r.total_rows),
    brokenAtId: r.broken_at_id ? Number(r.broken_at_id) : null,
    reason: r.broken_reason ?? null,
    verifiedAt: r.verified_at,
    ms: Date.now() - t0,
  };
  revalidatePath("/audit");
  return result;
}

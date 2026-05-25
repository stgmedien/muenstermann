"use server";

import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export type TamperStep = {
  step: string;
  ok: boolean;
  totalRows: number;
  brokenAtId: number | null;
  brokenReason: string | null;
  targetId: number;
  elapsedMs: number;
};

export type TamperResult = {
  steps: TamperStep[];
  ranAt: string;
  totalMs: number;
};

export async function runTamperDemo(): Promise<TamperResult> {
  const t0 = Date.now();
  const rows = await db.execute<{
    step: string;
    ok: boolean;
    total_rows: string;
    broken_at_id: string | null;
    broken_reason: string | null;
    target_id: string;
    elapsed_ms: number;
  }>(sql`select * from audit.tamper_demo()`);
  return {
    steps: rows.map((r) => ({
      step: r.step,
      ok: r.ok,
      totalRows: Number(r.total_rows),
      brokenAtId: r.broken_at_id ? Number(r.broken_at_id) : null,
      brokenReason: r.broken_reason ?? null,
      targetId: Number(r.target_id),
      elapsedMs: r.elapsed_ms,
    })),
    ranAt: new Date().toISOString(),
    totalMs: Date.now() - t0,
  };
}

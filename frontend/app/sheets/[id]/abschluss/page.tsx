import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { FinalizeForm } from "./FinalizeForm";

export const dynamic = "force-dynamic";

async function getSheetSummary(id: number) {
  const sheetRow = await db.execute<{
    id: number;
    title: string | null;
    period_from: string;
    period_to: string;
    customer_name: string;
    status: string;
    total: string;
    done: string;
    problem: string;
    skipped: string;
    pending: string;
    accepted: string;
    disputed: string;
    undecided: string;
  }>(sql`
    select s.id, s.title, s.period_from::text, s.period_to::text,
           c.name as customer_name, s.status,
           (select count(*) from ops.inspection_task t where t.cleaning_sheet_id=s.id)::text as total,
           (select count(*) from ops.inspection_task t where t.cleaning_sheet_id=s.id and t.status='DONE')::text as done,
           (select count(*) from ops.inspection_task t where t.cleaning_sheet_id=s.id and t.status='PROBLEM')::text as problem,
           (select count(*) from ops.inspection_task t where t.cleaning_sheet_id=s.id and t.status='SKIPPED')::text as skipped,
           (select count(*) from ops.inspection_task t where t.cleaning_sheet_id=s.id and t.status='PENDING')::text as pending,
           (select count(*) from ops.inspection_task t where t.cleaning_sheet_id=s.id and t.customer_acceptance='ACCEPTED')::text as accepted,
           (select count(*) from ops.inspection_task t where t.cleaning_sheet_id=s.id and t.customer_acceptance='DISPUTED')::text as disputed,
           (select count(*) from ops.inspection_task t where t.cleaning_sheet_id=s.id and t.customer_acceptance is null)::text as undecided
    from ops.cleaning_sheet s
    join core.customer c on c.id=s.customer_id
    where s.id = ${id}
    limit 1
  `);
  return sheetRow[0] ?? null;
}

export default async function SheetCloseoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const s = await getSheetSummary(Number(id));
  if (!s) notFound();

  if (s.status === "ACCEPTED" || s.status === "DISPUTED") {
    redirect(`/sheets/${s.id}`);
  }

  const pending = Number(s.pending);
  const undecided = Number(s.undecided);
  const ready = pending === 0 && undecided === 0;

  return (
    <div className="space-y-5 max-w-3xl">
      <header>
        <Link href={`/sheets/${s.id}`} className="text-sm text-blue-600 hover:underline">
          ← Zurück zum Sheet
        </Link>
        <h1 className="text-2xl font-semibold mt-2">Sheet-Abnahme</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {s.title ?? `Sheet #${s.id}`} · {s.customer_name} · {s.period_from} bis {s.period_to}
        </p>
      </header>

      <section className="rounded-lg bg-white border border-slate-200 p-5">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Zwischenstand
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <Stat label="Vorarbeiter ✓" value={s.done} color="emerald" />
          <Stat label="Vorarbeiter ⚠" value={s.problem} color="amber" />
          <Stat label="Vorarbeiter ⊘" value={s.skipped} color="slate" />
          <Stat label="Vorarbeiter offen" value={s.pending} color={pending > 0 ? "rose" : "slate"} />
          <Stat label="Kunde ✓" value={s.accepted} color="blue" />
          <Stat label="Kunde ✗" value={s.disputed} color="rose" />
          <Stat label="Kunde unentschieden" value={s.undecided} color={undecided > 0 ? "amber" : "slate"} />
          <Stat label="Summe" value={s.total} color="slate" />
        </div>
      </section>

      {!ready ? (
        <section className="rounded-lg bg-amber-50 border border-amber-200 p-5 text-sm space-y-2">
          <h2 className="font-semibold text-amber-900">Sheet noch nicht abnahmebereit</h2>
          {pending > 0 && (
            <p>⚠ <strong>{pending}</strong> Plan-Punkte haben den Vorarbeiter-Status noch auf <em>offen</em>. Bitte zuerst alle abhaken.</p>
          )}
          {undecided > 0 && (
            <p>⚠ <strong>{undecided}</strong> Plan-Punkte hat der Kunde noch nicht ✓ oder ✗ markiert.</p>
          )}
          <p>
            <Link href={`/sheets/${s.id}`} className="text-blue-700 hover:underline">
              ← Zurück zur Matrix
            </Link>
          </p>
        </section>
      ) : (
        <FinalizeForm
          sheetId={s.id}
          disputeCount={Number(s.disputed)}
        />
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: "emerald" | "amber" | "slate" | "rose" | "blue";
}) {
  const colorMap = {
    emerald: "text-emerald-700",
    amber: "text-amber-700",
    slate: "text-slate-700",
    rose: "text-rose-700",
    blue: "text-blue-700",
  };
  return (
    <div className="rounded-md border border-slate-200 p-3 bg-slate-50">
      <div className={`text-2xl font-semibold tabular-nums ${colorMap[color]}`}>{value}</div>
      <div className="text-xs text-slate-600 mt-0.5">{label}</div>
    </div>
  );
}

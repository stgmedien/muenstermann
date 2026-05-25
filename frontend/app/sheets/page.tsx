import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import Link from "next/link";

export const dynamic = "force-dynamic";

type Row = {
  id: number;
  title: string | null;
  period_from: string;
  period_to: string;
  assignee: string | null;
  status: string;
  customer_name: string;
  customer_number: number;
  bu_code: string;
  task_count: string;
  done_count: string;
  accepted_count: string;
  disputed_count: string;
};

async function getSheets() {
  return await db.execute<Row>(sql`
    select
      s.id, s.title, s.period_from::text, s.period_to::text,
      s.assignee, s.status,
      c.name as customer_name, c.customer_number, bu.code as bu_code,
      (select count(*) from ops.inspection_task t where t.cleaning_sheet_id = s.id)::text as task_count,
      (select count(*) from ops.inspection_task t
        where t.cleaning_sheet_id = s.id and t.status = 'DONE')::text as done_count,
      (select count(*) from ops.inspection_task t
        where t.cleaning_sheet_id = s.id and t.customer_acceptance = 'ACCEPTED')::text as accepted_count,
      (select count(*) from ops.inspection_task t
        where t.cleaning_sheet_id = s.id and t.customer_acceptance = 'DISPUTED')::text as disputed_count
    from ops.cleaning_sheet s
    join core.customer c on c.id = s.customer_id
    join core.business_unit bu on bu.id = c.business_unit_id
    order by s.id desc
    limit 50
  `);
}

export default async function SheetsPage() {
  const sheets = await getSheets();

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Reinigungs-Sheets</h1>
          <p className="text-sm text-slate-500 mt-1">
            Wochen-/Mehrtagespläne mit Vorarbeiter- und Kunden-Kreuz pro Plan-Punkt × Tag.
          </p>
        </div>
        <Link
          href="/sheets/neu"
          className="px-4 py-2 text-sm rounded-md bg-slate-900 text-white hover:bg-slate-700"
        >
          + Sheet erzeugen
        </Link>
      </header>

      {sheets.length === 0 ? (
        <div className="rounded-lg bg-white border border-slate-200 p-8 text-center text-sm text-slate-500">
          Noch keine Sheets. Klick „Sheet erzeugen" — Konfig: Kunde, Zeitraum, Filter
          (z. B. „nur tägliche Punkte"), Limit. Das System erzeugt automatisch
          die Matrix aus den Hygienekontroll-Plänen.
        </div>
      ) : (
        <div className="rounded-lg bg-white border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <th className="px-4 py-2">Sheet</th>
                <th className="px-4 py-2">Kunde</th>
                <th className="px-4 py-2 w-44">Zeitraum</th>
                <th className="px-4 py-2 w-32">Vorarbeiter</th>
                <th className="px-4 py-2 w-28">Status</th>
                <th className="px-4 py-2 text-right w-44">V✓ / K✓ / Σ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sheets.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2">
                    <Link
                      href={`/sheets/${s.id}`}
                      className="font-medium text-slate-900 hover:text-blue-600"
                    >
                      {s.title ?? `Sheet #${s.id}`}
                    </Link>
                  </td>
                  <td className="px-4 py-2">{s.customer_name}</td>
                  <td className="px-4 py-2 tabular-nums text-xs font-mono text-slate-600">
                    {s.period_from} – {s.period_to}
                  </td>
                  <td className="px-4 py-2 text-slate-600">{s.assignee ?? "—"}</td>
                  <td className="px-4 py-2">
                    <SheetStatus status={s.status} />
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-xs">
                    <span className="text-emerald-700">{s.done_count}</span>
                    {" / "}
                    <span className="text-blue-700">{s.accepted_count}</span>
                    {Number(s.disputed_count) > 0 && (
                      <span className="text-rose-700"> ⚠{s.disputed_count}</span>
                    )}
                    {" / "}
                    <span className="text-slate-500">{s.task_count}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SheetStatus({ status }: { status: string }) {
  const colors: Record<string, string> = {
    ACTIVE: "bg-blue-100 text-blue-700",
    COMPLETED: "bg-amber-100 text-amber-700",
    ACCEPTED: "bg-emerald-100 text-emerald-700",
    DISPUTED: "bg-rose-100 text-rose-700",
  };
  return (
    <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${colors[status] ?? "bg-slate-100"}`}>
      {status}
    </span>
  );
}

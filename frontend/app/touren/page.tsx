import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import Link from "next/link";

export const dynamic = "force-dynamic";

type TourRow = {
  id: number;
  tour_date: string;
  assignee: string | null;
  status: string;
  customer_name: string;
  customer_number: number;
  bu_code: string;
  task_count: string;
  done_count: string;
  problem_count: string;
};

async function getTours() {
  return await db.execute<TourRow>(sql`
    select
      t.id, t.tour_date::text, t.assignee, t.status::text,
      c.name as customer_name, c.customer_number, bu.code as bu_code,
      (select count(*) from ops.inspection_task it where it.tour_id = t.id)::text as task_count,
      (select count(*) from ops.inspection_task it
         where it.tour_id = t.id and it.status = 'DONE')::text as done_count,
      (select count(*) from ops.inspection_task it
         where it.tour_id = t.id and it.status = 'PROBLEM')::text as problem_count
    from ops.tour t
    join core.customer c on c.id = t.customer_id
    join core.business_unit bu on bu.id = c.business_unit_id
    order by t.tour_date desc, t.id desc
    limit 50
  `);
}

export default async function ToursPage() {
  const tours = await getTours();
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Touren</h1>
          <p className="text-sm text-slate-500 mt-1">
            {tours.length === 0
              ? "Noch keine Touren geplant."
              : `Letzte ${tours.length} Touren`}
          </p>
        </div>
        <Link
          href="/touren/neu"
          className="px-4 py-2 text-sm rounded-md bg-slate-900 text-white hover:bg-slate-700"
        >
          + Tour generieren
        </Link>
      </header>

      {tours.length === 0 ? (
        <div className="rounded-lg bg-white border border-slate-200 p-8 text-center text-sm text-slate-500">
          Noch nichts hier. Klick „Tour generieren" und gib einen Kunden + Datum
          + Vorarbeiter ein — das System erzeugt automatisch die täglichen
          Inspection-Punkte aus dem Hygienekontroll-Plan.
        </div>
      ) : (
        <div className="rounded-lg bg-white border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <th className="px-4 py-2 w-28">Datum</th>
                <th className="px-4 py-2">Kunde</th>
                <th className="px-4 py-2">Vorarbeiter</th>
                <th className="px-4 py-2 w-32">Status</th>
                <th className="px-4 py-2 text-right w-32">Fortschritt</th>
                <th className="px-4 py-2 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tours.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 tabular-nums font-mono text-xs">
                    {t.tour_date}
                    {t.tour_date === today && (
                      <span className="ml-1 text-emerald-600">●</span>
                    )}
                  </td>
                  <td className="px-4 py-2 font-medium">{t.customer_name}</td>
                  <td className="px-4 py-2 text-slate-600">{t.assignee ?? "—"}</td>
                  <td className="px-4 py-2">
                    <StatusBadge status={t.status} />
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-sm">
                    {t.done_count}/{t.task_count}
                    {Number(t.problem_count) > 0 && (
                      <span className="ml-1 text-amber-600">⚠ {t.problem_count}</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <Link
                      href={`/touren/${t.id}`}
                      className="text-blue-600 hover:underline text-xs"
                    >
                      Details
                    </Link>
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

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    PLANNED: "bg-slate-100 text-slate-700",
    IN_PROGRESS: "bg-blue-100 text-blue-700",
    COMPLETED: "bg-amber-100 text-amber-700",
    ACCEPTED: "bg-emerald-100 text-emerald-700",
    DISPUTED: "bg-rose-100 text-rose-700",
  };
  return (
    <span
      className={`px-1.5 py-0.5 text-xs font-medium rounded ${colors[status] ?? "bg-slate-100"}`}
    >
      {status}
    </span>
  );
}

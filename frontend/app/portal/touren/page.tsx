import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import Link from "next/link";
import { requirePortalUser } from "@/lib/portal-session";
import { PortalShell } from "../PortalShell";

export const dynamic = "force-dynamic";

async function getTours(customerId: number) {
  return await db.execute<{
    id: number;
    tour_date: string;
    status: string;
    assignee: string | null;
    total: string;
    done: string;
    problem: string;
    skipped: string;
  }>(sql`
    select t.id, t.tour_date::text, t.status::text, t.assignee,
           (select count(*) from ops.inspection_task it where it.tour_id = t.id)::text as total,
           (select count(*) from ops.inspection_task it where it.tour_id = t.id and it.status = 'DONE')::text as done,
           (select count(*) from ops.inspection_task it where it.tour_id = t.id and it.status = 'PROBLEM')::text as problem,
           (select count(*) from ops.inspection_task it where it.tour_id = t.id and it.status = 'SKIPPED')::text as skipped
      from ops.tour t
     where t.customer_id = ${customerId}
     order by t.tour_date desc, t.id desc
  `);
}

export default async function PortalTourenList() {
  const user = await requirePortalUser();
  const tours = await getTours(user.customerId);

  return (
    <PortalShell user={user} pathname="/portal/touren">
      <div className="space-y-4">
        <header>
          <h1 className="text-2xl font-semibold">Inspektions-Touren</h1>
          <p className="text-sm text-slate-500 mt-1">
            Alle dokumentierten Reinigungs-Inspektionen Ihres Standortes.
          </p>
        </header>

        {tours.length === 0 ? (
          <div className="rounded-lg bg-white border border-slate-200 p-8 text-center text-sm text-slate-500">
            Noch keine Touren dokumentiert.
          </div>
        ) : (
          <div className="rounded-lg bg-white border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left">Datum</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Vorarbeiter</th>
                  <th className="px-3 py-2 text-right">Punkte</th>
                  <th className="px-3 py-2 text-right">Erledigt</th>
                  <th className="px-3 py-2 text-right">Probleme</th>
                  <th className="px-3 py-2 text-right">Übersprungen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tours.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2">
                      <Link
                        href={`/portal/touren/${t.id}`}
                        className="text-blue-700 hover:underline font-medium"
                      >
                        {new Date(t.tour_date).toLocaleDateString("de-DE")}
                      </Link>
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge status={t.status} />
                    </td>
                    <td className="px-3 py-2 text-slate-600">{t.assignee ?? "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{t.total}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-emerald-700">
                      {t.done}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {Number(t.problem) > 0 ? (
                        <span className="text-amber-700 font-medium">{t.problem}</span>
                      ) : (
                        <span className="text-slate-300">0</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-500">
                      {t.skipped}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PortalShell>
  );
}

function StatusBadge({ status }: { status: string }) {
  const m: Record<string, { label: string; color: string }> = {
    PENDING: { label: "Geplant", color: "bg-slate-100 text-slate-700" },
    IN_PROGRESS: { label: "Läuft", color: "bg-blue-100 text-blue-800" },
    COMPLETED: { label: "Wartet auf Abnahme", color: "bg-amber-100 text-amber-800" },
    ACCEPTED: { label: "Abgenommen", color: "bg-emerald-100 text-emerald-800" },
    DISPUTED: { label: "Beanstandet", color: "bg-rose-100 text-rose-800" },
  };
  const v = m[status] ?? { label: status, color: "bg-slate-100" };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${v.color}`}>
      {v.label}
    </span>
  );
}

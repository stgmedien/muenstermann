import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import Link from "next/link";
import { requirePortalUser } from "@/lib/portal-session";
import { PortalShell } from "../PortalShell";

export const dynamic = "force-dynamic";

async function getSheets(customerId: number) {
  return await db.execute<{
    id: number;
    title: string;
    period_from: string | null;
    period_to: string | null;
    status: string;
    cells_total: string;
    cells_done: string;
  }>(sql`
    select s.id, s.title, s.period_from::text, s.period_to::text,
           s.status::text,
           (select count(*) from ops.inspection_task it where it.cleaning_sheet_id = s.id)::text as cells_total,
           (select count(*) from ops.inspection_task it
             where it.cleaning_sheet_id = s.id and it.status::text in ('DONE','SKIPPED','PROBLEM'))::text as cells_done
      from ops.cleaning_sheet s
     where s.customer_id = ${customerId}
     order by s.period_from desc nulls last, s.id desc
  `);
}

export default async function PortalSheetsList() {
  const user = await requirePortalUser();
  const sheets = await getSheets(user.customerId);

  return (
    <PortalShell user={user} pathname="/portal/sheets">
      <div className="space-y-4">
        <header>
          <h1 className="text-2xl font-semibold">Reinigungs-Sheets</h1>
          <p className="text-sm text-slate-500 mt-1">
            Wiederkehrende Reinigungsmatrizen — Vorarbeiter haken ab, Sie sehen
            den aktuellen Stand und nehmen am Ende ab.
          </p>
        </header>

        {sheets.length === 0 ? (
          <div className="rounded-lg bg-white border border-slate-200 p-8 text-center text-sm text-slate-500">
            Keine Sheets vorhanden.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {sheets.map((s) => {
              const done = Number(s.cells_done);
              const total = Number(s.cells_total);
              const pct = total > 0 ? Math.round((done / total) * 100) : 0;
              return (
                <Link
                  key={s.id}
                  href={`/portal/sheets/${s.id}`}
                  className="rounded-lg bg-white border border-slate-200 p-4 hover:border-slate-400"
                >
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <div className="font-medium">{s.title}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {s.period_from &&
                          new Date(s.period_from).toLocaleDateString("de-DE")}
                        {" – "}
                        {s.period_to &&
                          new Date(s.period_to).toLocaleDateString("de-DE")}
                      </div>
                    </div>
                    <StatusBadge status={s.status} />
                  </div>
                  <div className="mt-3 text-xs text-slate-500">
                    {done} / {total} Zellen ({pct} %)
                  </div>
                  <div className="mt-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </PortalShell>
  );
}

function StatusBadge({ status }: { status: string }) {
  const m: Record<string, { label: string; color: string }> = {
    DRAFT: { label: "Entwurf", color: "bg-slate-100 text-slate-700" },
    ACTIVE: { label: "Aktiv", color: "bg-blue-100 text-blue-800" },
    COMPLETED: { label: "Abgeschlossen", color: "bg-amber-100 text-amber-800" },
    ACCEPTED: { label: "Abgenommen", color: "bg-emerald-100 text-emerald-800" },
  };
  const v = m[status] ?? { label: status, color: "bg-slate-100" };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${v.color}`}>
      {v.label}
    </span>
  );
}

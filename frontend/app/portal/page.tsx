import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import Link from "next/link";
import { requirePortalUser } from "@/lib/portal-session";
import { PortalShell } from "./PortalShell";

export const dynamic = "force-dynamic";

type TourRow = {
  id: number;
  tour_date: string;
  status: string;
  task_total: string;
  task_done: string;
  task_problem: string;
};

type SheetRow = {
  id: number;
  title: string;
  status: string;
  cells_total: string;
  cells_done: string;
};

async function getRecentTours(customerId: number) {
  return await db.execute<TourRow>(sql`
    select t.id, t.tour_date::text, t.status::text,
           (select count(*) from ops.inspection_task it where it.tour_id = t.id)::text as task_total,
           (select count(*) from ops.inspection_task it where it.tour_id = t.id and it.status = 'DONE')::text as task_done,
           (select count(*) from ops.inspection_task it where it.tour_id = t.id and it.status = 'PROBLEM')::text as task_problem
      from ops.tour t
     where t.customer_id = ${customerId}
     order by t.tour_date desc, t.id desc
     limit 8
  `);
}

async function getActiveSheets(customerId: number) {
  return await db.execute<SheetRow>(sql`
    select s.id, s.title, s.status::text,
           (select count(*) from ops.inspection_task it where it.cleaning_sheet_id = s.id)::text as cells_total,
           (select count(*) from ops.inspection_task it
             where it.cleaning_sheet_id = s.id and it.status::text in ('DONE','SKIPPED','PROBLEM'))::text as cells_done
      from ops.cleaning_sheet s
     where s.customer_id = ${customerId}
     order by s.period_from desc nulls last, s.id desc
     limit 6
  `);
}

async function getStats(customerId: number) {
  const rows = await db.execute<{
    open_complaints: string;
    last_inspection: string | null;
    pending_acceptance: string;
  }>(sql`
    select
      (select count(*) from ops.complaint comp
        join ops.inspection_task it on it.id = comp.inspection_task_id
        join ops.tour t on t.id = it.tour_id
        where t.customer_id = ${customerId} and comp.status::text = 'OPEN'
      )::text as open_complaints,
      (select max(t.tour_date)::text from ops.tour t
        where t.customer_id = ${customerId} and t.status::text in ('COMPLETED','ACCEPTED','DISPUTED')
      ) as last_inspection,
      (select count(*) from ops.tour t
        where t.customer_id = ${customerId} and t.status::text = 'COMPLETED'
      )::text as pending_acceptance
  `);
  return rows[0];
}

export default async function PortalDashboard() {
  const user = await requirePortalUser();
  const [tours, sheets, stats] = await Promise.all([
    getRecentTours(user.customerId),
    getActiveSheets(user.customerId),
    getStats(user.customerId),
  ]);

  return (
    <PortalShell user={user} pathname="/portal">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Willkommen, {user.displayName}</h1>
          <p className="text-sm text-slate-500 mt-1">
            Aktueller Stand Ihrer Reinigungsdokumentation.
          </p>
        </div>

        <section className="grid md:grid-cols-3 gap-3">
          <StatCard
            label="Letzte Inspektion"
            value={
              stats.last_inspection
                ? new Date(stats.last_inspection).toLocaleDateString("de-DE")
                : "—"
            }
          />
          <StatCard
            label="Wartet auf Abnahme"
            value={Number(stats.pending_acceptance).toLocaleString("de-DE")}
            tone={Number(stats.pending_acceptance) > 0 ? "warning" : "neutral"}
            href={
              Number(stats.pending_acceptance) > 0 ? "/portal/touren" : undefined
            }
          />
          <StatCard
            label="Offene Beanstandungen"
            value={Number(stats.open_complaints).toLocaleString("de-DE")}
            tone={Number(stats.open_complaints) > 0 ? "danger" : "ok"}
          />
        </section>

        <section>
          <div className="flex justify-between items-baseline mb-2">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
              Letzte Inspektions-Touren
            </h2>
            <Link
              href="/portal/touren"
              className="text-sm text-blue-600 hover:underline"
            >
              alle ansehen →
            </Link>
          </div>
          {tours.length === 0 ? (
            <EmptyState>Noch keine Touren dokumentiert.</EmptyState>
          ) : (
            <div className="rounded-lg bg-white border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2 text-left">Datum</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-right">Punkte</th>
                    <th className="px-3 py-2 text-right">Erledigt</th>
                    <th className="px-3 py-2 text-right">Probleme</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tours.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2">
                        <Link
                          href={`/portal/touren/${t.id}`}
                          className="text-blue-700 hover:underline"
                        >
                          {new Date(t.tour_date).toLocaleDateString("de-DE")}
                        </Link>
                      </td>
                      <td className="px-3 py-2">
                        <TourStatusBadge status={t.status} />
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{t.task_total}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{t.task_done}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {Number(t.task_problem) > 0 ? (
                          <span className="text-amber-700 font-medium">
                            {t.task_problem}
                          </span>
                        ) : (
                          <span className="text-slate-300">0</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section>
          <div className="flex justify-between items-baseline mb-2">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
              Aktive Reinigungs-Sheets
            </h2>
            <Link
              href="/portal/sheets"
              className="text-sm text-blue-600 hover:underline"
            >
              alle ansehen →
            </Link>
          </div>
          {sheets.length === 0 ? (
            <EmptyState>Keine Sheets vorhanden.</EmptyState>
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
                    <div className="flex justify-between items-start">
                      <div className="font-medium">{s.title}</div>
                      <SheetStatusBadge status={s.status} />
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
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
        </section>
      </div>
    </PortalShell>
  );
}

function StatCard({
  label,
  value,
  tone = "neutral",
  href,
}: {
  label: string;
  value: string;
  tone?: "neutral" | "ok" | "warning" | "danger";
  href?: string;
}) {
  const color =
    tone === "danger"
      ? "text-rose-700"
      : tone === "warning"
        ? "text-amber-700"
        : tone === "ok"
          ? "text-emerald-700"
          : "text-slate-900";
  const body = (
    <div className="rounded-lg bg-white border border-slate-200 p-4">
      <div className="text-xs text-slate-500 uppercase tracking-wide">{label}</div>
      <div className={`text-2xl font-semibold mt-1 tabular-nums ${color}`}>
        {value}
      </div>
    </div>
  );
  if (href) {
    return (
      <Link href={href} className="block hover:opacity-90">
        {body}
      </Link>
    );
  }
  return body;
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-white border border-slate-200 p-8 text-center text-sm text-slate-500">
      {children}
    </div>
  );
}

function TourStatusBadge({ status }: { status: string }) {
  const m: Record<string, { label: string; color: string }> = {
    PENDING: { label: "Geplant", color: "bg-slate-100 text-slate-700" },
    IN_PROGRESS: { label: "Läuft", color: "bg-blue-100 text-blue-800" },
    COMPLETED: { label: "Wartet auf Abnahme", color: "bg-amber-100 text-amber-800" },
    ACCEPTED: { label: "Abgenommen", color: "bg-emerald-100 text-emerald-800" },
    DISPUTED: { label: "Beanstandet", color: "bg-rose-100 text-rose-800" },
  };
  const v = m[status] ?? { label: status, color: "bg-slate-100" };
  return (
    <span
      className={`px-2 py-0.5 rounded text-xs font-medium ${v.color}`}
    >
      {v.label}
    </span>
  );
}

function SheetStatusBadge({ status }: { status: string }) {
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

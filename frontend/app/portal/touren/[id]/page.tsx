import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePortalUser } from "@/lib/portal-session";
import { PortalShell } from "../../PortalShell";

export const dynamic = "force-dynamic";

type TourRow = {
  id: number;
  tour_date: string;
  status: string;
  assignee: string | null;
  started_at: string | null;
  completed_at: string | null;
};

type TaskRow = {
  id: number;
  department_name_snapshot: string | null;
  object_name_snapshot: string | null;
  interval_label_snapshot: string | null;
  status: string;
  comment: string | null;
  completed_at: string | null;
  completed_by: string | null;
  photo_count: string;
};

type ComplaintRow = {
  id: number;
  description: string;
  status: string;
  created_at: string;
};

async function getTour(id: number, customerId: number) {
  const rows = await db.execute<TourRow>(sql`
    select id, tour_date::text, status::text, assignee,
           started_at::text, completed_at::text
      from ops.tour
     where id = ${id} and customer_id = ${customerId}
     limit 1
  `);
  return rows[0] ?? null;
}

async function getTasks(tourId: number) {
  return await db.execute<TaskRow>(sql`
    select it.id, it.department_name_snapshot, it.object_name_snapshot,
           it.interval_label_snapshot, it.status::text, it.comment,
           it.completed_at::text, it.completed_by,
           (select count(*) from ops.inspection_photo p where p.inspection_task_id = it.id)::text as photo_count
      from ops.inspection_task it
     where it.tour_id = ${tourId}
     order by it.department_name_snapshot nulls last, it.object_name_snapshot nulls last, it.id
  `);
}

async function getComplaints(tourId: number) {
  return await db.execute<ComplaintRow>(sql`
    select c.id, c.description, c.status::text, c.created_at::text
      from ops.complaint c
      join ops.inspection_task it on it.id = c.inspection_task_id
     where it.tour_id = ${tourId}
     order by c.created_at desc
  `);
}

export default async function PortalTourDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePortalUser();
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isFinite(id)) notFound();

  const tour = await getTour(id, user.customerId);
  if (!tour) notFound();

  const [tasks, complaints] = await Promise.all([
    getTasks(tour.id),
    getComplaints(tour.id),
  ]);

  const counts = {
    total: tasks.length,
    done: tasks.filter((t) => t.status === "DONE").length,
    problem: tasks.filter((t) => t.status === "PROBLEM").length,
    skipped: tasks.filter((t) => t.status === "SKIPPED").length,
    pending: tasks.filter((t) => t.status === "PENDING").length,
  };

  // Gruppiert nach Abteilung
  const grouped = new Map<string, TaskRow[]>();
  for (const t of tasks) {
    const k = t.department_name_snapshot ?? "(ohne Abteilung)";
    if (!grouped.has(k)) grouped.set(k, []);
    grouped.get(k)!.push(t);
  }

  return (
    <PortalShell user={user} pathname="/portal/touren">
      <div className="space-y-5">
        <div>
          <Link
            href="/portal/touren"
            className="text-sm text-blue-600 hover:underline"
          >
            ← alle Touren
          </Link>
          <h1 className="text-2xl font-semibold mt-2">
            Tour vom {new Date(tour.tour_date).toLocaleDateString("de-DE")}
          </h1>
          <div className="text-sm text-slate-500 mt-1">
            Vorarbeiter: {tour.assignee ?? "—"} ·
            {tour.completed_at
              ? ` abgeschlossen ${new Date(tour.completed_at).toLocaleString("de-DE")}`
              : tour.started_at
                ? ` begonnen ${new Date(tour.started_at).toLocaleString("de-DE")}`
                : " noch nicht begonnen"}
          </div>
        </div>

        <section className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <SummaryCard label="Gesamt" value={counts.total} />
          <SummaryCard label="Erledigt" value={counts.done} tone="ok" />
          <SummaryCard label="Probleme" value={counts.problem} tone="warning" />
          <SummaryCard label="Übersprungen" value={counts.skipped} tone="neutral" />
          <SummaryCard label="Offen" value={counts.pending} tone="neutral" />
        </section>

        {complaints.length > 0 && (
          <section className="rounded-lg bg-rose-50 border border-rose-200 p-4">
            <h2 className="text-sm font-semibold text-rose-900 mb-2">
              Beanstandungen ({complaints.length})
            </h2>
            <ul className="space-y-2">
              {complaints.map((c) => (
                <li key={c.id} className="text-sm text-rose-900">
                  <div className="font-medium">
                    {new Date(c.created_at).toLocaleString("de-DE")} ·{" "}
                    <span className="text-xs uppercase">{c.status}</span>
                  </div>
                  <div>{c.description}</div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {[...grouped.entries()].map(([deptName, items]) => (
          <section key={deptName}>
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">
              {deptName} ({items.length})
            </h2>
            <div className="rounded-lg bg-white border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2 text-left w-10">St.</th>
                    <th className="px-3 py-2 text-left">Bereich/Gerät</th>
                    <th className="px-3 py-2 text-left">Intervall</th>
                    <th className="px-3 py-2 text-left">Kommentar</th>
                    <th className="px-3 py-2 text-right w-20">Fotos</th>
                    <th className="px-3 py-2 text-left w-40">Erledigt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((t) => (
                    <tr key={t.id}>
                      <td className="px-3 py-2">
                        <TaskStatusPill status={t.status} />
                      </td>
                      <td className="px-3 py-2 font-medium">
                        {t.object_name_snapshot ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-slate-500 text-xs">
                        {t.interval_label_snapshot ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-slate-700 text-xs">
                        {t.comment ?? ""}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {Number(t.photo_count) > 0 ? (
                          <span className="text-slate-700">
                            📷 {t.photo_count}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-500">
                        {t.completed_at ? (
                          <>
                            {new Date(t.completed_at).toLocaleString("de-DE")}
                            <div className="text-slate-400">
                              {t.completed_by}
                            </div>
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
    </PortalShell>
  );
}

function SummaryCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "ok" | "warning";
}) {
  const color =
    tone === "warning"
      ? "text-amber-700"
      : tone === "ok"
        ? "text-emerald-700"
        : "text-slate-900";
  return (
    <div className="rounded-md bg-white border border-slate-200 px-3 py-2">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`text-lg font-semibold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}

function TaskStatusPill({ status }: { status: string }) {
  const m: Record<string, { label: string; color: string }> = {
    DONE: { label: "✓", color: "bg-emerald-100 text-emerald-800" },
    PROBLEM: { label: "⚠", color: "bg-amber-100 text-amber-800" },
    SKIPPED: { label: "⊘", color: "bg-slate-100 text-slate-600" },
    PENDING: { label: "·", color: "bg-slate-50 text-slate-400" },
  };
  const v = m[status] ?? { label: status, color: "bg-slate-100" };
  return (
    <span
      className={`w-6 h-6 inline-flex items-center justify-center rounded font-bold ${v.color}`}
    >
      {v.label}
    </span>
  );
}

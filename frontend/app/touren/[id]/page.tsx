import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

async function getTour(id: number) {
  const rows = await db.execute<{
    id: number;
    tour_date: string;
    assignee: string | null;
    status: string;
    started_at: string | null;
    completed_at: string | null;
    accepted_at: string | null;
    accepted_by_name: string | null;
    accepted_by_role: string | null;
    customer_id: number;
    customer_name: string;
    customer_number: number;
    bu_code: string;
  }>(sql`
    select t.id, t.tour_date::text, t.assignee, t.status::text,
           t.started_at::text, t.completed_at::text, t.accepted_at::text,
           t.accepted_by_name, t.accepted_by_role,
           c.id as customer_id, c.name as customer_name, c.customer_number,
           bu.code as bu_code
    from ops.tour t
    join core.customer c on c.id = t.customer_id
    join core.business_unit bu on bu.id = c.business_unit_id
    where t.id = ${id}
    limit 1
  `);
  return rows[0] ?? null;
}

async function getTasks(tourId: number) {
  return await db.execute<{
    id: number;
    department_name_snapshot: string | null;
    object_name_snapshot: string | null;
    interval_label_snapshot: string | null;
    responsible_party_snapshot: string | null;
    status: string;
    completed_at: string | null;
    completed_by: string | null;
    comment: string | null;
    customer_acceptance: string | null;
    customer_dispute_reason: string | null;
  }>(sql`
    select id, department_name_snapshot, object_name_snapshot,
           interval_label_snapshot, responsible_party_snapshot,
           status::text, completed_at::text, completed_by, comment,
           customer_acceptance::text, customer_dispute_reason
    from ops.inspection_task
    where tour_id = ${tourId}
    order by department_name_snapshot nulls last, object_name_snapshot nulls last, id
  `);
}

async function getComplaints(tourId: number) {
  return await db.execute<{
    id: number;
    description: string;
    status: string;
    created_at: string;
  }>(sql`
    select c.id, c.description, c.status::text, c.created_at::text
    from ops.complaint c
    join ops.inspection_task it on it.id = c.inspection_task_id
    where it.tour_id = ${tourId}
    order by c.id
  `);
}

export default async function TourDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tour = await getTour(Number(id));
  if (!tour) notFound();

  const [tasks, complaints] = await Promise.all([
    getTasks(tour.id),
    getComplaints(tour.id),
  ]);

  const done = tasks.filter((t) => t.status === "DONE").length;
  const problem = tasks.filter((t) => t.status === "PROBLEM").length;
  const skipped = tasks.filter((t) => t.status === "SKIPPED").length;
  const pending = tasks.filter((t) => t.status === "PENDING").length;

  return (
    <div className="space-y-6">
      <header>
        <Link href="/touren" className="text-sm text-blue-600 hover:underline">
          ← Touren
        </Link>
        <div className="flex items-baseline justify-between mt-2">
          <div>
            <h1 className="text-2xl font-semibold">
              Tour #{tour.id} · {tour.customer_name}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {tour.tour_date} · Vorarbeiter: {tour.assignee ?? "—"} ·{" "}
              <StatusBadge status={tour.status} />
            </p>
          </div>
          <Link
            href={`/m/${tour.id}`}
            className="px-3 py-1.5 text-sm rounded-md bg-emerald-600 text-white hover:bg-emerald-700"
          >
            📱 Mobile-Ansicht
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card label="Gesamt" value={tasks.length} />
        <Card label="Offen" value={pending} color="slate" />
        <Card label="Erledigt" value={done} color="emerald" />
        <Card label="Problem" value={problem} color="amber" />
        <Card label="Übersprungen" value={skipped} color="rose" />
      </section>

      {complaints.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Beanstandungen ({complaints.length})
          </h2>
          <div className="rounded-lg bg-rose-50 border border-rose-200 divide-y divide-rose-100">
            {complaints.map((c) => (
              <div key={c.id} className="px-4 py-3 text-sm">
                <div className="flex items-baseline justify-between">
                  <div className="font-medium">#{c.id}</div>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-rose-200 text-rose-800">
                    {c.status}
                  </span>
                </div>
                <div className="mt-1 text-slate-700">{c.description}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Inspection-Punkte ({tasks.length})
        </h2>
        <div className="rounded-lg bg-white border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <th className="px-3 py-2">Abteilung</th>
                <th className="px-3 py-2">Objekt</th>
                <th className="px-3 py-2 w-24">Intervall</th>
                <th className="px-3 py-2 w-32">Status</th>
                <th className="px-3 py-2 w-32">Abnahme</th>
                <th className="px-3 py-2">Kommentar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tasks.map((t) => (
                <tr key={t.id}>
                  <td className="px-3 py-1.5">{t.department_name_snapshot ?? "—"}</td>
                  <td className="px-3 py-1.5">{t.object_name_snapshot ?? "—"}</td>
                  <td className="px-3 py-1.5 text-xs text-slate-500">
                    {t.interval_label_snapshot ?? "—"}
                  </td>
                  <td className="px-3 py-1.5">
                    <TaskStatus status={t.status} />
                  </td>
                  <td className="px-3 py-1.5">
                    {t.customer_acceptance ? (
                      <AcceptanceBadge value={t.customer_acceptance} />
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-1.5 text-xs text-slate-600">
                    {t.comment ?? ""}
                    {t.customer_dispute_reason && (
                      <div className="text-rose-700 mt-0.5">
                        Beanstandung: {t.customer_dispute_reason}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Card({
  label,
  value,
  color = "slate",
}: {
  label: string;
  value: number;
  color?: "slate" | "emerald" | "amber" | "rose";
}) {
  const colors = {
    slate: "bg-white border-slate-200",
    emerald: "bg-emerald-50 border-emerald-200",
    amber: "bg-amber-50 border-amber-200",
    rose: "bg-rose-50 border-rose-200",
  };
  return (
    <div className={`rounded-lg border px-4 py-3 ${colors[color]}`}>
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-xs text-slate-600 mt-0.5">{label}</div>
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

function TaskStatus({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    PENDING: { label: "offen", color: "bg-slate-100 text-slate-700" },
    DONE: { label: "✓ erledigt", color: "bg-emerald-100 text-emerald-700" },
    SKIPPED: { label: "⊘ skip", color: "bg-slate-200 text-slate-700" },
    PROBLEM: { label: "⚠ Problem", color: "bg-amber-100 text-amber-700" },
  };
  const m = map[status] ?? { label: status, color: "bg-slate-100" };
  return <span className={`px-1.5 py-0.5 text-xs rounded ${m.color}`}>{m.label}</span>;
}

function AcceptanceBadge({ value }: { value: string }) {
  if (value === "ACCEPTED")
    return (
      <span className="px-1.5 py-0.5 text-xs rounded bg-emerald-100 text-emerald-700">
        ✓ abgenommen
      </span>
    );
  if (value === "DISPUTED")
    return (
      <span className="px-1.5 py-0.5 text-xs rounded bg-rose-100 text-rose-700">
        ✗ beanstandet
      </span>
    );
  return <span className="text-xs text-slate-400">{value}</span>;
}

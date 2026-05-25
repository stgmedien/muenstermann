import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { sql } from "drizzle-orm";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function getMyTours(assignee: string) {
  return await db.execute<{
    id: number;
    tour_date: string;
    status: string;
    customer_name: string;
    customer_city: string | null;
    task_count: string;
    done_count: string;
  }>(sql`
    select t.id, t.tour_date::text, t.status::text,
           c.name as customer_name, c.city as customer_city,
           (select count(*) from ops.inspection_task it where it.tour_id = t.id)::text as task_count,
           (select count(*) from ops.inspection_task it
              where it.tour_id = t.id and it.status in ('DONE', 'SKIPPED', 'PROBLEM'))::text as done_count
    from ops.tour t
    join core.customer c on c.id = t.customer_id
    where t.assignee = ${assignee}
      and t.tour_date >= current_date - interval '7 days'
    order by t.tour_date desc, t.id desc
  `);
}

export default async function MyToursPage() {
  const user = await getCurrentUser();
  const tours = await getMyTours(user);
  const today = new Date().toISOString().slice(0, 10);
  const todayTours = tours.filter((t) => t.tour_date === today);
  const upcoming = tours.filter((t) => t.tour_date > today);
  const past = tours.filter((t) => t.tour_date < today);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold">Meine Touren</h1>
        <p className="text-sm text-slate-500 mt-0.5">{user}</p>
      </header>

      {todayTours.length > 0 && <TourSection title="Heute" tours={todayTours} highlight />}
      {upcoming.length > 0 && <TourSection title="Kommende" tours={upcoming} />}
      {past.length > 0 && <TourSection title="Letzte Tage" tours={past} muted />}

      {tours.length === 0 && (
        <div className="rounded-lg bg-white border border-slate-200 p-8 text-center text-sm text-slate-500">
          Keine Touren für dich. Frag den Disponenten.
        </div>
      )}
    </div>
  );
}

function TourSection({
  title,
  tours,
  highlight,
  muted,
}: {
  title: string;
  tours: Array<{
    id: number;
    tour_date: string;
    status: string;
    customer_name: string;
    customer_city: string | null;
    task_count: string;
    done_count: string;
  }>;
  highlight?: boolean;
  muted?: boolean;
}) {
  return (
    <section>
      <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
        {title}
      </h2>
      <div className="space-y-2">
        {tours.map((t) => {
          const pct =
            Number(t.task_count) > 0
              ? Math.round((Number(t.done_count) / Number(t.task_count)) * 100)
              : 0;
          return (
            <Link
              key={t.id}
              href={`/m/${t.id}`}
              className={`block rounded-lg border p-4 ${
                highlight
                  ? "bg-emerald-50 border-emerald-300"
                  : muted
                    ? "bg-slate-50 border-slate-200 opacity-75"
                    : "bg-white border-slate-200"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium text-slate-900">{t.customer_name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {t.tour_date}
                    {t.customer_city && ` · ${t.customer_city}`}
                  </div>
                </div>
                <div className="text-right">
                  <TourStatus status={t.status} />
                  <div className="text-xs text-slate-500 mt-1 tabular-nums">
                    {t.done_count}/{t.task_count} ({pct}%)
                  </div>
                </div>
              </div>
              <div className="mt-3 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function TourStatus({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    PLANNED: { label: "geplant", color: "bg-slate-200 text-slate-700" },
    IN_PROGRESS: { label: "läuft", color: "bg-blue-100 text-blue-700" },
    COMPLETED: { label: "Abnahme", color: "bg-amber-100 text-amber-700" },
    ACCEPTED: { label: "✓ abgenommen", color: "bg-emerald-100 text-emerald-700" },
    DISPUTED: { label: "✗ beanstandet", color: "bg-rose-100 text-rose-700" },
  };
  const m = map[status] ?? { label: status, color: "bg-slate-100" };
  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded ${m.color}`}>{m.label}</span>
  );
}

import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { InspectionItem } from "./InspectionItem";
import { completeTour } from "@/app/touren/actions";

export const dynamic = "force-dynamic";

async function getTour(id: number) {
  const rows = await db.execute<{
    id: number;
    tour_date: string;
    status: string;
    customer_name: string;
    customer_street: string | null;
    customer_postal_code: string | null;
    customer_city: string | null;
    customer_phone: string | null;
    assignee: string | null;
  }>(sql`
    select t.id, t.tour_date::text, t.status::text,
           c.name as customer_name, c.street as customer_street,
           c.postal_code as customer_postal_code, c.city as customer_city,
           c.phone as customer_phone, t.assignee
    from ops.tour t
    join core.customer c on c.id = t.customer_id
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
    status: string;
    comment: string | null;
  }>(sql`
    select id, department_name_snapshot, object_name_snapshot,
           interval_label_snapshot, status::text, comment
    from ops.inspection_task
    where tour_id = ${tourId}
    order by department_name_snapshot nulls last, object_name_snapshot nulls last, id
  `);
}

type PhotoMeta = {
  inspection_task_id: number;
  id: number;
  caption: string | null;
  uploaded_at: string;
  uploaded_by: string;
};

async function getPhotosByTask(tourId: number): Promise<Map<number, PhotoMeta[]>> {
  const rows = await db.execute<PhotoMeta>(sql`
    select p.inspection_task_id, p.id, p.caption, p.uploaded_at::text, p.uploaded_by
    from ops.inspection_photo p
    join ops.inspection_task t on t.id = p.inspection_task_id
    where t.tour_id = ${tourId}
    order by p.uploaded_at desc
  `);
  const map = new Map<number, PhotoMeta[]>();
  for (const r of rows) {
    if (!map.has(r.inspection_task_id)) map.set(r.inspection_task_id, []);
    map.get(r.inspection_task_id)!.push(r);
  }
  return map;
}

export default async function MobileTourPage({
  params,
}: {
  params: Promise<{ tourId: string }>;
}) {
  const { tourId } = await params;
  const tour = await getTour(Number(tourId));
  if (!tour) notFound();

  const tasks = await getTasks(tour.id);
  const photosByTask = await getPhotosByTask(tour.id);
  const total = tasks.length;
  const open = tasks.filter((t) => t.status === "PENDING").length;
  const done = tasks.filter((t) => t.status === "DONE").length;
  const problem = tasks.filter((t) => t.status === "PROBLEM").length;
  const skipped = tasks.filter((t) => t.status === "SKIPPED").length;

  const locked = tour.status === "COMPLETED" || tour.status === "ACCEPTED" ||
    tour.status === "DISPUTED";
  const canComplete = open === 0 && tour.status === "IN_PROGRESS";

  // Gruppiere nach Abteilung für übersichtlichere Mobile-Ansicht
  type TaskItem = (typeof tasks)[number];
  const grouped = new Map<string, TaskItem[]>();
  for (const t of tasks) {
    const key = t.department_name_snapshot ?? "(ohne Abteilung)";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(t);
  }

  return (
    <div className="space-y-4">
      <Link href="/m" className="text-sm text-emerald-700">
        ← Touren
      </Link>

      <div className="rounded-lg bg-white border border-slate-200 p-4">
        <h1 className="text-xl font-semibold">{tour.customer_name}</h1>
        <div className="text-sm text-slate-600 mt-1">
          {[tour.customer_street, tour.customer_postal_code, tour.customer_city]
            .filter(Boolean)
            .join(", ")}
        </div>
        {tour.customer_phone && (
          <a
            href={`tel:${tour.customer_phone}`}
            className="text-sm text-blue-600 hover:underline mt-1 inline-block"
          >
            📞 {tour.customer_phone}
          </a>
        )}
        <div className="mt-3 text-xs text-slate-500">
          Tour-Datum: {tour.tour_date} · Vorarbeiter: {tour.assignee}
        </div>
      </div>

      <div className="rounded-lg bg-white border border-slate-200 p-3">
        <div className="flex justify-between text-sm">
          <div>
            <div className="text-2xl font-bold tabular-nums">{done + skipped + problem}</div>
            <div className="text-xs text-slate-500">erledigt</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold tabular-nums text-slate-700">{open}</div>
            <div className="text-xs text-slate-500">offen</div>
          </div>
        </div>
        <div className="mt-2 h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500"
            style={{ width: total > 0 ? `${((total - open) / total) * 100}%` : "0%" }}
          />
        </div>
        {problem > 0 && (
          <div className="mt-2 text-xs text-amber-700">⚠ {problem} Probleme dokumentiert</div>
        )}
        {skipped > 0 && (
          <div className="mt-2 text-xs text-slate-600">⊘ {skipped} übersprungen</div>
        )}
      </div>

      {locked && (
        <div className="rounded-lg bg-slate-100 border border-slate-300 p-3 text-sm text-slate-700">
          Diese Tour ist {tour.status === "ACCEPTED" ? "abgenommen" : tour.status === "DISPUTED" ? "beanstandet" : "abgeschlossen"} — keine Änderungen mehr möglich.
        </div>
      )}

      {[...grouped.entries()].map(([deptName, deptTasks]) => (
        <section key={deptName}>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 px-1">
            {deptName} ({deptTasks.length})
          </h2>
          <div className="space-y-2">
            {deptTasks.map((t) => (
              <InspectionItem
                key={t.id}
                task={t}
                locked={locked}
                photos={photosByTask.get(t.id) ?? []}
                redirectPath={`/m/${tour.id}`}
              />
            ))}
          </div>
        </section>
      ))}

      {canComplete && (
        <form
          action={async () => {
            "use server";
            await completeTour(tour.id);
          }}
          className="sticky bottom-4 z-10"
        >
          <button
            type="submit"
            className="w-full py-4 rounded-lg bg-emerald-600 text-white font-semibold text-base shadow-lg active:bg-emerald-800"
          >
            ✓ Alle Punkte erledigt — Zur Kunden-Abnahme
          </button>
        </form>
      )}

      {tour.status === "COMPLETED" && (
        <Link
          href={`/m/${tour.id}/abnahme`}
          className="block sticky bottom-4 z-10"
        >
          <div className="w-full py-4 rounded-lg bg-blue-600 text-white font-semibold text-base text-center shadow-lg">
            📝 Kunden-Abnahme starten
          </div>
        </Link>
      )}
    </div>
  );
}

import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AcceptanceForm } from "./AcceptanceForm";

export const dynamic = "force-dynamic";

async function getTourAndTasks(tourId: number) {
  const tourRow = await db.execute<{
    id: number;
    customer_name: string;
    tour_date: string;
    status: string;
  }>(sql`
    select t.id, c.name as customer_name, t.tour_date::text, t.status::text
    from ops.tour t
    join core.customer c on c.id = t.customer_id
    where t.id = ${tourId}
    limit 1
  `);
  if (tourRow.length === 0) return null;
  const tasks = await db.execute<{
    id: number;
    department_name_snapshot: string | null;
    object_name_snapshot: string | null;
    status: string;
    comment: string | null;
  }>(sql`
    select id, department_name_snapshot, object_name_snapshot,
           status::text, comment
    from ops.inspection_task
    where tour_id = ${tourId}
    order by department_name_snapshot nulls last, object_name_snapshot nulls last, id
  `);
  return { tour: tourRow[0], tasks };
}

export default async function AbnahmePage({
  params,
}: {
  params: Promise<{ tourId: string }>;
}) {
  const { tourId } = await params;
  const data = await getTourAndTasks(Number(tourId));
  if (!data) notFound();
  const { tour, tasks } = data;

  // Bereits abgenommen? → zurück zur Tour
  if (tour.status === "ACCEPTED" || tour.status === "DISPUTED") {
    redirect(`/m/${tour.id}/danke`);
  }

  return (
    <div className="space-y-4">
      <Link href={`/m/${tour.id}`} className="text-sm text-emerald-700">
        ← Zurück zur Tour
      </Link>

      <header>
        <h1 className="text-xl font-semibold">Kunden-Abnahme</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {tour.customer_name} · {tour.tour_date}
        </p>
        <p className="text-sm text-slate-600 mt-2">
          Bitte pro Punkt mit <span className="font-semibold text-emerald-700">✓</span> abnehmen
          oder mit <span className="font-semibold text-rose-700">✗</span> beanstanden, dann
          unterschreiben.
        </p>
      </header>

      <AcceptanceForm tourId={tour.id} tasks={tasks} />
    </div>
  );
}

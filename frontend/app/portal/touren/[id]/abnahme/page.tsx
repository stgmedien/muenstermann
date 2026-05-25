import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requirePortalUser } from "@/lib/portal-session";
import { PortalShell } from "../../../PortalShell";
import { AcceptanceForm } from "./AcceptanceForm";

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
  status: string;
  comment: string | null;
  photo_count: number;
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

async function getTasks(tourId: number): Promise<TaskRow[]> {
  const rows = await db.execute<{
    id: string | number;
    department_name_snapshot: string | null;
    object_name_snapshot: string | null;
    status: string;
    comment: string | null;
    photo_count: string;
  }>(sql`
    select it.id, it.department_name_snapshot, it.object_name_snapshot,
           it.status::text, it.comment,
           (select count(*) from ops.inspection_photo p where p.inspection_task_id = it.id)::text as photo_count
      from ops.inspection_task it
     where it.tour_id = ${tourId}
     order by it.department_name_snapshot nulls last, it.object_name_snapshot nulls last, it.id
  `);
  return rows.map((r) => ({
    id: Number(r.id),
    department_name_snapshot: r.department_name_snapshot,
    object_name_snapshot: r.object_name_snapshot,
    status: r.status,
    comment: r.comment,
    photo_count: Number(r.photo_count),
  }));
}

export default async function PortalAbnahmePage({
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

  // Nur COMPLETED-Touren können abgenommen werden
  if (tour.status !== "COMPLETED") {
    redirect(`/portal/touren/${id}`);
  }

  const tasks = await getTasks(tour.id);
  const flaggedByForeman = tasks.filter((t) => t.status === "PROBLEM").length;

  return (
    <PortalShell user={user} pathname="/portal/touren">
      <div className="space-y-5 max-w-3xl">
        <div>
          <Link
            href={`/portal/touren/${tour.id}`}
            className="text-sm text-blue-600 hover:underline"
          >
            ← zurück zur Tour
          </Link>
          <h1 className="text-2xl font-semibold mt-2">
            Tour-Abnahme: {new Date(tour.tour_date).toLocaleDateString("de-DE")}
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Vorarbeiter: {tour.assignee ?? "—"} — Tour abgeschlossen{" "}
            {tour.completed_at &&
              new Date(tour.completed_at).toLocaleString("de-DE")}
          </p>
        </div>

        <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-sm space-y-1">
          <div className="font-semibold text-blue-900">So funktioniert die Abnahme</div>
          <ul className="list-disc list-inside text-blue-900 space-y-0.5 text-xs">
            <li>
              Jede Position startet auf <strong>✓ akzeptiert</strong>.
            </li>
            <li>
              Klicken Sie <strong>✗</strong>, wenn etwas nicht in Ordnung war —
              dann ist eine Begründung Pflicht.
            </li>
            <li>
              Unterschrift unten ist verpflichtend. Die gesamte Abnahme wird
              fälschungssicher protokolliert (Audit-Trail mit Hash-Chain).
            </li>
            {flaggedByForeman > 0 && (
              <li className="text-amber-800 font-medium">
                ⚠ Der Vorarbeiter hat {flaggedByForeman} Position
                {flaggedByForeman === 1 ? " selbst als problematisch" : "en selbst als problematisch"} markiert
                — diese sind unten hervorgehoben.
              </li>
            )}
          </ul>
        </div>

        <AcceptanceForm tourId={tour.id} tasks={tasks} />
      </div>
    </PortalShell>
  );
}

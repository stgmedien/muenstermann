import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePortalUser } from "@/lib/portal-session";
import { PortalShell } from "../../PortalShell";

export const dynamic = "force-dynamic";

async function getSheet(id: number, customerId: number) {
  const rows = await db.execute<{
    id: number;
    title: string;
    status: string;
    period_from: string | null;
    period_to: string | null;
    assignee: string | null;
    accepted_at: string | null;
    accepted_by_name: string | null;
  }>(sql`
    select id, title, status::text, period_from::text, period_to::text,
           assignee, accepted_at::text, accepted_by_name
      from ops.cleaning_sheet
     where id = ${id} and customer_id = ${customerId}
     limit 1
  `);
  return rows[0] ?? null;
}

async function getTasks(sheetId: number) {
  return await db.execute<{
    id: number;
    department_name_snapshot: string | null;
    object_name_snapshot: string | null;
    interval_label_snapshot: string | null;
    status: string;
    scheduled_date: string | null;
    completed_at: string | null;
    completed_by: string | null;
    comment: string | null;
  }>(sql`
    select id, department_name_snapshot, object_name_snapshot,
           interval_label_snapshot, status::text,
           scheduled_date::text, completed_at::text, completed_by, comment
      from ops.inspection_task
     where cleaning_sheet_id = ${sheetId}
     order by scheduled_date nulls last, department_name_snapshot, object_name_snapshot, id
  `);
}

export default async function PortalSheetDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePortalUser();
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isFinite(id)) notFound();

  const sheet = await getSheet(id, user.customerId);
  if (!sheet) notFound();

  const tasks = await getTasks(sheet.id);
  const counts = {
    total: tasks.length,
    done: tasks.filter((t) => t.status === "DONE").length,
    problem: tasks.filter((t) => t.status === "PROBLEM").length,
    skipped: tasks.filter((t) => t.status === "SKIPPED").length,
    pending: tasks.filter((t) => t.status === "PENDING").length,
  };

  return (
    <PortalShell user={user} pathname="/portal/sheets">
      <div className="space-y-5">
        <div>
          <Link
            href="/portal/sheets"
            className="text-sm text-blue-600 hover:underline"
          >
            ← alle Sheets
          </Link>
          <h1 className="text-2xl font-semibold mt-2">{sheet.title}</h1>
          <div className="text-sm text-slate-500 mt-1">
            {sheet.period_from &&
              new Date(sheet.period_from).toLocaleDateString("de-DE")}
            {" – "}
            {sheet.period_to &&
              new Date(sheet.period_to).toLocaleDateString("de-DE")}
            {sheet.assignee && ` · Vorarbeiter: ${sheet.assignee}`}
          </div>
          {sheet.accepted_at && (
            <div className="mt-1 text-sm text-emerald-700">
              ✓ Abgenommen am{" "}
              {new Date(sheet.accepted_at).toLocaleDateString("de-DE")}
              {sheet.accepted_by_name && ` durch ${sheet.accepted_by_name}`}
            </div>
          )}
        </div>

        <section className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <SummaryCard label="Gesamt" value={counts.total} />
          <SummaryCard label="Erledigt" value={counts.done} tone="ok" />
          <SummaryCard label="Probleme" value={counts.problem} tone="warning" />
          <SummaryCard label="Übersprungen" value={counts.skipped} tone="neutral" />
          <SummaryCard label="Offen" value={counts.pending} tone="neutral" />
        </section>

        <div className="rounded-lg bg-white border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2 text-left w-24">Datum</th>
                <th className="px-3 py-2 text-left w-10">St.</th>
                <th className="px-3 py-2 text-left">Bereich</th>
                <th className="px-3 py-2 text-left">Objekt</th>
                <th className="px-3 py-2 text-left">Intervall</th>
                <th className="px-3 py-2 text-left">Kommentar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tasks.map((t) => (
                <tr key={t.id}>
                  <td className="px-3 py-2 tabular-nums">
                    {t.scheduled_date
                      ? new Date(t.scheduled_date).toLocaleDateString("de-DE")
                      : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <TaskStatusPill status={t.status} />
                  </td>
                  <td className="px-3 py-2 text-slate-600 text-xs">
                    {t.department_name_snapshot ?? "—"}
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
                </tr>
              ))}
              {tasks.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                    Keine Einträge in diesem Sheet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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

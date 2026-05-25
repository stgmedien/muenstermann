import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SheetCell } from "./SheetCell";

export const dynamic = "force-dynamic";

type Sheet = {
  id: number;
  title: string | null;
  period_from: string;
  period_to: string;
  assignee: string | null;
  status: string;
  customer_name: string;
  customer_number: number;
  bu_code: string;
};

type Cell = {
  task_id: number;
  hygiene_control_plan_id: number;
  scheduled_date: string;
  department_name: string | null;
  object_name: string | null;
  interval_label: string | null;
  status: string;
  customer_acceptance: string | null;
  dispute_reason: string | null;
};

async function getSheetAndCells(id: number) {
  const sheetRows = await db.execute<Sheet>(sql`
    select s.id, s.title, s.period_from::text, s.period_to::text,
           s.assignee, s.status,
           c.name as customer_name, c.customer_number, bu.code as bu_code
    from ops.cleaning_sheet s
    join core.customer c on c.id = s.customer_id
    join core.business_unit bu on bu.id = c.business_unit_id
    where s.id = ${id}
    limit 1
  `);
  if (sheetRows.length === 0) return null;
  const cells = await db.execute<Cell>(sql`
    select t.id as task_id,
           t.hygiene_control_plan_id,
           t.scheduled_date::text,
           t.department_name_snapshot as department_name,
           t.object_name_snapshot as object_name,
           t.interval_label_snapshot as interval_label,
           t.status::text,
           t.customer_acceptance::text,
           t.customer_dispute_reason as dispute_reason
    from ops.inspection_task t
    where t.cleaning_sheet_id = ${id}
    order by department_name nulls last, object_name nulls last,
             hygiene_control_plan_id, scheduled_date
  `);
  return { sheet: sheetRows[0], cells };
}

export default async function SheetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getSheetAndCells(Number(id));
  if (!data) notFound();
  const { sheet, cells } = data;

  // Eindeutige Tage + eindeutige Plan-Punkte ermitteln
  const dayList: string[] = [];
  const daySet = new Set<string>();
  const planMap = new Map<
    number,
    { dept: string | null; obj: string | null; interval: string | null }
  >();

  for (const c of cells) {
    if (!daySet.has(c.scheduled_date)) {
      daySet.add(c.scheduled_date);
      dayList.push(c.scheduled_date);
    }
    if (!planMap.has(c.hygiene_control_plan_id)) {
      planMap.set(c.hygiene_control_plan_id, {
        dept: c.department_name,
        obj: c.object_name,
        interval: c.interval_label,
      });
    }
  }
  dayList.sort();

  // Cell-Index: (planId, date) → Cell
  const cellIndex = new Map<string, Cell>();
  for (const c of cells) {
    cellIndex.set(`${c.hygiene_control_plan_id}|${c.scheduled_date}`, c);
  }

  // Plan-Punkte gruppieren nach Abteilung
  const groups = new Map<string, Array<{ planId: number; obj: string | null; interval: string | null }>>();
  for (const [planId, p] of planMap.entries()) {
    const key = p.dept ?? "(ohne Abteilung)";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push({ planId, obj: p.obj, interval: p.interval });
  }
  const sortedGroups = Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));

  const locked = sheet.status === "ACCEPTED" || sheet.status === "DISPUTED";

  // Zahlen
  const doneCount = cells.filter((c) => c.status === "DONE").length;
  const problemCount = cells.filter((c) => c.status === "PROBLEM").length;
  const acceptedCount = cells.filter((c) => c.customer_acceptance === "ACCEPTED").length;
  const disputedCount = cells.filter((c) => c.customer_acceptance === "DISPUTED").length;

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between">
        <div>
          <Link href="/sheets" className="text-sm text-blue-600 hover:underline">
            ← Sheets
          </Link>
          <h1 className="text-xl font-semibold mt-2">{sheet.title ?? `Sheet #${sheet.id}`}</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {sheet.customer_name} · {sheet.period_from} bis {sheet.period_to}
            {sheet.assignee && ` · Vorarbeiter: ${sheet.assignee}`}
          </p>
        </div>
        <div className="text-right text-xs">
          <div className="font-semibold text-slate-700">{cells.length} Zellen</div>
          <div className="text-emerald-700 mt-1">V✓ {doneCount}</div>
          {problemCount > 0 && <div className="text-amber-700">V⚠ {problemCount}</div>}
          <div className="text-blue-700">K✓ {acceptedCount}</div>
          {disputedCount > 0 && <div className="text-rose-700">K✗ {disputedCount}</div>}
        </div>
      </header>

      <Legend />

      <div className="overflow-x-auto rounded-lg bg-white border border-slate-200">
        <table className="text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50">
              <th className="sticky left-0 z-20 bg-slate-50 px-3 py-2 text-left text-xs uppercase text-slate-500 border-r border-slate-200 min-w-[18rem]">
                Plan-Punkt
              </th>
              {dayList.map((d) => {
                const date = new Date(d);
                const weekday = date.toLocaleDateString("de-DE", { weekday: "short" });
                const dayNum = date.getDate();
                return (
                  <th
                    key={d}
                    className="px-1 py-2 text-center font-medium text-slate-600 border-r border-slate-100 min-w-[3rem]"
                  >
                    <div className="text-[10px] uppercase text-slate-400">{weekday}</div>
                    <div className="font-mono">{dayNum}.</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sortedGroups.map(([dept, items]) => (
              <Fragment key={dept}>
                <tr>
                  <td
                    colSpan={dayList.length + 1}
                    className="bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 sticky left-0"
                  >
                    {dept}
                  </td>
                </tr>
                {items.map((item) => (
                  <tr key={item.planId} className="border-t border-slate-100 hover:bg-slate-50/50">
                    <td className="sticky left-0 z-10 bg-white px-3 py-1 border-r border-slate-200 align-middle">
                      <div className="font-medium text-slate-900 text-sm">
                        {item.obj ?? "—"}
                      </div>
                      {item.interval && (
                        <div className="text-[10px] text-slate-500">{item.interval}</div>
                      )}
                    </td>
                    {dayList.map((d) => {
                      const cell = cellIndex.get(`${item.planId}|${d}`) ?? null;
                      return (
                        <td key={d} className="p-0 border-r border-slate-100">
                          <SheetCell cell={cell} sheetId={sheet.id} locked={locked} />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-500">
        💡 Klick auf das <strong>linke Symbol</strong> (Vorarbeiter): cyclt offen → erledigt → Problem → übersprungen.<br />
        Klick auf das <strong>rechte Symbol</strong> (Kunde): cyclt nicht-geprüft → akzeptiert → beanstandet (Pflicht-Begründung) → zurück.
      </p>
    </div>
  );
}

import { Fragment } from "react";

function Legend() {
  return (
    <div className="flex flex-wrap gap-4 text-xs">
      <div className="flex items-center gap-1.5">
        <span className="w-5 h-5 bg-emerald-500 text-white rounded-sm flex items-center justify-center font-bold">✓</span>
        <span className="text-slate-700">V: erledigt</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-5 h-5 bg-amber-500 text-white rounded-sm flex items-center justify-center font-bold">⚠</span>
        <span className="text-slate-700">V: Problem</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-5 h-5 bg-slate-400 text-white rounded-sm flex items-center justify-center font-bold">⊘</span>
        <span className="text-slate-700">V: übersprungen</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-5 h-5 bg-blue-600 text-white rounded-sm flex items-center justify-center font-bold">✓</span>
        <span className="text-slate-700">K: akzeptiert</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-5 h-5 bg-rose-600 text-white rounded-sm flex items-center justify-center font-bold">✗</span>
        <span className="text-slate-700">K: beanstandet</span>
      </div>
    </div>
  );
}

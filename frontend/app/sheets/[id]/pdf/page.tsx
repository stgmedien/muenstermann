import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Fragment } from "react";
import { PrintButton } from "./PrintButton";

export const dynamic = "force-dynamic";

type Sheet = {
  id: number;
  title: string | null;
  period_from: string;
  period_to: string;
  status: string;
  customer_name: string;
  customer_number: number;
  bu_code: string;
  assignee: string | null;
  accepted_by_name: string | null;
  accepted_by_role: string | null;
  accepted_at: string | null;
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
  comment: string | null;
  dispute_reason: string | null;
};

async function getData(id: number) {
  const sheet = await db.execute<Sheet>(sql`
    select s.id, s.title, s.period_from::text, s.period_to::text, s.status,
           c.name as customer_name, c.customer_number, bu.code as bu_code,
           s.assignee,
           s.accepted_by_name, s.accepted_by_role,
           s.accepted_at::text as accepted_at
    from ops.cleaning_sheet s
    join core.customer c on c.id = s.customer_id
    join core.business_unit bu on bu.id = c.business_unit_id
    where s.id = ${id}
    limit 1
  `);
  if (sheet.length === 0) return null;
  const cells = await db.execute<Cell>(sql`
    select t.id as task_id, t.hygiene_control_plan_id,
           t.scheduled_date::text,
           t.department_name_snapshot as department_name,
           t.object_name_snapshot as object_name,
           t.interval_label_snapshot as interval_label,
           t.status::text,
           t.customer_acceptance::text,
           t.comment,
           t.customer_dispute_reason as dispute_reason
    from ops.inspection_task t
    where t.cleaning_sheet_id = ${id}
    order by department_name nulls last, object_name nulls last, scheduled_date
  `);
  const signature = await db.execute<{ signature_png: string; signed_at: string }>(sql`
    select signature_png, signed_at::text
    from ops.signature
    where cleaning_sheet_id = ${id}
    order by signed_at desc
    limit 1
  `);
  return { sheet: sheet[0], cells, signature: signature[0] ?? null };
}

const V_SYMBOL: Record<string, string> = { DONE: "✓", PROBLEM: "⚠", SKIPPED: "⊘", PENDING: "·" };
const K_SYMBOL: Record<string, string> = { ACCEPTED: "✓", DISPUTED: "✗" };

export default async function SheetPdfPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getData(Number(id));
  if (!data) notFound();
  const { sheet, cells, signature } = data;

  const dayList: string[] = [];
  const daySet = new Set<string>();
  const planMap = new Map<number, { dept: string | null; obj: string | null; interval: string | null }>();
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

  const cellIndex = new Map<string, Cell>();
  for (const c of cells) cellIndex.set(`${c.hygiene_control_plan_id}|${c.scheduled_date}`, c);

  const groups = new Map<string, Array<{ planId: number; obj: string | null; interval: string | null }>>();
  for (const [planId, p] of planMap.entries()) {
    const key = p.dept ?? "(ohne Abteilung)";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push({ planId, obj: p.obj, interval: p.interval });
  }
  const sortedGroups = Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));

  const complaints = cells.filter(
    (c) => c.customer_acceptance === "DISPUTED" || c.status === "PROBLEM" || c.status === "SKIPPED",
  );

  return (
    <html lang="de">
      <head>
        <title>Sheet #{sheet.id} – {sheet.customer_name}</title>
        <style>{`
          @page { size: A4 landscape; margin: 14mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; color: #1a1a1a;
                 font-size: 9pt; margin: 0; padding: 18px; line-height: 1.35; background: white; }
          h1 { font-size: 16pt; margin: 0 0 4px; }
          h2 { font-size: 10pt; margin: 18px 0 6px; text-transform: uppercase; color: #444;
               letter-spacing: 0.5px; border-bottom: 1px solid #ccc; padding-bottom: 2px; }
          .meta { color: #666; font-size: 9pt; }
          .meta strong { color: #1a1a1a; }
          table { border-collapse: collapse; width: 100%; font-size: 8pt; }
          th, td { border: 0.5pt solid #999; padding: 3px 4px; vertical-align: middle; }
          th { background: #f0f0f0; font-weight: 600; }
          td.plan { text-align: left; min-width: 120px; }
          td.cell { width: 50px; text-align: center; padding: 0; }
          td.cell .v, td.cell .k { display: inline-block; width: 22px; height: 22px;
                                    line-height: 22px; font-weight: bold; font-size: 11pt; }
          .v-DONE { background: #d1fae5; color: #047857; }
          .v-PROBLEM { background: #fef3c7; color: #92400e; }
          .v-SKIPPED { background: #e2e8f0; color: #475569; }
          .v-PENDING { background: white; color: #cbd5e1; }
          .k-ACCEPTED { background: #dbeafe; color: #1e40af; }
          .k-DISPUTED { background: #fee2e2; color: #991b1b; }
          .k-null { background: white; color: #cbd5e1; }
          .group-header td { background: #ddd; font-weight: 600; }
          .signature { margin-top: 20px; display: flex; align-items: flex-end; gap: 40px; }
          .signature-line { border-bottom: 1px solid #333; min-width: 220px; height: 40px;
                             display: flex; align-items: flex-end; padding-bottom: 2px; }
          .signature-line img { max-height: 38px; }
          .complaints { font-size: 8pt; margin-top: 12px; }
          .complaints li { margin-bottom: 4px; }
          .footer { margin-top: 20px; font-size: 7pt; color: #888;
                     border-top: 1px solid #ddd; padding-top: 6px; }
          @media print { .no-print { display: none; } body { padding: 0; } }
        `}</style>
      </head>
      <body>
        <PrintButton />

        <h1>Reinigungs-Sheet</h1>
        <div className="meta">
          <strong>{sheet.title ?? `Sheet #${sheet.id}`}</strong><br />
          Kunde: <strong>{sheet.customer_name}</strong> (Nr. {sheet.customer_number}, {sheet.bu_code})<br />
          Zeitraum: <strong>{sheet.period_from}</strong> bis <strong>{sheet.period_to}</strong><br />
          Vorarbeiter: <strong>{sheet.assignee ?? "—"}</strong><br />
          Status: <strong>{sheet.status}</strong>
          {sheet.accepted_at && (
            <>
              {" "}· Abgenommen am <strong>{new Date(sheet.accepted_at).toLocaleString("de-DE")}</strong>
              {" "}durch <strong>{sheet.accepted_by_name}</strong>
              {sheet.accepted_by_role && <> ({sheet.accepted_by_role})</>}
            </>
          )}
        </div>

        <h2>Reinigungsleistungen</h2>
        <table>
          <thead>
            <tr>
              <th rowSpan={2} style={{ width: "16%" }}>Plan-Punkt</th>
              {dayList.map((d) => {
                const date = new Date(d);
                const weekday = date.toLocaleDateString("de-DE", { weekday: "short" });
                const dayNum = `${date.getDate()}.${date.getMonth() + 1}.`;
                return (
                  <th key={d} colSpan={2}>
                    <div style={{ fontSize: "7pt", color: "#666" }}>{weekday}</div>
                    <div>{dayNum}</div>
                  </th>
                );
              })}
            </tr>
            <tr>
              {dayList.map((d) => (
                <Fragment key={d}>
                  <th style={{ fontSize: "7pt" }}>V</th>
                  <th style={{ fontSize: "7pt" }}>K</th>
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedGroups.map(([dept, items]) => (
              <Fragment key={dept}>
                <tr className="group-header">
                  <td colSpan={1 + dayList.length * 2}>{dept}</td>
                </tr>
                {items.map((it) => (
                  <tr key={it.planId}>
                    <td className="plan">
                      <strong>{it.obj ?? "—"}</strong>
                      {it.interval && <div style={{ fontSize: "7pt", color: "#666" }}>{it.interval}</div>}
                    </td>
                    {dayList.map((d) => {
                      const cell = cellIndex.get(`${it.planId}|${d}`);
                      if (!cell) {
                        return (
                          <Fragment key={d}>
                            <td className="cell" />
                            <td className="cell" />
                          </Fragment>
                        );
                      }
                      const vKey = cell.status as keyof typeof V_SYMBOL;
                      const kKey = cell.customer_acceptance ?? "null";
                      return (
                        <Fragment key={d}>
                          <td className="cell">
                            <span className={`v v-${cell.status}`}>{V_SYMBOL[vKey]}</span>
                          </td>
                          <td className="cell">
                            <span className={`k k-${kKey}`}>{K_SYMBOL[kKey] ?? ""}</span>
                          </td>
                        </Fragment>
                      );
                    })}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>

        {complaints.length > 0 && (
          <>
            <h2>Anmerkungen und Beanstandungen</h2>
            <ul className="complaints">
              {complaints.map((c) => (
                <li key={c.task_id}>
                  <strong>{c.department_name} · {c.object_name}</strong> ({c.scheduled_date}):
                  {c.status === "PROBLEM" && c.comment && (
                    <> <em style={{ color: "#92400e" }}>V-Problem:</em> {c.comment}</>
                  )}
                  {c.status === "SKIPPED" && c.comment && (
                    <> <em style={{ color: "#475569" }}>V-übersprungen:</em> {c.comment}</>
                  )}
                  {c.customer_acceptance === "DISPUTED" && c.dispute_reason && (
                    <> <em style={{ color: "#991b1b" }}>K-beanstandet:</em> {c.dispute_reason}</>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}

        <div className="signature">
          <div>
            <div className="signature-line">
              {signature && (
                <img src={signature.signature_png} alt="Unterschrift" />
              )}
            </div>
            <div style={{ fontSize: "7pt", color: "#666", marginTop: 2 }}>
              Unterschrift Kunde
              {sheet.accepted_by_name && <>: {sheet.accepted_by_name}</>}
              {sheet.accepted_by_role && <> · {sheet.accepted_by_role}</>}
            </div>
          </div>
          <div>
            <div className="signature-line" />
            <div style={{ fontSize: "7pt", color: "#666", marginTop: 2 }}>
              Vorarbeiter Münstermann
              {sheet.assignee && <>: {sheet.assignee}</>}
            </div>
          </div>
        </div>

        <div className="footer">
          Generiert am {new Date().toLocaleString("de-DE")} ·
          Münstermann Reinigung · Dokument basiert auf {cells.length} Plan-Punkten ·
          Compliance-Pflicht: HACCP / IFS / GefStoffV
        </div>
      </body>
    </html>
  );
}

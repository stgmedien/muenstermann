import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

async function getEntries(offset: number) {
  return await db.execute<{
    id: number;
    occurred_at: string;
    action: string;
    schema_name: string;
    table_name: string;
    row_pk: string | null;
    actor: string | null;
    transaction_id: string;
  }>(sql`
    select id, occurred_at, action, schema_name, table_name, row_pk, actor,
           transaction_id::text
    from audit.activity_log
    order by id desc
    limit ${PAGE_SIZE} offset ${offset}
  `);
}

async function getStats() {
  const res = await db.execute<{
    total: string;
    by_action: string;
    by_table: string;
    first: string;
    last: string;
  }>(sql`
    select
      (select count(*) from audit.activity_log)::text as total,
      (select json_agg(t) from (
         select action, count(*)::text as count
         from audit.activity_log group by action
       ) t)::text as by_action,
      (select json_agg(t) from (
         select schema_name || '.' || table_name as table, count(*)::text as count
         from audit.activity_log group by 1 order by 2 desc limit 8
       ) t)::text as by_table,
      (select min(occurred_at)::text from audit.activity_log) as first,
      (select max(occurred_at)::text from audit.activity_log) as last
  `);
  return res[0];
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ offset?: string }>;
}) {
  const { offset } = await searchParams;
  const off = Number(offset ?? 0);
  const [entries, stats] = await Promise.all([getEntries(off), getStats()]);
  const byAction = JSON.parse(stats.by_action || "[]") as Array<{ action: string; count: string }>;
  const byTable = JSON.parse(stats.by_table || "[]") as Array<{ table: string; count: string }>;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Audit-Log</h1>
        <p className="text-sm text-slate-500 mt-1">
          Universeller Änderungsverlauf. Jede INSERT/UPDATE/DELETE in catalog, core und ops wird
          protokolliert.
        </p>
      </header>

      <section className="grid md:grid-cols-3 gap-4">
        <div className="rounded-lg bg-white border border-slate-200 p-4">
          <div className="text-3xl font-semibold tabular-nums">
            {Number(stats.total).toLocaleString("de-DE")}
          </div>
          <div className="text-sm text-slate-600 mt-1">Einträge gesamt</div>
        </div>
        <div className="rounded-lg bg-white border border-slate-200 p-4">
          <div className="text-sm space-y-1">
            {byAction.map((row) => (
              <div key={row.action} className="flex justify-between">
                <span className="text-slate-600">{row.action}</span>
                <span className="font-medium tabular-nums">
                  {Number(row.count).toLocaleString("de-DE")}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg bg-white border border-slate-200 p-4 text-sm">
          <div className="text-xs text-slate-500 uppercase mb-1">Zeitraum</div>
          <div>{new Date(stats.first).toLocaleString("de-DE")}</div>
          <div className="text-slate-400">bis</div>
          <div>{new Date(stats.last).toLocaleString("de-DE")}</div>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Top-Tabellen
        </h2>
        <div className="flex flex-wrap gap-2">
          {byTable.map((row) => (
            <div
              key={row.table}
              className="rounded-md bg-white border border-slate-200 px-3 py-1.5 text-xs"
            >
              <code className="text-slate-700">{row.table}</code>
              <span className="ml-2 text-slate-500 tabular-nums">
                {Number(row.count).toLocaleString("de-DE")}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Letzte Änderungen (ID {off + 1} – {off + entries.length})
        </h2>
        <div className="rounded-lg bg-white border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <th className="px-4 py-2 w-16">ID</th>
                <th className="px-4 py-2 w-44">Zeit</th>
                <th className="px-4 py-2 w-20">Aktion</th>
                <th className="px-4 py-2">Tabelle</th>
                <th className="px-4 py-2 w-20">Zeile</th>
                <th className="px-4 py-2 w-40">Akteur</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {entries.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50 text-xs">
                  <td className="px-4 py-1.5 tabular-nums text-slate-500">{e.id}</td>
                  <td className="px-4 py-1.5 text-slate-600 tabular-nums">
                    {new Date(e.occurred_at).toLocaleString("de-DE")}
                  </td>
                  <td className="px-4 py-1.5">
                    <ActionBadge action={e.action} />
                  </td>
                  <td className="px-4 py-1.5 font-mono">
                    {e.schema_name}.{e.table_name}
                  </td>
                  <td className="px-4 py-1.5 tabular-nums text-slate-500">{e.row_pk}</td>
                  <td className="px-4 py-1.5 text-slate-500 truncate">{e.actor ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-between mt-3 text-sm">
          {off > 0 ? (
            <a
              href={`?offset=${Math.max(0, off - PAGE_SIZE)}`}
              className="text-blue-600 hover:underline"
            >
              ← Neuer
            </a>
          ) : (
            <span />
          )}
          {entries.length === PAGE_SIZE && (
            <a
              href={`?offset=${off + PAGE_SIZE}`}
              className="text-blue-600 hover:underline"
            >
              Älter →
            </a>
          )}
        </div>
      </section>
    </div>
  );
}

function ActionBadge({ action }: { action: string }) {
  const colors: Record<string, string> = {
    INSERT: "bg-emerald-100 text-emerald-700",
    UPDATE: "bg-amber-100 text-amber-700",
    DELETE: "bg-rose-100 text-rose-700",
  };
  return (
    <span
      className={`px-1.5 py-0.5 text-xs font-medium rounded ${colors[action] ?? "bg-slate-100 text-slate-700"}`}
    >
      {action}
    </span>
  );
}

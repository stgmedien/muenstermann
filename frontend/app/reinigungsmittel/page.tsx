import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import Link from "next/link";

export const dynamic = "force-dynamic";

type Row = {
  id: number;
  name: string;
  short_info: string | null;
  manufacturer_name: string | null;
  ph_value: string | null;
  water_hazard_class: number | null;
  storage_class_code: string | null;
  substance_count: string;
};

async function getCleaningAgents(query: string | undefined) {
  const filter = query ? `%${query.toLowerCase()}%` : null;
  return await db.execute<Row>(sql`
    select ca.id, ca.name, ca.short_info,
           m.name as manufacturer_name,
           ca.ph_value, ca.water_hazard_class,
           sc.code as storage_class_code,
           (select count(*) from catalog.cleaning_agent_hazard_substance s
              where s.cleaning_agent_id = ca.id)::text as substance_count
    from catalog.cleaning_agent ca
    left join catalog.manufacturer m on m.id = ca.manufacturer_id
    left join catalog.storage_class sc on sc.id = ca.storage_class_id
    where ${filter === null
      ? sql`true`
      : sql`(lower(ca.name) like ${filter} or lower(coalesce(m.name, '')) like ${filter})`}
    order by ca.name
  `);
}

export default async function CleaningAgentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const rows = await getCleaningAgents(q);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Reinigungsmittel</h1>
        <p className="text-sm text-slate-500 mt-1">
          {rows.length} Mittel im Katalog (Stand: Reinigungsmittel_2025).
        </p>
      </header>

      <form className="flex gap-2 max-w-md" method="get">
        <input
          name="q"
          defaultValue={q}
          placeholder="Suche nach Name oder Hersteller..."
          className="flex-1 px-3 py-2 rounded-md border border-slate-300 bg-white text-sm focus:border-blue-500 focus:outline-none"
        />
        <button
          type="submit"
          className="px-4 py-2 rounded-md bg-slate-900 text-white text-sm hover:bg-slate-700"
        >
          Suchen
        </button>
        {q && (
          <Link
            href="/reinigungsmittel"
            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900"
          >
            Reset
          </Link>
        )}
      </form>

      <div className="rounded-lg bg-white border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <th className="px-4 py-2">Artikel</th>
              <th className="px-4 py-2">Hersteller</th>
              <th className="px-4 py-2 w-20">pH</th>
              <th className="px-4 py-2 w-16">WGK</th>
              <th className="px-4 py-2 w-24">LGK</th>
              <th className="px-4 py-2 text-right w-24">Gefahrst.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-4 py-2">
                  <Link
                    href={`/reinigungsmittel/${r.id}`}
                    className="font-medium text-slate-900 hover:text-blue-600"
                  >
                    {r.name}
                  </Link>
                  {r.short_info && (
                    <div className="text-xs text-slate-500 truncate max-w-md">
                      {r.short_info.slice(0, 80)}
                    </div>
                  )}
                </td>
                <td className="px-4 py-2 text-slate-600">{r.manufacturer_name ?? "—"}</td>
                <td className="px-4 py-2 text-slate-600">{r.ph_value ?? "—"}</td>
                <td className="px-4 py-2 text-slate-600 tabular-nums">
                  {r.water_hazard_class ?? "—"}
                </td>
                <td className="px-4 py-2 text-slate-600 font-mono text-xs">
                  {r.storage_class_code ?? "—"}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">{r.substance_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

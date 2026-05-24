import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

async function getFederalStates() {
  return await db.execute<{
    id: number;
    name: string;
    abbreviation: string;
    is_german_state: boolean;
    holiday_count: string;
  }>(sql`
    select fs.id, fs.name, fs.abbreviation, fs.is_german_state,
           (select count(*) from core.public_holiday_federal_state j
              where j.federal_state_id = fs.id)::text as holiday_count
    from core.federal_state fs
    order by fs.id
  `);
}

async function getHolidays() {
  return await db.execute<{
    id: number;
    holiday_date: string;
    name: string;
    fixed_date: boolean;
    states: string;
  }>(sql`
    select h.id, h.holiday_date::text, h.name, h.fixed_date,
           string_agg(fs.abbreviation, ', ' order by fs.id) as states
    from core.public_holiday h
    join core.public_holiday_federal_state j on j.public_holiday_id = h.id
    join core.federal_state fs on fs.id = j.federal_state_id
    group by h.id, h.holiday_date, h.name, h.fixed_date
    order by h.holiday_date
  `);
}

export default async function HolidaysPage() {
  const [states, holidays] = await Promise.all([getFederalStates(), getHolidays()]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">Kalender 2026</h1>
        <p className="text-sm text-slate-500 mt-1">
          Bundesländer + Feiertage. Münstermann betreut sowohl deutsche Bundesländer als auch
          mindestens einen Kunden in den Niederlanden.
        </p>
      </header>

      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Bundesländer ({states.length})
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {states.map((s) => (
            <div
              key={s.id}
              className="rounded-md bg-white border border-slate-200 p-3 text-sm"
            >
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-xs text-slate-500">{s.abbreviation}</span>
                <span className="text-xs text-slate-500 tabular-nums">
                  {s.holiday_count} FT
                </span>
              </div>
              <div className="font-medium mt-0.5">{s.name}</div>
              {!s.is_german_state && (
                <div className="text-xs text-amber-600 mt-0.5">Ausland</div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Feiertage ({holidays.length})
        </h2>
        <div className="rounded-lg bg-white border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <th className="px-4 py-2 w-28">Datum</th>
                <th className="px-4 py-2">Feiertag</th>
                <th className="px-4 py-2 w-20">Fix.</th>
                <th className="px-4 py-2">Gültig in</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {holidays.map((h) => (
                <tr key={h.id}>
                  <td className="px-4 py-1.5 tabular-nums text-slate-700 font-mono text-xs">
                    {h.holiday_date}
                  </td>
                  <td className="px-4 py-1.5 font-medium">{h.name}</td>
                  <td className="px-4 py-1.5">
                    {h.fixed_date && (
                      <span className="text-xs text-emerald-600">✓ fix</span>
                    )}
                  </td>
                  <td className="px-4 py-1.5 font-mono text-xs text-slate-600">{h.states}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

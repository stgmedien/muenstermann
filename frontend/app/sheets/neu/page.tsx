import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import Link from "next/link";
import { generateSheet } from "../actions";

export const dynamic = "force-dynamic";

async function getCustomers() {
  return await db.execute<{
    customer_number: number;
    name: string;
    bu_code: string;
    daily_plan_count: string;
    all_plan_count: string;
  }>(sql`
    select c.customer_number, c.name, bu.code as bu_code,
      (select count(*) from ops.hygiene_control_plan hcp
        where hcp.customer_id = c.id
          and hcp.control_type in ('STANDARD','SPECIAL_15')
          and (lower(hcp.interval_label) = 'täglich' or hcp.interval_label = '10')
      )::text as daily_plan_count,
      (select count(*) from ops.hygiene_control_plan hcp
        where hcp.customer_id = c.id
          and hcp.control_type in ('STANDARD','SPECIAL_15')
      )::text as all_plan_count
    from core.customer c
    join core.business_unit bu on bu.id = c.business_unit_id
    where exists (select 1 from ops.hygiene_control_plan hcp where hcp.customer_id = c.id)
    order by c.customer_number
  `);
}

export default async function NewSheetPage() {
  const customers = await getCustomers();
  const today = new Date().toISOString().slice(0, 10);
  const inAWeek = new Date(Date.now() + 6 * 86400000).toISOString().slice(0, 10);

  return (
    <div className="space-y-6 max-w-2xl">
      <header>
        <Link href="/sheets" className="text-sm text-blue-600 hover:underline">
          ← Sheets
        </Link>
        <h1 className="text-2xl font-semibold mt-2">Reinigungs-Sheet erzeugen</h1>
        <p className="text-sm text-slate-500 mt-1">
          Konfiguriere Kunde, Zeitraum und welche Jobs ins Sheet aufgenommen werden.
          Das System erzeugt automatisch die Matrix aus Plan-Punkten × Tagen.
        </p>
      </header>

      <form
        action={generateSheet}
        className="space-y-4 rounded-lg bg-white border border-slate-200 p-6"
      >
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Kunde</label>
          <select
            name="customer_key"
            required
            defaultValue=""
            className="w-full px-3 py-2 rounded-md border border-slate-300 bg-white text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="" disabled>
              — bitte wählen —
            </option>
            {customers.map((c) => (
              <option
                key={`${c.bu_code}-${c.customer_number}`}
                value={`${c.bu_code}|${c.customer_number}`}
              >
                {c.customer_number} · {c.name} ({c.bu_code}) — täglich: {c.daily_plan_count}, gesamt: {c.all_plan_count}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Titel (optional)
          </label>
          <input
            type="text"
            name="title"
            placeholder="z. B. KW 22/2026 — Standardreinigung"
            className="w-full px-3 py-2 rounded-md border border-slate-300 bg-white text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Von</label>
            <input
              type="date"
              name="period_from"
              defaultValue={today}
              required
              className="w-full px-3 py-2 rounded-md border border-slate-300 bg-white text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Bis</label>
            <input
              type="date"
              name="period_to"
              defaultValue={inAWeek}
              required
              className="w-full px-3 py-2 rounded-md border border-slate-300 bg-white text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Vorarbeiter (Username)
          </label>
          <input
            type="text"
            name="assignee"
            defaultValue="jonathan.k"
            required
            className="w-full px-3 py-2 rounded-md border border-slate-300 bg-white text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        <fieldset className="space-y-2">
          <legend className="block text-sm font-medium text-slate-700 mb-1">
            Welche Plan-Punkte?
          </legend>
          <label className="flex items-start gap-2 text-sm cursor-pointer">
            <input type="radio" name="interval_filter" value="daily" defaultChecked className="mt-0.5" />
            <span>
              <span className="font-medium">Nur tägliche</span>
              <span className="text-slate-500 ml-1">— passt für ein klassisches Wochen-Sheet</span>
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm cursor-pointer">
            <input type="radio" name="interval_filter" value="all" className="mt-0.5" />
            <span>
              <span className="font-medium">Alle STANDARD-Punkte</span>
              <span className="text-slate-500 ml-1">— wöchentliche + monatliche dabei, wird schnell groß</span>
            </span>
          </label>
        </fieldset>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Limit pro Sheet (optional)
          </label>
          <input
            type="number"
            name="max_per_day"
            min={1}
            placeholder="z. B. 30 — die ersten 30 Plan-Punkte aufnehmen"
            className="w-full px-3 py-2 rounded-md border border-slate-300 bg-white text-sm focus:border-blue-500 focus:outline-none"
          />
          <p className="text-xs text-slate-500 mt-1">
            Leer = alle gefilterten Plan-Punkte. Bei 30 Plan-Punkten × 7 Tagen sind das 210 Zellen.
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Link
            href="/sheets"
            className="px-4 py-2 text-sm rounded-md border border-slate-300 hover:bg-slate-100"
          >
            Abbrechen
          </Link>
          <button
            type="submit"
            className="px-4 py-2 text-sm rounded-md bg-slate-900 text-white hover:bg-slate-700"
          >
            Sheet erzeugen
          </button>
        </div>
      </form>
    </div>
  );
}

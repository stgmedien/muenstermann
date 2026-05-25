import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import Link from "next/link";
import { generateTour } from "../actions";

export const dynamic = "force-dynamic";

async function getCustomers() {
  return await db.execute<{
    customer_number: number;
    name: string;
    bu_code: string;
    plan_count: string;
  }>(sql`
    select c.customer_number, c.name, bu.code as bu_code,
           (select count(*) from ops.hygiene_control_plan hcp
              where hcp.customer_id = c.id
                and hcp.control_type in ('STANDARD', 'SPECIAL_15')
                and (lower(hcp.interval_label) = 'täglich' or hcp.interval_label = '10')
           )::text as plan_count
    from core.customer c
    join core.business_unit bu on bu.id = c.business_unit_id
    where exists (select 1 from ops.hygiene_control_plan hcp where hcp.customer_id = c.id)
    order by c.customer_number
  `);
}

export default async function NewTourPage() {
  const customers = await getCustomers();
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6 max-w-2xl">
      <header>
        <Link href="/touren" className="text-sm text-blue-600 hover:underline">
          ← Touren
        </Link>
        <h1 className="text-2xl font-semibold mt-2">Tour generieren</h1>
        <p className="text-sm text-slate-500 mt-1">
          Erzeugt eine Tour für einen Kunden + Datum + Vorarbeiter. Inspection-Tasks
          werden automatisch aus dem Hygienekontroll-Plan abgeleitet.
        </p>
      </header>

      <form
        action={generateTour}
        className="space-y-4 rounded-lg bg-white border border-slate-200 p-6"
      >
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Kunde
          </label>
          <select
            name="customer_key"
            required
            defaultValue=""
            className="w-full px-3 py-2 rounded-md border border-slate-300 bg-white text-sm focus:border-blue-500 focus:outline-none"
            onChange={undefined}
          >
            <option value="" disabled>
              — bitte wählen —
            </option>
            {customers.map((c) => (
              <option
                key={`${c.bu_code}-${c.customer_number}`}
                value={`${c.bu_code}|${c.customer_number}`}
              >
                {c.customer_number} · {c.name} ({c.bu_code}) — {c.plan_count} tägliche Plan-Punkte
              </option>
            ))}
          </select>
        </div>

        {/* Hidden Fields werden aus customer_key extrahiert per Inline-Script */}
        <input type="hidden" name="business_unit_code" />
        <input type="hidden" name="customer_number" />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Datum
            </label>
            <input
              type="date"
              name="tour_date"
              defaultValue={today}
              required
              className="w-full px-3 py-2 rounded-md border border-slate-300 bg-white text-sm focus:border-blue-500 focus:outline-none"
            />
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
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Umfang
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="filter" value="daily" defaultChecked />
            Nur tägliche Punkte (empfohlen)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="filter" value="all" />
            Alle STANDARD-Punkte (kann sehr lang werden)
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Link
            href="/touren"
            className="px-4 py-2 text-sm rounded-md border border-slate-300 hover:bg-slate-100"
          >
            Abbrechen
          </Link>
          <button
            type="submit"
            className="px-4 py-2 text-sm rounded-md bg-slate-900 text-white hover:bg-slate-700"
          >
            Tour generieren
          </button>
        </div>

        {/* Inline-Skript: splittet customer_key in zwei hidden Felder */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              document.querySelector('select[name="customer_key"]').addEventListener('change', function(e) {
                var v = e.target.value || '';
                var parts = v.split('|');
                document.querySelector('input[name="business_unit_code"]').value = parts[0] || '';
                document.querySelector('input[name="customer_number"]').value = parts[1] || '';
              });
            `,
          }}
        />
      </form>
    </div>
  );
}

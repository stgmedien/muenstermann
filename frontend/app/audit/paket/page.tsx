import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function getCustomers() {
  return await db.execute<{
    customer_number: number;
    name: string;
    bu_code: string;
  }>(sql`
    select c.customer_number, c.name, bu.code as bu_code
    from core.customer c
    join core.business_unit bu on bu.id = c.business_unit_id
    where exists (
      select 1 from ops.cleaning_sheet s where s.customer_id = c.id
      union all select 1 from ops.tour t where t.customer_id = c.id
    )
    order by c.customer_number
  `);
}

export default async function PaketConfigPage({
  searchParams,
}: {
  searchParams: Promise<{ cust?: string; month?: string }>;
}) {
  const { cust, month } = await searchParams;
  const customers = await getCustomers();
  const today = new Date();
  const defaultMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

  return (
    <div className="space-y-6 max-w-2xl">
      <header>
        <Link href="/audit" className="text-sm text-blue-600 hover:underline">
          ← Audit-Log
        </Link>
        <h1 className="text-2xl font-semibold mt-2">Audit-Paket erzeugen</h1>
        <p className="text-sm text-slate-500 mt-1">
          PDF mit allen Sheets, Touren, Complaints und Signaturen eines Kunden für
          einen Monat — plus Hash-Chain-Verifikation. Druckbar als PDF/A für
          IFS-/HACCP-Audits.
        </p>
      </header>

      <form
        action="/audit/paket/render"
        method="get"
        className="space-y-4 rounded-lg bg-white border border-slate-200 p-6"
      >
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Kunde</label>
          <select
            name="cust"
            required
            defaultValue={cust ?? ""}
            className="w-full px-3 py-2 rounded-md border border-slate-300 bg-white text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="" disabled>
              — bitte wählen —
            </option>
            {customers.map((c) => (
              <option
                key={`${c.bu_code}-${c.customer_number}`}
                value={`${c.bu_code}:${c.customer_number}`}
              >
                {c.customer_number} · {c.name} ({c.bu_code})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Monat</label>
          <input
            type="month"
            name="month"
            defaultValue={month ?? defaultMonth}
            required
            className="px-3 py-2 rounded-md border border-slate-300 bg-white text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Link
            href="/audit"
            className="px-4 py-2 text-sm rounded-md border border-slate-300 hover:bg-slate-100"
          >
            Abbrechen
          </Link>
          <button
            type="submit"
            className="px-4 py-2 text-sm rounded-md bg-slate-900 text-white hover:bg-slate-700"
          >
            Paket öffnen
          </button>
        </div>
      </form>
    </div>
  );
}

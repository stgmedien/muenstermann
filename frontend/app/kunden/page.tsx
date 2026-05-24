import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import Link from "next/link";

export const dynamic = "force-dynamic";

type Row = {
  id: number;
  customer_number: number;
  name: string;
  city: string | null;
  federal_state: string | null;
  bu_code: string;
  bu_name: string;
  supervisor: string | null;
  team_lead: string | null;
  departments: string;
  objects: string;
};

async function getCustomers() {
  return await db.execute<Row>(sql`
    select c.id, c.customer_number, c.name, c.city, c.federal_state,
           bu.code as bu_code, bu.name as bu_name,
           c.supervisor, c.team_lead,
           (select count(*) from ops.department d where d.customer_id = c.id)::text as departments,
           (select count(*) from ops.department_object o
              join ops.department d on d.id = o.department_id
              where d.customer_id = c.id)::text as objects
    from core.customer c
    join core.business_unit bu on bu.id = c.business_unit_id
    order by bu.code, c.customer_number
  `);
}

export default async function CustomersPage() {
  const customers = await getCustomers();
  const hUndI = customers.filter((c) => c.bu_code === "H_UND_I");
  const services = customers.filter((c) => c.bu_code === "SERVICES");

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">Kunden</h1>
        <p className="text-sm text-slate-500 mt-1">
          {customers.length} Kunden, getrennt nach Mandant (Geschäftsbereich).
        </p>
      </header>

      <CustomerSection title="Münstermann H und I" rows={hUndI} />
      <CustomerSection title="Münstermann Services" rows={services} />
    </div>
  );
}

function CustomerSection({ title, rows }: { title: string; rows: Row[] }) {
  if (rows.length === 0) return null;
  return (
    <section>
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
        {title} <span className="text-slate-400 normal-case">({rows.length})</span>
      </h2>
      <div className="rounded-lg bg-white border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <th className="px-4 py-2 w-20">Nr.</th>
              <th className="px-4 py-2">Firma</th>
              <th className="px-4 py-2">Ort</th>
              <th className="px-4 py-2 w-16">BL</th>
              <th className="px-4 py-2">Betreuer</th>
              <th className="px-4 py-2 text-right w-20">Abt.</th>
              <th className="px-4 py-2 text-right w-20">Objekte</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-4 py-2 tabular-nums text-slate-500">{r.customer_number}</td>
                <td className="px-4 py-2 font-medium">
                  <Link
                    href={`/kunden/${r.bu_code}/${r.customer_number}`}
                    className="text-slate-900 hover:text-blue-600"
                  >
                    {r.name}
                  </Link>
                </td>
                <td className="px-4 py-2 text-slate-600">{r.city ?? "—"}</td>
                <td className="px-4 py-2 text-slate-500 tabular-nums">{r.federal_state ?? "—"}</td>
                <td className="px-4 py-2 text-slate-600">{r.supervisor ?? "—"}</td>
                <td className="px-4 py-2 text-right tabular-nums">{r.departments}</td>
                <td className="px-4 py-2 text-right tabular-nums">{r.objects}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import Link from "next/link";

export const dynamic = "force-dynamic";

type MasterPlan = {
  id: number;
  code: string;
  title: string;
  step_count: string;
  customer_use_count: string;
};

async function getMasterPlans() {
  return await db.execute<MasterPlan>(sql`
    select hp.id, hp.code, hp.title,
           (select count(*) from catalog.hygiene_plan_step s
              where s.hygiene_plan_id = hp.id)::text as step_count,
           (select count(*) from ops.customer_hygiene_plan chp
              where chp.master_hygiene_plan_id = hp.id)::text as customer_use_count
    from catalog.hygiene_plan hp
    order by hp.plan_number
  `);
}

export default async function HygienePlansPage() {
  const plans = await getMasterPlans();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Hygienepläne (Master)</h1>
        <p className="text-sm text-slate-500 mt-1">
          {plans.length} zentrale Hygienepläne aus dem Master-Katalog (Reinigungspläne.accdb).
          Jeder Kunde kann eine eigene Auswahl plus eigene Anpassungen halten.
        </p>
      </header>

      <div className="rounded-lg bg-white border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <th className="px-4 py-2 w-20">Code</th>
              <th className="px-4 py-2">Titel</th>
              <th className="px-4 py-2 text-right w-24">Schritte</th>
              <th className="px-4 py-2 text-right w-32">Genutzt bei</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {plans.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-4 py-2 font-mono text-xs text-slate-700">{p.code}</td>
                <td className="px-4 py-2">
                  <Link
                    href={`/hygieneplaene/${p.id}`}
                    className="font-medium text-slate-900 hover:text-blue-600"
                  >
                    {p.title}
                  </Link>
                </td>
                <td className="px-4 py-2 text-right tabular-nums">{p.step_count}</td>
                <td className="px-4 py-2 text-right tabular-nums text-slate-600">
                  {p.customer_use_count} Kunde(n)
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

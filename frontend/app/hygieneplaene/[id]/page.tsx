import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

async function getPlan(id: number) {
  const rows = await db.execute<{
    id: number;
    plan_number: number;
    code: string;
    title: string;
    recommended_agent_text: string | null;
  }>(sql`
    select id, plan_number, code, title, recommended_agent_text
    from catalog.hygiene_plan
    where id = ${id}
    limit 1
  `);
  return rows[0] ?? null;
}

async function getSteps(id: number) {
  return await db.execute<{
    id: number;
    step_number: number;
    status: string | null;
    task_description: string;
    procedure: string | null;
    equipment: string | null;
    notes: string | null;
  }>(sql`
    select id, step_number, status, task_description, procedure, equipment, notes
    from catalog.hygiene_plan_step
    where hygiene_plan_id = ${id}
    order by step_number
  `);
}

async function getCustomersUsing(id: number) {
  return await db.execute<{
    customer_number: number;
    name: string;
    bu_code: string;
  }>(sql`
    select c.customer_number, c.name, bu.code as bu_code
    from ops.customer_hygiene_plan chp
    join core.customer c on c.id = chp.customer_id
    join core.business_unit bu on bu.id = c.business_unit_id
    where chp.master_hygiene_plan_id = ${id}
    order by c.customer_number
  `);
}

export default async function HygienePlanDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const plan = await getPlan(Number(id));
  if (!plan) notFound();
  const [steps, customers] = await Promise.all([
    getSteps(plan.id),
    getCustomersUsing(plan.id),
  ]);

  return (
    <div className="space-y-6">
      <header>
        <Link href="/hygieneplaene" className="text-sm text-blue-600 hover:underline">
          ← Alle Pläne
        </Link>
        <h1 className="text-2xl font-semibold mt-2">
          <span className="font-mono text-slate-500 mr-2">{plan.code}</span>
          {plan.title}
        </h1>
      </header>

      {plan.recommended_agent_text && (
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Empfehlung
          </h2>
          <pre className="rounded-lg bg-slate-100 border border-slate-200 p-4 text-xs whitespace-pre-wrap font-mono">
            {plan.recommended_agent_text}
          </pre>
        </section>
      )}

      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Arbeitsschritte ({steps.length})
        </h2>
        <div className="space-y-3">
          {steps.map((s) => (
            <div key={s.id} className="rounded-lg bg-white border border-slate-200 p-4">
              <div className="flex items-baseline gap-3 mb-2">
                <div className="text-xl font-semibold tabular-nums text-slate-400 w-8">
                  {s.step_number}
                </div>
                <div className="flex-1">
                  <div className="font-medium">{s.task_description}</div>
                  {s.status && (
                    <div className="text-xs text-slate-500 mt-0.5">Status: {s.status}</div>
                  )}
                </div>
              </div>
              {(s.procedure || s.equipment || s.notes) && (
                <dl className="text-sm mt-3 space-y-1.5 pl-11">
                  {s.procedure && (
                    <div className="flex gap-3">
                      <dt className="text-slate-500 w-24 shrink-0">Verfahren</dt>
                      <dd className="whitespace-pre-wrap">{s.procedure}</dd>
                    </div>
                  )}
                  {s.equipment && (
                    <div className="flex gap-3">
                      <dt className="text-slate-500 w-24 shrink-0">Geräte</dt>
                      <dd className="whitespace-pre-wrap">{s.equipment}</dd>
                    </div>
                  )}
                  {s.notes && (
                    <div className="flex gap-3">
                      <dt className="text-slate-500 w-24 shrink-0">Hinweise</dt>
                      <dd className="whitespace-pre-wrap">{s.notes}</dd>
                    </div>
                  )}
                </dl>
              )}
            </div>
          ))}
        </div>
      </section>

      {customers.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Genutzt bei ({customers.length})
          </h2>
          <div className="rounded-lg bg-white border border-slate-200 divide-y divide-slate-100">
            {customers.map((c) => (
              <Link
                key={c.bu_code + "-" + c.customer_number}
                href={`/kunden/${c.bu_code}/${c.customer_number}`}
                className="block px-4 py-2.5 text-sm hover:bg-slate-50"
              >
                <span className="font-medium">{c.name}</span>
                <span className="text-xs text-slate-500 ml-2">
                  Nr. {c.customer_number} · {c.bu_code}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

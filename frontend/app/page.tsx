import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function getStats() {
  const counts = await db.execute<{
    customers: string;
    departments: string;
    objects: string;
    cleaning_agents: string;
    manufacturers: string;
    hazard_phrases: string;
    master_plans: string;
    customer_plans: string;
    control_plans: string;
    work_instructions: string;
    customer_hazards: string;
    federal_states: string;
    holidays: string;
    audit_entries: string;
  }>(sql`
    select
      (select count(*) from core.customer) as customers,
      (select count(*) from ops.department) as departments,
      (select count(*) from ops.department_object) as objects,
      (select count(*) from catalog.cleaning_agent) as cleaning_agents,
      (select count(*) from catalog.manufacturer) as manufacturers,
      (select count(*) from catalog.hazard_phrase) as hazard_phrases,
      (select count(*) from catalog.hygiene_plan) as master_plans,
      (select count(*) from ops.customer_hygiene_plan) as customer_plans,
      (select count(*) from ops.hygiene_control_plan) as control_plans,
      (select count(*) from ops.work_instruction) as work_instructions,
      (select count(*) from ops.customer_hazard_substance) as customer_hazards,
      (select count(*) from core.federal_state) as federal_states,
      (select count(*) from core.public_holiday) as holidays,
      (select count(*) from audit.activity_log) as audit_entries
  `);
  return counts[0];
}

async function getRecentChanges() {
  return await db.execute<{
    occurred_at: string;
    action: string;
    schema_name: string;
    table_name: string;
    row_pk: string | null;
    actor: string | null;
  }>(sql`
    select occurred_at, action, schema_name, table_name, row_pk, actor
    from audit.activity_log
    order by occurred_at desc
    limit 8
  `);
}

async function getCustomerSizes() {
  return await db.execute<{
    customer_number: number;
    name: string;
    bu: string;
    departments: string;
    objects: string;
  }>(sql`
    select c.customer_number, c.name, bu.code as bu,
           count(distinct d.id)::text as departments,
           count(distinct o.id)::text as objects
    from core.customer c
    join core.business_unit bu on bu.id = c.business_unit_id
    left join ops.department d on d.customer_id = c.id
    left join ops.department_object o on o.department_id = d.id
    where d.id is not null
    group by c.customer_number, c.name, bu.code
    order by count(distinct o.id) desc
    limit 5
  `);
}

export default async function DashboardPage() {
  const [stats, recentChanges, topCustomers] = await Promise.all([
    getStats(),
    getRecentChanges(),
    getCustomerSizes(),
  ]);

  const cards: Array<{ label: string; value: string | number; href?: string; hint?: string }> = [
    { label: "Kunden", value: stats.customers, href: "/kunden" },
    { label: "Abteilungen", value: stats.departments, hint: "über alle Kunden" },
    { label: "Objekte", value: stats.objects, hint: "Geräte / Räume / Anlagen" },
    { label: "Reinigungsmittel", value: stats.cleaning_agents, href: "/reinigungsmittel" },
    { label: "Hersteller", value: stats.manufacturers },
    { label: "H-Sätze (CLP)", value: stats.hazard_phrases },
    { label: "Hygienepläne Master", value: stats.master_plans, href: "/hygieneplaene" },
    { label: "Hygienepläne kundenspezifisch", value: stats.customer_plans },
    { label: "Kontrollplan-Zeilen", value: stats.control_plans },
    { label: "Arbeitsanweisungen", value: stats.work_instructions },
    { label: "Bundesländer + NL", value: stats.federal_states },
    { label: "Feiertage 2026", value: stats.holidays, href: "/feiertage" },
    { label: "Audit-Log", value: stats.audit_entries, href: "/audit" },
  ];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">
          Übersicht der Hygiene- und Reinigungsmittel-Datenbank.
        </p>
      </header>

      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Inhalte
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {cards.map((card) => {
            const inner = (
              <>
                <div className="text-3xl font-semibold tabular-nums">
                  {Number(card.value).toLocaleString("de-DE")}
                </div>
                <div className="text-sm text-slate-600 mt-1">{card.label}</div>
                {card.hint && (
                  <div className="text-xs text-slate-400 mt-0.5">{card.hint}</div>
                )}
              </>
            );
            return card.href ? (
              <Link
                key={card.label}
                href={card.href}
                className="block rounded-lg bg-white px-5 py-4 border border-slate-200 hover:border-slate-400 hover:shadow-sm transition"
              >
                {inner}
              </Link>
            ) : (
              <div
                key={card.label}
                className="rounded-lg bg-white px-5 py-4 border border-slate-200"
              >
                {inner}
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Größte Kunden (nach Objekt-Anzahl)
          </h2>
          <div className="rounded-lg bg-white border border-slate-200 divide-y divide-slate-100">
            {topCustomers.map((c) => (
              <Link
                key={c.bu + "-" + c.customer_number}
                href={`/kunden/${c.bu}/${c.customer_number}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-slate-50"
              >
                <div>
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-slate-500">
                    Nr. {c.customer_number} · {c.bu}
                  </div>
                </div>
                <div className="text-right text-sm tabular-nums">
                  <div className="font-medium">{c.objects} Objekte</div>
                  <div className="text-xs text-slate-500">{c.departments} Abteilungen</div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Letzte Änderungen (Audit-Log)
          </h2>
          <div className="rounded-lg bg-white border border-slate-200 divide-y divide-slate-100">
            {recentChanges.map((row, i) => (
              <div key={i} className="px-4 py-2.5 text-sm">
                <div className="flex items-baseline justify-between gap-3">
                  <code className="text-xs text-slate-700 truncate">
                    {row.schema_name}.{row.table_name}#{row.row_pk}
                  </code>
                  <ActionBadge action={row.action} />
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {new Date(row.occurred_at).toLocaleString("de-DE")}
                  {row.actor && <span> · {row.actor}</span>}
                </div>
              </div>
            ))}
          </div>
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

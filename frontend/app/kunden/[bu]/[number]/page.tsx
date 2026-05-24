import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type Customer = {
  id: number;
  customer_number: number;
  name: string;
  name_supplement: string | null;
  street: string | null;
  postal_code: string | null;
  city: string | null;
  federal_state: string | null;
  phone: string | null;
  fax: string | null;
  supervisor: string | null;
  team_lead: string | null;
  hour_sheet_format: string | null;
  match_code: string | null;
  cleaning_agent_freetext: string | null;
  disinfectant_freetext: string | null;
  flat_rate_billing: boolean;
  extra_work_allowed: boolean;
  swab_tests_required: boolean;
  weekly_audit: boolean;
  monthly_audit: boolean;
  vacation_audit: boolean;
  sickness_audit: boolean;
  bu_code: string;
  bu_name: string;
};

async function getCustomer(bu: string, number: number) {
  const rows = await db.execute<Customer>(sql`
    select c.*, bu.code as bu_code, bu.name as bu_name
    from core.customer c
    join core.business_unit bu on bu.id = c.business_unit_id
    where bu.code = ${bu} and c.customer_number = ${number}
    limit 1
  `);
  return rows[0] ?? null;
}

async function getDepartments(customerId: number) {
  return await db.execute<{
    id: number;
    department_number: number;
    name: string;
    floor: string | null;
    area_name: string | null;
    object_count: string;
  }>(sql`
    select d.id, d.department_number, d.name, d.floor, d.area_name,
           (select count(*) from ops.department_object o where o.department_id = d.id)::text as object_count
    from ops.department d
    where d.customer_id = ${customerId}
    order by d.department_number
  `);
}

async function getHygienePlans(customerId: number) {
  return await db.execute<{
    id: number;
    plan_number: number;
    code: string | null;
    title: string;
    step_count: string;
  }>(sql`
    select chp.id, chp.plan_number, chp.code, chp.title,
           (select count(*) from ops.customer_hygiene_plan_step s
              where s.customer_hygiene_plan_id = chp.id)::text as step_count
    from ops.customer_hygiene_plan chp
    where chp.customer_id = ${customerId}
    order by chp.plan_number
  `);
}

async function getHazardSubstances(customerId: number) {
  return await db.execute<{
    id: number;
    name: string;
    location: string | null;
    annual_quantity_text: string | null;
    sds_document_path: string | null;
    master_id: number | null;
  }>(sql`
    select chs.id, chs.name, chs.location, chs.annual_quantity_text, chs.sds_document_path,
           chs.master_hazard_substance_id as master_id
    from ops.customer_hazard_substance chs
    where chs.customer_id = ${customerId}
    order by chs.name
  `);
}

async function getContacts(customerId: number) {
  return await db.execute<{
    salutation: string | null;
    first_name: string | null;
    last_name: string | null;
    position: string | null;
    email: string | null;
    phone: string | null;
  }>(sql`
    select salutation, first_name, last_name, position, email, phone
    from core.customer_contact_person
    where customer_id = ${customerId}
    order by last_name
  `);
}

async function getControlPlanSummary(customerId: number) {
  return await db.execute<{
    control_type: string;
    responsible_party: string;
    count: string;
  }>(sql`
    select control_type::text, responsible_party::text, count(*)::text
    from ops.hygiene_control_plan
    where customer_id = ${customerId}
    group by control_type, responsible_party
    order by control_type, responsible_party
  `);
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ bu: string; number: string }>;
}) {
  const { bu, number } = await params;
  const customer = await getCustomer(bu, Number(number));
  if (!customer) notFound();

  const [departments, plans, substances, contacts, controlSummary] = await Promise.all([
    getDepartments(customer.id),
    getHygienePlans(customer.id),
    getHazardSubstances(customer.id),
    getContacts(customer.id),
    getControlPlanSummary(customer.id),
  ]);

  const fullAddress = [
    customer.street,
    [customer.postal_code, customer.city].filter(Boolean).join(" "),
    customer.federal_state,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="space-y-8">
      <header>
        <Link href="/kunden" className="text-sm text-blue-600 hover:underline">
          ← Alle Kunden
        </Link>
        <div className="flex items-baseline justify-between mt-2">
          <div>
            <h1 className="text-2xl font-semibold">{customer.name}</h1>
            {customer.name_supplement && (
              <div className="text-sm text-slate-500">{customer.name_supplement}</div>
            )}
          </div>
          <div className="text-sm text-slate-500 tabular-nums">
            Kunden-Nr. {customer.customer_number} · {customer.bu_name}
          </div>
        </div>
      </header>

      <section className="grid md:grid-cols-2 gap-6">
        <div className="rounded-lg bg-white border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Stammdaten
          </h2>
          <dl className="text-sm space-y-1.5">
            <Row label="Adresse" value={fullAddress || "—"} />
            <Row label="Telefon" value={customer.phone} />
            <Row label="Fax" value={customer.fax} />
            <Row label="Betreuer" value={customer.supervisor} />
            <Row label="Vorarbeiter" value={customer.team_lead} />
            <Row label="Stundenzettel" value={customer.hour_sheet_format} />
            <Row label="Match-Code" value={customer.match_code} />
          </dl>
        </div>

        <div className="rounded-lg bg-white border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Vertrags-Flags
          </h2>
          <dl className="text-sm grid grid-cols-2 gap-1.5">
            <Flag label="Pauschale" value={customer.flat_rate_billing} />
            <Flag label="Zusatzarbeiten" value={customer.extra_work_allowed} />
            <Flag label="Abstriche" value={customer.swab_tests_required} />
            <Flag label="wöchentl. Audit" value={customer.weekly_audit} />
            <Flag label="monatl. Audit" value={customer.monthly_audit} />
            <Flag label="Auswertung Urlaub" value={customer.vacation_audit} />
            <Flag label="Auswertung Krank" value={customer.sickness_audit} />
          </dl>
          {customer.cleaning_agent_freetext && (
            <div className="mt-4 text-sm">
              <div className="text-xs text-slate-500 uppercase mb-1">Reinigungsmittel</div>
              <div>{customer.cleaning_agent_freetext}</div>
            </div>
          )}
          {customer.disinfectant_freetext && (
            <div className="mt-3 text-sm">
              <div className="text-xs text-slate-500 uppercase mb-1">Desinfektionsmittel</div>
              <div>{customer.disinfectant_freetext}</div>
            </div>
          )}
        </div>
      </section>

      {contacts.length > 0 && (
        <Section title={`Ansprechpartner (${contacts.length})`}>
          <ul className="text-sm space-y-1.5">
            {contacts.map((c, i) => (
              <li key={i}>
                <span className="font-medium">
                  {[c.salutation, c.first_name, c.last_name].filter(Boolean).join(" ")}
                </span>
                {c.position && <span className="text-slate-600"> · {c.position}</span>}
                {c.email && (
                  <span className="text-slate-500"> · {c.email}</span>
                )}
                {c.phone && (
                  <span className="text-slate-500"> · {c.phone}</span>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title={`Abteilungen (${departments.length})`}>
        {departments.length === 0 ? (
          <div className="text-slate-500 text-sm">Keine Abteilungen erfasst.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-slate-500">
                <th className="px-3 py-1.5 w-16">Nr.</th>
                <th className="px-3 py-1.5">Abteilung</th>
                <th className="px-3 py-1.5">Etage</th>
                <th className="px-3 py-1.5">Bereich</th>
                <th className="px-3 py-1.5 text-right w-20">Objekte</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {departments.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="px-3 py-1.5 tabular-nums text-slate-500">{d.department_number}</td>
                  <td className="px-3 py-1.5 font-medium">{d.name}</td>
                  <td className="px-3 py-1.5 text-slate-600">{d.floor ?? "—"}</td>
                  <td className="px-3 py-1.5 text-slate-600">{d.area_name ?? "—"}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{d.object_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title={`Hygienepläne (${plans.length})`}>
        {plans.length === 0 ? (
          <div className="text-slate-500 text-sm">Keine kundenspezifischen Hygienepläne.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-slate-500">
                <th className="px-3 py-1.5 w-20">Code</th>
                <th className="px-3 py-1.5">Titel</th>
                <th className="px-3 py-1.5 text-right w-24">Schritte</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {plans.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-3 py-1.5 tabular-nums text-slate-700 font-mono text-xs">
                    {p.code ?? p.plan_number}
                  </td>
                  <td className="px-3 py-1.5">{p.title}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{p.step_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title={`Gefahrstoffverzeichnis (${substances.length})`}>
        {substances.length === 0 ? (
          <div className="text-slate-500 text-sm">Keine Einträge.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-slate-500">
                <th className="px-3 py-1.5">Stoff</th>
                <th className="px-3 py-1.5">Standort</th>
                <th className="px-3 py-1.5">Menge/Jahr</th>
                <th className="px-3 py-1.5 w-16">Master</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {substances.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-3 py-1.5 font-medium">{s.name}</td>
                  <td className="px-3 py-1.5 text-slate-600">{s.location ?? "—"}</td>
                  <td className="px-3 py-1.5 text-slate-600">{s.annual_quantity_text ?? "—"}</td>
                  <td className="px-3 py-1.5">
                    {s.master_id ? (
                      <span className="text-emerald-600 text-xs">✓ verlinkt</span>
                    ) : (
                      <span className="text-slate-400 text-xs">lokal</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title="Hygienekontroll-Plan (Übersicht)">
        {controlSummary.length === 0 ? (
          <div className="text-slate-500 text-sm">Keine Kontrollpläne.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-slate-500">
                <th className="px-3 py-1.5">Typ</th>
                <th className="px-3 py-1.5">Verantwortlich</th>
                <th className="px-3 py-1.5 text-right w-24">Plan-Zeilen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {controlSummary.map((row, i) => (
                <tr key={i}>
                  <td className="px-3 py-1.5 font-mono text-xs">{row.control_type}</td>
                  <td className="px-3 py-1.5">{row.responsible_party}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex gap-3">
      <dt className="text-slate-500 w-32 shrink-0">{label}</dt>
      <dd className="text-slate-900">{value ?? "—"}</dd>
    </div>
  );
}

function Flag({ label, value }: { label: string; value: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`inline-block w-2.5 h-2.5 rounded-full ${
          value ? "bg-emerald-500" : "bg-slate-300"
        }`}
      />
      <span className={value ? "text-slate-900" : "text-slate-500"}>{label}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
        {title}
      </h2>
      <div className="rounded-lg bg-white border border-slate-200 overflow-hidden p-3">
        {children}
      </div>
    </section>
  );
}

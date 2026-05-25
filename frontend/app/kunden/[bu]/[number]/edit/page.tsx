import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { updateCustomer } from "./actions";

export const dynamic = "force-dynamic";

async function getCustomer(bu: string, number: number) {
  const rows = await db.execute<{
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
  }>(sql`
    select c.*, bu.code as bu_code
    from core.customer c
    join core.business_unit bu on bu.id = c.business_unit_id
    where bu.code = ${bu} and c.customer_number = ${number}
    limit 1
  `);
  return rows[0] ?? null;
}

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ bu: string; number: string }>;
}) {
  const { bu, number } = await params;
  const customer = await getCustomer(bu, Number(number));
  if (!customer) notFound();

  const action = updateCustomer.bind(null, bu, customer.customer_number);

  return (
    <div className="space-y-6 max-w-3xl">
      <header>
        <Link
          href={`/kunden/${bu}/${customer.customer_number}`}
          className="text-sm text-blue-600 hover:underline"
        >
          ← Zurück
        </Link>
        <h1 className="text-2xl font-semibold mt-2">
          {customer.name} <span className="text-slate-400 text-base">bearbeiten</span>
        </h1>
      </header>

      <form action={action} className="space-y-6">
        <Section title="Stammdaten">
          <Field label="Firma" name="name" defaultValue={customer.name} required />
          <Field
            label="Zusatz"
            name="name_supplement"
            defaultValue={customer.name_supplement}
          />
          <Grid>
            <Field label="Straße" name="street" defaultValue={customer.street} />
            <Field
              label="PLZ"
              name="postal_code"
              defaultValue={customer.postal_code}
              className="md:col-span-1"
            />
            <Field label="Ort" name="city" defaultValue={customer.city} />
            <Field
              label="Bundesland"
              name="federal_state"
              defaultValue={customer.federal_state}
            />
          </Grid>
          <Grid>
            <Field label="Telefon" name="phone" defaultValue={customer.phone} />
            <Field label="Fax" name="fax" defaultValue={customer.fax} />
          </Grid>
        </Section>

        <Section title="Operative Felder">
          <Grid>
            <Field label="Betreuer" name="supervisor" defaultValue={customer.supervisor} />
            <Field label="Vorarbeiter" name="team_lead" defaultValue={customer.team_lead} />
            <Field
              label="Stundenzettel-Format"
              name="hour_sheet_format"
              defaultValue={customer.hour_sheet_format}
            />
            <Field
              label="Match-Code"
              name="match_code"
              defaultValue={customer.match_code}
            />
          </Grid>
          <Field
            label="Reinigungsmittel (Freitext)"
            name="cleaning_agent_freetext"
            defaultValue={customer.cleaning_agent_freetext}
            multiline
          />
          <Field
            label="Desinfektionsmittel (Freitext)"
            name="disinfectant_freetext"
            defaultValue={customer.disinfectant_freetext}
            multiline
          />
        </Section>

        <Section title="Vertrags-Flags">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <Check
              label="Pauschale"
              name="flat_rate_billing"
              defaultChecked={customer.flat_rate_billing}
            />
            <Check
              label="Zusatzarbeiten"
              name="extra_work_allowed"
              defaultChecked={customer.extra_work_allowed}
            />
            <Check
              label="Abstriche"
              name="swab_tests_required"
              defaultChecked={customer.swab_tests_required}
            />
            <Check
              label="wöchentl. Audit"
              name="weekly_audit"
              defaultChecked={customer.weekly_audit}
            />
            <Check
              label="monatl. Audit"
              name="monthly_audit"
              defaultChecked={customer.monthly_audit}
            />
            <Check
              label="Auswertung Urlaub"
              name="vacation_audit"
              defaultChecked={customer.vacation_audit}
            />
            <Check
              label="Auswertung Krank"
              name="sickness_audit"
              defaultChecked={customer.sickness_audit}
            />
          </div>
        </Section>

        <div className="flex justify-end gap-3 pt-2">
          <Link
            href={`/kunden/${bu}/${customer.customer_number}`}
            className="px-4 py-2 text-sm rounded-md border border-slate-300 hover:bg-slate-100"
          >
            Abbrechen
          </Link>
          <button
            type="submit"
            className="px-4 py-2 text-sm rounded-md bg-slate-900 text-white hover:bg-slate-700"
          >
            Speichern
          </button>
        </div>
      </form>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg bg-white border border-slate-200 p-5 space-y-3">
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid md:grid-cols-2 gap-3">{children}</div>;
}

function Field({
  label,
  name,
  defaultValue,
  required,
  multiline,
  className,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  required?: boolean;
  multiline?: boolean;
  className?: string;
}) {
  return (
    <label className={`block text-sm ${className ?? ""}`}>
      <span className="text-slate-700">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      {multiline ? (
        <textarea
          name={name}
          defaultValue={defaultValue ?? ""}
          rows={3}
          className="mt-1 w-full px-3 py-2 rounded-md border border-slate-300 bg-white text-sm focus:border-blue-500 focus:outline-none"
        />
      ) : (
        <input
          type="text"
          name={name}
          defaultValue={defaultValue ?? ""}
          required={required}
          className="mt-1 w-full px-3 py-2 rounded-md border border-slate-300 bg-white text-sm focus:border-blue-500 focus:outline-none"
        />
      )}
    </label>
  );
}

function Check({
  label,
  name,
  defaultChecked,
}: {
  label: string;
  name: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="rounded border-slate-300"
      />
      {label}
    </label>
  );
}

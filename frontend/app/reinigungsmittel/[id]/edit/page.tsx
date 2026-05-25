import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { updateCleaningAgent } from "./actions";

export const dynamic = "force-dynamic";

async function getAgent(id: number) {
  const rows = await db.execute<{
    id: number;
    name: string;
    operations_number: string | null;
    ph_value: string | null;
    water_hazard_class: number | null;
    flammability_class: string | null;
    adr_rid: string | null;
    short_info: string | null;
    measurement_instructions: string | null;
  }>(sql`
    select id, name, operations_number, ph_value, water_hazard_class,
           flammability_class, adr_rid, short_info, measurement_instructions
    from catalog.cleaning_agent
    where id = ${id}
    limit 1
  `);
  return rows[0] ?? null;
}

export default async function EditCleaningAgentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const agent = await getAgent(Number(id));
  if (!agent) notFound();

  const action = updateCleaningAgent.bind(null, agent.id);

  return (
    <div className="space-y-6 max-w-2xl">
      <header>
        <Link
          href={`/reinigungsmittel/${agent.id}`}
          className="text-sm text-blue-600 hover:underline"
        >
          ← Zurück
        </Link>
        <h1 className="text-2xl font-semibold mt-2">
          {agent.name} <span className="text-slate-400 text-base">bearbeiten</span>
        </h1>
      </header>

      <form action={action} className="space-y-4">
        <Section title="Stammdaten">
          <Field label="Name" name="name" defaultValue={agent.name} required />
          <Field
            label="Betriebs-Nr."
            name="operations_number"
            defaultValue={agent.operations_number}
          />
        </Section>

        <Section title="Eigenschaften">
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="pH-Wert (Freitext)" name="ph_value" defaultValue={agent.ph_value} />
            <Field
              label="WGK (1-3)"
              name="water_hazard_class"
              defaultValue={agent.water_hazard_class?.toString() ?? null}
              hint="leer = ohne WGK"
            />
            <Field
              label="Brennbarkeitsklasse (Vbf)"
              name="flammability_class"
              defaultValue={agent.flammability_class}
            />
            <Field label="ADR/RID" name="adr_rid" defaultValue={agent.adr_rid} />
          </div>
        </Section>

        <Section title="Texte">
          <Field
            label="Kurzinfo"
            name="short_info"
            defaultValue={agent.short_info}
            multiline
            rows={4}
          />
          <Field
            label="Anleitung Messung"
            name="measurement_instructions"
            defaultValue={agent.measurement_instructions}
            multiline
            rows={4}
          />
        </Section>

        <div className="flex justify-end gap-3 pt-2">
          <Link
            href={`/reinigungsmittel/${agent.id}`}
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg bg-white border border-slate-200 p-5 space-y-3">
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Field({
  label,
  name,
  defaultValue,
  required,
  multiline,
  rows,
  hint,
}: {
  label: string;
  name: string;
  defaultValue: string | null | undefined;
  required?: boolean;
  multiline?: boolean;
  rows?: number;
  hint?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="text-slate-700">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      {multiline ? (
        <textarea
          name={name}
          defaultValue={defaultValue ?? ""}
          rows={rows ?? 3}
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
      {hint && <span className="text-xs text-slate-500 mt-0.5 block">{hint}</span>}
    </label>
  );
}

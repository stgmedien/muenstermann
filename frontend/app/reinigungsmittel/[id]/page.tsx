import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

async function getAgent(id: number) {
  const rows = await db.execute<{
    id: number;
    name: string;
    operations_number: string | null;
    short_info: string | null;
    measurement_instructions: string | null;
    ph_value: string | null;
    water_hazard_class: number | null;
    flammability_class: string | null;
    adr_rid: string | null;
    hazard_legacy_text: string | null;
    precaution_legacy_text: string | null;
    manufacturer_name: string | null;
    manufacturer_city: string | null;
    manufacturer_email: string | null;
    poison_center_city: string | null;
    poison_center_phone: string | null;
    storage_class_code: string | null;
    storage_class_description: string | null;
  }>(sql`
    select ca.id, ca.name, ca.operations_number, ca.short_info, ca.measurement_instructions,
           ca.ph_value, ca.water_hazard_class, ca.flammability_class, ca.adr_rid,
           ca.hazard_legacy_text, ca.precaution_legacy_text,
           m.name as manufacturer_name, m.city as manufacturer_city, m.email as manufacturer_email,
           pic.city as poison_center_city, pic.phone as poison_center_phone,
           sc.code as storage_class_code, sc.description as storage_class_description
    from catalog.cleaning_agent ca
    left join catalog.manufacturer m on m.id = ca.manufacturer_id
    left join catalog.poison_information_center pic on pic.id = m.poison_center_id
    left join catalog.storage_class sc on sc.id = ca.storage_class_id
    where ca.id = ${id}
    limit 1
  `);
  return rows[0] ?? null;
}

async function getSubstances(id: number) {
  return await db.execute<{ position: number; substance_name: string }>(sql`
    select position, substance_name
    from catalog.cleaning_agent_hazard_substance
    where cleaning_agent_id = ${id}
    order by position
  `);
}

async function getUsedByCustomers(agentName: string) {
  // Keine direkte FK von customer.cleaning_agent_freetext zu cleaning_agent —
  // wir machen Fuzzy-Match auf den Freitext.
  return await db.execute<{
    customer_number: number;
    name: string;
    bu_code: string;
    text: string;
  }>(sql`
    select c.customer_number, c.name, bu.code as bu_code, c.cleaning_agent_freetext as text
    from core.customer c
    join core.business_unit bu on bu.id = c.business_unit_id
    where lower(c.cleaning_agent_freetext) like '%' || lower(${agentName}) || '%'
       or lower(c.disinfectant_freetext) like '%' || lower(${agentName}) || '%'
    limit 20
  `);
}

export default async function CleaningAgentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const agent = await getAgent(Number(id));
  if (!agent) notFound();

  const [substances, customers] = await Promise.all([
    getSubstances(agent.id),
    getUsedByCustomers(agent.name),
  ]);

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between">
        <div>
          <Link href="/reinigungsmittel" className="text-sm text-blue-600 hover:underline">
            ← Alle Reinigungsmittel
          </Link>
          <h1 className="text-2xl font-semibold mt-2">{agent.name}</h1>
          {agent.operations_number && (
            <p className="text-sm text-slate-500 mt-1">Betriebs-Nr.: {agent.operations_number}</p>
          )}
        </div>
        <Link
          href={`/reinigungsmittel/${agent.id}/edit`}
          className="px-3 py-1.5 text-sm rounded-md bg-slate-900 text-white hover:bg-slate-700"
        >
          Bearbeiten
        </Link>
      </header>

      <section className="grid md:grid-cols-2 gap-6">
        <div className="rounded-lg bg-white border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Eigenschaften
          </h2>
          <dl className="text-sm space-y-1.5">
            <Row label="pH-Wert" value={agent.ph_value} />
            <Row
              label="Wassergefährdung"
              value={agent.water_hazard_class ? `WGK ${agent.water_hazard_class}` : null}
            />
            <Row label="Brennbarkeitsklasse" value={agent.flammability_class} />
            <Row label="ADR/RID" value={agent.adr_rid} />
            <Row
              label="Lagerklasse"
              value={
                agent.storage_class_code
                  ? `${agent.storage_class_code}${agent.storage_class_description ? ` (${agent.storage_class_description})` : ""}`
                  : null
              }
            />
          </dl>
        </div>

        <div className="rounded-lg bg-white border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Hersteller
          </h2>
          {agent.manufacturer_name ? (
            <dl className="text-sm space-y-1.5">
              <Row label="Firma" value={agent.manufacturer_name} />
              <Row label="Ort" value={agent.manufacturer_city} />
              <Row label="E-Mail" value={agent.manufacturer_email} />
              <Row label="Giftnotruf" value={agent.poison_center_city} />
              <Row label="Notruf-Tel." value={agent.poison_center_phone} />
            </dl>
          ) : (
            <p className="text-sm text-amber-700">
              Kein Hersteller-Match — siehe ADR-003 (Fuzzy-Match-Quarantäne).
            </p>
          )}
        </div>
      </section>

      {substances.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Gefahrstoff-Komponenten ({substances.length})
          </h2>
          <div className="rounded-lg bg-white border border-slate-200 p-3">
            <ul className="text-sm space-y-1">
              {substances.map((s) => (
                <li key={s.position} className="flex gap-3">
                  <span className="text-slate-400 tabular-nums w-6">{s.position}.</span>
                  <span>{s.substance_name}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {(agent.hazard_legacy_text || agent.precaution_legacy_text) && (
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Gefahren- und P-Sätze (Quelle: Legacy / R-Sätze)
          </h2>
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm space-y-2">
            <p className="text-amber-800 text-xs">
              ⚠ Die Quell-Datenbank enthält R-Sätze nach 67/548/EWG (Stoffrichtlinie), nicht
              H-Sätze nach CLP. Fachliche Re-Klassifizierung wäre separater Compliance-Auftrag.
            </p>
            {agent.hazard_legacy_text && (
              <div>
                <span className="text-xs uppercase text-slate-500">H/R-Sätze:</span>{" "}
                <code className="text-xs">{agent.hazard_legacy_text}</code>
              </div>
            )}
            {agent.precaution_legacy_text && (
              <div>
                <span className="text-xs uppercase text-slate-500">P/S-Sätze:</span>{" "}
                <code className="text-xs">{agent.precaution_legacy_text}</code>
              </div>
            )}
          </div>
        </section>
      )}

      {agent.short_info && (
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Kurzinfo
          </h2>
          <div className="rounded-lg bg-white border border-slate-200 p-5 text-sm whitespace-pre-wrap">
            {agent.short_info}
          </div>
        </section>
      )}

      {agent.measurement_instructions && (
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Anleitung Messung
          </h2>
          <div className="rounded-lg bg-white border border-slate-200 p-5 text-sm whitespace-pre-wrap">
            {agent.measurement_instructions}
          </div>
        </section>
      )}

      {customers.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Bei Kunden im Einsatz (Freitext-Match)
          </h2>
          <div className="rounded-lg bg-white border border-slate-200 divide-y divide-slate-100">
            {customers.map((c) => (
              <Link
                key={c.bu_code + "-" + c.customer_number}
                href={`/kunden/${c.bu_code}/${c.customer_number}`}
                className="block px-4 py-2.5 text-sm hover:bg-slate-50"
              >
                <div className="font-medium">{c.name}</div>
                <div className="text-xs text-slate-500">
                  Nr. {c.customer_number} · {c.bu_code}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div className="flex gap-3">
      <dt className="text-slate-500 w-32 shrink-0">{label}</dt>
      <dd className="text-slate-900">{value ?? "—"}</dd>
    </div>
  );
}

import Link from "next/link";
import { requirePortalUser } from "@/lib/portal-session";
import { listAuditPaketMonths } from "@/lib/audit-paket";
import { PortalShell } from "../PortalShell";

export const dynamic = "force-dynamic";

const MONTH_NAMES = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
];

function formatMonth(yyyyMm: string): string {
  const [y, m] = yyyyMm.split("-").map(Number);
  if (!y || !m) return yyyyMm;
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

export default async function PortalDokumentePage() {
  const user = await requirePortalUser();
  const months = await listAuditPaketMonths(user.customerId);

  return (
    <PortalShell user={user} pathname="/portal/dokumente">
      <div className="space-y-5 max-w-4xl">
        <header>
          <h1 className="text-2xl font-semibold">Dokumente & Berichte</h1>
          <p className="text-sm text-slate-500 mt-1">
            Monatliche Audit-Pakete zum Selbst-Download — alle Touren, Sheets,
            Beanstandungen, Fotos und Signaturen eines Monats in einem
            druckfertigen Dokument mit Hash-Chain-Verifikation.
          </p>
        </header>

        <section className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-sm space-y-1">
          <div className="font-semibold text-blue-900">
            Was steckt in einem Audit-Paket?
          </div>
          <ul className="list-disc list-inside text-blue-900 text-xs space-y-0.5">
            <li>Tabelle aller Reinigungs-Sheets und Touren des Monats</li>
            <li>Beanstandungen mit Begründung und Bearbeitungs-Status</li>
            <li>Foto-Belege der dokumentierten Punkte</li>
            <li>Vorarbeiter- und Kunden-Signaturen (inkl. Datum)</li>
            <li>
              Verifikation der Hash-Chain (kryptografischer Nachweis, dass
              keine Zeile nachträglich verändert wurde)
            </li>
          </ul>
          <p className="text-xs text-blue-800 mt-2">
            Tipp: Im geöffneten Paket „Drucken → Als PDF speichern" liefert ein
            archivierbares PDF/A für IFS-/HACCP-Audits.
          </p>
        </section>

        {months.length === 0 ? (
          <div className="rounded-lg bg-white border border-slate-200 p-8 text-center text-sm text-slate-500">
            Noch keine Daten zum Generieren eines Audit-Pakets vorhanden.
          </div>
        ) : (
          <section>
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Verfügbare Monate ({months.length})
            </h2>
            <div className="rounded-lg bg-white border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2 text-left">Monat</th>
                    <th className="px-3 py-2 text-right">Touren</th>
                    <th className="px-3 py-2 text-right">Sheets</th>
                    <th className="px-3 py-2 text-right">Beanstandungen</th>
                    <th className="px-3 py-2 text-center">Signiert</th>
                    <th className="px-3 py-2 text-right">Aktion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {months.map((m) => (
                    <tr key={m.month} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-medium">
                        {formatMonth(m.month)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {Number(m.tour_count).toLocaleString("de-DE")}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {Number(m.sheet_count).toLocaleString("de-DE")}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {Number(m.complaint_count) > 0 ? (
                          <span className="text-amber-700 font-medium">
                            {m.complaint_count}
                          </span>
                        ) : (
                          <span className="text-slate-300">0</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {m.has_signature ? (
                          <span className="text-emerald-700">✓</span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Link
                          href={`/portal/dokumente/render?month=${m.month}`}
                          target="_blank"
                          rel="noopener"
                          className="inline-block px-3 py-1.5 text-xs rounded bg-slate-900 text-white hover:bg-slate-700"
                        >
                          📄 Öffnen
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </PortalShell>
  );
}

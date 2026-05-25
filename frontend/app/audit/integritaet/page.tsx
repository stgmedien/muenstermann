import Link from "next/link";
import { TamperDemoPanel } from "./TamperDemoPanel";

export const dynamic = "force-dynamic";

export default function IntegritaetPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <header>
        <Link href="/audit" className="text-sm text-blue-600 hover:underline">
          ← Audit-Übersicht
        </Link>
        <h1 className="text-2xl font-semibold mt-2">Integritäts-Beweis</h1>
        <p className="text-sm text-slate-500 mt-1">
          Diese Seite demonstriert für Auditoren, dass die Hash-Chain auf der
          Audit-Tabelle nachweislich Manipulationen aufdeckt — auch dann, wenn
          jemand mit Datenbank-Zugriff direkt eine Zeile editiert.
        </p>
      </header>

      <section className="rounded-lg bg-slate-50 border border-slate-200 p-5">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-2">
          Konzept in einem Satz
        </h2>
        <p className="text-sm text-slate-700">
          Jede Audit-Zeile trägt einen SHA-256-Hash über ihren eigenen Inhalt
          plus den Hash der vorherigen Zeile. Wer auch nur ein einzelnes Feld
          einer alten Zeile verändert, hinterlässt eine erkennbare Spur in jeder
          nachfolgenden Zeile — denn der Hash passt nicht mehr.
        </p>
        <details className="mt-3 text-xs text-slate-600">
          <summary className="cursor-pointer font-medium">Mathematischer Hintergrund</summary>
          <div className="mt-2 pl-3 border-l-2 border-slate-300 space-y-1">
            <div>
              <code className="font-mono">
                hash_n = sha256(felder_n ∥ hash_{`{n-1}`})
              </code>
            </div>
            <div>
              Manipulation einer Zeile n ändert hash_n → hash_{`{n+1}`} stimmt
              nicht mehr → ein einzelner Verify-Lauf über die ganze Tabelle
              entdeckt jede nachträgliche Veränderung.
            </div>
            <div>
              Eine vollständige Fälschung erfordert: Manipulation aller Zeilen
              von n bis Tabellenende. Das ist mit Datenbank-Trigger-Definition
              und Backup-Vergleich für einen Auditor leicht aufzuspüren.
            </div>
          </div>
        </details>
      </section>

      <TamperDemoPanel />

      <section className="text-xs text-slate-500 space-y-1">
        <div className="font-semibold text-slate-600">Was die Demo nicht ersetzt</div>
        <ul className="list-disc list-inside space-y-1">
          <li>
            Regelmäßige (z. B. tägliche) verify_chain()-Läufe in einem
            Monitoring-Job, plus Alarmierung bei ok=false.
          </li>
          <li>
            Off-site-Backup der current_hash-Werte (z. B. Hash des letzten Eintrags
            zum Geschäftsschluss an einen externen Logger schicken).
          </li>
          <li>
            Datenbank-Berechtigungen so beschränken, dass nur die App
            INSERT/UPDATE-Rechte auf audit-Tabellen besitzt — nicht jeder
            DB-Nutzer.
          </li>
        </ul>
      </section>
    </div>
  );
}

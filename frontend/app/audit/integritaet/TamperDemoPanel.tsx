"use client";

import { useState, useTransition } from "react";
import { runTamperDemo, type TamperResult } from "./actions";

export function TamperDemoPanel() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<TamperResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  function run() {
    setError(null);
    setResult(null);
    startTransition(async () => {
      try {
        const r = await runTamperDemo();
        setResult(r);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  }

  return (
    <section className="rounded-lg bg-white border border-slate-200 p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Beweis-Test: Manipulation der Audit-Tabelle
          </h2>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Die Demo verändert programmatisch ein Feld in der jüngsten Audit-Zeile
            durch ein UPDATE — exakt der Angriffsvektor, vor dem die Hash-Chain
            schützen soll. Anschließend wird <code className="font-mono text-xs">verify_chain()</code>{" "}
            ausgeführt und die manipulierte Zeile sollte erkannt werden. Im
            dritten Schritt wird der Originalwert wiederhergestellt und Verify
            muss wieder grün sein.
          </p>
        </div>
      </div>

      {!confirmed ? (
        <div className="rounded-md bg-amber-50 border border-amber-300 p-4 text-sm">
          <div className="font-semibold text-amber-900 mb-1">
            ⚠ Hinweis: Schreibt kurzfristig in die Audit-Tabelle
          </div>
          <p className="text-amber-800 mb-3">
            Die Demo verändert eine Audit-Zeile und stellt sie unmittelbar wieder
            her. Ein EXCEPTION-Handler garantiert die Wiederherstellung auch bei
            Fehlern. Der Vorgang wird selbst nicht ins Audit-Log geschrieben
            (Audit-Schema ist nicht selbstprotokollierend) — was bedeutet: nach
            der Demo ist die Tabelle bit-identisch zum Vor-Zustand.
          </p>
          <button
            type="button"
            onClick={() => setConfirmed(true)}
            className="px-4 py-2 text-sm rounded-md bg-amber-700 text-white hover:bg-amber-800"
          >
            Verstanden — Demo aktivieren
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={run}
          disabled={pending}
          className="px-4 py-2 text-sm rounded-md bg-rose-700 text-white hover:bg-rose-800 disabled:opacity-50"
        >
          {pending ? "Demo läuft…" : "▶ Beweis-Test starten"}
        </button>
      )}

      {error && (
        <div className="rounded-md bg-rose-50 border border-rose-200 p-3 text-sm text-rose-900">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-3">
          <div className="rounded-md border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left">Schritt</th>
                  <th className="px-3 py-2 text-left w-32">Status</th>
                  <th className="px-3 py-2 text-right w-24">Einträge</th>
                  <th className="px-3 py-2 text-left">Bruch bei ID</th>
                  <th className="px-3 py-2 text-right w-24">Dauer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {result.steps.map((s, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 font-medium">{s.step}</td>
                    <td className="px-3 py-2">
                      {s.ok ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-xs font-semibold">
                          ✓ INTEGER
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 text-xs font-semibold">
                          ✗ TAMPERING ERKANNT
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-600">
                      {s.totalRows.toLocaleString("de-DE")}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {s.brokenAtId ? (
                        <span className="text-rose-700">#{s.brokenAtId}</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-500">
                      {s.elapsedMs} ms
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {result.steps.some((s) => !s.ok) && (
            <div className="rounded-md bg-rose-50 border border-rose-200 p-3 text-xs">
              <div className="font-semibold text-rose-900 mb-1">
                Bruch-Detail (Schritt 2):
              </div>
              <code className="block text-rose-800 font-mono whitespace-pre-wrap">
                {result.steps.find((s) => !s.ok)?.brokenReason}
              </code>
            </div>
          )}

          <div className="rounded-md bg-emerald-50 border border-emerald-300 p-3 text-sm text-emerald-900">
            <div className="font-semibold mb-1">Bewertung</div>
            {result.steps.length === 3 &&
            result.steps[0].ok &&
            !result.steps[1].ok &&
            result.steps[2].ok ? (
              <div>
                ✓ Die Hash-Chain funktioniert wie erwartet: vor der Manipulation
                konsistent → Manipulation wurde an Zeile #
                {result.steps[1].brokenAtId} eindeutig erkannt → nach
                Wiederherstellung wieder konsistent. Das bedeutet:{" "}
                <strong>nachträgliche Datenänderungen an der Audit-Spur sind
                nicht spurlos möglich.</strong>
              </div>
            ) : (
              <div>
                ⚠ Unerwartetes Demo-Ergebnis — bitte Detail-Tabelle prüfen.
              </div>
            )}
          </div>

          <div className="text-xs text-slate-400">
            Demo-Zieleintrag: #{result.steps[0]?.targetId} · Gesamtlaufzeit:{" "}
            {result.totalMs} ms · ausgeführt:{" "}
            {new Date(result.ranAt).toLocaleString("de-DE")}
          </div>
        </div>
      )}
    </section>
  );
}

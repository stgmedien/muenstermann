"use client";

import { useState, useTransition } from "react";
import { verifyAuditChain, type VerifyResult } from "./actions";

export function VerifyChainPanel() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function run() {
    setError(null);
    startTransition(async () => {
      try {
        const r = await verifyAuditChain();
        setResult(r);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  }

  return (
    <section className="rounded-lg bg-white border border-slate-200 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-1">
            Hash-Chain Integrität
          </h2>
          <p className="text-xs text-slate-600">
            Jeder Eintrag enthält SHA-256-Hash über alle Felder plus den Hash des vorherigen Eintrags.
            Verify durchläuft die gesamte Chain und meldet die erste Inkonsistenz.
          </p>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={pending}
          className="px-4 py-2 text-sm rounded-md bg-slate-900 text-white hover:bg-slate-700 disabled:opacity-50 whitespace-nowrap"
        >
          {pending ? "Verifiziere…" : "Chain verifizieren"}
        </button>
      </div>

      {error && (
        <div className="mt-3 rounded-md bg-rose-50 border border-rose-200 p-3 text-sm text-rose-900">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-4 grid md:grid-cols-3 gap-3 text-sm">
          <Stat
            label="Status"
            value={result.ok ? "✓ INTEGER" : "✗ TAMPERING"}
            color={result.ok ? "emerald" : "rose"}
          />
          <Stat label="Geprüfte Einträge" value={result.total.toLocaleString("de-DE")} />
          <Stat label="Laufzeit" value={`${result.ms} ms`} />
          {!result.ok && (
            <div className="md:col-span-3 rounded-md bg-rose-50 border border-rose-200 p-3 text-sm">
              <div className="font-semibold text-rose-900 mb-1">
                Inkonsistenz bei Eintrag #{result.brokenAtId}
              </div>
              <div className="font-mono text-xs text-rose-800">{result.reason}</div>
            </div>
          )}
          <div className="md:col-span-3 text-xs text-slate-500">
            verifiziert: {new Date(result.verifiedAt).toLocaleString("de-DE")}
          </div>
        </div>
      )}
    </section>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: "emerald" | "rose";
}) {
  const colorClass =
    color === "emerald"
      ? "text-emerald-700 bg-emerald-50 border-emerald-200"
      : color === "rose"
        ? "text-rose-700 bg-rose-50 border-rose-200"
        : "bg-slate-50 border-slate-200 text-slate-900";
  return (
    <div className={`rounded-md border p-3 ${colorClass}`}>
      <div className="text-xl font-semibold tabular-nums">{value}</div>
      <div className="text-xs mt-0.5 opacity-80">{label}</div>
    </div>
  );
}

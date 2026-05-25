"use client";

import { useState } from "react";
import { SignaturePad } from "@/app/m/[tourId]/abnahme/SignaturePad";
import { acceptTourViaPortal } from "./actions";

type Task = {
  id: number;
  department_name_snapshot: string | null;
  object_name_snapshot: string | null;
  status: string;
  comment: string | null;
  photo_count: number;
};

type Decision = "ACCEPTED" | "DISPUTED";

export function AcceptanceForm({
  tourId,
  tasks,
}: {
  tourId: number;
  tasks: Task[];
}) {
  const [decisions, setDecisions] = useState<Record<number, Decision>>(() =>
    // Default ACCEPTED — Kunde hakt nur ab, was er beanstandet
    Object.fromEntries(tasks.map((t) => [t.id, "ACCEPTED" as Decision])),
  );
  const [reasons, setReasons] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const disputed = tasks.filter((t) => decisions[t.id] === "DISPUTED");
  const allReasonsGiven = disputed.every(
    (t) => (reasons[t.id] ?? "").trim().length > 0,
  );

  return (
    <form
      action={acceptTourViaPortal}
      onSubmit={() => setSubmitting(true)}
      className="space-y-4"
    >
      <input type="hidden" name="tour_id" value={tourId} />

      <div className="space-y-2">
        {tasks.map((t) => {
          const d = decisions[t.id];
          const wasFlaggedByForeman = t.status === "PROBLEM";
          return (
            <div
              key={t.id}
              className={`rounded-lg border p-3 ${
                d === "ACCEPTED"
                  ? "bg-emerald-50 border-emerald-200"
                  : "bg-rose-50 border-rose-300"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="font-medium text-slate-900 flex items-center gap-2">
                    {t.object_name_snapshot ?? "—"}
                    {wasFlaggedByForeman && (
                      <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold">
                        ⚠ Vorarbeiter hat Problem markiert
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {t.department_name_snapshot}
                  </div>
                  {t.comment && (
                    <div className="text-xs text-slate-700 mt-1 italic bg-white/60 px-2 py-1 rounded">
                      Vorarbeiter-Notiz: „{t.comment}"
                    </div>
                  )}
                  {t.photo_count > 0 && (
                    <div className="text-xs text-slate-500 mt-1">
                      📷 {t.photo_count} Foto-Beleg{t.photo_count === 1 ? "" : "e"}
                    </div>
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      setDecisions((p) => ({ ...p, [t.id]: "ACCEPTED" }))
                    }
                    className={`w-12 h-12 rounded-md text-lg font-bold ${
                      d === "ACCEPTED"
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-100 text-slate-400 hover:bg-emerald-100"
                    }`}
                    aria-label="abnehmen"
                    title="Diese Position akzeptieren"
                  >
                    ✓
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setDecisions((p) => ({ ...p, [t.id]: "DISPUTED" }))
                    }
                    className={`w-12 h-12 rounded-md text-lg font-bold ${
                      d === "DISPUTED"
                        ? "bg-rose-600 text-white"
                        : "bg-slate-100 text-slate-400 hover:bg-rose-100"
                    }`}
                    aria-label="beanstanden"
                    title="Diese Position beanstanden"
                  >
                    ✗
                  </button>
                </div>
              </div>

              <input type="hidden" name={`accept_${t.id}`} value={d} />

              {d === "DISPUTED" && (
                <textarea
                  name={`reason_${t.id}`}
                  rows={2}
                  required
                  placeholder="Was war nicht in Ordnung? (Pflichtfeld — wird zur Beanstandung)"
                  value={reasons[t.id] ?? ""}
                  onChange={(e) =>
                    setReasons((p) => ({ ...p, [t.id]: e.target.value }))
                  }
                  className="mt-3 w-full px-3 py-2 rounded-md border border-rose-300 bg-white text-sm focus:border-rose-500 focus:outline-none"
                  maxLength={2000}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="rounded-lg bg-white border border-slate-200 p-4 space-y-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Name der abnehmenden Person *
          </label>
          <input
            type="text"
            name="signer_name"
            required
            maxLength={200}
            placeholder="z. B. Maria Schmidt"
            className="w-full px-3 py-2 rounded-md border border-slate-300 bg-white text-base focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Position (optional)
          </label>
          <input
            type="text"
            name="signer_role"
            maxLength={200}
            placeholder="z. B. Produktionsleiter"
            className="w-full px-3 py-2 rounded-md border border-slate-300 bg-white text-base focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Unterschrift *
          </label>
          <SignaturePad />
        </div>
      </div>

      {disputed.length > 0 && (
        <div className="rounded-lg bg-amber-50 border border-amber-300 p-3 text-sm text-amber-900">
          <div className="font-semibold mb-0.5">
            ⚠ {disputed.length} Position
            {disputed.length === 1 ? "" : "en"} beanstandet
          </div>
          <p className="text-xs">
            Die Tour wird als <strong>DISPUTED</strong> markiert. Für jede
            Beanstandung wird automatisch eine Aufgabe für Münstermann erzeugt.
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || !allReasonsGiven}
        className="w-full py-4 rounded-lg bg-slate-900 text-white font-semibold text-base disabled:opacity-50 disabled:cursor-not-allowed sticky bottom-4 shadow-lg"
      >
        {submitting
          ? "Wird abgeschickt…"
          : `Unterschreiben & ${disputed.length > 0 ? "beanstanden" : "abnehmen"}`}
      </button>

      {!allReasonsGiven && (
        <div className="text-xs text-rose-700 text-center">
          Bei beanstandeten Positionen ist eine Begründung Pflicht.
        </div>
      )}
    </form>
  );
}

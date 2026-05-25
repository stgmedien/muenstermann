"use client";

import { useState } from "react";
import { SignaturePad } from "./SignaturePad";
import { finalizeTourAcceptance } from "@/app/touren/actions";

type Task = {
  id: number;
  department_name_snapshot: string | null;
  object_name_snapshot: string | null;
  status: string;
  comment: string | null;
};

type Decision = "ACCEPTED" | "DISPUTED" | null;

export function AcceptanceForm({
  tourId,
  tasks,
}: {
  tourId: number;
  tasks: Task[];
}) {
  // Pro Task: Decision + Reason
  const [decisions, setDecisions] = useState<Record<number, Decision>>(() =>
    Object.fromEntries(tasks.map((t) => [t.id, "ACCEPTED" as Decision])),
  );
  const [reasons, setReasons] = useState<Record<number, string>>({});

  const undecided = tasks.filter((t) => !decisions[t.id]).length;
  const disputed = tasks.filter((t) => decisions[t.id] === "DISPUTED");
  const allDecided = undecided === 0;
  const allReasonsGiven = disputed.every((t) => (reasons[t.id] ?? "").trim().length > 0);

  return (
    <form action={finalizeTourAcceptance} className="space-y-4">
      <input type="hidden" name="tour_id" value={tourId} />

      <div className="space-y-2">
        {tasks.map((t) => {
          const d = decisions[t.id];
          return (
            <div
              key={t.id}
              className={`rounded-lg border p-3 ${
                d === "ACCEPTED"
                  ? "bg-emerald-50 border-emerald-200"
                  : d === "DISPUTED"
                    ? "bg-rose-50 border-rose-300"
                    : "bg-white border-slate-200"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="font-medium text-slate-900">
                    {t.object_name_snapshot ?? "—"}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {t.department_name_snapshot}
                  </div>
                  {t.comment && (
                    <div className="text-xs text-slate-600 mt-1 italic">
                      Vorarbeiter-Notiz: „{t.comment}"
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
                  >
                    ✗
                  </button>
                </div>
              </div>

              <input type="hidden" name={`accept_${t.id}`} value={d ?? ""} />

              {d === "DISPUTED" && (
                <textarea
                  name={`reason_${t.id}`}
                  rows={2}
                  required
                  placeholder="Was war nicht ok? (Pflichtfeld)"
                  value={reasons[t.id] ?? ""}
                  onChange={(e) =>
                    setReasons((p) => ({ ...p, [t.id]: e.target.value }))
                  }
                  className="mt-3 w-full px-3 py-2 rounded-md border border-rose-300 bg-white text-sm focus:border-rose-500 focus:outline-none"
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="rounded-lg bg-white border border-slate-200 p-4 space-y-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Name der abnehmenden Person
          </label>
          <input
            type="text"
            name="signer_name"
            required
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
            placeholder="z. B. Produktionsleiter"
            className="w-full px-3 py-2 rounded-md border border-slate-300 bg-white text-base focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Unterschrift
          </label>
          <SignaturePad />
        </div>
      </div>

      {disputed.length > 0 && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
          ⚠ {disputed.length} Punkt{disputed.length === 1 ? "" : "e"} beanstandet — die Tour wird als DISPUTED markiert und es entstehen Nacharbeit-Aufgaben.
        </div>
      )}

      <button
        type="submit"
        disabled={!allDecided || !allReasonsGiven}
        className="w-full py-4 rounded-lg bg-slate-900 text-white font-semibold text-base disabled:opacity-50 disabled:cursor-not-allowed sticky bottom-4 shadow-lg"
      >
        Unterschreiben & abschließen
      </button>

      {!allDecided && (
        <div className="text-xs text-slate-500 text-center">
          Bitte alle {tasks.length} Punkte mit ✓ oder ✗ markieren ({undecided} offen)
        </div>
      )}
    </form>
  );
}

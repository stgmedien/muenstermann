"use client";

import { useState, useTransition } from "react";
import { sheetCellAction } from "../actions";

type Cell = {
  task_id: number;
  status: string; // PENDING / DONE / PROBLEM / SKIPPED
  customer_acceptance: string | null; // null / ACCEPTED / DISPUTED
  dispute_reason: string | null;
};

const V_SYMBOLS: Record<string, { sym: string; cls: string; label: string }> = {
  PENDING: { sym: "·", cls: "bg-slate-100 text-slate-400 hover:bg-slate-200", label: "offen" },
  DONE: { sym: "✓", cls: "bg-emerald-500 text-white", label: "erledigt" },
  PROBLEM: { sym: "⚠", cls: "bg-amber-500 text-white", label: "Problem" },
  SKIPPED: { sym: "⊘", cls: "bg-slate-400 text-white", label: "übersprungen" },
};

const K_SYMBOLS: Record<string, { sym: string; cls: string; label: string }> = {
  null: { sym: "·", cls: "bg-slate-100 text-slate-400 hover:bg-slate-200", label: "nicht geprüft" },
  ACCEPTED: { sym: "✓", cls: "bg-blue-600 text-white", label: "akzeptiert" },
  DISPUTED: { sym: "✗", cls: "bg-rose-600 text-white", label: "beanstandet" },
};

export function SheetCell({ cell, sheetId, locked = false }: { cell: Cell | null; sheetId: number; locked?: boolean }) {
  const [pending, startTransition] = useTransition();
  const [showDispute, setShowDispute] = useState(false);
  const [v, setV] = useState(cell?.status ?? "PENDING");
  const [k, setK] = useState<string | null>(cell?.customer_acceptance ?? null);

  if (!cell) {
    return <div className="w-12 h-10 bg-slate-50" />;
  }
  // Narrow to non-null in closures (TS verliert Narrowing über Callback-Captures)
  const c: Cell = cell;

  const vIcon = V_SYMBOLS[v] ?? V_SYMBOLS.PENDING;
  const kIcon = K_SYMBOLS[k ?? "null"];

  const [showComment, setShowComment] = useState<"PROBLEM" | "SKIPPED" | null>(null);

  function applyV(target: "PENDING" | "DONE" | "PROBLEM" | "SKIPPED", commentText: string | null) {
    setV(target);
    const fd = new FormData();
    fd.append("task_id", String(c.task_id));
    fd.append("sheet_id", String(sheetId));
    fd.append("action", "v_set");
    fd.append("target_status", target);
    if (commentText) fd.append("comment", commentText);
    startTransition(async () => {
      try {
        await sheetCellAction(fd);
      } catch {
        // Rollback der optimistischen Anzeige bei Fehler
        setV(c.status);
      }
    });
  }

  function doVCycle() {
    const next = v === "PENDING" ? "DONE" : v === "DONE" ? "PROBLEM" : v === "PROBLEM" ? "SKIPPED" : "PENDING";
    if (next === "PROBLEM" || next === "SKIPPED") {
      // Dialog öffnen, Comment einsammeln, dann erst Update
      setShowComment(next);
      return;
    }
    applyV(next, null);
  }

  function doKAccept() {
    setK("ACCEPTED");
    const fd = new FormData();
    fd.append("task_id", String(c.task_id));
    fd.append("sheet_id", String(sheetId));
    fd.append("action", "k_accept");
    startTransition(async () => {
      await sheetCellAction(fd);
    });
  }

  function doKDispute(reason: string) {
    setK("DISPUTED");
    setShowDispute(false);
    const fd = new FormData();
    fd.append("task_id", String(c.task_id));
    fd.append("sheet_id", String(sheetId));
    fd.append("action", "k_dispute");
    fd.append("reason", reason);
    startTransition(async () => {
      await sheetCellAction(fd);
    });
  }

  function doKClear() {
    setK(null);
    const fd = new FormData();
    fd.append("task_id", String(c.task_id));
    fd.append("sheet_id", String(sheetId));
    fd.append("action", "k_clear");
    startTransition(async () => {
      await sheetCellAction(fd);
    });
  }

  function handleKClick() {
    // Cycle: null → ACCEPTED → DISPUTED-Dialog → null
    if (k === null) {
      doKAccept();
    } else if (k === "ACCEPTED") {
      setShowDispute(true);
    } else {
      doKClear();
    }
  }

  return (
    <div className={`relative ${pending ? "opacity-60" : ""}`}>
      <div className="flex gap-px">
        <button
          type="button"
          onClick={doVCycle}
          disabled={locked || pending}
          aria-label={`V: ${vIcon.label}`}
          title={`V: ${vIcon.label}`}
          className={`w-5 h-10 flex items-center justify-center text-sm font-bold ${vIcon.cls} ${
            locked ? "cursor-not-allowed" : "cursor-pointer"
          }`}
        >
          {vIcon.sym}
        </button>
        <button
          type="button"
          onClick={handleKClick}
          disabled={locked || pending}
          aria-label={`K: ${kIcon.label}`}
          title={`K: ${kIcon.label}`}
          className={`w-5 h-10 flex items-center justify-center text-sm font-bold ${kIcon.cls} ${
            locked ? "cursor-not-allowed" : "cursor-pointer"
          }`}
        >
          {kIcon.sym}
        </button>
      </div>
      {showDispute && (
        <DisputeDialog
          onConfirm={doKDispute}
          onCancel={() => setShowDispute(false)}
        />
      )}
      {showComment && (
        <CommentDialog
          kind={showComment}
          onConfirm={(text) => {
            applyV(showComment, text);
            setShowComment(null);
          }}
          onCancel={() => setShowComment(null)}
        />
      )}
    </div>
  );
}

function CommentDialog({
  kind,
  onConfirm,
  onCancel,
}: {
  kind: "PROBLEM" | "SKIPPED";
  onConfirm: (text: string) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState("");
  const title = kind === "PROBLEM" ? "Problem melden" : "Übersprungen melden";
  const placeholder =
    kind === "PROBLEM"
      ? "Was war auffällig? (z. B. Sieb fehlt, Boden uneben)"
      : "Warum konnte der Punkt nicht erledigt werden? (z. B. Halle gesperrt)";
  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-5 space-y-3">
        <h3 className="font-semibold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-600">
          Eine Begründung ist Pflicht. Sie wandert ins Audit-Log und ist im
          Backoffice einsehbar.
        </p>
        <textarea
          autoFocus
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 rounded-md border border-slate-300 bg-white text-sm focus:border-amber-500 focus:outline-none"
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-md border border-slate-300 hover:bg-slate-100"
          >
            Abbrechen
          </button>
          <button
            onClick={() => text.trim() && onConfirm(text.trim())}
            disabled={!text.trim()}
            className={`px-4 py-2 text-sm rounded-md text-white disabled:opacity-50 ${
              kind === "PROBLEM" ? "bg-amber-600 hover:bg-amber-700" : "bg-slate-600 hover:bg-slate-700"
            }`}
          >
            Speichern
          </button>
        </div>
      </div>
    </div>
  );
}

function DisputeDialog({
  onConfirm,
  onCancel,
}: {
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-5 space-y-3">
        <h3 className="font-semibold text-slate-900">Beanstandung</h3>
        <p className="text-sm text-slate-600">
          Was war an diesem Punkt nicht ok? Die Begründung wird im Audit-Log und als
          neue Complaint-Aufgabe gespeichert.
        </p>
        <textarea
          autoFocus
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="z. B. „Boden in Halle 3 nicht trocken"
          className="w-full px-3 py-2 rounded-md border border-slate-300 bg-white text-sm focus:border-rose-500 focus:outline-none"
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-md border border-slate-300 hover:bg-slate-100"
          >
            Abbrechen
          </button>
          <button
            onClick={() => reason.trim() && onConfirm(reason.trim())}
            disabled={!reason.trim()}
            className="px-4 py-2 text-sm rounded-md bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
          >
            Beanstanden
          </button>
        </div>
      </div>
    </div>
  );
}

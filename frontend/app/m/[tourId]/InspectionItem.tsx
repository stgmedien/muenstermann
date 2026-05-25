"use client";

import { useState, useTransition } from "react";
import { updateInspectionItem } from "@/app/touren/actions";

type Task = {
  id: number;
  department_name_snapshot: string | null;
  object_name_snapshot: string | null;
  interval_label_snapshot: string | null;
  status: string;
  comment: string | null;
};

export function InspectionItem({ task, locked }: { task: Task; locked: boolean }) {
  const [expanded, setExpanded] = useState<"SKIPPED" | "PROBLEM" | null>(null);
  const [pending, startTransition] = useTransition();
  const [optimisticStatus, setOptimisticStatus] = useState(task.status);
  const [optimisticComment, setOptimisticComment] = useState(task.comment);

  const isDone = optimisticStatus !== "PENDING";

  return (
    <div
      className={`rounded-lg border p-4 ${
        optimisticStatus === "DONE"
          ? "bg-emerald-50 border-emerald-200"
          : optimisticStatus === "PROBLEM"
            ? "bg-amber-50 border-amber-200"
            : optimisticStatus === "SKIPPED"
              ? "bg-slate-100 border-slate-200"
              : "bg-white border-slate-200"
      } ${pending ? "opacity-60" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="font-medium text-slate-900">
            {task.object_name_snapshot ?? "—"}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            {task.department_name_snapshot ?? ""}
            {task.interval_label_snapshot && ` · ${task.interval_label_snapshot}`}
          </div>
          {optimisticComment && (
            <div className="text-xs text-slate-700 mt-1.5 bg-white/60 px-2 py-1 rounded">
              {optimisticComment}
            </div>
          )}
        </div>
        {isDone && (
          <StatusPill status={optimisticStatus} />
        )}
      </div>

      {!isDone && !locked && (
        <div className="mt-3 flex gap-2">
          <form
            action={(fd) => {
              startTransition(async () => {
                setOptimisticStatus("DONE");
                await updateInspectionItem(fd);
              });
            }}
            className="flex-1"
          >
            <input type="hidden" name="task_id" value={task.id} />
            <input type="hidden" name="status" value="DONE" />
            <button
              type="submit"
              disabled={pending}
              className="w-full py-3 rounded-md bg-emerald-600 text-white font-medium text-sm active:bg-emerald-800"
            >
              ✓ Erledigt
            </button>
          </form>
          <button
            type="button"
            onClick={() => setExpanded(expanded === "PROBLEM" ? null : "PROBLEM")}
            disabled={pending}
            className="flex-1 py-3 rounded-md bg-amber-500 text-white font-medium text-sm active:bg-amber-700"
          >
            ⚠ Problem
          </button>
          <button
            type="button"
            onClick={() => setExpanded(expanded === "SKIPPED" ? null : "SKIPPED")}
            disabled={pending}
            className="py-3 px-3 rounded-md bg-slate-400 text-white font-medium text-sm active:bg-slate-600"
          >
            ⊘
          </button>
        </div>
      )}

      {expanded && !isDone && (
        <form
          action={(fd) => {
            startTransition(async () => {
              const comment = String(fd.get("comment") ?? "").trim();
              if (!comment) return;
              setOptimisticStatus(expanded);
              setOptimisticComment(comment);
              setExpanded(null);
              await updateInspectionItem(fd);
            });
          }}
          className="mt-3 space-y-2"
        >
          <input type="hidden" name="task_id" value={task.id} />
          <input type="hidden" name="status" value={expanded} />
          <textarea
            name="comment"
            rows={2}
            required
            placeholder={
              expanded === "SKIPPED"
                ? "Warum nicht möglich? (z. B. Halle gesperrt)"
                : "Was war auffällig? (z. B. Sieb fehlt)"
            }
            className="w-full px-3 py-2 rounded-md border border-slate-300 bg-white text-sm focus:border-blue-500 focus:outline-none"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="flex-1 py-2 rounded-md bg-slate-900 text-white text-sm"
            >
              {expanded === "SKIPPED" ? "Übersprungen melden" : "Problem melden"}
            </button>
            <button
              type="button"
              onClick={() => setExpanded(null)}
              className="px-4 py-2 rounded-md border border-slate-300 text-sm"
            >
              Abbrechen
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    DONE: { label: "✓", color: "bg-emerald-600 text-white" },
    SKIPPED: { label: "⊘", color: "bg-slate-500 text-white" },
    PROBLEM: { label: "⚠", color: "bg-amber-500 text-white" },
  };
  const m = map[status] ?? { label: status, color: "bg-slate-200" };
  return (
    <div
      className={`w-9 h-9 rounded-full flex items-center justify-center font-bold ${m.color}`}
    >
      {m.label}
    </div>
  );
}

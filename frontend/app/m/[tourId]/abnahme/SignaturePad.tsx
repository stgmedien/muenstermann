"use client";

import { useEffect, useRef, useState } from "react";

export function SignaturePad({ name = "signature_png" }: { name?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [empty, setEmpty] = useState(true);
  const [drawing, setDrawing] = useState(false);
  const [hiddenValue, setHiddenValue] = useState("");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // High-DPI fit
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    ctx.scale(ratio, ratio);
    ctx.strokeStyle = "#0f172a"; // slate-900
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function onDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    setDrawing(true);
  }

  function onMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const p = pos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    if (empty) setEmpty(false);
  }

  function onUp() {
    setDrawing(false);
    // Auto-commit aktuellen Stand in das Hidden-Field
    const canvas = canvasRef.current;
    if (canvas && !empty) {
      setHiddenValue(canvas.toDataURL("image/png"));
    }
  }

  function clear() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setEmpty(true);
    setHiddenValue("");
  }

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
        style={{ touchAction: "none" }}
        className="w-full h-40 rounded-md border-2 border-dashed border-slate-300 bg-white cursor-crosshair"
      />
      <input type="hidden" name={name} value={hiddenValue} />
      <div className="flex justify-between text-sm">
        <span className="text-slate-500">
          {empty ? "Hier mit dem Finger unterschreiben" : "Unterschrift erfasst"}
        </span>
        <button
          type="button"
          onClick={clear}
          className="text-slate-600 hover:text-slate-900"
        >
          Löschen
        </button>
      </div>
    </div>
  );
}

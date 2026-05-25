"use client";

export function PrintButton() {
  return (
    <div className="no-print" style={{ marginBottom: 12 }}>
      <button
        type="button"
        onClick={() => window.print()}
        style={{
          padding: "6px 14px",
          background: "#0f172a",
          color: "white",
          border: "none",
          borderRadius: 4,
          fontSize: "9pt",
          cursor: "pointer",
        }}
      >
        🖨 Drucken oder als PDF speichern (Cmd+P)
      </button>
    </div>
  );
}

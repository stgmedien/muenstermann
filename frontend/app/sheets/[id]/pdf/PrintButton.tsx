"use client";

export function PrintButton() {
  return (
    <div className="no-print" style={{ marginBottom: 14, fontSize: "9pt" }}>
      <button
        onClick={() => window.print()}
        style={{
          padding: "6px 12px",
          background: "#0f172a",
          color: "white",
          border: "none",
          borderRadius: 4,
          cursor: "pointer",
        }}
        type="button"
      >
        🖨 Drucken oder als PDF speichern (Cmd+P)
      </button>
      <span style={{ marginLeft: 12, color: "#666" }}>
        Im Druck-Dialog &quot;Als PDF speichern&quot; wählen.
      </span>
    </div>
  );
}

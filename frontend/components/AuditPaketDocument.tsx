// Render-Komponente für das Audit-Paket-PDF.
// Stateless: nimmt geladene Daten + Header-Optionen entgegen.
// Wird genutzt aus Admin- UND Portal-Routen (gleiche Optik).

import type { AuditPaketData } from "@/lib/audit-paket";

export function AuditPaketDocument({
  data,
  from,
  to,
  month,
  context,
}: {
  data: AuditPaketData;
  from: string;
  to: string;
  month: string;
  context: "admin" | "portal";
}) {
  const { customer, sheets, tours, complaints, signatures, photos, verify } = data;

  return (
    <div className="paket-doc">
      <title>{`Audit-Paket ${customer.name} ${month}`}</title>
      <style>{`
        @page { size: A4; margin: 14mm; }
        .paket-doc { font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                     color: #1a1a1a; font-size: 9.5pt; line-height: 1.4; padding: 16px;
                     background: white; max-width: 900px; margin: 0 auto; }
        .paket-doc h1 { font-size: 16pt; margin: 0 0 4px; }
        .paket-doc h2 { font-size: 11pt; margin: 22px 0 8px; text-transform: uppercase;
                        color: #475569; letter-spacing: 0.5px; border-bottom: 1px solid #cbd5e1;
                        padding-bottom: 2px; }
        .paket-doc .meta { color: #64748b; font-size: 9pt; }
        .paket-doc .meta strong { color: #1a1a1a; }
        .paket-doc table { border-collapse: collapse; width: 100%; font-size: 8.5pt;
                            margin-top: 4px; }
        .paket-doc th, .paket-doc td { border: 0.5pt solid #cbd5e1; padding: 4px 6px;
                                        text-align: left; vertical-align: top; }
        .paket-doc th { background: #f1f5f9; font-weight: 600; font-size: 8pt;
                        text-transform: uppercase; letter-spacing: 0.3px; color: #475569; }
        .paket-doc td.num { text-align: right; font-variant-numeric: tabular-nums; }
        .paket-doc .verify-ok { background: #d1fae5; color: #047857; padding: 4px 8px;
                                 border-radius: 4px; font-weight: 600; display: inline-block; }
        .paket-doc .verify-fail { background: #fee2e2; color: #991b1b; padding: 4px 8px;
                                   border-radius: 4px; font-weight: 600; display: inline-block; }
        .paket-doc .verify-box { background: #f8fafc; border: 1px solid #cbd5e1;
                                  padding: 10px; border-radius: 4px; margin: 6px 0; }
        .paket-doc .complaint { background: #fef2f2; border-left: 3px solid #ef4444;
                                 padding: 6px 10px; margin: 4px 0; font-size: 9pt; }
        .paket-doc .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .paket-doc .sig-box { border: 1px solid #cbd5e1; padding: 8px; border-radius: 4px;
                              background: white; }
        .paket-doc .sig-box img { max-height: 60px; max-width: 100%; }
        .paket-doc .sig-meta { font-size: 8pt; color: #64748b; margin-top: 4px; }
        .paket-doc .footer { margin-top: 24px; font-size: 7.5pt; color: #94a3b8;
                              border-top: 1px solid #e2e8f0; padding-top: 8px; }
        .paket-doc .compliance-stamp { display: inline-block; border: 2px solid #475569;
                                        padding: 6px 10px; border-radius: 4px; font-size: 8pt;
                                        font-weight: 600; color: #475569; }
        .paket-doc .source-stamp { font-size: 7.5pt; color: #94a3b8; margin-top: 4px; }
        @media print {
          .no-print { display: none; }
          body { background: white !important; }
          .paket-doc { padding: 0 !important; max-width: none !important; }
        }
      `}</style>

      <h1>Audit-Paket</h1>
      <p className="meta">
        <strong>{customer.name}</strong> (Kunden-Nr. {customer.customer_number})
        {customer.city && `, ${customer.city}`}
        {customer.federal_state && ` · ${customer.federal_state}`}
        <br />
        Zeitraum: <strong>{from}</strong> bis <strong>{to}</strong>
        <br />
        Generiert: <strong>{new Date().toLocaleString("de-DE")}</strong>
        {` · `}
        <span className="compliance-stamp">HACCP · IFS · GefStoffV</span>
      </p>
      <p className="source-stamp">
        Quelle: {context === "portal"
          ? "Self-Service-Download aus dem Kunden-Portal"
          : "Backoffice-Export"} · Hash-Chain-verifiziertes Dokument
      </p>

      <h2>1. Hash-Chain-Integrität</h2>
      <div className="verify-box">
        {verify.ok ? (
          <>
            <span className="verify-ok">✓ INTEGER</span>
            <span style={{ marginLeft: 12, fontSize: "9pt" }}>
              Alle <strong>{Number(verify.total_rows).toLocaleString("de-DE")}</strong> Audit-Einträge
              haben gültige SHA-256-Verkettung. Kein Tampering nachweisbar.
            </span>
          </>
        ) : (
          <>
            <span className="verify-fail">✗ TAMPERING ERKANNT</span>
            <div style={{ marginTop: 6, fontSize: "9pt", color: "#991b1b" }}>
              Erste Inkonsistenz bei Eintrag #{verify.broken_at_id}: {verify.broken_reason}
            </div>
          </>
        )}
      </div>

      <h2>2. Reinigungs-Sheets ({sheets.length})</h2>
      {sheets.length === 0 ? (
        <p className="meta">Keine Sheets im Zeitraum.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th style={{ width: 40 }}>ID</th>
              <th>Titel</th>
              <th style={{ width: 140 }}>Zeitraum</th>
              <th style={{ width: 70 }}>Status</th>
              <th className="num" style={{ width: 50 }}>V✓</th>
              <th className="num" style={{ width: 50 }}>V⚠</th>
              <th className="num" style={{ width: 50 }}>K✓</th>
              <th className="num" style={{ width: 50 }}>K✗</th>
              <th className="num" style={{ width: 50 }}>Σ</th>
            </tr>
          </thead>
          <tbody>
            {sheets.map((s) => (
              <tr key={s.id}>
                <td>#{s.id}</td>
                <td>{s.title ?? "—"}</td>
                <td>{s.period_from} – {s.period_to}</td>
                <td>{s.status}</td>
                <td className="num">{s.done}</td>
                <td className="num">{s.problem}</td>
                <td className="num">{s.accepted}</td>
                <td className="num">{s.disputed}</td>
                <td className="num">{s.task_total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>3. Touren ({tours.length})</h2>
      {tours.length === 0 ? (
        <p className="meta">Keine Touren im Zeitraum.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th style={{ width: 40 }}>ID</th>
              <th style={{ width: 100 }}>Datum</th>
              <th style={{ width: 90 }}>Status</th>
              <th className="num" style={{ width: 50 }}>V✓</th>
              <th className="num" style={{ width: 50 }}>V⚠</th>
              <th className="num" style={{ width: 50 }}>K✓</th>
              <th className="num" style={{ width: 50 }}>K✗</th>
              <th className="num" style={{ width: 50 }}>Σ</th>
            </tr>
          </thead>
          <tbody>
            {tours.map((t) => (
              <tr key={t.id}>
                <td>#{t.id}</td>
                <td>{t.tour_date}</td>
                <td>{t.status}</td>
                <td className="num">{t.done}</td>
                <td className="num">{t.problem}</td>
                <td className="num">{t.accepted}</td>
                <td className="num">{t.disputed}</td>
                <td className="num">{t.task_total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>4. Beanstandungen ({complaints.length})</h2>
      {complaints.length === 0 ? (
        <p className="meta">Keine Beanstandungen im Zeitraum.</p>
      ) : (
        <div>
          {complaints.map((c) => (
            <div key={c.id} className="complaint">
              <div style={{ fontSize: "8pt", color: "#64748b" }}>
                #{c.id} · {new Date(c.created_at).toLocaleString("de-DE")} · Status: <strong>{c.status}</strong>
                {c.inspection_task_id && ` · Task #${c.inspection_task_id}`}
              </div>
              <div style={{ marginTop: 2 }}>{c.description}</div>
            </div>
          ))}
        </div>
      )}

      <h2>5. Foto-Belege ({photos.length})</h2>
      {photos.length === 0 ? (
        <p className="meta">Keine Foto-Belege im Zeitraum.</p>
      ) : (
        <div className="signatures">
          {photos.map((p) => (
            <div key={p.id} className="sig-box">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/photo/${p.id}`}
                alt={p.caption ?? "Foto-Beleg"}
                style={{ maxHeight: 120, maxWidth: "100%", objectFit: "contain" }}
              />
              <div className="sig-meta">
                <strong>{p.department_name ?? "—"}</strong>
                {p.object_name && ` · ${p.object_name}`}
                <br />
                Status: <strong>{p.task_status}</strong>
                {p.caption && <><br />„{p.caption}"</>}
                {p.task_comment && <><br /><em>Notiz: {p.task_comment}</em></>}
                <br />
                {new Date(p.uploaded_at).toLocaleString("de-DE")} · {p.uploaded_by}
              </div>
            </div>
          ))}
        </div>
      )}

      <h2>6. Signaturen ({signatures.length})</h2>
      {signatures.length === 0 ? (
        <p className="meta">Keine Signaturen im Zeitraum.</p>
      ) : (
        <div className="signatures">
          {signatures.map((s) => (
            <div key={s.id} className="sig-box">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.signature_png} alt="Unterschrift" />
              <div className="sig-meta">
                <strong>{s.signer_name}</strong>
                {s.signer_role && ` · ${s.signer_role}`}
                <br />
                {new Date(s.signed_at).toLocaleString("de-DE")} · {s.signer_kind}
                {s.cleaning_sheet_id && ` · Sheet #${s.cleaning_sheet_id}`}
                {s.tour_id && ` · Tour #${s.tour_id}`}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="footer">
        Münstermann Reinigung · Audit-Paket nach HACCP/IFS-Standard · Hash-Chain-verifiziertes Dokument · Aufbewahrung: 5 Jahre.
      </div>
    </div>
  );
}

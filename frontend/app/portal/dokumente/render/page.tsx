import { notFound } from "next/navigation";
import { requirePortalUser } from "@/lib/portal-session";
import { loadAuditPaketData, monthRange } from "@/lib/audit-paket";
import { AuditPaketDocument } from "@/components/AuditPaketDocument";
import { PrintButton } from "@/app/audit/paket/render/PrintButton";

export const dynamic = "force-dynamic";

/**
 * Portal-Variante des Audit-Pakets.
 *
 * Sicherheits-Zusicherung:
 *  - customerId wird AUSSCHLIESSLICH aus der Portal-Session gezogen,
 *    nicht aus dem Query-String — damit ist Cross-Tenant-Zugriff
 *    konstruktiv ausgeschlossen.
 *  - Der Monats-Parameter ist nur ein Filter, kein Authz-Hebel.
 */
export default async function PortalPaketRenderPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const user = await requirePortalUser();
  const { month } = await searchParams;
  if (!month) notFound();

  let from: string;
  let to: string;
  try {
    [from, to] = monthRange(month);
  } catch {
    notFound();
  }

  const data = await loadAuditPaketData(user.customerId, from, to);
  if (!data) notFound();

  return (
    <>
      <PrintButton />
      <AuditPaketDocument
        data={data}
        from={from}
        to={to}
        month={month}
        context="portal"
      />
    </>
  );
}

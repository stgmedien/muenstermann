import { requirePortalUser } from "@/lib/portal-session";
import { PortalShell } from "../PortalShell";

export const dynamic = "force-dynamic";

export default async function PortalDokumentePage() {
  const user = await requirePortalUser();

  return (
    <PortalShell user={user} pathname="/portal/dokumente">
      <div className="space-y-4">
        <header>
          <h1 className="text-2xl font-semibold">Dokumente &amp; Berichte</h1>
          <p className="text-sm text-slate-500 mt-1">
            Monatliche Audit-Pakete, Hygieneplan-Auszüge und Vertragsdokumente.
          </p>
        </header>

        <div className="rounded-lg bg-amber-50 border border-amber-200 p-6 text-sm text-amber-900">
          <div className="font-semibold mb-1">In Entwicklung</div>
          <p>
            Der eigenständige Download-Bereich für Kunden ist noch nicht
            freigegeben. Bitte fordern Sie Ihr Audit-Paket vorerst über Ihren
            Ansprechpartner bei Münstermann an — wir werden dieses Feature in
            der nächsten Portal-Iteration aktivieren.
          </p>
        </div>
      </div>
    </PortalShell>
  );
}

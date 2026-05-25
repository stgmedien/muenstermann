"use server";

import { db, writeAsUser } from "@/lib/db";
import { sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { readSession } from "@/lib/portal-auth";

/**
 * Kunden-Abnahme via Portal.
 *
 * Sicherheits-Pflichten dieser Action:
 *  1. Portal-User authentisiert (über readSession)
 *  2. Tour gehört dem Customer des Portal-Users (sonst Abbruch)
 *  3. Tour ist im Status COMPLETED (sonst Abbruch — nicht ACCEPTED, nicht IN_PROGRESS)
 *  4. Audit-Actor wird als "portal:<username>" gesetzt
 *
 * FormData-Schema (identisch zur Tablet-Abnahme):
 *   tour_id              number
 *   signer_name          string
 *   signer_role          string (optional)
 *   signature_png        string (data:image/png;base64,...)
 *   accept_<taskId>      "ACCEPTED" | "DISPUTED"
 *   reason_<taskId>      string (Pflicht bei DISPUTED)
 */
export async function acceptTourViaPortal(formData: FormData) {
  // 1) Portal-Auth
  const session = await readSession();
  if (!session) {
    throw new Error("Nicht angemeldet.");
  }

  // 2) Tour + Ownership-Check
  const tourId = Number(formData.get("tour_id"));
  if (!Number.isFinite(tourId)) throw new Error("Ungültige Tour-ID.");

  const tourRows = await db.execute<{
    id: string | number;
    customer_id: string | number;
    status: string;
  }>(sql`
    select id, customer_id, status::text
      from ops.tour
     where id = ${tourId}
     limit 1
  `);
  const tour = tourRows[0];
  if (!tour) throw new Error("Tour nicht gefunden.");
  if (Number(tour.customer_id) !== session.cid) {
    // Cross-Tenant — bewusst gleicher Wortlaut wie "nicht gefunden",
    // damit kein Sichtbarkeits-Leak entsteht
    throw new Error("Tour nicht gefunden.");
  }
  if (tour.status !== "COMPLETED") {
    throw new Error(
      `Tour ist im Status ${tour.status} — Abnahme nur bei COMPLETED möglich.`,
    );
  }

  // 3) Username für Audit-Actor
  const userRows = await db.execute<{ username: string }>(sql`
    select username from core.customer_user where id = ${session.uid} limit 1
  `);
  const portalUsername = userRows[0]?.username ?? "unknown";
  const auditActor = `portal:${portalUsername}`;

  // 4) Formularinhalte
  const signerName = String(formData.get("signer_name") ?? "").trim();
  const signerRole = String(formData.get("signer_role") ?? "").trim() || null;
  const signaturePng = String(formData.get("signature_png") ?? "");

  if (!signerName) throw new Error("Name des Abnehmenden ist Pflicht.");
  if (!signaturePng.startsWith("data:image/png;base64,")) {
    throw new Error("Unterschrift fehlt oder ist ungültig.");
  }

  // Größe begrenzen (Schutz vor Riesen-Uploads): base64-data:image
  // typischerweise <100 KB. Limit hier 1 MB.
  if (signaturePng.length > 1_400_000) {
    throw new Error("Unterschrift zu groß.");
  }

  // 5) Tasks dieser Tour holen
  const tasks = await db.execute<{ id: string | number }>(sql`
    select id from ops.inspection_task where tour_id = ${tourId}
  `);

  const disputes: Array<{ taskId: number; reason: string }> = [];
  const accepts: number[] = [];

  for (const t of tasks) {
    const tid = Number(t.id);
    const acc = String(formData.get(`accept_${tid}`) ?? "");
    if (acc === "DISPUTED") {
      const reason = String(formData.get(`reason_${tid}`) ?? "").trim();
      if (!reason) {
        throw new Error(
          `Für Position #${tid} ist eine Beanstandungs-Begründung Pflicht.`,
        );
      }
      if (reason.length > 2000) {
        throw new Error(
          `Begründung für Position #${tid} zu lang (max. 2000 Zeichen).`,
        );
      }
      disputes.push({ taskId: tid, reason });
    } else if (acc === "ACCEPTED") {
      accepts.push(tid);
    } else {
      // Keine Auswahl pro Task → Default ist ACCEPTED.
      // Das spiegelt die Realität: Kunde hakt nur ab, was er beanstandet.
      accepts.push(tid);
    }
  }

  // 6) Atomare Schreibung
  await writeAsUser(auditActor, async (tx) => {
    // Signatur (signer_kind=CUSTOMER, parallel zur Tablet-Variante)
    await tx.execute(sql`
      insert into ops.signature
        (tour_id, signer_name, signer_role, signer_kind, signature_png)
      values (${tourId}, ${signerName}, ${signerRole}, 'CUSTOMER', ${signaturePng})
    `);

    // Pro akzeptiertem Task
    for (const taskId of accepts) {
      await tx.execute(sql`
        update ops.inspection_task
           set customer_acceptance = 'ACCEPTED'::ops.customer_acceptance,
               customer_acceptance_at = now(),
               updated_at = now()
         where id = ${taskId}
      `);
    }

    // Pro beanstandetem Task + Complaint
    for (const d of disputes) {
      await tx.execute(sql`
        update ops.inspection_task
           set customer_acceptance = 'DISPUTED'::ops.customer_acceptance,
               customer_acceptance_at = now(),
               customer_dispute_reason = ${d.reason},
               updated_at = now()
         where id = ${d.taskId}
      `);
      await tx.execute(sql`
        insert into ops.complaint
          (inspection_task_id, customer_id, description)
        select ${d.taskId}, customer_id, ${d.reason}
          from ops.inspection_task where id = ${d.taskId}
      `);
    }

    // Tour-Status
    const newStatus = disputes.length > 0 ? "DISPUTED" : "ACCEPTED";
    await tx.execute(sql`
      update ops.tour
         set status = ${newStatus}::ops.tour_status,
             accepted_at = now(),
             accepted_by_name = ${signerName},
             accepted_by_role = ${signerRole},
             updated_at = now()
       where id = ${tourId}
    `);
  });

  revalidatePath(`/portal`);
  revalidatePath(`/portal/touren`);
  revalidatePath(`/portal/touren/${tourId}`);
  // Backoffice-Seiten auch invalidieren — die zeigen den neuen Status sofort
  revalidatePath(`/touren/${tourId}`);
  revalidatePath(`/m/${tourId}`);

  redirect(`/portal/touren/${tourId}?accepted=1`);
}

"use server";

import { writeAsUser, db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

/**
 * Generiert eine Tour + alle zugehörigen inspection_tasks aus
 * ops.hygiene_control_plan.
 *
 * @param filter 'daily' (Default) = nur interval_label "täglich" oder "10",
 *               'all'              = sämtliche STANDARD/SPECIAL_15 Plan-Zeilen
 */
export async function generateTour(formData: FormData) {
  const user = await getCurrentUser();

  // customer_key hat Format "BU_CODE|customer_number"
  const customerKey = String(formData.get("customer_key") ?? "");
  const [businessUnitCode, customerNumberStr] = customerKey.split("|");
  const customerNumber = Number(customerNumberStr);
  const tourDate = String(formData.get("tour_date")); // YYYY-MM-DD
  const assignee = String(formData.get("assignee") ?? "").trim();
  const filter = (formData.get("filter") as "daily" | "all") ?? "daily";

  if (!businessUnitCode || !Number.isFinite(customerNumber))
    throw new Error("Kunde fehlt oder ungültig.");
  if (!assignee) throw new Error("Vorarbeiter (Username) angeben.");
  if (!tourDate.match(/^\d{4}-\d{2}-\d{2}$/))
    throw new Error("Datum muss YYYY-MM-DD sein.");

  const result = await writeAsUser(user, async (tx) => {
    // Customer-ID auflösen
    const cust = await tx.execute<{ id: number; name: string }>(sql`
      select c.id, c.name
      from core.customer c
      join core.business_unit bu on bu.id = c.business_unit_id
      where bu.code = ${businessUnitCode} and c.customer_number = ${customerNumber}
      limit 1
    `);
    if (cust.length === 0) throw new Error("Kunde nicht gefunden.");
    const customerId = cust[0].id;

    // Tour einfügen (oder bestehende verwenden)
    const tourRow = await tx.execute<{ id: number }>(sql`
      insert into ops.tour (customer_id, tour_date, assignee, status)
      values (${customerId}, ${tourDate}::date, ${assignee}, 'PLANNED')
      on conflict (customer_id, tour_date, assignee) do update
        set updated_at = now()
      returning id
    `);
    const tourId = tourRow[0].id;

    // Inspection-Tasks erzeugen
    const intervalCondition =
      filter === "daily"
        ? sql`and (lower(hcp.interval_label) = 'täglich' or hcp.interval_label = '10')`
        : sql``;

    const inserted = await tx.execute<{ id: number }>(sql`
      insert into ops.inspection_task (
        tour_id, hygiene_control_plan_id, customer_id,
        department_id, department_object_id,
        department_name_snapshot, object_name_snapshot,
        interval_label_snapshot, responsible_party_snapshot,
        scheduled_date, status
      )
      select
        ${tourId},
        hcp.id,
        hcp.customer_id,
        hcp.department_id,
        hcp.department_object_id,
        coalesce(d.name, hcp.area_name),
        o.name,
        hcp.interval_label,
        hcp.responsible_party::text,
        ${tourDate}::date,
        'PENDING'::ops.inspection_item_status
      from ops.hygiene_control_plan hcp
      left join ops.department d on d.id = hcp.department_id
      left join ops.department_object o on o.id = hcp.department_object_id
      where hcp.customer_id = ${customerId}
        and hcp.control_type in ('STANDARD', 'SPECIAL_15')
        ${intervalCondition}
        and not exists (
          select 1 from ops.inspection_task it
          where it.tour_id = ${tourId}
            and it.hygiene_control_plan_id = hcp.id
        )
      returning id
    `);

    return { tourId, generatedCount: inserted.length, customerName: cust[0].name };
  });

  revalidatePath("/touren");
  revalidatePath(`/touren/${result.tourId}`);
  redirect(`/touren/${result.tourId}`);
}

export async function updateInspectionItem(formData: FormData) {
  const user = await getCurrentUser();
  const taskId = Number(formData.get("task_id"));
  const status = String(formData.get("status")) as "DONE" | "SKIPPED" | "PROBLEM";
  const comment = String(formData.get("comment") ?? "").trim() || null;

  if (!["DONE", "SKIPPED", "PROBLEM"].includes(status))
    throw new Error("Ungültiger Status");
  if (status !== "DONE" && !comment)
    throw new Error("Bei SKIPPED oder PROBLEM ist ein Kommentar Pflicht.");

  await writeAsUser(user, async (tx) => {
    await tx.execute(sql`
      update ops.inspection_task
      set status = ${status}::ops.inspection_item_status,
          completed_at = now(),
          completed_by = ${user},
          comment = ${comment},
          updated_at = now()
      where id = ${taskId}
    `);

    // Tour auf IN_PROGRESS heben, sobald min. 1 Task abgehakt
    await tx.execute(sql`
      update ops.tour
      set status = 'IN_PROGRESS'::ops.tour_status,
          started_at = coalesce(started_at, now()),
          updated_at = now()
      where id = (select tour_id from ops.inspection_task where id = ${taskId})
        and status = 'PLANNED'
    `);
  });

  // Mobile-URL revalidieren
  const tourIdRow = await db.execute<{ tour_id: number }>(sql`
    select tour_id from ops.inspection_task where id = ${taskId}
  `);
  if (tourIdRow[0]?.tour_id) {
    revalidatePath(`/m/${tourIdRow[0].tour_id}`);
    revalidatePath(`/touren/${tourIdRow[0].tour_id}`);
  }
}

/**
 * Kunden-Abnahme: pro Task customer_acceptance setzen + Signatur erfassen.
 * Erzeugt Complaint-Einträge für jede beanstandete Position.
 *
 * FormData-Schema:
 *   tour_id              number
 *   signer_name          string
 *   signer_role          string (optional)
 *   signature_png        string (data:image/png;base64,...)
 *   accept_<taskId>      "ACCEPTED" | "DISPUTED"
 *   reason_<taskId>      string (Pflicht bei DISPUTED)
 */
export async function finalizeTourAcceptance(formData: FormData) {
  const user = await getCurrentUser();
  const tourId = Number(formData.get("tour_id"));
  const signerName = String(formData.get("signer_name") ?? "").trim();
  const signerRole = String(formData.get("signer_role") ?? "").trim() || null;
  const signaturePng = String(formData.get("signature_png") ?? "");

  if (!signerName) throw new Error("Name des Abnehmenden ist Pflicht.");
  if (!signaturePng.startsWith("data:image/png;base64,"))
    throw new Error("Unterschrift fehlt.");

  // Tasks dieser Tour holen (alle id's)
  const tasks = await db.execute<{ id: number }>(sql`
    select id from ops.inspection_task where tour_id = ${tourId}
  `);

  const disputes: Array<{ taskId: number; reason: string }> = [];
  const accepts: number[] = [];

  for (const t of tasks) {
    const acc = String(formData.get(`accept_${t.id}`) ?? "");
    if (acc === "DISPUTED") {
      const reason = String(formData.get(`reason_${t.id}`) ?? "").trim();
      if (!reason)
        throw new Error(`Für Punkt #${t.id} fehlt der Beanstandungs-Grund.`);
      disputes.push({ taskId: t.id, reason });
    } else if (acc === "ACCEPTED") {
      accepts.push(t.id);
    }
    // Wenn nichts gewählt: Punkt bleibt ohne Abnahme (sollte nicht passieren)
  }

  await writeAsUser(user, async (tx) => {
    // Signatur
    await tx.execute(sql`
      insert into ops.signature (tour_id, signer_name, signer_role, signer_kind, signature_png)
      values (${tourId}, ${signerName}, ${signerRole}, 'CUSTOMER', ${signaturePng})
    `);

    // Pro akzeptiertem Task
    if (accepts.length > 0) {
      // Drizzle / psycopg-style: einzelne updates pro ID
      for (const taskId of accepts) {
        await tx.execute(sql`
          update ops.inspection_task
          set customer_acceptance = 'ACCEPTED'::ops.customer_acceptance,
              customer_acceptance_at = now(),
              updated_at = now()
          where id = ${taskId}
        `);
      }
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
        insert into ops.complaint (inspection_task_id, customer_id, description)
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

  revalidatePath(`/m/${tourId}`);
  revalidatePath(`/touren/${tourId}`);
  redirect(`/m/${tourId}/danke`);
}

/**
 * Markiert die Tour als COMPLETED (= alle Punkte bearbeitet, bereit für
 * Kunden-Abnahme).
 */
export async function completeTour(tourId: number) {
  const user = await getCurrentUser();
  await writeAsUser(user, async (tx) => {
    // Sanity-Check: keine PENDING-Tasks mehr
    const pending = await tx.execute<{ n: number }>(sql`
      select count(*)::int as n from ops.inspection_task
      where tour_id = ${tourId} and status = 'PENDING'
    `);
    if (pending[0].n > 0)
      throw new Error(`Es sind noch ${pending[0].n} Punkte offen.`);

    await tx.execute(sql`
      update ops.tour
      set status = 'COMPLETED'::ops.tour_status,
          completed_at = now(),
          updated_at = now()
      where id = ${tourId}
    `);
  });
  revalidatePath(`/m/${tourId}`);
  revalidatePath(`/m/${tourId}/abnahme`);
  redirect(`/m/${tourId}/abnahme`);
}

"use server";

import { db, writeAsUser } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

/**
 * Erzeugt ein cleaning_sheet (Wochen/Mehrtages-Plan) für einen Kunden
 * + Zeitraum, mit pro (Plan-Punkt, Tag) einem inspection_task in der Matrix.
 *
 * FormData:
 *   customer_key       "BU_CODE|customer_number"
 *   period_from        YYYY-MM-DD
 *   period_to          YYYY-MM-DD (max 60 Tage Abstand)
 *   assignee           string
 *   title              optional, sonst auto-gen
 *   interval_filter    'daily' | 'all'
 *   max_per_day        optional Zahl
 */
export async function generateSheet(formData: FormData) {
  const user = await getCurrentUser();
  const customerKey = String(formData.get("customer_key") ?? "");
  const [bu, custNumStr] = customerKey.split("|");
  const customerNumber = Number(custNumStr);
  const periodFrom = String(formData.get("period_from") ?? "");
  const periodTo = String(formData.get("period_to") ?? "");
  const assignee = String(formData.get("assignee") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim() || null;
  const filter = (String(formData.get("interval_filter") ?? "daily") as "daily" | "all");
  const maxPerDayRaw = String(formData.get("max_per_day") ?? "").trim();
  const maxPerDay = maxPerDayRaw ? Number(maxPerDayRaw) : null;

  if (!bu || !Number.isFinite(customerNumber)) throw new Error("Kunde fehlt.");
  if (!periodFrom.match(/^\d{4}-\d{2}-\d{2}$/)) throw new Error("Von-Datum ungültig.");
  if (!periodTo.match(/^\d{4}-\d{2}-\d{2}$/)) throw new Error("Bis-Datum ungültig.");
  if (!assignee) throw new Error("Vorarbeiter fehlt.");

  const result = await writeAsUser(user, async (tx) => {
    const cust = await tx.execute<{ id: number; name: string }>(sql`
      select c.id, c.name from core.customer c
      join core.business_unit bu on bu.id = c.business_unit_id
      where bu.code = ${bu} and c.customer_number = ${customerNumber}
      limit 1
    `);
    if (cust.length === 0) throw new Error("Kunde nicht gefunden.");
    const customerId = cust[0].id;

    const sheetTitle = title ?? `Sheet ${periodFrom} – ${periodTo}`;
    const sheetRow = await tx.execute<{ id: number }>(sql`
      insert into ops.cleaning_sheet
        (customer_id, period_from, period_to, assignee, title)
      values
        (${customerId}, ${periodFrom}::date, ${periodTo}::date, ${assignee}, ${sheetTitle})
      returning id
    `);
    const sheetId = sheetRow[0].id;

    const intervalCondition =
      filter === "daily"
        ? sql`and (lower(hcp.interval_label) = 'täglich' or hcp.interval_label = '10')`
        : sql``;

    const limitClause = maxPerDay ? sql`limit ${maxPerDay}` : sql``;

    // Generate-Series für jeden Tag im Zeitraum × Plan-Punkte
    const generated = await tx.execute<{ id: number }>(sql`
      with plan_points as (
        select hcp.id, hcp.customer_id, hcp.department_id, hcp.department_object_id,
               coalesce(d.name, hcp.area_name) as dept_name,
               o.name as obj_name,
               hcp.interval_label, hcp.responsible_party
        from ops.hygiene_control_plan hcp
        left join ops.department d on d.id = hcp.department_id
        left join ops.department_object o on o.id = hcp.department_object_id
        where hcp.customer_id = ${customerId}
          and hcp.control_type in ('STANDARD', 'SPECIAL_15')
          ${intervalCondition}
        order by dept_name, obj_name
        ${limitClause}
      ),
      days as (
        select generate_series(${periodFrom}::date, ${periodTo}::date, '1 day'::interval)::date as d
      )
      insert into ops.inspection_task (
        cleaning_sheet_id, hygiene_control_plan_id, customer_id,
        department_id, department_object_id,
        department_name_snapshot, object_name_snapshot,
        interval_label_snapshot, responsible_party_snapshot,
        scheduled_date, status
      )
      select ${sheetId}, p.id, p.customer_id,
             p.department_id, p.department_object_id,
             p.dept_name, p.obj_name,
             p.interval_label, p.responsible_party::text,
             days.d, 'PENDING'::ops.inspection_item_status
      from plan_points p, days
      returning id
    `);

    return { sheetId, taskCount: generated.length, customerName: cust[0].name };
  });

  revalidatePath("/sheets");
  redirect(`/sheets/${result.sheetId}`);
}

/**
 * Vorarbeiter-Toggle: cyclt PENDING → DONE → PROBLEM → PENDING.
 * Für SKIPPED wird ein eigener Button am Sheet (rechts) benutzt — siehe Page.
 */
export async function cycleVorarbeiterStatus(taskId: number) {
  const user = await getCurrentUser();
  await writeAsUser(user, async (tx) => {
    await tx.execute(sql`
      update ops.inspection_task
      set status = case status::text
                     when 'PENDING' then 'DONE'::ops.inspection_item_status
                     when 'DONE' then 'PROBLEM'::ops.inspection_item_status
                     when 'PROBLEM' then 'PENDING'::ops.inspection_item_status
                     else 'DONE'::ops.inspection_item_status
                   end,
          completed_at = case when status::text = 'PENDING' then now() else completed_at end,
          completed_by = ${user},
          updated_at = now()
      where id = ${taskId}
    `);
  });
}

/**
 * Kunden-Toggle: cyclt NULL → ACCEPTED → DISPUTED → NULL.
 */
export async function cycleKundenStatus(taskId: number, disputeReason: string | null = null) {
  const user = await getCurrentUser();
  await writeAsUser(user, async (tx) => {
    await tx.execute(sql`
      update ops.inspection_task
      set customer_acceptance =
            case customer_acceptance::text
              when null then 'ACCEPTED'::ops.customer_acceptance
              when 'ACCEPTED' then 'DISPUTED'::ops.customer_acceptance
              when 'DISPUTED' then null
              else 'ACCEPTED'::ops.customer_acceptance
            end,
          customer_acceptance_at = now(),
          customer_dispute_reason =
            case
              when customer_acceptance::text = 'ACCEPTED' then ${disputeReason}
              else null
            end,
          updated_at = now()
      where id = ${taskId}
    `);

    // Wenn neuer Status DISPUTED ist (also vorher ACCEPTED) → erzeuge complaint
    if (disputeReason) {
      await tx.execute(sql`
        insert into ops.complaint (inspection_task_id, customer_id, description)
        select ${taskId}, customer_id, ${disputeReason}
        from ops.inspection_task where id = ${taskId}
          and customer_acceptance::text = 'DISPUTED'
      `);
    }
  });
}

/**
 * Beide Status atomic über FormData. Wird vom Form aufgerufen.
 * action: 'v_cycle' | 'k_accept' | 'k_dispute' | 'k_clear'
 */
export async function sheetCellAction(formData: FormData) {
  const taskId = Number(formData.get("task_id"));
  const action = String(formData.get("action") ?? "");
  const reason = String(formData.get("reason") ?? "").trim() || null;
  const comment = String(formData.get("comment") ?? "").trim() || null;
  const targetStatus = String(formData.get("target_status") ?? "").trim() as
    | "PENDING"
    | "DONE"
    | "PROBLEM"
    | "SKIPPED"
    | "";
  const sheetId = Number(formData.get("sheet_id"));

  const user = await getCurrentUser();
  await writeAsUser(user, async (tx) => {
    if (action === "v_set") {
      // Expliziter Status-Wechsel mit explizitem Comment (Pflicht für PROBLEM/SKIPPED).
      if (!["PENDING", "DONE", "PROBLEM", "SKIPPED"].includes(targetStatus)) {
        throw new Error(`Ungültiger target_status: ${targetStatus}`);
      }
      if ((targetStatus === "PROBLEM" || targetStatus === "SKIPPED") && !comment) {
        throw new Error("Comment ist Pflicht bei PROBLEM/SKIPPED.");
      }
      // Bei Reset zu PENDING: Comment löschen
      const newComment =
        targetStatus === "PENDING" || targetStatus === "DONE"
          ? null
          : comment;
      await tx.execute(sql`
        update ops.inspection_task
        set status = ${targetStatus}::ops.inspection_item_status,
            comment = ${newComment},
            completed_at = case when ${targetStatus} = 'PENDING' then null else now() end,
            completed_by = case when ${targetStatus} = 'PENDING' then null else ${user} end,
            updated_at = now()
        where id = ${taskId}
      `);
    } else if (action === "k_accept") {
      await tx.execute(sql`
        update ops.inspection_task
        set customer_acceptance = 'ACCEPTED'::ops.customer_acceptance,
            customer_acceptance_at = now(),
            customer_dispute_reason = null,
            updated_at = now()
        where id = ${taskId}
      `);
    } else if (action === "k_dispute") {
      if (!reason) throw new Error("Beanstandung braucht eine Begründung.");
      await tx.execute(sql`
        update ops.inspection_task
        set customer_acceptance = 'DISPUTED'::ops.customer_acceptance,
            customer_acceptance_at = now(),
            customer_dispute_reason = ${reason},
            updated_at = now()
        where id = ${taskId}
      `);
      await tx.execute(sql`
        insert into ops.complaint (inspection_task_id, customer_id, description)
        select ${taskId}, customer_id, ${reason}
        from ops.inspection_task where id = ${taskId}
      `);
    } else if (action === "k_clear") {
      await tx.execute(sql`
        update ops.inspection_task
        set customer_acceptance = null,
            customer_acceptance_at = null,
            customer_dispute_reason = null,
            updated_at = now()
        where id = ${taskId}
      `);
    }
  });

  if (sheetId) revalidatePath(`/sheets/${sheetId}`);
}

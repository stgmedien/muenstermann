// Shared Loader für das Audit-Paket-PDF.
//
// Wird genutzt aus:
//   - app/audit/paket/render/page.tsx (Admin-Auth, customer per bu+nr)
//   - app/portal/dokumente/render/page.tsx (Portal-Auth, customer aus Session)
//
// Beide Pfade landen hier mit einer customer_id und einem Monat — die
// Authorisierung passiert vorher in den jeweiligen Pages.

import "server-only";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export type SheetRow = {
  id: number;
  title: string | null;
  period_from: string;
  period_to: string;
  status: string;
  task_total: string;
  done: string;
  problem: string;
  skipped: string;
  accepted: string;
  disputed: string;
};

export type TourRow = {
  id: number;
  tour_date: string;
  status: string;
  task_total: string;
  done: string;
  problem: string;
  accepted: string;
  disputed: string;
};

export type ComplaintRow = {
  id: number;
  created_at: string;
  description: string;
  status: string;
  inspection_task_id: number | null;
};

export type SignatureRow = {
  id: number;
  signed_at: string;
  signer_name: string;
  signer_role: string | null;
  signer_kind: string;
  cleaning_sheet_id: number | null;
  tour_id: number | null;
  signature_png: string;
};

export type PhotoRow = {
  id: number;
  uploaded_by: string;
  uploaded_at: string;
  caption: string | null;
  inspection_task_id: number;
  task_status: string;
  task_comment: string | null;
  department_name: string | null;
  object_name: string | null;
};

export type AuditPaketCustomer = {
  id: number;
  name: string;
  customer_number: number;
  city: string | null;
  federal_state: string | null;
};

export type AuditPaketData = {
  customer: AuditPaketCustomer;
  sheets: SheetRow[];
  tours: TourRow[];
  complaints: ComplaintRow[];
  signatures: SignatureRow[];
  photos: PhotoRow[];
  verify: {
    ok: boolean;
    total_rows: string;
    broken_at_id: string | null;
    broken_reason: string | null;
  };
};

/** "2026-05" → ["2026-05-01", "2026-05-31"] */
export function monthRange(month: string): [string, string] {
  const [y, m] = month.split("-").map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
    throw new Error(`Ungültiger Monat: ${month}`);
  }
  const from = `${y}-${String(m).padStart(2, "0")}-01`;
  const last = new Date(y, m, 0).getDate();
  const to = `${y}-${String(m).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
  return [from, to];
}

/**
 * Lädt Daten für ein Audit-Paket eines Kunden in einem Monat.
 * customerId wird hier strikt eingehalten — die Routen-Layer (admin oder
 * portal) müssen vorher prüfen, dass der aufrufende User Zugriff auf
 * diesen Kunden hat.
 */
export async function loadAuditPaketData(
  customerId: number,
  monthFrom: string,
  monthTo: string,
): Promise<AuditPaketData | null> {
  const customer = await db.execute<AuditPaketCustomer>(sql`
    select c.id, c.name, c.customer_number, c.city, c.federal_state
    from core.customer c
    where c.id = ${customerId}
    limit 1
  `);
  if (customer.length === 0) return null;

  const sheets = await db.execute<SheetRow>(sql`
    select s.id, s.title, s.period_from::text, s.period_to::text, s.status::text,
           (select count(*) from ops.inspection_task t where t.cleaning_sheet_id=s.id)::text as task_total,
           (select count(*) from ops.inspection_task t where t.cleaning_sheet_id=s.id and t.status::text='DONE')::text as done,
           (select count(*) from ops.inspection_task t where t.cleaning_sheet_id=s.id and t.status::text='PROBLEM')::text as problem,
           (select count(*) from ops.inspection_task t where t.cleaning_sheet_id=s.id and t.status::text='SKIPPED')::text as skipped,
           (select count(*) from ops.inspection_task t where t.cleaning_sheet_id=s.id and t.customer_acceptance::text='ACCEPTED')::text as accepted,
           (select count(*) from ops.inspection_task t where t.cleaning_sheet_id=s.id and t.customer_acceptance::text='DISPUTED')::text as disputed
    from ops.cleaning_sheet s
    where s.customer_id = ${customerId}
      and (s.period_from <= ${monthTo}::date and s.period_to >= ${monthFrom}::date)
    order by s.period_from
  `);

  const tours = await db.execute<TourRow>(sql`
    select t.id, t.tour_date::text, t.status::text,
           (select count(*) from ops.inspection_task i where i.tour_id=t.id)::text as task_total,
           (select count(*) from ops.inspection_task i where i.tour_id=t.id and i.status::text='DONE')::text as done,
           (select count(*) from ops.inspection_task i where i.tour_id=t.id and i.status::text='PROBLEM')::text as problem,
           (select count(*) from ops.inspection_task i where i.tour_id=t.id and i.customer_acceptance::text='ACCEPTED')::text as accepted,
           (select count(*) from ops.inspection_task i where i.tour_id=t.id and i.customer_acceptance::text='DISPUTED')::text as disputed
    from ops.tour t
    where t.customer_id = ${customerId}
      and t.tour_date between ${monthFrom}::date and ${monthTo}::date
    order by t.tour_date
  `);

  const complaints = await db.execute<ComplaintRow>(sql`
    select c.id, c.created_at::text, c.description, c.status::text,
           c.inspection_task_id
    from ops.complaint c
    where c.customer_id = ${customerId}
      and c.created_at::date between ${monthFrom}::date and ${monthTo}::date
    order by c.created_at
  `);

  const signatures = await db.execute<SignatureRow>(sql`
    select s.id, s.signed_at::text, s.signer_name, s.signer_role,
           s.signer_kind::text, s.cleaning_sheet_id, s.tour_id, s.signature_png
    from ops.signature s
    where s.signed_at::date between ${monthFrom}::date and ${monthTo}::date
      and (
        s.cleaning_sheet_id in (select id from ops.cleaning_sheet where customer_id = ${customerId}) or
        s.tour_id in (select id from ops.tour where customer_id = ${customerId})
      )
    order by s.signed_at
  `);

  const photos = await db.execute<PhotoRow>(sql`
    select p.id, p.uploaded_by, p.uploaded_at::text, p.caption,
           p.inspection_task_id,
           t.status::text as task_status,
           t.comment as task_comment,
           t.department_name_snapshot as department_name,
           t.object_name_snapshot as object_name
    from ops.inspection_photo p
    join ops.inspection_task t on t.id = p.inspection_task_id
    where t.customer_id = ${customerId}
      and p.uploaded_at::date between ${monthFrom}::date and ${monthTo}::date
    order by p.uploaded_at
  `);

  const verify = await db.execute<{
    ok: boolean;
    total_rows: string;
    broken_at_id: string | null;
    broken_reason: string | null;
  }>(sql`select * from audit.verify_chain()`);

  return {
    customer: customer[0],
    sheets,
    tours,
    complaints,
    signatures,
    photos,
    verify: verify[0],
  };
}

/**
 * Übersicht: für welche Monate gibt es überhaupt Daten dieses Kunden?
 * Liefert Liste von "YYYY-MM"-Strings + Aktivitäts-Statistiken pro Monat.
 * Wird vom Portal genutzt, um die Download-Liste zu bauen.
 */
export async function listAuditPaketMonths(customerId: number) {
  const rows = await db.execute<{
    month: string;
    tour_count: string;
    sheet_count: string;
    complaint_count: string;
    has_signature: boolean;
  }>(sql`
    with months as (
      -- Touren-Monate
      select to_char(tour_date, 'YYYY-MM') as month
        from ops.tour where customer_id = ${customerId}
      union
      -- Sheets-Monate (jeweils Beginn-Monat)
      select to_char(period_from, 'YYYY-MM') as month
        from ops.cleaning_sheet where customer_id = ${customerId}
      union
      -- Complaint-Monate
      select to_char(created_at, 'YYYY-MM') as month
        from ops.complaint where customer_id = ${customerId}
    )
    select
      m.month,
      (select count(*) from ops.tour t
        where t.customer_id = ${customerId}
          and to_char(t.tour_date, 'YYYY-MM') = m.month)::text as tour_count,
      (select count(*) from ops.cleaning_sheet s
        where s.customer_id = ${customerId}
          and to_char(s.period_from, 'YYYY-MM') = m.month)::text as sheet_count,
      (select count(*) from ops.complaint c
        where c.customer_id = ${customerId}
          and to_char(c.created_at, 'YYYY-MM') = m.month)::text as complaint_count,
      exists(
        select 1 from ops.signature s
          where to_char(s.signed_at, 'YYYY-MM') = m.month
            and (
              s.tour_id in (select id from ops.tour where customer_id = ${customerId}) or
              s.cleaning_sheet_id in (select id from ops.cleaning_sheet where customer_id = ${customerId})
            )
      ) as has_signature
    from months m
    where m.month is not null
    order by m.month desc
  `);
  return rows;
}

import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import { loadAuditPaketData, monthRange } from "@/lib/audit-paket";
import { AuditPaketDocument } from "@/components/AuditPaketDocument";
import { PrintButton } from "./PrintButton";

export const dynamic = "force-dynamic";

async function customerIdFromBuAndNumber(
  bu: string,
  customerNumber: number,
): Promise<number | null> {
  const rows = await db.execute<{ id: string | number }>(sql`
    select c.id
    from core.customer c
    join core.business_unit bu on bu.id = c.business_unit_id
    where bu.code = ${bu} and c.customer_number = ${customerNumber}
    limit 1
  `);
  if (rows.length === 0) return null;
  return Number(rows[0].id);
}

export default async function PaketRenderPage({
  searchParams,
}: {
  searchParams: Promise<{ cust?: string; month?: string }>;
}) {
  const { cust, month } = await searchParams;
  if (!cust || !month) notFound();
  const [bu, customerNumberStr] = cust.split(":");
  const customerNumber = Number(customerNumberStr);
  if (!bu || !Number.isFinite(customerNumber)) notFound();

  const customerId = await customerIdFromBuAndNumber(bu, customerNumber);
  if (!customerId) notFound();

  let from: string;
  let to: string;
  try {
    [from, to] = monthRange(month);
  } catch {
    notFound();
  }

  const data = await loadAuditPaketData(customerId, from, to);
  if (!data) notFound();

  return (
    <>
      <PrintButton />
      <AuditPaketDocument
        data={data}
        from={from}
        to={to}
        month={month}
        context="admin"
      />
    </>
  );
}

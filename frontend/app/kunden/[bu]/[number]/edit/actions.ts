"use server";

import { writeAsUser } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function nz(v: FormDataEntryValue | null): string | null {
  if (v === null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

function bool(v: FormDataEntryValue | null): boolean {
  return v === "on" || v === "true";
}

export async function updateCustomer(
  bu: string,
  customerNumber: number,
  formData: FormData,
) {
  const user = await getCurrentUser();

  const data = {
    name: String(formData.get("name") ?? "").trim(),
    name_supplement: nz(formData.get("name_supplement")),
    street: nz(formData.get("street")),
    postal_code: nz(formData.get("postal_code")),
    city: nz(formData.get("city")),
    federal_state: nz(formData.get("federal_state")),
    phone: nz(formData.get("phone")),
    fax: nz(formData.get("fax")),
    supervisor: nz(formData.get("supervisor")),
    team_lead: nz(formData.get("team_lead")),
    hour_sheet_format: nz(formData.get("hour_sheet_format")),
    match_code: nz(formData.get("match_code")),
    cleaning_agent_freetext: nz(formData.get("cleaning_agent_freetext")),
    disinfectant_freetext: nz(formData.get("disinfectant_freetext")),
    flat_rate_billing: bool(formData.get("flat_rate_billing")),
    extra_work_allowed: bool(formData.get("extra_work_allowed")),
    swab_tests_required: bool(formData.get("swab_tests_required")),
    weekly_audit: bool(formData.get("weekly_audit")),
    monthly_audit: bool(formData.get("monthly_audit")),
    vacation_audit: bool(formData.get("vacation_audit")),
    sickness_audit: bool(formData.get("sickness_audit")),
  };

  if (!data.name) {
    throw new Error("Firma (Name) darf nicht leer sein.");
  }

  await writeAsUser(user, async (tx) => {
    await tx.execute(sql`
      update core.customer
      set name                    = ${data.name},
          name_supplement         = ${data.name_supplement},
          street                  = ${data.street},
          postal_code             = ${data.postal_code},
          city                    = ${data.city},
          federal_state           = ${data.federal_state},
          phone                   = ${data.phone},
          fax                     = ${data.fax},
          supervisor              = ${data.supervisor},
          team_lead               = ${data.team_lead},
          hour_sheet_format       = ${data.hour_sheet_format},
          match_code              = ${data.match_code},
          cleaning_agent_freetext = ${data.cleaning_agent_freetext},
          disinfectant_freetext   = ${data.disinfectant_freetext},
          flat_rate_billing       = ${data.flat_rate_billing},
          extra_work_allowed      = ${data.extra_work_allowed},
          swab_tests_required     = ${data.swab_tests_required},
          weekly_audit            = ${data.weekly_audit},
          monthly_audit           = ${data.monthly_audit},
          vacation_audit          = ${data.vacation_audit},
          sickness_audit          = ${data.sickness_audit},
          updated_at              = now()
      where business_unit_id = (select id from core.business_unit where code = ${bu})
        and customer_number = ${customerNumber}
    `);
  });

  revalidatePath(`/kunden/${bu}/${customerNumber}`);
  revalidatePath(`/kunden`);
  redirect(`/kunden/${bu}/${customerNumber}`);
}

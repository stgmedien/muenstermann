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

export async function updateCleaningAgent(id: number, formData: FormData) {
  const user = await getCurrentUser();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Name darf nicht leer sein.");

  const operations_number = nz(formData.get("operations_number"));
  const ph_value = nz(formData.get("ph_value"));
  const adr_rid = nz(formData.get("adr_rid"));
  const flammability_class = nz(formData.get("flammability_class"));
  const short_info = nz(formData.get("short_info"));
  const measurement_instructions = nz(formData.get("measurement_instructions"));

  const wgkRaw = nz(formData.get("water_hazard_class"));
  let water_hazard_class: number | null = null;
  if (wgkRaw) {
    const n = Number(wgkRaw);
    if (Number.isFinite(n) && n >= 1 && n <= 3) water_hazard_class = n;
    else throw new Error("WGK muss 1, 2 oder 3 sein.");
  }

  await writeAsUser(user, async (tx) => {
    await tx.execute(sql`
      update catalog.cleaning_agent
      set name                       = ${name},
          operations_number          = ${operations_number},
          ph_value                   = ${ph_value},
          water_hazard_class         = ${water_hazard_class},
          flammability_class         = ${flammability_class},
          adr_rid                    = ${adr_rid},
          short_info                 = ${short_info},
          measurement_instructions   = ${measurement_instructions},
          updated_at                 = now()
      where id = ${id}
    `);
  });

  revalidatePath(`/reinigungsmittel/${id}`);
  revalidatePath(`/reinigungsmittel`);
  redirect(`/reinigungsmittel/${id}`);
}

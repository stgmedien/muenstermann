// Server-side helper für Portal-Routen
//
// Liest die Session-Cookie + lädt den Customer-User aus der DB.
// Wirft notFound() bei jeder Inkonsistenz — die Routes sind danach
// garantiert nur mit valid + active user erreichbar.

import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { readSession } from "./portal-auth";

export type PortalUser = {
  id: number;
  customerId: number;
  username: string;
  displayName: string;
  email: string | null;
  customerName: string;
  customerCity: string | null;
};

export async function requirePortalUser(): Promise<PortalUser> {
  const session = await readSession();
  if (!session) redirect("/portal/login");

  const rows = await db.execute<{
    id: string | number;
    customer_id: string | number;
    username: string;
    display_name: string;
    email: string | null;
    is_active: boolean;
    customer_name: string;
    customer_city: string | null;
  }>(sql`
    select u.id, u.customer_id, u.username, u.display_name, u.email,
           u.is_active, c.name as customer_name, c.city as customer_city
      from core.customer_user u
      join core.customer c on c.id = u.customer_id
     where u.id = ${session.uid}
       and u.customer_id = ${session.cid}
     limit 1
  `);
  const user = rows[0];
  if (!user || !user.is_active) {
    redirect("/portal/login");
  }

  return {
    id: Number(user.id),
    customerId: Number(user.customer_id),
    username: user.username,
    displayName: user.display_name,
    email: user.email,
    customerName: user.customer_name,
    customerCity: user.customer_city,
  };
}

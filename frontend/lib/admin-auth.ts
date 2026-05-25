// Backoffice-Auth: scrypt + HMAC-Cookie.
// Strikt getrennt vom Portal (eigenes Secret, eigener Cookie-Name).

import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { signToken, verifyToken } from "./auth-core";

export const ADMIN_COOKIE_NAME = "admin_session";
const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 12; // 12h

type AdminRole = "ADMIN" | "OPERATOR" | "VIEWER";

type AdminSessionPayload = {
  uid: number;
  role: AdminRole;
  exp: number;
};

export type AdminUser = {
  id: number;
  username: string;
  displayName: string;
  email: string | null;
  role: AdminRole;
};

function getSecret(): string {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new Error(
      "ADMIN_SESSION_SECRET fehlt oder zu kurz — mindestens 32 Zeichen",
    );
  }
  return s;
}

export async function createAdminSession(
  uid: number,
  role: AdminRole,
): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + ADMIN_SESSION_MAX_AGE_SECONDS;
  const token = signToken({ uid, role, exp }, getSecret());
  const store = await cookies();
  store.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
  });
  return token;
}

export async function destroyAdminSession(): Promise<void> {
  const store = await cookies();
  store.delete(ADMIN_COOKIE_NAME);
}

export async function readAdminSession(): Promise<AdminSessionPayload | null> {
  const store = await cookies();
  const c = store.get(ADMIN_COOKIE_NAME);
  if (!c) return null;
  return verifyToken<AdminSessionPayload>(c.value, getSecret());
}

/**
 * Erzwingt Admin-Login. Redirektet sonst zur Login-Seite.
 * Lädt zusätzlich den User aus der DB und prüft is_active.
 */
export async function requireAdminUser(): Promise<AdminUser> {
  const session = await readAdminSession();
  if (!session) redirect("/login");

  const rows = await db.execute<{
    id: string | number;
    username: string;
    display_name: string;
    email: string | null;
    role: AdminRole;
    is_active: boolean;
  }>(sql`
    select id, username, display_name, email, role::text as role, is_active
      from core.admin_user
     where id = ${session.uid}
     limit 1
  `);
  const u = rows[0];
  if (!u || !u.is_active) redirect("/login");

  return {
    id: Number(u.id),
    username: u.username,
    displayName: u.display_name,
    email: u.email,
    role: u.role,
  };
}

/**
 * Wie requireAdminUser, aber prüft zusätzlich eine Mindest-Rolle.
 * VIEWER < OPERATOR < ADMIN. Wirft 403-äquivalente Antwort über redirect.
 */
export async function requireAdminRole(
  minRole: AdminRole,
): Promise<AdminUser> {
  const user = await requireAdminUser();
  const order: Record<AdminRole, number> = {
    VIEWER: 1,
    OPERATOR: 2,
    ADMIN: 3,
  };
  if (order[user.role] < order[minRole]) {
    redirect("/?forbidden=" + encodeURIComponent(minRole));
  }
  return user;
}

/** Conveniences */
export const requireAdmin = () => requireAdminRole("ADMIN");
export const requireOperator = () => requireAdminRole("OPERATOR");

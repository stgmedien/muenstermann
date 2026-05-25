// Login-Route-Handler (statt Server Action)
//
// Standard-HTML-Form-POST → diese Route → Cookie setzen → Redirect.
// Vorteil gegenüber Server Action: testbar per curl, kein verschleierter
// Aktion-ID-Mechanismus, eindeutige Audit-Spur.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { verifyPassword } from "@/lib/portal-auth";
import { createHmac } from "node:crypto";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;
const COOKIE_NAME = "portal_session";
const MAX_FAILED = 5;
const LOCK_MINUTES = 15;

function b64url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/=+$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function sign(payload: object, secret: string): string {
  const body = b64url(Buffer.from(JSON.stringify(payload), "utf8"));
  const mac = createHmac("sha256", Buffer.from(secret, "utf8"))
    .update(body)
    .digest();
  return `${body}.${b64url(mac)}`;
}

function loginPageUrl(req: NextRequest, error: string, nextPath: string) {
  const url = new URL("/portal/login", req.url);
  url.searchParams.set("e", error);
  if (nextPath && nextPath !== "/portal") {
    url.searchParams.set("next", nextPath);
  }
  return url;
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const username = String(form.get("username") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const nextPath = String(form.get("next") ?? "/portal");

  const secret = process.env.PORTAL_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    return NextResponse.json(
      { error: "Server-Konfiguration fehlt" },
      { status: 500 },
    );
  }

  if (!username || !password) {
    return NextResponse.redirect(
      loginPageUrl(req, "missing", nextPath),
      303,
    );
  }
  if (!/^[a-z0-9._-]{3,50}$/.test(username)) {
    return NextResponse.redirect(loginPageUrl(req, "invalid", nextPath), 303);
  }

  const rows = await db.execute<{
    id: number;
    customer_id: number;
    password_hash: string;
    is_active: boolean;
    locked_until: string | null;
    failed_attempts: number;
  }>(sql`
    select id, customer_id, password_hash, is_active,
           locked_until::text, failed_attempts
      from core.customer_user
     where username = ${username}
     limit 1
  `);
  const user = rows[0];

  if (!user) {
    // Timing-konstant: dummy-verify
    await verifyPassword(
      password,
      "scrypt$16384$00000000000000000000000000000000$" + "00".repeat(64),
    );
    return NextResponse.redirect(loginPageUrl(req, "invalid", nextPath), 303);
  }

  if (!user.is_active) {
    return NextResponse.redirect(loginPageUrl(req, "inactive", nextPath), 303);
  }

  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    return NextResponse.redirect(loginPageUrl(req, "locked", nextPath), 303);
  }

  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) {
    const newFailed = (user.failed_attempts ?? 0) + 1;
    if (newFailed >= MAX_FAILED) {
      await db.execute(sql`
        update core.customer_user
           set failed_attempts = ${newFailed},
               locked_until = now() + (${LOCK_MINUTES} || ' minutes')::interval,
               updated_at = now()
         where id = ${user.id}
      `);
    } else {
      await db.execute(sql`
        update core.customer_user
           set failed_attempts = ${newFailed}, updated_at = now()
         where id = ${user.id}
      `);
    }
    return NextResponse.redirect(loginPageUrl(req, "invalid", nextPath), 303);
  }

  await db.execute(sql`
    update core.customer_user
       set failed_attempts = 0,
           locked_until = null,
           last_login_at = now(),
           updated_at = now()
     where id = ${user.id}
  `);

  const exp = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS;
  // BIGINT kommt aus postgres-js als string — explizit zu Number casten,
  // damit verify-Logik (typeof === "number") greift
  const token = sign(
    { uid: Number(user.id), cid: Number(user.customer_id), exp },
    secret,
  );

  const safeNext =
    nextPath.startsWith("/portal") && !nextPath.startsWith("/portal/login")
      ? nextPath
      : "/portal";

  const res = NextResponse.redirect(new URL(safeNext, req.url), 303);
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return res;
}

// Admin-Login-Submit. Setzt admin_session-Cookie und redirektet.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { dummyVerify, signToken, verifyPassword } from "@/lib/auth-core";
import { ADMIN_COOKIE_NAME } from "@/lib/admin-auth";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;
const MAX_FAILED = 5;
const LOCK_MINUTES = 15;

function loginUrl(req: NextRequest, errorCode: string, next: string) {
  const url = new URL("/login", req.url);
  url.searchParams.set("e", errorCode);
  if (next && next !== "/") url.searchParams.set("next", next);
  return url;
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const username = String(form.get("username") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const nextPath = String(form.get("next") ?? "/");

  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    return NextResponse.redirect(loginUrl(req, "config", nextPath), 303);
  }

  if (!username || !password) {
    return NextResponse.redirect(loginUrl(req, "missing", nextPath), 303);
  }
  if (!/^[a-z0-9._-]{3,50}$/.test(username)) {
    await dummyVerify(password);
    return NextResponse.redirect(loginUrl(req, "invalid", nextPath), 303);
  }

  const rows = await db.execute<{
    id: string | number;
    password_hash: string;
    role: string;
    is_active: boolean;
    locked_until: string | null;
    failed_attempts: number;
  }>(sql`
    select id, password_hash, role::text as role, is_active,
           locked_until::text, failed_attempts
      from core.admin_user
     where username = ${username}
     limit 1
  `);
  const user = rows[0];

  if (!user) {
    await dummyVerify(password);
    return NextResponse.redirect(loginUrl(req, "invalid", nextPath), 303);
  }
  if (!user.is_active) {
    return NextResponse.redirect(loginUrl(req, "inactive", nextPath), 303);
  }
  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    return NextResponse.redirect(loginUrl(req, "locked", nextPath), 303);
  }

  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) {
    const newFailed = (user.failed_attempts ?? 0) + 1;
    if (newFailed >= MAX_FAILED) {
      await db.execute(sql`
        update core.admin_user
           set failed_attempts = ${newFailed},
               locked_until = now() + (${LOCK_MINUTES} || ' minutes')::interval,
               updated_at = now()
         where id = ${user.id}
      `);
    } else {
      await db.execute(sql`
        update core.admin_user
           set failed_attempts = ${newFailed}, updated_at = now()
         where id = ${user.id}
      `);
    }
    return NextResponse.redirect(loginUrl(req, "invalid", nextPath), 303);
  }

  // Erfolg
  await db.execute(sql`
    update core.admin_user
       set failed_attempts = 0,
           locked_until = null,
           last_login_at = now(),
           updated_at = now()
     where id = ${user.id}
  `);

  const exp = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS;
  const token = signToken(
    { uid: Number(user.id), role: user.role, exp },
    secret,
  );

  // nextPath validieren — kein offenes Redirect
  const safeNext =
    nextPath.startsWith("/") &&
    !nextPath.startsWith("/login") &&
    !nextPath.startsWith("//")
      ? nextPath
      : "/";

  const res = NextResponse.redirect(new URL(safeNext, req.url), 303);
  res.cookies.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return res;
}

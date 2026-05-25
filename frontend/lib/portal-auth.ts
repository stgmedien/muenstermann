// Kunden-Portal Authentifizierung
//
// Passwort + Token: delegiert an auth-core (DRY mit admin-auth).
// Cookie-Name + Secret-Env-Var sind portal-spezifisch.

import { cookies } from "next/headers";
import {
  hashPassword,
  signToken,
  verifyPassword,
  verifyToken,
} from "./auth-core";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8; // 8h
const COOKIE_NAME = "portal_session";

export { hashPassword, verifyPassword };

function getSecret(): string {
  const s = process.env.PORTAL_SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new Error(
      "PORTAL_SESSION_SECRET fehlt oder zu kurz — mindestens 32 Zeichen erforderlich",
    );
  }
  return s;
}

type SessionPayload = {
  uid: number; // customer_user id
  cid: number; // customer id (denormalisiert)
  exp: number;
};

export async function createSession(uid: number, cid: number): Promise<void> {
  const exp = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS;
  const token = signToken({ uid, cid, exp }, getSecret());
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function readSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const cookie = store.get(COOKIE_NAME);
  if (!cookie) return null;
  return verifyToken<SessionPayload>(cookie.value, getSecret());
}

export const PORTAL_COOKIE_NAME = COOKIE_NAME;

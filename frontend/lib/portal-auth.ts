// Kunden-Portal Authentifizierung
//
// Passwort-Hashing: scrypt (Node stdlib, RFC 7914)
//   Format: scrypt$<N>$<saltHex>$<hashHex>
//   N=16384 (recommended für interactive logins)
//
// Session: HMAC-SHA256-signiertes Cookie
//   Format: base64url(payload).base64url(hmac)
//   Payload: JSON { uid, cid, exp }
//   HMAC-Key aus env PORTAL_SESSION_SECRET (oder Fallback bei Dev)

import { createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";

const scryptAsync = promisify(scrypt);
const SCRYPT_N = 16384;
const SCRYPT_KEYLEN = 64;
const SCRYPT_SALT_BYTES = 16;
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8; // 8h
const COOKIE_NAME = "portal_session";

function getSecret(): Buffer {
  const s = process.env.PORTAL_SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new Error(
      "PORTAL_SESSION_SECRET fehlt oder zu kurz — mindestens 32 Zeichen erforderlich",
    );
  }
  return Buffer.from(s, "utf8");
}

// ---------------- Passwort ----------------

export async function hashPassword(password: string): Promise<string> {
  if (password.length < 8) {
    throw new Error("Passwort zu kurz (mindestens 8 Zeichen)");
  }
  const salt = randomBytes(SCRYPT_SALT_BYTES);
  const hash = (await scryptAsync(password, salt, SCRYPT_KEYLEN, {
    N: SCRYPT_N,
  })) as Buffer;
  return `scrypt$${SCRYPT_N}$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "scrypt") return false;
  const N = parseInt(parts[1], 10);
  const salt = Buffer.from(parts[2], "hex");
  const expected = Buffer.from(parts[3], "hex");
  let derived: Buffer;
  try {
    derived = (await scryptAsync(password, salt, expected.length, {
      N,
    })) as Buffer;
  } catch {
    return false;
  }
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}

// ---------------- Session ----------------

type SessionPayload = {
  uid: number; // customer_user id
  cid: number; // customer id (denormalisiert für schnellen Zugriff)
  exp: number; // unix seconds
};

function b64urlEncode(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/=+$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function b64urlDecode(s: string): Buffer {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4 !== 0) s += "=";
  return Buffer.from(s, "base64");
}

function sign(payload: SessionPayload): string {
  const secret = getSecret();
  const body = b64urlEncode(Buffer.from(JSON.stringify(payload), "utf8"));
  const mac = createHmac("sha256", secret).update(body).digest();
  return `${body}.${b64urlEncode(mac)}`;
}

function verify(token: string): SessionPayload | null {
  const dot = token.indexOf(".");
  if (dot < 0) return null;
  const body = token.slice(0, dot);
  const macGiven = token.slice(dot + 1);
  const secret = getSecret();
  const expected = createHmac("sha256", secret).update(body).digest();
  const given = b64urlDecode(macGiven);
  if (given.length !== expected.length) return null;
  if (!timingSafeEqual(given, expected)) return null;
  try {
    const payload = JSON.parse(b64urlDecode(body).toString("utf8")) as SessionPayload;
    if (typeof payload.uid !== "number") return null;
    if (typeof payload.cid !== "number") return null;
    if (typeof payload.exp !== "number") return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function createSession(uid: number, cid: number): Promise<void> {
  const exp = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS;
  const token = sign({ uid, cid, exp });
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
  return verify(cookie.value);
}

// Edge-Runtime-safe Variante für Middleware: bekommt Request, gibt
// Session-Payload zurück.
export function verifyTokenForMiddleware(token: string | undefined): SessionPayload | null {
  if (!token) return null;
  return verify(token);
}

export const PORTAL_COOKIE_NAME = COOKIE_NAME;

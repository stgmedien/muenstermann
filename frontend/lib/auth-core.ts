// Geteilter Auth-Kern für Admin-Backoffice + Kunden-Portal.
//
// Beide Realms nutzen die gleiche Crypto-Mechanik:
//   - scrypt (Node stdlib) für Password-Hashing
//   - HMAC-SHA256-Cookie für Session
//   - getrennte Cookie-Namen + Secrets — d.h. Kompromittierung des Portal-
//     Secrets kompromittiert NICHT die Admin-Sessions.

import { createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

const SCRYPT_N = 16384;
const SCRYPT_KEYLEN = 64;
const SCRYPT_SALT_BYTES = 16;

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
  if (!Number.isFinite(N) || N < 1024) return false;
  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(parts[2], "hex");
    expected = Buffer.from(parts[3], "hex");
  } catch {
    return false;
  }
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

// Dummy-Verify für Timing-Konstanz wenn User nicht gefunden
const DUMMY_HASH = "scrypt$16384$" + "00".repeat(16) + "$" + "00".repeat(64);

export async function dummyVerify(password: string): Promise<void> {
  // best-effort; Result wird verworfen
  await verifyPassword(password, DUMMY_HASH).catch(() => false);
}

// ---------------- Session-Cookie (Node-Runtime) ----------------

function b64url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/=+$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function b64urlDecode(s: string): Buffer {
  let b = s.replace(/-/g, "+").replace(/_/g, "/");
  while (b.length % 4 !== 0) b += "=";
  return Buffer.from(b, "base64");
}

export function signToken(payload: object, secret: string): string {
  if (!secret || secret.length < 32) {
    throw new Error("Auth-Secret zu kurz (mindestens 32 Zeichen)");
  }
  const body = b64url(Buffer.from(JSON.stringify(payload), "utf8"));
  const mac = createHmac("sha256", Buffer.from(secret, "utf8"))
    .update(body)
    .digest();
  return `${body}.${b64url(mac)}`;
}

export function verifyToken<T = unknown>(
  token: string | undefined,
  secret: string,
): T | null {
  if (!token || !secret) return null;
  const dot = token.indexOf(".");
  if (dot < 0) return null;
  const body = token.slice(0, dot);
  const macGiven = token.slice(dot + 1);

  const expected = createHmac("sha256", Buffer.from(secret, "utf8"))
    .update(body)
    .digest();
  let given: Buffer;
  try {
    given = b64urlDecode(macGiven);
  } catch {
    return null;
  }
  if (given.length !== expected.length) return null;
  if (!timingSafeEqual(given, expected)) return null;

  try {
    const payload = JSON.parse(b64urlDecode(body).toString("utf8")) as {
      exp?: number;
    } & T;
    if (typeof payload.exp !== "number") return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

// ---------------- Session-Verify (Edge-Runtime / Web Crypto) ----------------
// Für Middleware. async, kein node:crypto.

export async function verifyTokenEdge(
  token: string | undefined,
  secret: string,
): Promise<boolean> {
  if (!token || !secret) return false;
  const dot = token.indexOf(".");
  if (dot < 0) return false;
  const body = token.slice(0, dot);
  const macGiven = token.slice(dot + 1);

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(body),
  );
  const expected = new Uint8Array(sig);

  let macBin = macGiven.replace(/-/g, "+").replace(/_/g, "/");
  while (macBin.length % 4 !== 0) macBin += "=";
  let given: Uint8Array;
  try {
    const bin = atob(macBin);
    given = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) given[i] = bin.charCodeAt(i);
  } catch {
    return false;
  }

  if (given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= given[i] ^ expected[i];
  if (diff !== 0) return false;

  // exp prüfen
  try {
    let bodyBin = body.replace(/-/g, "+").replace(/_/g, "/");
    while (bodyBin.length % 4 !== 0) bodyBin += "=";
    const bin = atob(bodyBin);
    const buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    const payload = JSON.parse(new TextDecoder().decode(buf));
    if (typeof payload.exp !== "number") return false;
    if (payload.exp < Math.floor(Date.now() / 1000)) return false;
    return true;
  } catch {
    return false;
  }
}

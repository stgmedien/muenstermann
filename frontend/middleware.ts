import { NextRequest, NextResponse } from "next/server";

// Edge-Runtime: kein node:crypto.
// HMAC läuft über Web Crypto. Identische Logik wie in lib/auth-core.ts,
// hier inline weil Middleware kein async-import von Server-only-Files mag.

async function hmacSha256(secret: string, body: string): Promise<Uint8Array> {
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
  return new Uint8Array(sig);
}

function b64urlToBytes(s: string): Uint8Array {
  let b = s.replace(/-/g, "+").replace(/_/g, "/");
  while (b.length % 4 !== 0) b += "=";
  const bin = atob(b);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function verifyCookieToken(
  token: string | undefined,
  secret: string,
): Promise<boolean> {
  if (!token || !secret) return false;
  const dot = token.indexOf(".");
  if (dot < 0) return false;
  const body = token.slice(0, dot);
  const macGiven = token.slice(dot + 1);

  const expected = await hmacSha256(secret, body);
  let given: Uint8Array;
  try {
    given = b64urlToBytes(macGiven);
  } catch {
    return false;
  }
  if (!bytesEqual(given, expected)) return false;

  try {
    const payloadBytes = b64urlToBytes(body);
    const payload = JSON.parse(new TextDecoder().decode(payloadBytes));
    if (typeof payload.exp !== "number") return false;
    if (payload.exp < Math.floor(Date.now() / 1000)) return false;
    return true;
  } catch {
    return false;
  }
}

// Pfade, die KEINEN Login brauchen (öffentlich oder eigene Auth-Routen)
function isPublicPath(p: string): boolean {
  return (
    p === "/login" ||
    p === "/login/" ||
    p.startsWith("/login/submit") ||
    p === "/portal/login" ||
    p === "/portal/login/" ||
    p.startsWith("/portal/login/submit") ||
    p === "/portal/logout" ||
    p === "/logout" ||
    // Mobile-Routen sind aktuell ohne Login (Tablet-Vorarbeiter); kann später
    // mit eigener Auth-Schicht gehärtet werden.
    p.startsWith("/m") ||
    p === "/api/health"
  );
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const isPortal = pathname.startsWith("/portal");

  // ---------- Portal ----------
  if (isPortal) {
    if (isPublicPath(pathname)) {
      req.headers.set("x-app-pathname", pathname);
      return NextResponse.next({ request: { headers: req.headers } });
    }
    const secret = process.env.PORTAL_SESSION_SECRET;
    if (!secret || secret.length < 32) {
      return new NextResponse(
        "Portal nicht konfiguriert (PORTAL_SESSION_SECRET fehlt)",
        { status: 500 },
      );
    }
    const cookie = req.cookies.get("portal_session")?.value;
    if (!(await verifyCookieToken(cookie, secret))) {
      const url = new URL("/portal/login", req.url);
      if (pathname !== "/portal") url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    req.headers.set("x-app-pathname", pathname);
    return NextResponse.next({ request: { headers: req.headers } });
  }

  // ---------- Admin ----------
  if (isPublicPath(pathname)) {
    req.headers.set("x-app-pathname", pathname);
    return NextResponse.next({ request: { headers: req.headers } });
  }

  const adminSecret = process.env.ADMIN_SESSION_SECRET;
  if (!adminSecret || adminSecret.length < 32) {
    // Wenn das Secret fehlt, leite explizit zur Login-Seite — die meldet
    // dann den Config-Fehler. Kein 500 vom Middleware-Level.
    const url = new URL("/login", req.url);
    url.searchParams.set("e", "config");
    return NextResponse.redirect(url);
  }

  const adminCookie = req.cookies.get("admin_session")?.value;
  if (!(await verifyCookieToken(adminCookie, adminSecret))) {
    const url = new URL("/login", req.url);
    if (pathname !== "/") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  req.headers.set("x-app-pathname", pathname);
  return NextResponse.next({ request: { headers: req.headers } });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|symbols/|.*\\.svg|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.bmp|.*\\.webp).*)",
  ],
};

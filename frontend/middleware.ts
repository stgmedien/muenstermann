import { NextRequest, NextResponse } from "next/server";

const REALM = "Münstermann Verwaltung";
const PORTAL_COOKIE = "portal_session";

// Edge-safe HMAC via Web Crypto (kein node:crypto in Middleware)
async function hmacSha256(secret: string, body: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
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

async function verifyPortalToken(
  token: string | undefined,
  secret: string,
): Promise<boolean> {
  if (!token) return false;
  const dot = token.indexOf(".");
  if (dot < 0) return false;
  const body = token.slice(0, dot);
  const macGiven = token.slice(dot + 1);

  const expected = await hmacSha256(secret, body);
  const given = b64urlToBytes(macGiven);
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

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const isPortal = pathname.startsWith("/portal");
  // Login-Seite + Submit-Route + Logout sind frei zugänglich
  const isPortalAuthFree =
    pathname === "/portal/login" ||
    pathname === "/portal/login/" ||
    pathname.startsWith("/portal/login/submit") ||
    pathname === "/portal/logout";

  // ------------- Portal-Routen: Cookie-Auth -------------
  if (isPortal) {
    // Login-Seite + Submit-Route + Logout sind frei zugänglich
    if (isPortalAuthFree) {
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

    const cookie = req.cookies.get(PORTAL_COOKIE)?.value;
    if (!(await verifyPortalToken(cookie, secret))) {
      const loginUrl = new URL("/portal/login", req.url);
      if (pathname !== "/portal") loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }

    req.headers.set("x-app-pathname", pathname);
    return NextResponse.next({ request: { headers: req.headers } });
  }

  // ------------- Admin-Routen: Basic Auth -------------
  const expectedUser = process.env.AUTH_USERNAME;
  const expectedPass = process.env.AUTH_PASSWORD;

  if (!expectedUser || !expectedPass) {
    return NextResponse.next();
  }

  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Basic ")) {
    const decoded = atob(auth.slice(6));
    const idx = decoded.indexOf(":");
    const user = decoded.slice(0, idx);
    const pass = decoded.slice(idx + 1);
    if (user === expectedUser && pass === expectedPass) {
      req.headers.set("x-app-pathname", pathname);
      req.headers.set("x-app-user", user);
      return NextResponse.next({
        request: { headers: req.headers },
      });
    }
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": `Basic realm="${REALM}", charset="UTF-8"`,
    },
  });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|symbols/|.*\\.svg|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.bmp).*)",
  ],
};

import { NextRequest, NextResponse } from "next/server";

const REALM = "Münstermann Verwaltung";

export function middleware(req: NextRequest) {
  const expectedUser = process.env.AUTH_USERNAME;
  const expectedPass = process.env.AUTH_PASSWORD;

  // Wenn keine Credentials konfiguriert sind, läuft Auth nicht (Dev-Bequemlichkeit
  // bei nicht konfigurierten Test-Setups).
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
      // Username + Pfad an Server Components weiterreichen
      const res = NextResponse.next({
        request: { headers: new Headers(req.headers) },
      });
      res.headers.set("x-app-user", user);
      // x-app-pathname für Layout-Conditional (PDF-View ohne Sidebar)
      res.headers.set("x-app-pathname", req.nextUrl.pathname);
      // Plus auf Request setzen damit Server Components via headers() lesen können
      req.headers.set("x-app-pathname", req.nextUrl.pathname);
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
    // Alles außer Next.js-Internals, statische Assets und unsere Public-Symbole
    // (die Next.js Image-Optimization-Route holt /symbols/* intern OHNE Cookies,
    // also muss /symbols/* von der Auth befreit sein. Da Bilder keine sensitiven
    // Daten sind, ist das OK.)
    "/((?!_next/static|_next/image|favicon.ico|symbols/|.*\\.svg|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.bmp).*)",
  ],
};

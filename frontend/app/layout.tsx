import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { readAdminSession } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import "./globals.css";

export const metadata: Metadata = {
  title: "Münstermann Verwaltung",
  description: "Hygieneplan- und Reinigungsmittel-Verwaltung",
};

type AdminRole = "ADMIN" | "OPERATOR" | "VIEWER";

const NAV: Array<{
  href: string;
  label: string;
  icon: string;
  minRole?: AdminRole;
}> = [
  { href: "/", label: "Dashboard", icon: "▦" },
  { href: "/touren", label: "Touren", icon: "🚐" },
  { href: "/sheets", label: "Sheets", icon: "📑" },
  { href: "/kunden", label: "Kunden", icon: "🏢" },
  { href: "/reinigungsmittel", label: "Reinigungsmittel", icon: "🧪" },
  { href: "/hygieneplaene", label: "Hygienepläne", icon: "📋" },
  { href: "/gefahrstoffe", label: "Gefahrstoffe", icon: "⚠" },
  { href: "/feiertage", label: "Feiertage", icon: "📅" },
  { href: "/audit", label: "Audit-Log", icon: "🔒" },
  { href: "/admin/users", label: "Nutzerverwaltung", icon: "👥", minRole: "ADMIN" },
];

const ROLE_ORDER: Record<AdminRole, number> = {
  VIEWER: 1,
  OPERATOR: 2,
  ADMIN: 3,
};

function isPrintRoute(pathname: string): boolean {
  return (
    pathname.endsWith("/pdf") ||
    pathname.includes("/pdf/") ||
    pathname.includes("/audit/paket/render") ||
    pathname.includes("/portal/dokumente/render")
  );
}

function isPortalRoute(pathname: string): boolean {
  return pathname.startsWith("/portal") || pathname.startsWith("/m");
}

function isLoginRoute(pathname: string): boolean {
  return (
    pathname === "/login" ||
    pathname === "/login/" ||
    pathname.startsWith("/login/")
  );
}

async function getAdminUser(): Promise<{
  username: string;
  displayName: string;
  role: AdminRole;
} | null> {
  const session = await readAdminSession();
  if (!session) return null;
  const rows = await db.execute<{
    username: string;
    display_name: string;
    role: AdminRole;
    is_active: boolean;
  }>(sql`
    select username, display_name, role::text as role, is_active
      from core.admin_user where id = ${session.uid} limit 1
  `);
  const u = rows[0];
  if (!u || !u.is_active) return null;
  return { username: u.username, displayName: u.display_name, role: u.role };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const h = await headers();
  const pathname = h.get("x-app-pathname") ?? "";
  const print = isPrintRoute(pathname);
  const portal = isPortalRoute(pathname);
  const login = isLoginRoute(pathname);

  // Login-Seite, Print-Routen und Portal-Routen rendern OHNE Backoffice-Shell
  const bareLayout = print || portal || login;

  const user = bareLayout ? null : await getAdminUser();

  return (
    <html lang="de">
      <body
        className={
          print
            ? "bg-white text-slate-900 antialiased"
            : "bg-slate-50 text-slate-900 antialiased"
        }
      >
        {bareLayout ? (
          children
        ) : (
          <div className="flex min-h-screen">
            <aside className="w-64 shrink-0 border-r border-slate-200 bg-white flex flex-col">
              <div className="px-6 py-5 border-b border-slate-200">
                <div className="font-semibold text-slate-900">Münstermann</div>
                <div className="text-xs text-slate-500">Verwaltungs-Software</div>
              </div>
              <nav className="px-3 py-4 space-y-1 flex-1">
                {NAV.filter(
                  (item) =>
                    !item.minRole ||
                    (user && ROLE_ORDER[user.role] >= ROLE_ORDER[item.minRole]),
                ).map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                  >
                    <span className="text-slate-400 w-4 text-center">
                      {item.icon}
                    </span>
                    {item.label}
                  </Link>
                ))}
              </nav>
              {user && (
                <div className="border-t border-slate-200 px-4 py-3">
                  <div className="text-sm font-medium text-slate-700">
                    {user.displayName}
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-1.5">
                    <RoleBadge role={user.role} />
                    <span>· {user.username}</span>
                  </div>
                  <form action="/logout" method="post" className="mt-2">
                    <button
                      type="submit"
                      className="text-xs text-slate-500 hover:text-rose-700 underline"
                    >
                      Abmelden
                    </button>
                  </form>
                </div>
              )}
              <div className="px-6 py-3 border-t border-slate-200 text-xs text-slate-500">
                Neon (EU) · PostgreSQL 17
              </div>
            </aside>
            <main className="flex-1 overflow-x-auto">
              <div className="px-8 py-6 max-w-7xl">{children}</div>
            </main>
          </div>
        )}
      </body>
    </html>
  );
}

function RoleBadge({ role }: { role: AdminRole }) {
  const c =
    role === "ADMIN"
      ? "bg-rose-100 text-rose-800"
      : role === "OPERATOR"
        ? "bg-blue-100 text-blue-800"
        : "bg-slate-100 text-slate-700";
  return (
    <span className={`text-[10px] font-semibold rounded px-1.5 py-0.5 ${c}`}>
      {role}
    </span>
  );
}

import Link from "next/link";
import type { PortalUser } from "@/lib/portal-session";

const NAV = [
  { href: "/portal", label: "Übersicht", icon: "▦" },
  { href: "/portal/touren", label: "Touren", icon: "🚐" },
  { href: "/portal/sheets", label: "Reinigungs-Sheets", icon: "📑" },
  { href: "/portal/dokumente", label: "Dokumente", icon: "📄" },
];

export function PortalShell({
  user,
  children,
  pathname,
}: {
  user: PortalUser;
  children: React.ReactNode;
  pathname?: string;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <div className="text-base font-semibold text-slate-900">
              Münstermann Kunden-Portal
            </div>
            <div className="text-xs text-slate-500">
              {user.customerName}
              {user.customerCity ? ` · ${user.customerCity}` : ""}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-slate-700">{user.displayName}</div>
            <form action="/portal/logout" method="post">
              <button
                type="submit"
                className="text-xs text-slate-500 hover:text-rose-700 underline"
              >
                Abmelden
              </button>
            </form>
          </div>
        </div>
        <nav className="max-w-6xl mx-auto px-6 flex gap-1 -mb-px">
          {NAV.map((n) => {
            const active =
              pathname === n.href ||
              (n.href !== "/portal" && pathname?.startsWith(n.href));
            return (
              <Link
                key={n.href}
                href={n.href}
                className={
                  "px-3 py-2 text-sm border-b-2 -mb-px " +
                  (active
                    ? "border-slate-900 text-slate-900 font-medium"
                    : "border-transparent text-slate-600 hover:text-slate-900")
                }
              >
                <span className="mr-1.5">{n.icon}</span>
                {n.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-6">{children}</main>

      <footer className="border-t border-slate-200 bg-white py-3">
        <div className="max-w-6xl mx-auto px-6 text-xs text-slate-400">
          Anmeldung als <code className="font-mono">{user.username}</code> ·
          Sie sehen nur Daten Ihres Standortes.
        </div>
      </footer>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Münstermann Verwaltung",
  description: "Hygieneplan- und Reinigungsmittel-Verwaltung",
};

const NAV = [
  { href: "/", label: "Dashboard", icon: "▦" },
  { href: "/touren", label: "Touren", icon: "🚐" },
  { href: "/kunden", label: "Kunden", icon: "🏢" },
  { href: "/reinigungsmittel", label: "Reinigungsmittel", icon: "🧪" },
  { href: "/hygieneplaene", label: "Hygienepläne", icon: "📋" },
  { href: "/gefahrstoffe", label: "Gefahrstoffe", icon: "⚠" },
  { href: "/feiertage", label: "Feiertage", icon: "📅" },
  { href: "/audit", label: "Audit-Log", icon: "🔒" },
];

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de">
      <body className="bg-slate-50 text-slate-900 antialiased">
        <div className="flex min-h-screen">
          <aside className="w-64 shrink-0 border-r border-slate-200 bg-white flex flex-col">
            <div className="px-6 py-5 border-b border-slate-200">
              <div className="font-semibold text-slate-900">Münstermann</div>
              <div className="text-xs text-slate-500">Verwaltungs-Software</div>
            </div>
            <nav className="px-3 py-4 space-y-1 flex-1">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                >
                  <span className="text-slate-400 w-4 text-center">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="px-6 py-3 border-t border-slate-200 text-xs text-slate-500">
              Neon (EU) · PostgreSQL 17
            </div>
          </aside>
          <main className="flex-1 overflow-x-auto">
            <div className="px-8 py-6 max-w-7xl">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}

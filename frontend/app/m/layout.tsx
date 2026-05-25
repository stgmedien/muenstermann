import Link from "next/link";

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 -m-6 md:m-0 md:-mx-8 md:-my-6">
      <header className="bg-emerald-700 text-white px-4 py-3 sticky top-0 z-10 shadow">
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          <Link href="/m" className="font-semibold">
            🧹 Tour-App
          </Link>
          <Link href="/" className="text-xs opacity-80 hover:opacity-100">
            Backoffice →
          </Link>
        </div>
      </header>
      <main className="px-4 py-4 max-w-3xl mx-auto pb-24">{children}</main>
    </div>
  );
}

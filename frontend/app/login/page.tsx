import { LoginForm } from "./LoginForm";
import { readAdminSession } from "@/lib/admin-auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; e?: string }>;
}) {
  const { next, e } = await searchParams;
  // Bereits eingeloggt? → weiterleiten
  const session = await readAdminSession();
  if (session) {
    redirect(next && next.startsWith("/") ? next : "/");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-2xl font-semibold text-slate-900">
            Münstermann Verwaltung
          </div>
          <div className="text-sm text-slate-500 mt-1">
            Backoffice — Login erforderlich
          </div>
        </div>
        <LoginForm next={next} errorCode={e} />
        <div className="mt-8 text-center text-xs text-slate-400">
          Kunden-Portal:{" "}
          <a
            href="/portal/login"
            className="underline hover:text-slate-600"
          >
            /portal/login
          </a>
        </div>
      </div>
    </div>
  );
}

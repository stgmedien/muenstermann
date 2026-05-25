import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function PortalLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; e?: string }>;
}) {
  const { next, e } = await searchParams;
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-2xl font-semibold text-slate-900">
            Münstermann Kunden-Portal
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Einblick in Ihre Reinigungsdokumentation
          </p>
        </div>
        <LoginForm next={next} errorCode={e} />
        <p className="mt-6 text-xs text-slate-400 text-center">
          Bei Login-Problemen wenden Sie sich bitte an Ihren Ansprechpartner
          bei Münstermann.
        </p>
      </div>
    </div>
  );
}

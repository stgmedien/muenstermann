"use client";

const ERROR_MESSAGES: Record<string, string> = {
  invalid: "Anmeldung fehlgeschlagen.",
  missing: "Benutzername und Passwort eingeben.",
  inactive: "Konto deaktiviert. Bitte Administrator kontaktieren.",
  locked:
    "Konto vorübergehend gesperrt (zu viele Fehlversuche). Bitte später erneut versuchen.",
};

export function LoginForm({ next, errorCode }: { next?: string; errorCode?: string }) {
  const error = errorCode ? ERROR_MESSAGES[errorCode] ?? ERROR_MESSAGES.invalid : null;

  return (
    <form
      action="/portal/login/submit"
      method="post"
      className="rounded-lg bg-white border border-slate-200 p-6 shadow-sm space-y-4"
    >
      {next && <input type="hidden" name="next" value={next} />}

      <div>
        <label
          htmlFor="username"
          className="block text-xs font-medium text-slate-600 mb-1"
        >
          Benutzername
        </label>
        <input
          id="username"
          name="username"
          type="text"
          required
          autoComplete="username"
          autoFocus
          spellCheck={false}
          className="w-full px-3 py-2 rounded-md border border-slate-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-xs font-medium text-slate-600 mb-1"
        >
          Passwort
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="w-full px-3 py-2 rounded-md border border-slate-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
        />
      </div>

      {error && (
        <div className="rounded-md bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-800">
          {error}
        </div>
      )}

      <button
        type="submit"
        className="w-full py-2.5 rounded-md bg-slate-900 text-white text-sm font-medium hover:bg-slate-700"
      >
        Anmelden
      </button>
    </form>
  );
}

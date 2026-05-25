import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

type AdminRow = {
  id: number;
  username: string;
  display_name: string;
  email: string | null;
  role: string;
  is_active: boolean;
  last_login_at: string | null;
  failed_attempts: number;
  locked_until: string | null;
  created_at: string;
};

type CustomerRow = {
  id: number;
  username: string;
  display_name: string;
  customer_name: string;
  is_active: boolean;
  last_login_at: string | null;
};

async function getAdmins() {
  return await db.execute<AdminRow>(sql`
    select id, username, display_name, email, role::text as role,
           is_active, last_login_at::text, failed_attempts,
           locked_until::text, created_at::text
      from core.admin_user
     order by role desc, username
  `);
}

async function getCustomerUsers() {
  return await db.execute<CustomerRow>(sql`
    select u.id, u.username, u.display_name,
           c.name as customer_name,
           u.is_active, u.last_login_at::text
      from core.customer_user u
      join core.customer c on c.id = u.customer_id
     order by c.name, u.username
  `);
}

export default async function UserAdminPage() {
  await requireAdmin();
  const [admins, customers] = await Promise.all([
    getAdmins(),
    getCustomerUsers(),
  ]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Nutzerverwaltung</h1>
        <p className="text-sm text-slate-500 mt-1">
          Backoffice-Logins und Portal-Logins. Nur sichtbar für Administratoren.
        </p>
      </header>

      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">
          Backoffice-Nutzer ({admins.length})
        </h2>
        <div className="rounded-lg bg-white border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2 text-left">Benutzername</th>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">Rolle</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Letzter Login</th>
                <th className="px-3 py-2 text-right">Fehlversuche</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {admins.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-mono">{u.username}</td>
                  <td className="px-3 py-2">{u.display_name}</td>
                  <td className="px-3 py-2">
                    <RoleBadge role={u.role} />
                  </td>
                  <td className="px-3 py-2">
                    {u.locked_until && new Date(u.locked_until) > new Date() ? (
                      <span className="text-rose-700 text-xs">
                        ⛔ gesperrt bis{" "}
                        {new Date(u.locked_until).toLocaleTimeString("de-DE")}
                      </span>
                    ) : u.is_active ? (
                      <span className="text-emerald-700 text-xs">aktiv</span>
                    ) : (
                      <span className="text-slate-500 text-xs">inaktiv</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-500">
                    {u.last_login_at
                      ? new Date(u.last_login_at).toLocaleString("de-DE")
                      : "nie"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {u.failed_attempts > 0 ? (
                      <span className="text-amber-700">{u.failed_attempts}</span>
                    ) : (
                      <span className="text-slate-300">0</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">
          Kunden-Portal-Nutzer ({customers.length})
        </h2>
        <div className="rounded-lg bg-white border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2 text-left">Benutzername</th>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">Kunde</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Letzter Login</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                    Noch keine Portal-Nutzer angelegt.
                  </td>
                </tr>
              ) : (
                customers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-mono">{u.username}</td>
                    <td className="px-3 py-2">{u.display_name}</td>
                    <td className="px-3 py-2 text-slate-600">
                      {u.customer_name}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {u.is_active ? (
                        <span className="text-emerald-700">aktiv</span>
                      ) : (
                        <span className="text-slate-500">inaktiv</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-500">
                      {u.last_login_at
                        ? new Date(u.last_login_at).toLocaleString("de-DE")
                        : "nie"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm">
        <div className="font-semibold text-amber-900 mb-1">
          Anlegen/Editieren von Nutzern
        </div>
        <p className="text-amber-800 text-xs">
          Aktuell nur lesend. Anlegen + Passwort-Reset folgen in der nächsten
          Iteration — dann auch mit erzwungenem Passwort-Wechsel beim ersten
          Login und 2FA-Option. Bis dahin: neue Nutzer per SQL-Seed-Script (
          <code className="font-mono">tools/seed_admin_user.mjs</code>).
        </p>
      </section>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const c =
    role === "ADMIN"
      ? "bg-rose-100 text-rose-800"
      : role === "OPERATOR"
        ? "bg-blue-100 text-blue-800"
        : "bg-slate-100 text-slate-700";
  return (
    <span className={`text-xs font-semibold rounded px-2 py-0.5 ${c}`}>
      {role}
    </span>
  );
}

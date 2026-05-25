# Deployment — Münstermann auf Vercel + Neon

Schritt-für-Schritt-Anleitung für ein produktives (oder Demo-)Deployment.
Vorausgesetzt: ein Neon-Projekt in EU Central und ein Vercel-Account mit
Zugriff auf das GitHub-Repo `stgmedien/muenstermann`.

---

## 1. Neon-Datenbank vorbereiten

1. **Projekt anlegen** in https://console.neon.tech — Region `eu-central-1`
   (Frankfurt). Postgres-Version 17.
2. **Connection String holen** (Dashboard → Connection Details → "Pooled
   connection", `psql`-Format). Format:
   ```
   postgresql://USER:PASSWORD@ep-xxx-pooler.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
   ```
3. **Optional**: zweite Datenbank-Branch `preview` für Vercel-Preview-Deploys.

---

## 2. DDL + Seeds anwenden (einmalig pro neuer DB)

Lokal mit aktiver Python-Venv:

```bash
cd ~/Downloads/muenstermann-migration
source .venv/bin/activate

# DATABASE_URL temporär exportieren (NICHT in .env committen)
export DATABASE_URL="postgresql://USER:PASS@HOST/neondb?sslmode=require"

# Erstmaliges Apply
python tools/apply.py

# Oder: alles platt machen und neu aufsetzen
python tools/apply.py --reset
```

`tools/apply.py` lädt die DDL-Dateien in der korrekten Reihenfolge
(siehe `DDL_ORDER` im Skript), dann die Seeds. Am Ende werden die
Zeilenzahlen pro Tabelle ausgegeben — Sanity-Check.

---

## 3. Erste Backoffice-Nutzer anlegen

```bash
# Drei Rollen — ADMIN, OPERATOR, VIEWER
DATABASE_URL="postgresql://..." node tools/seed_admin_user.mjs \
  jonathan.k 'sauber22macher' ADMIN 'Jonathan K.' jonathan@example.com

DATABASE_URL="postgresql://..." node tools/seed_admin_user.mjs \
  disponent 'TestDisponent-2026' OPERATOR 'Disponent (Demo)'

DATABASE_URL="postgresql://..." node tools/seed_admin_user.mjs \
  viewer 'TestViewer-2026' VIEWER 'Viewer (Demo)'
```

Das Skript benutzt scrypt mit zufälligem Salt; das Passwort wird **nie** im
Klartext gespeichert. `on conflict do update` macht es idempotent.

> Portal-Nutzer (`borgmeier` etc.) werden über ein separates Skript bzw.
> direkt in `core.customer_user` angelegt — siehe Portal-Setup-Notes.

---

## 4. Vercel-Projekt einrichten

### 4.1 Repo importieren

1. https://vercel.com/new
2. **Import Git Repository** → `stgmedien/muenstermann` auswählen.
3. Auf dem nächsten Screen:
   - **Framework Preset:** Next.js (auto-detect sollte greifen)
   - **Root Directory:** `frontend` ← wichtig, sonst findet Vercel `package.json` nicht
   - **Build Command:** `next build` (aus `frontend/vercel.json` übernommen)
   - **Output Directory:** Default lassen
   - **Install Command:** `npm install` (oder `pnpm install`, wenn pnpm
     genutzt wird)
   - **Node Version:** 22.x

### 4.2 Environment Variables eintragen

In **Project Settings → Environment Variables** drei Variablen anlegen,
jeweils für `Production` und `Preview` (Development kann leer bleiben):

| Name | Wert | Hinweis |
|---|---|---|
| `DATABASE_URL` | Neon-Pooled-Connection-String | inkl. `?sslmode=require&channel_binding=require` |
| `ADMIN_SESSION_SECRET` | `openssl rand -base64 48` | ≥ 32 Zeichen Pflicht |
| `PORTAL_SESSION_SECRET` | `openssl rand -base64 48` | ≥ 32 Zeichen, **anderer Wert** als Admin |

Secrets lokal erzeugen:

```bash
openssl rand -base64 48
# Beispiel-Output: a1B2c3D4e5F6...== — 64 Zeichen, base64
```

> **Niemals** Secrets in `frontend/.env.example` oder ins Repo committen.
> Vercel verschlüsselt diese Werte at-rest und stellt sie nur zur
> Build-/Runtime bereit.

### 4.3 Region setzen

Bereits in `frontend/vercel.json` festgenagelt: `regions: ["fra1"]`
(Frankfurt, gleicher Cloud-Standort wie Neon EU Central). Damit liegt
die Server-Runtime im selben Rechenzentrum wie die DB — minimale Latenz.

### 4.4 Function-Timeouts

Ebenfalls in `frontend/vercel.json` konfiguriert: `maxDuration: 60s`
für `app/audit/paket/render/page.tsx` und `app/audit/paket/page.tsx`
(PDF-Generierung kann je nach Kundenvolumen länger laufen) sowie `30s`
für die Hash-Chain-Verifikation und das Foto-Endpoint.

Hobby-Plan erlaubt maximal 60s. Falls die Audit-Pakete länger brauchen,
muss auf Pro upgegradet werden (dort bis 300s).

---

## 5. Erstes Deployment auslösen

```bash
# Im Repo-Root, lokal
git push origin main
```

Vercel deployt automatisch. Erstes Build dauert ca. 2–3 Minuten (Install
+ `next build` + Tracing).

Live-URLs nach erfolgreichem Deploy:

- `https://muenstermann.vercel.app/login` (Backoffice)
- `https://muenstermann.vercel.app/portal/login` (Portal)
- `https://muenstermann.vercel.app/` (Backoffice-Dashboard, redirect
  zu `/login`, wenn nicht eingeloggt)

---

## 6. Smoke-Test

Direkt nach dem Deploy:

1. `/login` aufrufen → Login-Maske erscheint, kein 500.
2. Mit ADMIN-Login einloggen → Dashboard zeigt Zahlen (Kunden,
   Abteilungen, …). Wenn DB leer ist, stehen überall Nullen → DDL+Seeds
   sind nicht durchgelaufen, zurück zu Schritt 2.
3. `/audit` → Audit-Log zeigt Einträge.
4. `/audit/integritaet` → Hash-Chain-Verifikation läuft durch ("Kette
   verifiziert").
5. `/portal/login` → Portal-Login. Mit `borgmeier`-Demo-Login einloggen.

Wenn das durchläuft, ist der Stack live.

---

## 7. Custom Domain (optional)

In Vercel **Project Settings → Domains** eine eigene Domain hinzufügen
(z. B. `app.muenstermann.de`). DNS-Records (CNAME oder A) werden im
Dashboard angezeigt. Nach DNS-Propagation wird automatisch ein
Let's-Encrypt-Zertifikat ausgestellt.

> Die in `middleware.ts` gesetzten Cookies haben `httpOnly` + `secure`
> (in Production). Eine Cross-Site-Subdomain (z. B. `portal.muenstermann.de`
> separat) würde dedizierte Cookie-Domain-Settings benötigen — derzeit
> nicht konfiguriert.

---

## 8. Updates pushen

```bash
git push origin main      # → Production-Deploy
git push origin <branch>  # → Preview-Deploy mit eigener URL
```

Jeder Push erzeugt einen unveränderlichen Deployment-Snapshot. Rollback
über das Vercel-Dashboard ("Promote to Production" auf einem alten
Deployment).

---

## 9. Troubleshooting

| Symptom | Ursache | Fix |
|---|---|---|
| 500 auf `/login` | `ADMIN_SESSION_SECRET` fehlt oder < 32 Zeichen | Env-Var in Vercel korrigieren, Redeploy |
| Login bringt `?e=config` | Middleware erkennt fehlendes Secret | wie oben |
| Dashboard zeigt nur Nullen | DDL/Seeds nicht angewendet | `tools/apply.py` lokal gegen Neon |
| `prepared statement does not exist` | Neon-Pooler + postgres.js ohne `prepare: false` | bereits in `frontend/lib/db.ts` gesetzt — sonst Connection-String prüfen |
| PDF-Generierung timeout | `maxDuration` überschritten | Pro-Plan + höhere `maxDuration` |
| Build schlägt fehl, "Cannot find module @/..." | Root Directory falsch gesetzt | Vercel-Project-Settings → Root Directory = `frontend` |

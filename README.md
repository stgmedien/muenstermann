# Münstermann Cleaning Operations Platform

Reinigungs-Software für die Münstermann GmbH. Löst eine über Jahre gewachsene
Microsoft-Access-Landschaft (9 `.accdb`, ~340 MB) durch eine sauber modellierte
PostgreSQL-Datenbank auf Neon EU plus ein Next.js-Backoffice und ein
Kundenportal ab.

## Live-Demo

Sobald das Vercel-Deployment durchgelaufen ist (siehe `docs/DEPLOY.md`):

- Backoffice (Disponenten/Admin): `https://muenstermann.vercel.app/login`
- Kundenportal: `https://muenstermann.vercel.app/portal/login`

## Test-Logins

| Bereich | Rolle | Benutzer | Passwort |
|---|---|---|---|
| Backoffice | ADMIN | `jonathan.k` | `sauber22macher` |
| Backoffice | OPERATOR | `disponent` | `TestDisponent-2026` |
| Backoffice | VIEWER | `viewer` | `TestViewer-2026` |
| Portal | KUNDE | `borgmeier` | `demo-portal-2026` |

> Diese Logins existieren nur, nachdem das Seeding (`tools/seed_admin_user.mjs`
> bzw. das Portal-Pendant) gegen die Ziel-DB gelaufen ist.

## Architektur in drei Sätzen

Datenebene: PostgreSQL 17 auf Neon EU mit vier Schemas (`core`, `catalog`,
`ops`, `audit`) und einem Trigger-basierten Audit-Trail, der jede Änderung
inklusive Hash-Chain-Verkettung in `audit.activity_log` schreibt.
Anwendungsschicht: Next.js 16 (App Router, Turbopack) mit Drizzle ORM,
postgres.js und custom Cookie-Sessions (HMAC-SHA-256), getrennt für Admin
und Portal. Deployment: Vercel (Region `fra1`), Datenbank-Migration via
`tools/apply.py`, Auth-Seeding via `tools/seed_admin_user.mjs`.

## Lokale Entwicklung

### 1. Python-Umgebung (für Migrations-Tooling)

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Datenbank konfigurieren

Im Repo-Root:

```bash
cp ops/secrets/.env.example .env   # oder eigene .env anlegen
# DATABASE_URL eintragen (Neon-Connection-String)
```

DDL + Seeds anwenden:

```bash
.venv/bin/python tools/apply.py        # erstes Mal
.venv/bin/python tools/apply.py --reset  # neu aufsetzen (DROP CASCADE)
```

### 3. Backoffice/Portal lokal starten

```bash
cd frontend
cp .env.example .env.local
# DATABASE_URL, ADMIN_SESSION_SECRET, PORTAL_SESSION_SECRET eintragen
# Secrets erzeugen: openssl rand -base64 48
npm install
npm run dev
```

Backoffice unter http://localhost:3000/login, Portal unter
http://localhost:3000/portal/login.

### 4. Erste Nutzer anlegen

```bash
DATABASE_URL="postgresql://…" node tools/seed_admin_user.mjs \
  jonathan.k 'sauber22macher' ADMIN 'Jonathan K.' jonathan@example.com
```

## Deployment

Vercel zieht aus diesem Repo das `frontend/`-Verzeichnis als Root. Detaillierte
Schritt-für-Schritt-Anleitung: **[docs/DEPLOY.md](docs/DEPLOY.md)**. Kurzform:

1. Vercel → Import → `github.com/stgmedien/muenstermann`
2. Root Directory: `frontend`
3. Environment Variables: `DATABASE_URL`, `ADMIN_SESSION_SECRET`,
   `PORTAL_SESSION_SECRET` (siehe `frontend/.env.example`)
4. Region: `fra1` (EU, gleiche Region wie Neon)
5. `git push origin main` → Vercel deployt automatisch

## Quelldaten

Die Original-`.accdb`-Dateien liegen in
`~/Downloads/Probedaten Datenbank Muenstermann  Test/` und werden
**niemals** ins Repo committed (siehe `.gitignore`).

## Verzeichnisstruktur

```
frontend/    Next.js 16 — Backoffice + Portal (Vercel-Deploy-Target)
inventory/   Auto-generierte Inventarberichte pro Quell-DB
schema/      Ziel-DDL für PostgreSQL + Audit-Trigger + Migrations
etl/         Extract/Transform/Load-Pipelines pro Domäne
tests/       Unit-Tests + SQL-Geschäftsregel-Assertions
docs/        ADRs, Domänenwissen, Compliance-Mapping, Runbooks, DEPLOY
ops/         Neon-Infra-Notes, .env-Vorlagen
tools/       JAR-Bundles, Helfer-Skripte (apply.py, seed_admin_user.mjs)
```

## Domänen (PostgreSQL-Schemas)

Strikte Trennung — Personal/Lohn ↔ Kundenfakturierung **nie** vermischen.

- `core.*` — Kunden, Mitarbeiter, Adressen, Standorte, Backoffice-User
- `catalog.*` — Reinigungsmittel, Gefahrstoffe, Sicherheitsdatenblätter,
  Hygieneplan-Master
- `ops.*` — Kundenprojekte, Reinigungspläne, Touren, Inspektionen, Sheets
- `hr.*` — Stempeluhrdaten, Arbeitszeit (geplant)
- `payroll.*` — Lohn, Zuschläge, Abrechnungsläufe (geplant)
- `billing.*` — Kundenfakturierung, Orgamax-Anbindung (geplant)
- `audit.*` — Audit-Trail, JSONB-Snapshots, Hash-Chain

## Phasen-Status

- **Phase 0** — Tooling-Setup, `.accdb`-Inventarisierung ✅
- **Phase 1** — Ziel-DDL Catalog/Core/Ops + Audit-Framework ✅
- **Phase 2** — ETL aus 9 Access-DBs, idempotente Seeds, SQL-Assertions ✅
- **Phase 3** — Backoffice-Frontend (Login, Kunden, Reinigungsmittel,
  Hygienepläne, Touren, Sheets) ✅
- **Phase 4** — Audit-Paket (PDF, Hash-Chain-Verifikation) ✅
- **Phase 5** — Kundenportal (Read-only Pläne + Berichte) 🔧 in Arbeit
- **Phase 6** — Mobile Vorarbeiter-PWA (Inspection-Workflow, offline-fähig) 📋 geplant
- **Phase 7** — HR / Payroll / Billing-Domänen 📋 geplant

Plan-Dokument: siehe `docs/PRODUCT_VISION.md`. ADRs unter
`docs/decisions/`.

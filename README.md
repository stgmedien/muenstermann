# Münstermann Migration: Access (.accdb) → PostgreSQL (Neon EU)

Migration der über Jahre gewachsenen Microsoft-Access-Landschaft (9 `.accdb`,
~340 MB) hin zu einer sauber modellierten PostgreSQL-Datenbank auf Neon.

**Status:** Phase 0 — Tooling-Setup & Inventarisierung. Kein produktiver
Migrationscode bisher.

**Plan-Dokument:** siehe `~/.claude/plans/aufgabe-migrationsplan-access-jiggly-scroll.md`
(externer Plan, hier nicht im Repo). Kurzform unter [docs/decisions/](docs/decisions/).

## Quelldaten

Die Original-`.accdb`-Dateien liegen in
`~/Downloads/Probedaten Datenbank Muenstermann  Test/`
und werden **niemals** ins Repo committed (siehe `.gitignore`).

## Setup (macOS)

### 1. Systemwerkzeuge (einmalig)
```bash
# Homebrew (wenn nicht vorhanden):
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Java + mdbtools:
brew install openjdk mdbtools

# Java in PATH einrichten (für aktuellen Shell):
export PATH="/opt/homebrew/opt/openjdk/bin:$PATH"
```

### 2. Python-Umgebung
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt  # noch zu schreiben
```

### 3. UCanAccess JDBC-Treiber
Liegt entpackt in `tools/ucanaccess-5.0.1/` (manuell entpackt aus
`tools/ucanaccess-5.0.1.bin.zip`, gitignored).

## Verzeichnisstruktur

```
inventory/   Auto-generierte Inventarberichte pro Quell-DB (Schema, Profile, Diff)
schema/      Ziel-DDL für PostgreSQL + Audit-Trigger + Migrations
etl/         Extract/Transform/Load-Pipelines pro Domäne
tests/       Unit-Tests + SQL-Geschäftsregel-Assertions
docs/        ADRs, Domänenwissen, Compliance-Mapping, Runbooks
ops/         Neon-Infra-Notes, .env-Vorlagen
tools/       JAR-Bundles, Helfer-Skripte (keine produktive Logik)
```

## Domänen (PostgreSQL-Schemas)

Strikte Trennung — Personal/Lohn ↔ Kundenfakturierung **nie** vermischen.

- `core.*` — Kunden, Mitarbeiter, Adressen, Standorte
- `catalog.*` — Reinigungsmittel, Gefahrstoffe, Sicherheitsdatenblätter
- `ops.*` — Kundenprojekte, Reinigungspläne, Gefahrenanalysen
- `hr.*` — Stempeluhrdaten, Arbeitszeit
- `payroll.*` — Lohn, Zuschläge, Abrechnungsläufe
- `billing.*` — Kundenfakturierung (Orgamax-Anbindung später)
- `audit.*` — Audit-Trail, Versionierung

# Ziel-Schema (PostgreSQL)

DDL-Dateien sind durch Präfix-Nummern sortiert; Apply-Reihenfolge ist
streng aufsteigend (sequenziell, idempotente Definitionen wo möglich
über `CREATE OR REPLACE`).

```
000_schemas.sql               Schemas anlegen (audit, catalog, core, ops, hr, payroll, billing)
audit/
  010_audit_framework.sql     audit.activity_log + audit.log_changes + audit.enable_for
catalog/
  100_catalog_domain.sql      Reinigungsmittel-Domäne: Stammdaten + Junction-Tabellen
core/
  (Phase 2)                   Kunden-, Mitarbeiter-, Adress-, Standort-Stammdaten
ops/
  (Phase 2)                   Hygienepläne, Gefahrenanalysen, Einsätze
```

**Konventionen:**

- Surrogate Primary Key: `id bigint generated always as identity primary key`.
- Original-Access-IDs als `legacy_id text unique`, ETL-rückverfolgbar.
- Audit-Trail: jede fachliche Tabelle bekommt `select audit.enable_for(schema, table)`.
- Zeitstempel: `created_at timestamptz not null default now()`; `updated_at` nur wo es semantisch nötig ist.
- Kein NULL für Identifikatoren und Pflichtfelder; CHECK-Constraints wo Format/Wertebereich klar ist.
- Foreign Keys: explizit + benannt; Cascade-Delete nur in Junction-Tabellen.
- Naming: snake_case für Tabellen/Spalten; Englisch für Tabellen/Spalten (auch wenn die Domäne deutsch ist), weil das in PG-Tooling-Welt natürlicher liest. Comments + Dokumentation bleiben deutsch.

**Anwendung (Bsp Neon-Konsole):**

```sql
\i 000_schemas.sql
\i audit/010_audit_framework.sql
\i catalog/100_catalog_domain.sql
```

Oder via psql:

```bash
psql "$DATABASE_URL" -f schema/ddl/000_schemas.sql \
                     -f schema/ddl/audit/010_audit_framework.sql \
                     -f schema/ddl/catalog/100_catalog_domain.sql
```

**Migrations-Tool:** noch nicht gewählt. Kandidaten: `sqitch`, `dbmate`, oder
ein Plain-SQL-Workflow mit einer kleinen `schema/migrations/`-Konvention.
Entscheidung kommt mit Phase 2.

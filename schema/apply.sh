#!/bin/bash
# Apply Schema + Seeds in korrekter Reihenfolge gegen eine PostgreSQL-DB.
#
# Voraussetzung: $DATABASE_URL ist gesetzt (z. B. Neon Connection String).
# Beispiel:
#   export DATABASE_URL="postgres://user:pass@host/db"
#   bash schema/apply.sh
#
# Bei Fehlern bricht das Skript ab (psql -v ON_ERROR_STOP=1).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

if [ -z "${DATABASE_URL:-}" ]; then
    echo "FEHLER: DATABASE_URL ist nicht gesetzt." >&2
    exit 1
fi

run() {
    local f="$1"
    echo ">> $f"
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$ROOT/$f"
}

echo "=== Schemas ==="
run schema/ddl/000_schemas.sql

echo "=== Audit-Framework ==="
run schema/ddl/audit/010_audit_framework.sql

echo "=== Catalog-Domäne ==="
run schema/ddl/catalog/100_catalog_domain.sql
run schema/ddl/catalog/200_hygiene_plans.sql
run schema/ddl/catalog/210_hazard_factors.sql

echo "=== Core-Domäne ==="
run schema/ddl/core/100_customer_domain.sql
run schema/ddl/core/200_calendar_domain.sql

echo "=== Ops-Domäne ==="
run schema/ddl/ops/100_department_domain.sql
# 300 vor 200: 200 hat ALTER TABLE mit FK auf customer_hygiene_plan aus 300
run schema/ddl/ops/300_customer_artifacts.sql
run schema/ddl/ops/200_hygiene_control.sql

echo "=== Seeds (idempotent — können wiederholt werden) ==="
# Reihenfolge der Seeds bedacht: erst Kataloge (referenzierte Stammdaten),
# dann core (Kunden), dann ops (referenziert Kunden).
# Innerhalb ops: department/department_object zuerst (werden von hygiene_control
# und work_instruction referenziert), dann customer_hygiene_plan
# (von work_instruction referenziert), dann der Rest.
for seed in catalog_reinigungsmittel.sql \
            catalog_hygiene_plans.sql \
            core_customer_domain.sql \
            core_calendar_domain.sql \
            ops_department_domain.sql \
            ops_customer_artifacts.sql \
            ops_hygiene_control.sql \
            ops_hygiene_control_rewe.sql; do
    seed_path="schema/seeds/$seed"
    if [ -f "$ROOT/$seed_path" ]; then
        run "$seed_path"
    else
        echo "   (übersprungen, fehlt: $seed_path — generieren via etl/*.py)"
    fi
done

echo
echo "=== Fertig ==="
echo "Stats: psql \"\$DATABASE_URL\" -c 'SELECT table_schema, table_name, n_live_tup FROM pg_stat_user_tables ORDER BY 1, 2'"

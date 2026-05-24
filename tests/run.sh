#!/bin/bash
# tests/run.sh — führt alle Assertions in tests/assertions/ sequenziell aus.
#
# Voraussetzung: schema/apply.sh ist vorher gelaufen und Daten sind geladen.
# $DATABASE_URL ist gesetzt.

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ASSERT_DIR="$SCRIPT_DIR/assertions"

if [ -z "${DATABASE_URL:-}" ]; then
    echo "FEHLER: DATABASE_URL ist nicht gesetzt." >&2
    exit 1
fi

failures=0
total=0
infos=0

echo "=== SQL-Assertions ==="
echo

for f in "$ASSERT_DIR"/*.sql; do
    name=$(basename "$f" .sql)
    echo "── $name ──"
    out=$(psql "$DATABASE_URL" -X -t -A -F $'\t' -P pager=off -v ON_ERROR_STOP=1 -f "$f" 2>&1)
    rc=$?
    if [ $rc -ne 0 ]; then
        echo "FEHLER bei $name (psql rc=$rc):"
        echo "$out"
        failures=$((failures + 1))
        continue
    fi
    while IFS=$'\t' read -r test_name status violations details; do
        total=$((total + 1))
        case "$status" in
            OK)
                printf '  ✓ %-60s %s\n' "$test_name" "OK"
                ;;
            INFO)
                infos=$((infos + 1))
                printf '  ⓘ %-60s %s\n' "$test_name" "${details:-(no details)}"
                ;;
            FAIL|WARN)
                failures=$((failures + 1))
                printf '  ✗ %-60s %s — %s violations: %s\n' "$test_name" "$status" "$violations" "${details:-(no details)}"
                ;;
            *)
                printf '  ? %-60s %s\n' "$test_name" "$status"
                ;;
        esac
    done <<< "$out"
    echo
done

echo "=== Zusammenfassung ==="
echo "Tests gesamt: $total"
echo "Fehlschläge:  $failures"
echo "Infos:        $infos"

if [ $failures -gt 0 ]; then
    exit 1
fi
exit 0

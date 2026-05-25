#!/usr/bin/env python3
"""Apply Schema + Seeds gegen PostgreSQL (Neon-kompatibel).

Liest DATABASE_URL aus .env oder Umgebung. Fährt Statements einzeln durch
psycopg, weil ein paar DO-Blöcke und ALTER TYPE ADD VALUE nicht in EINER
Transaktion mit dem späteren Gebrauch des Typs laufen können.

Aufruf:
    .venv/bin/python tools/apply.py
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

import psycopg
from dotenv import load_dotenv

REPO_ROOT = Path(__file__).resolve().parents[1]
load_dotenv(REPO_ROOT / ".env")

DDL_ORDER = [
    "schema/ddl/000_schemas.sql",
    "schema/ddl/audit/010_audit_framework.sql",
    "schema/ddl/audit/020_hash_chain.sql",
    "schema/ddl/catalog/100_catalog_domain.sql",
    "schema/ddl/catalog/200_hygiene_plans.sql",
    "schema/ddl/catalog/210_hazard_factors.sql",
    "schema/ddl/core/100_customer_domain.sql",
    "schema/ddl/core/200_calendar_domain.sql",
    "schema/ddl/ops/100_department_domain.sql",
    # 300 vor 200: hygiene_control_plan (200) hat ein ALTER TABLE,
    # das FK auf customer_hygiene_plan (in 300) setzt.
    "schema/ddl/ops/300_customer_artifacts.sql",
    "schema/ddl/ops/200_hygiene_control.sql",
    "schema/ddl/ops/400_inspection.sql",
    "schema/ddl/ops/600_inspection_photo.sql",
    "schema/ddl/ops/500_cleaning_sheet.sql",
]

SEED_ORDER = [
    "schema/seeds/catalog_reinigungsmittel.sql",
    "schema/seeds/catalog_hygiene_plans.sql",
    "schema/seeds/core_customer_domain.sql",
    "schema/seeds/core_calendar_domain.sql",
    "schema/seeds/ops_department_domain.sql",
    "schema/seeds/ops_customer_artifacts.sql",
    "schema/seeds/ops_hygiene_control.sql",
    "schema/seeds/ops_hygiene_control_rewe.sql",
]


def apply_file(conn: psycopg.Connection, path: Path) -> tuple[int, int]:
    """Liest die Datei und executet ihren Inhalt als ein execute()-Call.

    psycopg kann Mehrfach-Statements in einem execute (außer für COPY).
    Returns (statements_executed, statements_failed).
    """
    sql = path.read_text(encoding="utf-8")
    try:
        with conn.cursor() as cur:
            cur.execute(sql)
        conn.commit()
        return 1, 0
    except psycopg.Error as e:
        conn.rollback()
        print(f"  ✗ {path.relative_to(REPO_ROOT)}: {e}", file=sys.stderr)
        return 0, 1


def main() -> int:
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        print("FEHLER: DATABASE_URL nicht gesetzt (.env fehlt?)", file=sys.stderr)
        return 1

    reset = "--reset" in sys.argv

    # Conninfo etwas freundlicher anzeigen (ohne Passwort)
    show_url = db_url.split("@", 1)[-1] if "@" in db_url else db_url
    print(f"Ziel: {show_url}")
    if reset:
        print("Modus: --reset (DROP SCHEMA CASCADE vor Apply)")
    print()

    failures = 0
    with psycopg.connect(db_url) as conn:
        if reset:
            print("=== Reset ===")
            with conn.cursor() as cur:
                for schema in ("ops", "core", "catalog", "audit"):
                    cur.execute(f"drop schema if exists {schema} cascade")
                    print(f"  ✓ DROP SCHEMA {schema} CASCADE")
            conn.commit()
            print()
        # PostgreSQL-Version anzeigen
        with conn.cursor() as cur:
            cur.execute("select version()")
            (version,) = cur.fetchone()
        print(f"Server: {version}")
        print()

        print("=== DDL ===")
        for rel in DDL_ORDER:
            p = REPO_ROOT / rel
            if not p.exists():
                print(f"  ⚠ {rel} (nicht gefunden)")
                continue
            ok, fail = apply_file(conn, p)
            if ok:
                print(f"  ✓ {rel}")
            failures += fail

        if failures > 0:
            print()
            print(f"DDL-Fehler: {failures} — Apply abgebrochen.", file=sys.stderr)
            return 1

        print()
        print("=== Seeds (idempotent) ===")
        for rel in SEED_ORDER:
            p = REPO_ROOT / rel
            if not p.exists():
                print(f"  ⚠ {rel} (nicht gefunden — generiere via etl/*.py)")
                continue
            ok, fail = apply_file(conn, p)
            if ok:
                print(f"  ✓ {rel}")
            failures += fail

        # Stats: was haben wir jetzt drin?
        print()
        print("=== Zeilen pro Tabelle ===")
        with conn.cursor() as cur:
            cur.execute("""
                select table_schema, table_name
                from information_schema.tables
                where table_schema in ('audit', 'catalog', 'core', 'ops')
                  and table_type = 'BASE TABLE'
                order by table_schema, table_name
            """)
            tables = cur.fetchall()
            for schema, table in tables:
                cur.execute(f'select count(*) from "{schema}"."{table}"')
                (n,) = cur.fetchone()
                print(f"  {schema}.{table:40s} {n:6d}")

    print()
    if failures > 0:
        print(f"=== {failures} Fehler ===", file=sys.stderr)
        return 1
    print("=== Erfolgreich ===")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

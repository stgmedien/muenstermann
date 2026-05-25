#!/usr/bin/env python3
"""Schema-Migration + UPDATE für die Piktogramm-URLs.

Nach Lauf von tools/ExtractPictograms.java (Bilder kopiert nach
frontend/public/symbols/...) ergänzen wir catalog.hazard_symbol und
catalog.ppe_symbol um eine image_url-Spalte und tragen die Pfade ein.

Pfad-Konvention: /symbols/hazard/{legacy_id}.{ext}   (URL-Pfad im Frontend)
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

import psycopg
from dotenv import load_dotenv

REPO_ROOT = Path(__file__).resolve().parents[1]
load_dotenv(REPO_ROOT / ".env")

SYMBOLS_DIR = REPO_ROOT / "frontend" / "public" / "symbols"


def discover_image(category_dir: Path) -> dict[str, str]:
    """Liefert {legacy_id: 'ID.ext'} für alle Bilder im Verzeichnis."""
    mapping: dict[str, str] = {}
    for f in sorted(category_dir.iterdir()):
        if f.is_dir():
            continue
        stem = f.stem
        if stem.isdigit():
            mapping[stem] = f.name
    return mapping


def main() -> int:
    db_url = os.environ["DATABASE_URL"]
    hazard = discover_image(SYMBOLS_DIR / "hazard")
    ppe = discover_image(SYMBOLS_DIR / "ppe")
    print(f"Hazard-Bilder gefunden: {len(hazard)}")
    print(f"PPE-Bilder gefunden:    {len(ppe)}")

    with psycopg.connect(db_url) as conn:
        with conn.cursor() as cur:
            # Schema-Migration: image_url-Spalten (idempotent)
            cur.execute("""
                do $$
                begin
                    if not exists (
                        select 1 from information_schema.columns
                        where table_schema = 'catalog' and table_name = 'hazard_symbol'
                          and column_name = 'image_url'
                    ) then
                        alter table catalog.hazard_symbol add column image_url text;
                    end if;
                    if not exists (
                        select 1 from information_schema.columns
                        where table_schema = 'catalog' and table_name = 'ppe_symbol'
                          and column_name = 'image_url'
                    ) then
                        alter table catalog.ppe_symbol add column image_url text;
                    end if;
                end$$;
            """)
            conn.commit()

            # Audit-Aktor setzen für die Updates
            cur.execute("select set_config('app.user_id', 'tools/apply_pictograms.py', false)")

            updated_h = 0
            for legacy_id, filename in hazard.items():
                url = f"/symbols/hazard/{filename}"
                cur.execute(
                    "update catalog.hazard_symbol set image_url = %s where legacy_id = %s",
                    (url, legacy_id),
                )
                updated_h += cur.rowcount

            updated_p = 0
            for legacy_id, filename in ppe.items():
                url = f"/symbols/ppe/{filename}"
                cur.execute(
                    "update catalog.ppe_symbol set image_url = %s where legacy_id = %s",
                    (url, legacy_id),
                )
                updated_p += cur.rowcount

            conn.commit()

        # Verify
        with conn.cursor() as cur:
            cur.execute(
                "select legacy_id, name, image_url from catalog.hazard_symbol "
                "order by legacy_id::int"
            )
            print()
            print("=== catalog.hazard_symbol ===")
            for row in cur.fetchall():
                print(f"  {row[0]:3s} {row[1]:25s} → {row[2] or '—'}")

            cur.execute(
                "select legacy_id, name, image_url from catalog.ppe_symbol "
                "order by legacy_id::int"
            )
            print()
            print("=== catalog.ppe_symbol ===")
            for row in cur.fetchall():
                print(f"  {row[0]:3s} {row[1]:25s} → {row[2] or '—'}")

    print()
    print(f"Updated: {updated_h} hazard + {updated_p} ppe.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

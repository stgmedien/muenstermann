"""Smoke-Test: kann das Tooling überhaupt .accdb öffnen?

Aufruf:
    .venv/bin/python tools/smoke_test.py \\
        "/Users/.../Probedaten Datenbank Muenstermann  Test/Musterdatenbank 2026.accdb"

Erwartetes Verhalten:
    1. Verbindung wird hergestellt (UCanAccess JDBC).
    2. Liste der Anwendertabellen wird gedruckt + Row-Count pro Tabelle.
    3. Spaltenstruktur und 5 Beispielzeilen der ersten Tabelle.
    4. Exit-Code 0 = erfolgreich.

Was der Test NICHT macht:
    - Nichts schreiben.
    - Nichts persistent speichern.
    - Keine personenbezogenen Daten ausgeben (nur Spaltenstruktur,
      Stichprobenausgabe kann personenbezogen sein → bewusst auf 5 Zeilen
      begrenzt, läuft nicht in Logs).
"""

from __future__ import annotations

import sys
from pathlib import Path

# Repo-Root in sys.path, damit etl/ importierbar ist
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from etl.extract import access_reader  # noqa: E402


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print(__doc__)
        return 2

    accdb_path = argv[1]
    print(f"[smoke-test] Datei: {accdb_path}")

    try:
        conn = access_reader.connect(accdb_path, read_only=True)
    except Exception as exc:
        print(f"[FEHLER] Verbindung gescheitert: {exc.__class__.__name__}: {exc}")
        return 1

    try:
        tables = access_reader.list_user_tables(conn)
        print(f"[smoke-test] {len(tables)} Anwendertabellen gefunden:")
        for t in tables:
            try:
                rc = access_reader.table_row_count(conn, t)
            except Exception as exc:
                rc = f"FEHLER {exc.__class__.__name__}"
            print(f"  - {t}: {rc} Zeilen")

        if tables:
            first = tables[0]
            print(f"\n[smoke-test] Struktur der ersten Tabelle: {first}")
            for col_name, col_type, nullable in access_reader.table_columns(conn, first):
                null_str = "NULL" if nullable else "NOT NULL"
                print(f"    {col_name:40s} {col_type:20s} {null_str}")

            print(f"\n[smoke-test] 5 Beispielzeilen aus {first}:")
            df = access_reader.sample_rows(conn, first, limit=5)
            with __import__("pandas").option_context(
                "display.max_columns", None,
                "display.width", 200,
                "display.max_colwidth", 60,
            ):
                print(df.to_string(index=False))

        print("\n[smoke-test] OK")
        return 0
    finally:
        conn.close()


if __name__ == "__main__":
    sys.exit(main(sys.argv))

#!/usr/bin/env python3
"""Syntaktische Validierung aller SQL-Dateien gegen den PostgreSQL-Parser.

Nutzt pglast (libpg_query) — kein PG-Server nötig. Findet Syntaxfehler,
fehlerhaftes Quoting, falsche Keywords etc. — ABER KEINE semantischen
Probleme wie "Spalte X existiert nicht in Tabelle Y" oder
"FK auf nicht-existierende Tabelle".

Aufruf:
    .venv/bin/python tools/validate_sql.py [pfad-zu-sql-dateien...]

Default: schema/ddl/**.sql + schema/seeds/*.sql + tests/assertions/*.sql

Exit-Code 0 wenn alle OK, 1 wenn min. 1 Datei Fehler hat.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pglast
from pglast.parser import ParseError

REPO_ROOT = Path(__file__).resolve().parents[1]

DEFAULT_PATHS = [
    REPO_ROOT / "schema" / "ddl",
    REPO_ROOT / "schema" / "seeds",
    REPO_ROOT / "tests" / "assertions",
]


def find_sql_files(roots: list[Path]) -> list[Path]:
    files: list[Path] = []
    for r in roots:
        if r.is_file() and r.suffix == ".sql":
            files.append(r)
        elif r.is_dir():
            files.extend(sorted(r.rglob("*.sql")))
    return files


def validate(path: Path) -> tuple[bool, str | None, int]:
    """Versucht die ganze Datei zu parsen.

    Returns (ok, error_message, statement_count).
    """
    sql = path.read_text(encoding="utf-8")
    try:
        ast = pglast.parse_sql(sql)
        return True, None, len(ast)
    except ParseError as e:
        return False, str(e), 0


def main(argv: list[str]) -> int:
    if len(argv) > 1:
        roots = [Path(p) for p in argv[1:]]
    else:
        roots = DEFAULT_PATHS

    files = find_sql_files(roots)
    if not files:
        print("Keine SQL-Dateien gefunden.", file=sys.stderr)
        return 1

    print(f"Validiere {len(files)} SQL-Dateien gegen pglast/libpg_query...")
    print()

    failures: list[tuple[Path, str]] = []
    for f in files:
        rel = f.relative_to(REPO_ROOT)
        ok, err, stmts = validate(f)
        if ok:
            print(f"  ✓ {rel}  ({stmts} statement{'s' if stmts != 1 else ''})")
        else:
            print(f"  ✗ {rel}")
            print(f"      {err}")
            failures.append((rel, err))

    print()
    print(f"Gesamt: {len(files)} Dateien, {len(failures)} Fehler")
    if failures:
        print()
        print("Fehlerhafte Dateien:")
        for path, err in failures:
            print(f"  - {path}")
            for line in str(err).splitlines():
                print(f"      {line}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))

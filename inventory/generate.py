#!/usr/bin/env python3
"""Inventarisiert alle .accdb-Dateien aus einem Quellverzeichnis.

Schreibt pro Quell-DB nach inventory/<db_name>/:
    - schema.json         volle Tabellen-/Spalten-Struktur (JSON)
    - linked_tables.json  Liste der via Access verlinkten externen Tabellen
    - report.md           menschenlesbare Zusammenfassung

Aufruf:
    .venv/bin/python inventory/generate.py [QUELLVERZEICHNIS]

QUELLVERZEICHNIS default = ~/Downloads/Probedaten Datenbank Muenstermann  Test/

Idempotent: re-run überschreibt Artefakte; Fehler werden in
inventory/<db_name>/errors.txt protokolliert, nicht abbrechen.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

DEFAULT_SOURCE = Path(
    "/Users/jonathankreutzheide/Downloads/Probedaten Datenbank Muenstermann  Test"
)

REPO_ROOT = Path(__file__).resolve().parents[1]
INVENTORY_DIR = REPO_ROOT / "inventory"
ACCESS_TOOL = REPO_ROOT / "tools" / "access"


def run_access(accdb_path: Path, command: str, output: Path) -> tuple[int, str]:
    """Ruft tools/access für eine Datei + Kommando auf.

    Schreibt JSON in `output`, gibt (returncode, stderr_text) zurück.
    Stderr enthält ggf. wertvolle Warnungen (z. B. zu Linked Tables).
    """
    output.parent.mkdir(parents=True, exist_ok=True)
    proc = subprocess.run(
        [
            str(ACCESS_TOOL),
            str(accdb_path),
            command,
            "--output",
            str(output),
        ],
        capture_output=True,
        text=True,
    )
    return proc.returncode, proc.stderr


def write_report(db_name: str, db_dir: Path, schema: dict, linked: dict, profile: dict, stderr_log: str) -> None:
    """Erzeugt eine schlanke Markdown-Zusammenfassung pro DB."""
    tables = schema.get("tables", [])
    profile_by_table = {t["name"]: t for t in profile.get("tables", [])}
    lines: list[str] = [
        f"# Inventar: {db_name}",
        "",
        f"**Quelle:** `{schema.get('path', '?')}`",
        f"**Treiber:** {schema.get('driver_product', '?')}",
        f"**Tabellen gesamt:** {len(tables)}",
        f"**Linked Tables:** {len(linked.get('linked_tables', []))}",
        "",
    ]

    if linked.get("linked_tables"):
        lines.append("## Linked Tables")
        lines.append("")
        lines.append("| Lokaler Name | Verlinkte DB | Tabelle dort |")
        lines.append("|---|---|---|")
        for lt in linked["linked_tables"]:
            lines.append(
                f"| `{lt.get('name')}` | `{lt.get('linked_db')}` | `{lt.get('linked_table')}` |"
            )
        lines.append("")

    lines.append("## Tabellen-Übersicht")
    lines.append("")
    lines.append("| Tabelle | Zeilen | Spalten | PK | Indizes | FKs |")
    lines.append("|---|---:|---:|---|---:|---:|")
    for t in tables:
        pk = ", ".join(t.get("primary_key") or []) or "—"
        lines.append(
            f"| `{t['name']}` | {t['row_count']} | {len(t['columns'])} | {pk} | "
            f"{len(t.get('indexes', []))} | {len(t.get('foreign_keys', []))} |"
        )
    lines.append("")

    # Auffälligkeiten flaggen (aus Schema + Profile)
    issues: list[str] = []
    for t in tables:
        if not t.get("primary_key"):
            issues.append(f"- `{t['name']}` hat **keinen Primary Key** ({t['row_count']} Zeilen)")
        prof = profile_by_table.get(t["name"], {})
        prof_cols = {c["name"]: c for c in prof.get("columns", [])}
        for c in t.get("columns", []):
            if c.get("size") == 16_777_216:
                pc = prof_cols.get(c["name"], {})
                extra = ""
                if "null_count" in pc and "max_length" in pc:
                    extra = f" — {pc['null_count']} Nulls von {t['row_count']}, max_len={pc['max_length']}"
                issues.append(f"- `{t['name']}.{c['name']}` ist ein **Memo-Feld** (16 MB max){extra}")
        # Profiling-Auffälligkeiten: vollständig leere Spalten + nahezu-konstante Spalten
        for cname, pc in prof_cols.items():
            row_count = t["row_count"]
            if row_count == 0:
                continue
            null_count = pc.get("null_count", 0)
            distinct_count = pc.get("distinct_count", 0)
            if null_count == row_count:
                issues.append(f"- `{t['name']}.{cname}` ist **vollständig NULL** ({row_count} Zeilen)")
            elif null_count >= row_count * 0.95 and row_count >= 20:
                pct = round(100 * null_count / row_count, 1)
                issues.append(f"- `{t['name']}.{cname}` ist **{pct}% NULL** ({null_count}/{row_count})")
            elif distinct_count == 1 and row_count >= 20:
                issues.append(f"- `{t['name']}.{cname}` hat **nur 1 Distinct-Wert** über {row_count} Zeilen — tote Spalte?")
    if issues:
        lines.append("## Auffälligkeiten")
        lines.append("")
        lines.extend(issues)
        lines.append("")

    # Driver-Logs nur ausgeben, wenn nach Filterung etwas Substantielles
    # übrig bleibt. Linked-Table-Warnungen sind redundant mit der oben
    # gerenderten Linked-Tables-Tabelle und werden ausgeblendet.
    noise_markers = (
        "INFORMATION:",
        "WARNING:External file",
        "WARNING:given file does not exist",
        "### schema",
        "### linked-tables",
    )
    interesting: list[str] = []
    for ln in stderr_log.splitlines():
        if not ln.strip():
            continue
        if any(m in ln for m in noise_markers):
            continue
        if "hsqldb" in ln.lower():
            continue
        interesting.append(ln)
    if interesting:
        lines.append("## Driver-Warnungen / Logs (gefiltert)")
        lines.append("")
        lines.append("```")
        lines.extend(interesting)
        lines.append("```")
        lines.append("")

    (db_dir / "report.md").write_text("\n".join(lines), encoding="utf-8")


def inventory_one(accdb_path: Path) -> dict:
    """Inventarisiert eine .accdb. Gibt {db_name, schema, linked} zurück."""
    db_name = accdb_path.stem
    db_dir = INVENTORY_DIR / db_name
    db_dir.mkdir(parents=True, exist_ok=True)

    schema_path = db_dir / "schema.json"
    linked_path = db_dir / "linked_tables.json"
    profile_path = db_dir / "profile.json"
    errors_log = db_dir / "errors.txt"

    print(f"  • {db_name}", flush=True)

    full_stderr: list[str] = []

    rc, stderr = run_access(accdb_path, "schema", schema_path)
    full_stderr.append(f"### schema (rc={rc})\n{stderr}")
    if rc != 0:
        errors_log.write_text(f"schema-Extraktion gescheitert (rc={rc}):\n{stderr}", encoding="utf-8")

    rc2, stderr2 = run_access(accdb_path, "linked-tables", linked_path)
    full_stderr.append(f"### linked-tables (rc={rc2})\n{stderr2}")
    if rc2 != 0:
        with errors_log.open("a", encoding="utf-8") as f:
            f.write(f"\nlinked-tables-Extraktion gescheitert (rc={rc2}):\n{stderr2}")

    rc3, stderr3 = run_access(accdb_path, "profile", profile_path)
    full_stderr.append(f"### profile (rc={rc3})\n{stderr3}")
    if rc3 != 0:
        with errors_log.open("a", encoding="utf-8") as f:
            f.write(f"\nprofile-Extraktion gescheitert (rc={rc3}):\n{stderr3}")

    try:
        schema = json.loads(schema_path.read_text(encoding="utf-8")) if schema_path.exists() else {}
    except json.JSONDecodeError as e:
        schema = {"error": str(e)}
    try:
        linked = json.loads(linked_path.read_text(encoding="utf-8")) if linked_path.exists() else {}
    except json.JSONDecodeError as e:
        linked = {"error": str(e)}
    try:
        profile = json.loads(profile_path.read_text(encoding="utf-8")) if profile_path.exists() else {}
    except json.JSONDecodeError as e:
        profile = {"error": str(e)}

    write_report(db_name, db_dir, schema, linked, profile, "\n".join(full_stderr))
    return {"db_name": db_name, "schema": schema, "linked": linked, "profile": profile}


def main(argv: list[str]) -> int:
    source = Path(argv[1]) if len(argv) > 1 else DEFAULT_SOURCE
    if not source.is_dir():
        print(f"FEHLER: Quellverzeichnis nicht gefunden: {source}", file=sys.stderr)
        return 1

    accdb_files = sorted(source.glob("*.accdb"))
    if not accdb_files:
        print(f"FEHLER: keine .accdb in {source}", file=sys.stderr)
        return 1

    print(f"Inventarisiere {len(accdb_files)} Datenbanken aus {source}")
    print(f"Output: {INVENTORY_DIR}")
    print()

    all_results = []
    for accdb in accdb_files:
        result = inventory_one(accdb)
        all_results.append(result)

    # Eine übergreifende Index-Datei
    overview = INVENTORY_DIR / "INDEX.md"
    lines = [
        "# Inventar-Index",
        "",
        f"Quelle: `{source}`",
        f"Stand: automatisch generiert durch `inventory/generate.py`",
        "",
        "| Datenbank | Tabellen | Linked Tables | Report |",
        "|---|---:|---:|---|",
    ]
    for r in all_results:
        tcount = len(r["schema"].get("tables", []))
        lcount = len(r["linked"].get("linked_tables", []))
        rep = f"./{r['db_name']}/report.md"
        lines.append(f"| `{r['db_name']}` | {tcount} | {lcount} | [report.md]({rep}) |")
    overview.write_text("\n".join(lines), encoding="utf-8")

    print()
    print(f"Fertig. Index: {overview}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))

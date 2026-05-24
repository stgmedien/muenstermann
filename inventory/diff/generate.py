#!/usr/bin/env python3
"""Cross-DB Schema-Drift-Report über die Kunden-DB-Familie.

Vergleicht: Musterdatenbank, 100 Borgmeier, 540 Bittner, 60 REWE.
(Adressen-, Kalender-, Reinigungsmittel-, Reinigungspläne-DBs haben eigene
Fachschemas und werden separat behandelt.)

Output: inventory/diff/customer-db-schema-drift.md
"""

from __future__ import annotations

import json
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
INVENTORY = REPO_ROOT / "inventory"

CUSTOMER_DBS = [
    "Musterdatenbank 2026",
    "100 Borgmeier 2026 V1.12",
    "540 Bittner 2026 V1.1",
    "60 REWE 2026 V1.1 - Services",
]


def load_schema(db_name: str) -> dict:
    p = INVENTORY / db_name / "schema.json"
    return json.loads(p.read_text(encoding="utf-8"))


def main() -> int:
    schemas = {name: load_schema(name) for name in CUSTOMER_DBS}

    # 1) Tabellen-Matrix: welche Tabelle in welcher DB?
    all_tables: dict[str, dict[str, int]] = {}  # table_name -> {db_name -> row_count}
    for db_name, sc in schemas.items():
        for t in sc["tables"]:
            all_tables.setdefault(t["name"], {})[db_name] = t["row_count"]

    sorted_tables = sorted(all_tables.keys())

    # 2) Pro gemeinsamer Tabelle: Spalten-Vergleich
    #    Welche Spalten existieren in welchen DBs (für die Tabelle)?
    column_matrix: dict[str, dict[str, dict[str, str]]] = {}
    # column_matrix[table][col_name] = {db_name -> type_str_or_None}
    for db_name, sc in schemas.items():
        for t in sc["tables"]:
            tcols = column_matrix.setdefault(t["name"], {})
            for c in t["columns"]:
                col_entry = tcols.setdefault(c["name"], {})
                col_entry[db_name] = c["type"]

    # 3) Markdown rendern
    out: list[str] = [
        "# Schema-Drift in der Kunden-DB-Familie",
        "",
        "Vergleich der vier Datenbanken mit gleichem (oder ähnlichem) Schema-Erbe:",
        "**Mustervorlage** (vermutlich Vorlage) und drei Kunden-DBs **100 Borgmeier**, **540 Bittner**, **60 REWE - Services**.",
        "",
        "Diese Matrix ist die zentrale Eingabe für die Entscheidung, wie konsolidiert in PostgreSQL modelliert wird.",
        "",
        "## 1. Tabellen-Existenz und Zeilenzahlen",
        "",
        "Symbole in den Spalten: `✓N` = Tabelle vorhanden, N Zeilen. `—` = Tabelle fehlt.",
        "",
        f"| Tabelle | {' | '.join(['Muster','Borgmeier','Bittner','REWE'])} |",
        "|---|" + "|".join(["---:"] * 4) + "|",
    ]
    short_names = {
        "Musterdatenbank 2026": "Muster",
        "100 Borgmeier 2026 V1.12": "Borgmeier",
        "540 Bittner 2026 V1.1": "Bittner",
        "60 REWE 2026 V1.1 - Services": "REWE",
    }

    for tname in sorted_tables:
        cells = []
        for db in CUSTOMER_DBS:
            if db in all_tables[tname]:
                cells.append(f"✓ {all_tables[tname][db]}")
            else:
                cells.append("—")
        out.append(f"| `{tname}` | {' | '.join(cells)} |")
    out.append("")

    # 4) Auffälligkeiten zusammenfassen
    only_in_one: list[tuple[str, str]] = []
    missing_somewhere: list[tuple[str, list[str]]] = []
    everywhere: list[str] = []
    for tname in sorted_tables:
        present = set(all_tables[tname].keys())
        missing = set(CUSTOMER_DBS) - present
        if len(present) == 1:
            only_in_one.append((tname, list(present)[0]))
        elif missing:
            missing_somewhere.append((tname, sorted(missing)))
        else:
            everywhere.append(tname)

    out.append("### Auswertung")
    out.append("")
    out.append(f"- **Überall vorhanden:** {len(everywhere)} Tabellen")
    out.append(f"- **In ≥2 DBs, aber nicht überall:** {len(missing_somewhere)} Tabellen")
    out.append(f"- **Nur in 1 DB:** {len(only_in_one)} Tabellen")
    out.append("")

    if only_in_one:
        out.append("#### Tabellen, die nur in einer DB existieren")
        out.append("")
        for tname, db in only_in_one:
            out.append(f"- `{tname}` — nur in **{short_names[db]}**")
        out.append("")

    if missing_somewhere:
        out.append("#### Tabellen mit teilweiser Existenz")
        out.append("")
        for tname, missing in missing_somewhere:
            short_missing = ", ".join(short_names[m] for m in missing)
            out.append(f"- `{tname}` — fehlt in: **{short_missing}**")
        out.append("")

    # 5) Spalten-Drift pro gemeinsam-existierender Tabelle
    out.append("## 2. Spalten-Drift pro Tabelle")
    out.append("")
    out.append("Für jede Tabelle, die in mindestens 2 DBs existiert, eine Spalten-Matrix.")
    out.append("Typ-Unterschiede werden mit `≠ TYP` markiert.")
    out.append("")

    tables_with_drift = []
    for tname in sorted_tables:
        present_dbs = [db for db in CUSTOMER_DBS if db in all_tables[tname]]
        if len(present_dbs) < 2:
            continue

        # Sammele alle Spalten und Typen
        all_cols = column_matrix[tname]
        # Stelle fest: gibt es Drift?
        drifted_cols = []
        for col_name, col_types in all_cols.items():
            relevant_dbs = [db for db in present_dbs if db in col_types]
            distinct_types = set(col_types[db] for db in relevant_dbs)
            if len(relevant_dbs) < len(present_dbs):
                drifted_cols.append((col_name, col_types, "FEHLT"))
            elif len(distinct_types) > 1:
                drifted_cols.append((col_name, col_types, "TYP"))

        if not drifted_cols:
            continue

        tables_with_drift.append(tname)
        out.append(f"### `{tname}`")
        out.append("")
        # Header
        out.append("| Spalte | " + " | ".join(short_names[db] for db in present_dbs) + " | Drift |")
        out.append("|---|" + "|".join(["---"] * len(present_dbs)) + "|---|")
        for col_name, col_types, drift_kind in drifted_cols:
            cells = []
            type_set = set()
            for db in present_dbs:
                if db in col_types:
                    cells.append(col_types[db])
                    type_set.add(col_types[db])
                else:
                    cells.append("—")
            marker = "fehlt teilw." if drift_kind == "FEHLT" else "Typ-Drift"
            out.append(f"| `{col_name}` | " + " | ".join(cells) + f" | {marker} |")
        out.append("")

    if not tables_with_drift:
        out.append("_Keine Spalten-Drift in gemeinsamen Tabellen festgestellt._")
        out.append("")

    out.append("## 3. Konsequenzen für die PostgreSQL-Modellierung")
    out.append("")
    out.append(f"- Insgesamt {len(everywhere)} Tabellen sind in allen vier DBs gleich strukturiert — "
               f"diese bilden den **Kern-Schema-Anker** für die Migration der Kunden-Domäne.")
    if only_in_one:
        rewe_only = [t for t, db in only_in_one if db == "60 REWE 2026 V1.1 - Services"]
        out.append(f"- {len(rewe_only)} Tabellen existieren **nur in 60 REWE** — typische "
                   "Kundenanpassung. Klärung mit Frank: bewusst oder gewachsen? Konsolidieren oder als "
                   "REWE-spezifischen Modellbaustein behalten?")
    out.append("- Spalten-Drift in gemeinsamen Tabellen (Abschnitt 2): bei der Zielmodellierung "
               "konsolidiert man auf den **Superset** der Spalten + Datentypen, sonst gehen Daten verloren.")
    out.append("")

    out_path = INVENTORY / "diff" / "customer-db-schema-drift.md"
    out_path.write_text("\n".join(out), encoding="utf-8")
    print(f"→ {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

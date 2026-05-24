#!/usr/bin/env python3
"""ETL für die Hygieneplan-Master-Domäne.

Quelle: Reinigungspläne.accdb (40 Hygienepläne, 244 Arbeitsschritte,
        23 Gefahrstoff-Stammdaten, 1 GullyCheck-Mystery-Zeile)
Ziel:   catalog.hygiene_plan + catalog.hygiene_plan_step + catalog.hazard_substance

Aufruf:
    .venv/bin/python etl/hygiene_plans_etl.py [accdb-pfad]
"""

from __future__ import annotations

import sys
from datetime import datetime
from pathlib import Path

import pandas as pd

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT))

from etl.access_io import dump_table  # noqa: E402
from etl.catalog_etl import (  # noqa: E402
    insert_statements,
    write_parquet,
    _insert_with_subselect,
    _sql_value,
)

DEFAULT_ACCDB = Path(
    "/Users/jonathankreutzheide/Downloads/Probedaten Datenbank Muenstermann  Test/"
    "Reinigungspläne.accdb"
)

OUT_DIR = REPO_ROOT / "inventory" / "samples" / "catalog"
SEEDS_DIR = REPO_ROOT / "schema" / "seeds"
SEED_PATH = SEEDS_DIR / "catalog_hygiene_plans.sql"
REPORT_PATH = OUT_DIR / "hygiene-plans-etl-report.md"


def transform_hygiene_plan(accdb: Path) -> pd.DataFrame:
    raw = dump_table(accdb, "003 Hygienepläne")
    return pd.DataFrame({
        "legacy_id": raw["PlanNr"].astype("Int64").astype("string"),
        "plan_number": raw["PlanNr"].astype("Int64"),
        "code": raw["Plan"].astype("string"),
        "title": raw["T1"].astype("string"),
        "recommended_agent_text": raw["M1"].astype("string"),  # Memo: Empfehlung
    })


def transform_hygiene_plan_step(accdb: Path) -> pd.DataFrame:
    raw = dump_table(accdb, "003 Hygienepläne Arbeitsschritte")
    return pd.DataFrame({
        # legacy_id = "<PlanNr>-<Arbeitsschritt>" — Zeile in Access hatte keinen PK,
        # die zusammengesetzte Identität war (PlanNr, Arbeitsschritt).
        "legacy_id": (
            raw["PlanNr"].astype("Int64").astype("string")
            + "-"
            + raw["Arbeitsschritt"].astype("Int64").astype("string")
        ),
        "_plan_legacy_id": raw["PlanNr"].astype("Int64").astype("string"),
        "step_number": raw["Arbeitsschritt"].astype("Int64"),
        "status": raw["Status"].astype("string"),
        "task_description": raw["Aufgaben"].astype("string"),
        "procedure": raw["Verfahren"].astype("string"),
        "equipment": raw["Geräte"].astype("string"),
        "notes": raw["Hinweise"].astype("string"),
    })


def transform_hazard_substance(accdb: Path) -> pd.DataFrame:
    raw = dump_table(accdb, "021 Gefahrstoffverzeichnis")
    return pd.DataFrame({
        "legacy_id": raw["ID"].astype("Int64").astype("string"),
        "name": raw["Artikelname"].astype("string"),
        "sds_document_path": raw["Pfadtext"].astype("string"),
    })


def to_loadable(df: pd.DataFrame) -> pd.DataFrame:
    return df[[c for c in df.columns if not c.startswith("_")]]


def step_insert_statements(df: pd.DataFrame) -> list[str]:
    """Insert für hygiene_plan_step mit FK-Auflösung auf hygiene_plan.legacy_id."""
    if df.empty:
        return ["-- catalog.hygiene_plan_step: 0 Zeilen"]
    stmts: list[str] = [f"-- catalog.hygiene_plan_step: {len(df)} Zeilen"]
    cols = ["legacy_id", "hygiene_plan_id", "step_number", "status",
            "task_description", "procedure", "equipment", "notes"]
    col_list = ", ".join(cols)
    for _, r in df.iterrows():
        plan_lookup = (
            f"(select id from catalog.hygiene_plan where legacy_id = "
            f"'{r['_plan_legacy_id']}')"
        )
        values = [
            _sql_value(r["legacy_id"]),
            plan_lookup,
            _sql_value(r["step_number"]),
            _sql_value(r["status"]),
            _sql_value(r["task_description"]),
            _sql_value(r["procedure"]),
            _sql_value(r["equipment"]),
            _sql_value(r["notes"]),
        ]
        stmts.append(
            f"insert into catalog.hygiene_plan_step ({col_list}) values ("
            f"{', '.join(values)}) on conflict (hygiene_plan_id, step_number) do nothing;"
        )
    return stmts


def write_seed(sections: list[tuple[str, list[str]]]) -> Path:
    SEEDS_DIR.mkdir(parents=True, exist_ok=True)
    lines = [
        "-- Auto-generiert von etl/hygiene_plans_etl.py",
        "-- Hygieneplan-Stammdaten aus Reinigungspläne.accdb",
        "",
        "begin;",
        "set local app.user_id = 'etl/hygiene_plans_etl.py';",
        "set local search_path = catalog, public;",
        "",
    ]
    for title, stmts in sections:
        lines.append(f"-- == {title} ==")
        lines.extend(stmts)
        lines.append("")
    lines.append("commit;")
    SEED_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return SEED_PATH


def main(argv: list[str]) -> int:
    accdb = Path(argv[1]) if len(argv) > 1 else DEFAULT_ACCDB
    if not accdb.exists():
        print(f"FEHLER: Quelldatei nicht gefunden: {accdb}", file=sys.stderr)
        return 1

    print(f"Quelle: {accdb}")
    print(f"Output: {OUT_DIR}")
    print()

    report_lines: list[str] = [
        "# ETL-Lauf: Hygieneplan-Domäne",
        "",
        f"**Quelle:** `{accdb}`",
        f"**Zeitstempel:** {datetime.now().isoformat(timespec='seconds')}",
        "",
        "| Zieltabelle | Quelltabelle | Zeilen | Status |",
        "|---|---|---:|---|",
    ]

    sections: list[tuple[str, list[str]]] = []

    print("• catalog.hygiene_plan")
    plans = transform_hygiene_plan(accdb)
    write_parquet(plans, "hygiene_plan")
    m1_filled = plans["recommended_agent_text"].notna().sum()
    sections.append(("catalog.hygiene_plan",
                     insert_statements("catalog.hygiene_plan", to_loadable(plans))))
    report_lines.append(
        f"| `catalog.hygiene_plan` | 003 Hygienepläne | {len(plans)} | "
        f"✓ ({m1_filled}/{len(plans)} mit Empfehlungstext aus M1) |"
    )

    print("• catalog.hygiene_plan_step")
    steps = transform_hygiene_plan_step(accdb)
    write_parquet(steps, "hygiene_plan_step")
    sections.append(("catalog.hygiene_plan_step", step_insert_statements(steps)))
    # Sanity: Welche Plan-FKs würden nicht aufgelöst werden?
    plan_legacy_ids = set(plans["legacy_id"].dropna().tolist())
    unresolved = steps[~steps["_plan_legacy_id"].isin(plan_legacy_ids)]
    report_lines.append(
        f"| `catalog.hygiene_plan_step` | 003 Hygienepläne Arbeitsschritte | {len(steps)} | "
        f"✓ ({len(unresolved)} ohne FK) |"
    )

    print("• catalog.hazard_substance")
    subs = transform_hazard_substance(accdb)
    write_parquet(subs, "hazard_substance")
    sections.append(("catalog.hazard_substance",
                     insert_statements("catalog.hazard_substance", to_loadable(subs))))
    report_lines.append(
        f"| `catalog.hazard_substance` | 021 Gefahrstoffverzeichnis | {len(subs)} | ✓ |"
    )

    seed_path = write_seed(sections)
    report_lines.extend([
        "",
        f"**Seed-SQL:** `{seed_path.relative_to(REPO_ROOT)}`",
        "",
        "## Bewusst NICHT migriert",
        "",
        "- **`003 Hygienepläne.M2`-`M9` + `Besonderheiten 1-3` + `Hinweise zur Anpassung`**: "
        "alle waren in der Quelle vollständig NULL (40/40 Nulls). ADR-003 Regel 3.",
        "- **`003 Hygienepläne Arbeitsschritte.Hinweise zur Anpassung`**: 244/244 Nulls.",
        "- **`021 Gefahrstoffverzeichnis.ArtNr` + `Menge jährl` + `Standort`**: konstant bzw. leer.",
        "- **`GullyCheck`**: 1 Zeile mit 7 Boolean-Checklisten-Feldern (Sieb defekt, Geruchsverschluss fehlt, ...). "
        "Vermutlich Vorlage für eine Inspektions-Checkliste. Mystery-Tabelle, nicht migriert. "
        "TODO: fachlich klären; ggf. Modellierung als `ops.inspection_template`.",
        "",
        "## Offene fachliche Punkte (TODO)",
        "",
        "- **`recommended_agent_text`** (M1 in Access) ist ein semi-strukturiertes Memo "
        "(Hersteller / Produkt / Konzentration / Kontaktzeit / Temperatur als Freitext). "
        "Sauberer wäre eine Junction `catalog.hygiene_plan_recommended_agent` mit FK auf "
        "`catalog.cleaning_agent`. Parsing + Fuzzy-Match ist ein separater Schritt.",
        "- **`catalog.hazard_substance`** trägt 23 Master-Einträge. Die 814 Freitext-Werte aus "
        "`catalog.cleaning_agent_hazard_substance.substance_name` könnten per Fuzzy-Match gegen diese "
        "Liste aufgelöst werden — wenn die Master-Liste tatsächlich vollständig ist (vermutlich nicht).",
    ])
    REPORT_PATH.write_text("\n".join(report_lines), encoding="utf-8")
    print()
    print(f"→ Seed SQL: {seed_path}")
    print(f"→ Report:   {REPORT_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))

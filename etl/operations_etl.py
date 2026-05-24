#!/usr/bin/env python3
"""ETL für die operative Domäne — Abteilungen + Objekte pro Kunde.

Quellen: die drei Kunden-DBs (100 Borgmeier, 540 Bittner, 60 REWE - Services).
Ziele:   ops.department + ops.department_object.

Customer-Lookup:
    Wir leiten die Kunden-Nr aus dem Datei-Präfix ab (100, 540, 60).
    Im realen Projekt würde man das aus 100 Firmendaten.Kunden-Nr lesen,
    das ist hier ein TODO (siehe report).

Aufruf:
    .venv/bin/python etl/operations_etl.py
"""

from __future__ import annotations

import re
import sys
from datetime import datetime
from pathlib import Path

import pandas as pd

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT))

from etl.access_io import dump_table  # noqa: E402
from etl.catalog_etl import _sql_value  # noqa: E402

SOURCE_BASE = Path(
    "/Users/jonathankreutzheide/Downloads/Probedaten Datenbank Muenstermann  Test"
)

# Mapping: Datei → (customer_number, business_unit_id)
# H und I = 1, Services = 2 (siehe schema/ddl/core/100_customer_domain.sql)
CUSTOMER_DBS: list[tuple[str, int, int]] = [
    ("100 Borgmeier 2026 V1.12.accdb",       100, 1),
    ("540 Bittner 2026 V1.1.accdb",          540, 1),
    ("60 REWE 2026 V1.1 - Services.accdb",    60, 2),
]

OUT_DIR = REPO_ROOT / "inventory" / "samples" / "ops"
SEEDS_DIR = REPO_ROOT / "schema" / "seeds"
SEED_PATH = SEEDS_DIR / "ops_department_domain.sql"
REPORT_PATH = OUT_DIR / "operations-etl-report.md"


def write_parquet(df: pd.DataFrame, name: str) -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    df.to_parquet(OUT_DIR / f"{name}.parquet", index=False)


# ----------------------------------------------------------------------------
# Transformations
# ----------------------------------------------------------------------------

def transform_department(accdb: Path, customer_number: int) -> pd.DataFrame:
    raw = dump_table(accdb, "001 Abteilungen")
    df = pd.DataFrame({
        "legacy_id": f"{customer_number}:" + raw["Abteilungs-Nr"].astype("Int64").astype("string"),
        "_customer_number": customer_number,
        "department_number": raw["Abteilungs-Nr"].astype("Int64"),
        "name": raw["Abteilung"].astype("string"),
        "floor": raw.get("Etage"),
        "area_number": raw.get("BereichNr"),
        "area_name": raw.get("Bereich"),
        "customer_department_number": raw.get("Abteilungs-Nr Kunde"),
    })
    return df


def _coerce_smallint(v):
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return None
    try:
        return int(v)
    except (ValueError, TypeError):
        return None


def transform_department_object(accdb: Path, customer_number: int) -> pd.DataFrame:
    raw = dump_table(accdb, "002 Abt-Objekte")

    weekday_pairs = [
        ("Montag", "monday"),
        ("Dienstag", "tuesday"),
        ("Mittwoch", "wednesday"),
        ("Donnerstag", "thursday"),
        ("Freitag", "friday"),
        ("Samstag", "saturday"),
        ("Sonntag", "sunday"),
    ]
    df_data = {
        "legacy_id": f"{customer_number}:" + raw["ObID"].astype("Int64").astype("string"),
        "_customer_number": customer_number,
        "_department_number_legacy": raw["Abteilungs-Nr"].astype("Int64"),
        "object_number": raw.get("Objekt-Nr"),
        "name": raw["Objekt"].astype("string"),
        "quantity_text": raw.get("Anzahl"),
        "execution_count": raw.get("AusführungZahl").apply(_coerce_smallint) if "AusführungZahl" in raw.columns else None,
        "execution_type": raw.get("Ausführung"),
        "execution_code": raw.get("AusführungKennziffer"),
        "cleaning_method": raw.get("AusführungReinigung"),
        "additional_work": raw.get("Zusatzarbeiten"),
        "control_interval": raw.get("Kontroll_intervall"),
        "k_factor": raw.get("KFaktor"),
    }
    for src, dst in weekday_pairs:
        df_data[f"{dst}_count"] = raw.get(src).apply(_coerce_smallint) if src in raw.columns else None
        df_data[f"{dst}_code"] = raw.get(f"{src}T")
    df = pd.DataFrame(df_data)
    # Booleans normalisieren
    if "additional_work" in df.columns:
        df["additional_work"] = df["additional_work"].apply(
            lambda v: bool(v) if v is not None and not (isinstance(v, float) and pd.isna(v)) else None
        )
    return df


# ----------------------------------------------------------------------------
# SQL-Generation
# ----------------------------------------------------------------------------

def customer_lookup_sql(customer_number: int, business_unit_id: int) -> str:
    """Subselect: core.customer.id für die gegebene Kunden-Nr."""
    return (f"(select id from core.customer where business_unit_id = {business_unit_id} "
            f"and customer_number = {customer_number})")


def department_insert_stmts(df: pd.DataFrame, business_unit_map: dict[int, int]) -> list[str]:
    if df.empty:
        return ["-- ops.department: 0 Zeilen"]
    stmts = [f"-- ops.department: {len(df)} Zeilen"]
    for _, r in df.iterrows():
        cust_num = int(r["_customer_number"])
        bu = business_unit_map[cust_num]
        customer_lookup = customer_lookup_sql(cust_num, bu)
        cols = ["legacy_id", "customer_id", "department_number", "name",
                "floor", "area_number", "area_name", "customer_department_number"]
        values = [
            _sql_value(r["legacy_id"]),
            customer_lookup,
            _sql_value(r["department_number"]),
            _sql_value(r["name"]),
            _sql_value(r.get("floor")),
            _sql_value(r.get("area_number")),
            _sql_value(r.get("area_name")),
            _sql_value(r.get("customer_department_number")),
        ]
        stmts.append(
            f"insert into ops.department ({', '.join(cols)}) values "
            f"({', '.join(values)}) on conflict (customer_id, department_number) do nothing;"
        )
    return stmts


def department_object_insert_stmts(df: pd.DataFrame, business_unit_map: dict[int, int]) -> list[str]:
    if df.empty:
        return ["-- ops.department_object: 0 Zeilen"]
    stmts = [f"-- ops.department_object: {len(df)} Zeilen"]
    weekday_cols = [
        "monday_count", "monday_code", "tuesday_count", "tuesday_code",
        "wednesday_count", "wednesday_code", "thursday_count", "thursday_code",
        "friday_count", "friday_code", "saturday_count", "saturday_code",
        "sunday_count", "sunday_code",
    ]
    cols = ["legacy_id", "department_id", "object_number", "name",
            "quantity_text", "execution_count", "execution_type", "execution_code",
            "cleaning_method", "additional_work", "control_interval", "k_factor"] + weekday_cols

    for _, r in df.iterrows():
        cust_num = int(r["_customer_number"])
        bu = business_unit_map[cust_num]
        dept_lookup = (
            f"(select d.id from ops.department d "
            f"join core.customer c on c.id = d.customer_id "
            f"where c.business_unit_id = {bu} and c.customer_number = {cust_num} "
            f"and d.department_number = {int(r['_department_number_legacy'])})"
        )
        values = [
            _sql_value(r["legacy_id"]),
            dept_lookup,
            _sql_value(r.get("object_number")),
            _sql_value(r["name"]),
            _sql_value(r.get("quantity_text")),
            _sql_value(r.get("execution_count")),
            _sql_value(r.get("execution_type")),
            _sql_value(r.get("execution_code")),
            _sql_value(r.get("cleaning_method")),
            _sql_value(r.get("additional_work")),
            _sql_value(r.get("control_interval")),
            _sql_value(r.get("k_factor")),
        ]
        for wd in weekday_cols:
            values.append(_sql_value(r.get(wd)))
        stmts.append(
            f"insert into ops.department_object ({', '.join(cols)}) values "
            f"({', '.join(values)}) on conflict (department_id, legacy_id) do nothing;"
        )
    return stmts


def write_seed(sections: list[tuple[str, list[str]]]) -> Path:
    SEEDS_DIR.mkdir(parents=True, exist_ok=True)
    lines = [
        "-- Auto-generiert von etl/operations_etl.py",
        "-- Abteilungen + Abt-Objekte aus den Kunden-DBs",
        "",
        "begin;",
        "set local app.user_id = 'etl/operations_etl.py';",
        "",
    ]
    for title, stmts in sections:
        lines.append(f"-- == {title} ==")
        lines.extend(stmts)
        lines.append("")
    lines.append("commit;")
    SEED_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return SEED_PATH


def main() -> int:
    print("Quellen:")
    for f, n, bu in CUSTOMER_DBS:
        print(f"  {f}  (customer_number={n}, business_unit_id={bu})")
    print()

    business_unit_map = {n: bu for _, n, bu in CUSTOMER_DBS}

    all_dept = []
    all_obj = []
    summary_rows = []
    for filename, customer_number, business_unit_id in CUSTOMER_DBS:
        accdb = SOURCE_BASE / filename
        if not accdb.exists():
            print(f"  WARNUNG: {accdb} nicht gefunden — übersprungen", file=sys.stderr)
            continue
        print(f"• Kunde {customer_number}: {filename}")
        dept = transform_department(accdb, customer_number)
        obj = transform_department_object(accdb, customer_number)
        all_dept.append(dept)
        all_obj.append(obj)
        summary_rows.append({"customer_number": customer_number,
                             "filename": filename,
                             "departments": len(dept),
                             "objects": len(obj)})

    dept_df = pd.concat(all_dept, ignore_index=True) if all_dept else pd.DataFrame()
    obj_df = pd.concat(all_obj, ignore_index=True) if all_obj else pd.DataFrame()

    write_parquet(dept_df, "department")
    write_parquet(obj_df, "department_object")

    sections = [
        ("ops.department", department_insert_stmts(dept_df, business_unit_map)),
        ("ops.department_object", department_object_insert_stmts(obj_df, business_unit_map)),
    ]
    seed_path = write_seed(sections)

    report_lines = [
        "# ETL-Lauf: Operations-Domäne (Abteilungen + Objekte)",
        "",
        f"**Zeitstempel:** {datetime.now().isoformat(timespec='seconds')}",
        "",
        "| Kunde | Quelle | Abteilungen | Objekte |",
        "|---|---|---:|---:|",
    ]
    for s in summary_rows:
        report_lines.append(
            f"| {s['customer_number']} | `{s['filename']}` | {s['departments']} | {s['objects']} |"
        )
    report_lines.extend([
        "",
        f"**Total:** {len(dept_df)} Abteilungen + {len(obj_df)} Objekte",
        f"**Seed-SQL:** `{seed_path.relative_to(REPO_ROOT)}`",
        "",
        "## Voraussetzungen für erfolgreichen Apply",
        "",
        "Die Customer-Lookup-Subselects setzen voraus, dass die Kunden mit "
        "customer_number 100, 540, 60 in `core.customer` existieren. Wenn `core.customer` "
        "z. B. nur die 89 Kunden aus den Adressbüchern enthält, ein Kunde mit der jeweiligen "
        "Nummer aber NICHT dabei ist, werden die zugehörigen department-Inserts NULL als "
        "customer_id erzeugen (Constraint-Verletzung). Vorab-Check:",
        "",
        "```sql",
        "SELECT customer_number, business_unit_id, name FROM core.customer",
        " WHERE (business_unit_id, customer_number) IN ((1, 100), (1, 540), (2, 60));",
        "```",
        "",
        "**TODO im realen Projekt**: customer_number aus `100 Firmendaten.Kunden-Nr` "
        "der jeweiligen Kunden-DB lesen statt aus dem Dateinamen. In den Probedaten "
        "ist das hier aus Dateinamen abgeleitet (anonymisierter Test).",
        "",
        "## Bewusst NICHT migriert (alle Quellfelder vollständig leer in den 3 Kunden-DBs)",
        "",
        "- `001 Abteilungen`: Kostenstelle, Kostenträger, Raum-Nr, Hygienekontrolle täglich, "
        "HyTWert, Bericht1-3, Kontroll_intervall, Stunden, KFaktor, Häufigkeits-Booleans, "
        "Maschinennummer, Abteilungsleiter — alles 100% NULL.",
        "- `001 Abteilungen`: Filter1-4, ABIstSu, ABSollSu, High Risk, Low Risk — alle "
        "konstant (1 Distinct über 30-124 Zeilen), keine Information.",
        "- `002 Abt-Objekte`: Letzte Reinigung, Besonderheiten, Maschinen Innenreinigung, "
        "ZusatzText, Stunden, Bericht1-3, Maschinennummer — 100% NULL.",
        "- `002 Abt-Objekte` Status — 99% NULL (nur 2 Zeilen befüllt).",
    ])
    REPORT_PATH.write_text("\n".join(report_lines), encoding="utf-8")

    print()
    print(f"→ Seed SQL: {seed_path}")
    print(f"→ Report:   {REPORT_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

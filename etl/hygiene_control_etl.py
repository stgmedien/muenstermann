#!/usr/bin/env python3
"""ETL für ops.hygiene_control_plan + ops.control_interval.

Quellen (aus den 3 Kunden-DBs):
    050 Kontrollintervalle           → ops.control_interval
    022 Hygienekontrollen            → ops.hygiene_control_plan (STANDARD)
    022 Hygienekontrollen Spezial 15 → ops.hygiene_control_plan (SPECIAL_15)

Aufruf:
    .venv/bin/python etl/hygiene_control_etl.py
"""

from __future__ import annotations

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

CUSTOMER_DBS: list[tuple[str, int, int]] = [
    ("100 Borgmeier 2026 V1.12.accdb",       100, 1),
    ("540 Bittner 2026 V1.1.accdb",          540, 1),
    ("60 REWE 2026 V1.1 - Services.accdb",    60, 2),
]

OUT_DIR = REPO_ROOT / "inventory" / "samples" / "ops"
SEEDS_DIR = REPO_ROOT / "schema" / "seeds"
SEED_PATH = SEEDS_DIR / "ops_hygiene_control.sql"
REPORT_PATH = OUT_DIR / "hygiene-control-etl-report.md"


def write_parquet(df: pd.DataFrame, name: str) -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    df.to_parquet(OUT_DIR / f"{name}.parquet", index=False)


def _coerce_int(v):
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return None
    try:
        return int(v)
    except (ValueError, TypeError):
        return None


def _coerce_decimal(v):
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return None
    try:
        return float(v)
    except (ValueError, TypeError):
        return None


# ----------------------------------------------------------------------------
# Transformations
# ----------------------------------------------------------------------------

def transform_control_interval(accdb: Path, customer_number: int) -> pd.DataFrame:
    raw = dump_table(accdb, "050 Kontrollintervalle")
    if raw.empty:
        return pd.DataFrame()
    return pd.DataFrame({
        "legacy_id": f"{customer_number}:" + raw["ID"].astype("Int64").astype("string"),
        "_customer_number": customer_number,
        "interval_code": raw["ID"].astype("Int64"),
        "name": raw["KinterV"].astype("string"),
        "correction_factor": raw.get("Kfaktor").apply(_coerce_decimal) if "Kfaktor" in raw.columns else None,
        "execution_count": raw.get("AusführungZahl").apply(_coerce_int) if "AusführungZahl" in raw.columns else None,
        "interval_text": raw.get("IntervallText"),
    })


def _normalize_responsible(v):
    """'Münstermann' / 'Kunde' / Freitext → ENUM."""
    if v is None:
        return "MUENSTERMANN"
    s = str(v).strip().lower()
    if "kunde" in s:
        return "KUNDE"
    return "MUENSTERMANN"


def transform_standard_plan(accdb: Path, customer_number: int) -> pd.DataFrame:
    raw = dump_table(accdb, "022 Hygienekontrollen")
    if raw.empty:
        return pd.DataFrame()
    n = len(raw)
    return pd.DataFrame({
        "legacy_id": [f"{customer_number}:STD:{i}" for i in range(n)],
        "_customer_number": customer_number,
        "_department_number": raw["Abteilungs-Nr"].astype("Int64"),
        "_object_number": raw.get("Objekt-Nr"),
        "control_type": "STANDARD",
        "department_number_snapshot": raw["Abteilungs-Nr"].astype("Int64"),
        "object_number_snapshot": raw.get("Objekt-Nr"),
        "interval_count": raw.get("IntervallZahl").apply(_coerce_int) if "IntervallZahl" in raw.columns else None,
        "interval_label": raw.get("IntV"),
        "control_count": None,
        "quantity_text": raw.get("Anzahl"),
        "responsible_party": raw["AusführungReinigung"].apply(_normalize_responsible),
        "area_number": raw.get("BereichNr").apply(_coerce_int) if "BereichNr" in raw.columns else None,
        "area_name": raw.get("Bereich"),
    })


def transform_special15_plan(accdb: Path, customer_number: int) -> pd.DataFrame:
    raw = dump_table(accdb, "022 Hygienekontrollen Spezial 15")
    if raw.empty:
        return pd.DataFrame()
    n = len(raw)
    return pd.DataFrame({
        "legacy_id": [f"{customer_number}:S15:{i}" for i in range(n)],
        "_customer_number": customer_number,
        "_department_number": raw["Abteilungs-Nr"].astype("Int64"),
        "_object_number": raw.get("Objekt-Nr"),
        "control_type": "SPECIAL_15",
        "department_number_snapshot": raw["Abteilungs-Nr"].astype("Int64"),
        "object_number_snapshot": raw.get("Objekt-Nr"),
        "interval_count": raw.get("Kontroll_intervall").apply(_coerce_int) if "Kontroll_intervall" in raw.columns else None,
        "interval_label": raw.get("IntervallText"),
        "control_count": raw.get("KontrollZahl").apply(_coerce_int) if "KontrollZahl" in raw.columns else None,
        "quantity_text": raw.get("Anzahl"),
        "responsible_party": raw["AusführungReinigung"].apply(_normalize_responsible),
        "area_number": raw.get("Bereichs-Nr").apply(_coerce_int) if "Bereichs-Nr" in raw.columns else None,
        "area_name": raw.get("Bereich"),
    })


# ----------------------------------------------------------------------------
# SQL-Generation
# ----------------------------------------------------------------------------

def control_interval_insert_stmts(df: pd.DataFrame, bu_map: dict[int, int]) -> list[str]:
    if df.empty:
        return ["-- ops.control_interval: 0 Zeilen"]
    stmts = [f"-- ops.control_interval: {len(df)} Zeilen"]
    cols = ["legacy_id", "customer_id", "interval_code", "name",
            "correction_factor", "execution_count", "interval_text"]
    for _, r in df.iterrows():
        cust_num = int(r["_customer_number"])
        bu = bu_map[cust_num]
        customer_lookup = (
            f"(select id from core.customer where business_unit_id = {bu} "
            f"and customer_number = {cust_num})"
        )
        values = [
            _sql_value(r["legacy_id"]),
            customer_lookup,
            _sql_value(r["interval_code"]),
            _sql_value(r["name"]),
            _sql_value(r.get("correction_factor")),
            _sql_value(r.get("execution_count")),
            _sql_value(r.get("interval_text")),
        ]
        stmts.append(
            f"insert into ops.control_interval ({', '.join(cols)}) values "
            f"({', '.join(values)}) on conflict (customer_id, interval_code) do nothing;"
        )
    return stmts


def hygiene_plan_insert_stmts(df: pd.DataFrame, bu_map: dict[int, int]) -> list[str]:
    if df.empty:
        return ["-- ops.hygiene_control_plan: 0 Zeilen"]
    stmts = [f"-- ops.hygiene_control_plan: {len(df)} Zeilen"]
    cols = ["legacy_id", "customer_id", "department_id", "department_object_id",
            "control_type", "department_number_snapshot", "object_number_snapshot",
            "interval_count", "interval_label", "control_count", "quantity_text",
            "responsible_party", "area_number", "area_name"]

    for _, r in df.iterrows():
        cust_num = int(r["_customer_number"])
        bu = bu_map[cust_num]
        dept_num = int(r["_department_number"]) if pd.notna(r["_department_number"]) else None

        if dept_num is None:
            stmts.append(f"-- SKIP: legacy_id={r['legacy_id']!r} ohne Abteilungs-Nr")
            continue

        customer_lookup = (
            f"(select id from core.customer where business_unit_id = {bu} "
            f"and customer_number = {cust_num})"
        )
        dept_lookup = (
            f"(select d.id from ops.department d "
            f"join core.customer c on c.id = d.customer_id "
            f"where c.business_unit_id = {bu} and c.customer_number = {cust_num} "
            f"and d.department_number = {dept_num})"
        )
        # department_object: per (department, object_number) wenn nicht NULL
        obj_num = r["_object_number"]
        if obj_num is not None and not (isinstance(obj_num, float) and pd.isna(obj_num)):
            obj_str = str(obj_num).replace("'", "''")
            obj_lookup = (
                f"(select o.id from ops.department_object o "
                f"join ops.department d on d.id = o.department_id "
                f"join core.customer c on c.id = d.customer_id "
                f"where c.business_unit_id = {bu} and c.customer_number = {cust_num} "
                f"and d.department_number = {dept_num} "
                f"and o.object_number = '{obj_str}' limit 1)"
            )
        else:
            obj_lookup = "NULL"

        values = [
            _sql_value(r["legacy_id"]),
            customer_lookup,
            dept_lookup,
            obj_lookup,
            f"'{r['control_type']}'",
            _sql_value(r.get("department_number_snapshot")),
            _sql_value(r.get("object_number_snapshot")),
            _sql_value(r.get("interval_count")),
            _sql_value(r.get("interval_label")),
            _sql_value(r.get("control_count")),
            _sql_value(r.get("quantity_text")),
            f"'{r['responsible_party']}'",
            _sql_value(r.get("area_number")),
            _sql_value(r.get("area_name")),
        ]
        stmts.append(
            f"insert into ops.hygiene_control_plan ({', '.join(cols)}) values "
            f"({', '.join(values)}) on conflict (legacy_id) do nothing;"
        )
    return stmts


def write_seed(sections: list[tuple[str, list[str]]]) -> Path:
    SEEDS_DIR.mkdir(parents=True, exist_ok=True)
    lines = [
        "-- Auto-generiert von etl/hygiene_control_etl.py",
        "",
        "begin;",
        "set local app.user_id = 'etl/hygiene_control_etl.py';",
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
    bu_map = {n: bu for _, n, bu in CUSTOMER_DBS}
    all_intervals = []
    all_plans = []
    summary_rows = []

    for filename, customer_number, _ in CUSTOMER_DBS:
        accdb = SOURCE_BASE / filename
        if not accdb.exists():
            continue
        print(f"• Kunde {customer_number}: {filename}")
        intervals = transform_control_interval(accdb, customer_number)
        std = transform_standard_plan(accdb, customer_number)
        s15 = transform_special15_plan(accdb, customer_number)
        all_intervals.append(intervals)
        all_plans.append(std)
        all_plans.append(s15)
        summary_rows.append({
            "customer_number": customer_number,
            "intervals": len(intervals),
            "standard_plan_rows": len(std),
            "special15_plan_rows": len(s15),
        })

    intervals_df = pd.concat(all_intervals, ignore_index=True) if all_intervals else pd.DataFrame()
    plans_df = pd.concat([p for p in all_plans if not p.empty], ignore_index=True) if all_plans else pd.DataFrame()

    write_parquet(intervals_df, "control_interval")
    write_parquet(plans_df, "hygiene_control_plan")

    sections = [
        ("ops.control_interval", control_interval_insert_stmts(intervals_df, bu_map)),
        ("ops.hygiene_control_plan", hygiene_plan_insert_stmts(plans_df, bu_map)),
    ]
    seed_path = write_seed(sections)

    # Sanity: wie viele Plan-Zeilen haben ein nicht-NULL object_number?
    has_object = plans_df["_object_number"].notna().sum() if "_object_number" in plans_df.columns else 0

    report = [
        "# ETL-Lauf: Hygienekontroll-Plan",
        "",
        f"**Zeitstempel:** {datetime.now().isoformat(timespec='seconds')}",
        "",
        "| Kunde | Intervalle | STANDARD | SPECIAL_15 |",
        "|---|---:|---:|---:|",
    ]
    for s in summary_rows:
        report.append(
            f"| {s['customer_number']} | {s['intervals']} | {s['standard_plan_rows']} | {s['special15_plan_rows']} |"
        )
    report.extend([
        "",
        f"**Total:** {len(intervals_df)} Intervalle + {len(plans_df)} Plan-Zeilen "
        f"(davon {has_object} mit Objekt-Nr).",
        f"**Seed-SQL:** `{seed_path.relative_to(REPO_ROOT)}`",
        "",
        "## Befunde",
        "",
        f"- **{has_object}/{len(plans_df)} Plan-Zeilen haben eine Objekt-Nr**. Die anderen sind "
        "auf Abteilungs-Ebene (z. B. \"Sicht-Kontrolle der ganzen Halle X\"). Im PG-Modell ist "
        "`department_object_id` nullable.",
        "- Beim Apply löst der Subselect die Objekt-Nr per (Abteilung, Objekt-Nr) gegen "
        "`ops.department_object` auf. Wenn die Kombination nicht gefunden wird (z. B. weil "
        "die Objekt-Nr im Plan nicht in den Objekt-Stammdaten existiert), wird `NULL` gesetzt "
        "— die Plan-Zeile bleibt erhalten, der Bezug fehlt nur.",
        "",
        "## REWE-spezifische Tabellen — NOCH NICHT migriert",
        "",
        "REWE hat zusätzlich zu `022 Hygienekontrollen` (STANDARD) noch:",
        "- `022 Hygienekontrollen Unterhaltsreinigung` (0 Zeilen — vermutlich ungenutzt)",
        "- `022_1 HK_nachHygPlan` (388 Zeilen — eigene Hygieneplan-basierte Variante)",
        "- `022_1 tempHK_nachHygPlan` (1636 Zeilen — temporäre Variante, möglicherweise Working-Set)",
        "",
        "Diese werden in einer separaten ETL-Etappe als `control_type = 'REWE_BY_PLAN'` ergänzt.",
    ])
    REPORT_PATH.write_text("\n".join(report), encoding="utf-8")
    print()
    print(f"→ Seed SQL: {seed_path}")
    print(f"→ Report:   {REPORT_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

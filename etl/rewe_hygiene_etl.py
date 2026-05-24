#!/usr/bin/env python3
"""REWE-spezifischer Zusatz-ETL für 022_1 HK_nachHygPlan + 022_1 tempHK_nachHygPlan.

Beide Tabellen erweitern ops.hygiene_control_plan um zwei neue control_type-Werte:
    REWE_BY_PLAN: aus 022_1 HK_nachHygPlan (kuratierte Plan-Zuordnungen)
    REWE_TEMP:    aus 022_1 tempHK_nachHygPlan (Working-Set, 4x so viele Zeilen)

Beide Tabellen tragen Plan-Bezug (HygPlan / NachHygPlan) und Wochentag-
Schichten (Mo/Di/Mi/Do/Fr/Sa/So/uebrige als SMALLINT mit Schicht-Codes).
Plan-Bezug → customer_hygiene_plan_id. Wochentage → weekday_schedule JSONB.

Aufruf:
    .venv/bin/python etl/rewe_hygiene_etl.py
"""

from __future__ import annotations

import json
import sys
from datetime import datetime
from pathlib import Path

import pandas as pd

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT))

from etl.access_io import dump_table  # noqa: E402
from etl.catalog_etl import _sql_value  # noqa: E402

REWE_ACCDB = Path(
    "/Users/jonathankreutzheide/Downloads/Probedaten Datenbank Muenstermann  Test/"
    "60 REWE 2026 V1.1 - Services.accdb"
)
REWE_CUSTOMER_NUMBER = 60
REWE_BUSINESS_UNIT_ID = 2  # SERVICES

OUT_DIR = REPO_ROOT / "inventory" / "samples" / "ops"
SEEDS_DIR = REPO_ROOT / "schema" / "seeds"
SEED_PATH = SEEDS_DIR / "ops_hygiene_control_rewe.sql"
REPORT_PATH = OUT_DIR / "rewe-hygiene-etl-report.md"


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


def _weekday_jsonb(row: pd.Series) -> str | None:
    weekdays = {}
    for key in ("Mo", "Di", "Mi", "Do", "Fr", "Sa", "So", "uebrige"):
        v = row.get(key)
        if v is not None and not (isinstance(v, float) and pd.isna(v)):
            try:
                weekdays[key] = int(v)
            except (ValueError, TypeError):
                pass
    if not weekdays:
        return None
    return json.dumps(weekdays, ensure_ascii=False)


def _normalize_responsible(v):
    if v is None:
        return "MUENSTERMANN"
    s = str(v).strip().lower()
    if "kunde" in s:
        return "KUNDE"
    return "MUENSTERMANN"


def _legacy_attrs(row: pd.Series, *cols: str) -> str | None:
    attrs = {}
    for c in cols:
        v = row.get(c)
        if v is None or (isinstance(v, float) and pd.isna(v)):
            continue
        s = str(v).strip()
        if s:
            attrs[c] = s
    return json.dumps(attrs, ensure_ascii=False) if attrs else None


def transform_rewe_by_plan() -> pd.DataFrame:
    raw = dump_table(REWE_ACCDB, "022_1 HK_nachHygPlan")
    if raw.empty:
        return pd.DataFrame()
    n = len(raw)
    return pd.DataFrame({
        "legacy_id": [f"{REWE_CUSTOMER_NUMBER}:REWEPLAN:{i}" for i in range(n)],
        "_department_number": raw["Abteilungs-Nr"].astype("Int64"),
        "_object_number": raw.get("Objekt-Nr"),
        "_hyg_plan_code": raw.get("HygPlan"),                            # für FK-Lookup auf customer_hygiene_plan.code
        "control_type": "REWE_BY_PLAN",
        "department_number_snapshot": raw["Abteilungs-Nr"].astype("Int64"),
        "object_number_snapshot": raw.get("Objekt-Nr"),
        "interval_count": raw.get("Kontroll_intervall").apply(_coerce_int) if "Kontroll_intervall" in raw.columns else None,
        "interval_label": raw.get("IntervallText"),
        "control_count": raw.get("KontrollZahl").apply(_coerce_int) if "KontrollZahl" in raw.columns else None,
        "quantity_text": None,                                            # in dieser Variante nicht vorhanden
        "responsible_party": "MUENSTERMANN",                              # in HK_nachHygPlan ist Ausführer nicht aufgeführt; Default
        "area_number": raw.get("Bereichs-Nr").apply(_coerce_int) if "Bereichs-Nr" in raw.columns else None,
        "area_name": raw.get("Bereich"),
        "plan_text_snapshot": raw.get("PlanTxt"),
        "weekday_schedule": raw.apply(_weekday_jsonb, axis=1),
        "legacy_attributes": raw.apply(
            lambda r: _legacy_attrs(r, "Etage", "KontrolleEinzeln", "Abteilungs-Nr Kunde",
                                    "Abteilungsleiter-Nr"), axis=1),
    })


def transform_rewe_temp() -> pd.DataFrame:
    raw = dump_table(REWE_ACCDB, "022_1 tempHK_nachHygPlan")
    if raw.empty:
        return pd.DataFrame()
    n = len(raw)
    return pd.DataFrame({
        "legacy_id": [f"{REWE_CUSTOMER_NUMBER}:REWETEMP:{i}" for i in range(n)],
        "_department_number": raw["Abteilungs-Nr"].astype("Int64"),
        "_object_number": raw.get("Objekt-Nr"),
        "_hyg_plan_code": raw.get("NachHygPlan"),                         # in dieser Variante heißt es "NachHygPlan"
        "control_type": "REWE_TEMP",
        "department_number_snapshot": raw["Abteilungs-Nr"].astype("Int64"),
        "object_number_snapshot": raw.get("Objekt-Nr"),
        "interval_count": raw.get("Kontroll_intervall").apply(_coerce_int) if "Kontroll_intervall" in raw.columns else None,
        "interval_label": raw.get("IntervallText"),
        "control_count": raw.get("KontrollZahl").apply(_coerce_int) if "KontrollZahl" in raw.columns else None,
        "quantity_text": None,
        "responsible_party": raw["AusführungReinigung"].apply(_normalize_responsible) if "AusführungReinigung" in raw.columns else "MUENSTERMANN",
        "area_number": raw.get("Bereichs-Nr").apply(_coerce_int) if "Bereichs-Nr" in raw.columns else None,
        "area_name": raw.get("Bereich"),
        "plan_text_snapshot": raw.get("PlanTxt"),
        "weekday_schedule": raw.apply(_weekday_jsonb, axis=1),
        "legacy_attributes": raw.apply(
            lambda r: _legacy_attrs(r, "Etage", "KontrolleEinzeln", "Abteilungs-Nr Kunde",
                                    "Abteilungsleiter-Nr"), axis=1),
    })


def _hyg_plan_lookup(customer_number: int, business_unit_id: int, code: str) -> str:
    """Subselect: ops.customer_hygiene_plan.id über customer + code-Match."""
    code_escaped = str(code).replace("'", "''")
    return (
        f"(select chp.id from ops.customer_hygiene_plan chp "
        f"join core.customer c on c.id = chp.customer_id "
        f"where c.business_unit_id = {business_unit_id} and c.customer_number = {customer_number} "
        f"and chp.code = '{code_escaped}' limit 1)"
    )


def insert_stmts(df: pd.DataFrame, label: str) -> list[str]:
    if df.empty:
        return [f"-- {label}: 0 Zeilen"]
    stmts = [f"-- {label}: {len(df)} Zeilen"]
    cols = ["legacy_id", "customer_id", "department_id", "department_object_id",
            "control_type", "department_number_snapshot", "object_number_snapshot",
            "interval_count", "interval_label", "control_count", "quantity_text",
            "responsible_party", "area_number", "area_name",
            "customer_hygiene_plan_id", "plan_text_snapshot", "weekday_schedule",
            "legacy_attributes"]

    cust = REWE_CUSTOMER_NUMBER
    bu = REWE_BUSINESS_UNIT_ID
    customer_lookup = f"(select id from core.customer where business_unit_id = {bu} and customer_number = {cust})"

    for _, r in df.iterrows():
        dept_num = int(r["_department_number"]) if pd.notna(r["_department_number"]) else None
        if dept_num is None:
            stmts.append(f"-- SKIP {r['legacy_id']}: ohne Abteilungs-Nr")
            continue
        dept_lookup = (
            f"(select d.id from ops.department d "
            f"join core.customer c on c.id = d.customer_id "
            f"where c.business_unit_id = {bu} and c.customer_number = {cust} "
            f"and d.department_number = {dept_num})"
        )
        obj_num = r["_object_number"]
        if obj_num is not None and not (isinstance(obj_num, float) and pd.isna(obj_num)):
            obj_str = str(obj_num).replace("'", "''")
            obj_lookup = (
                f"(select o.id from ops.department_object o "
                f"join ops.department d on d.id = o.department_id "
                f"join core.customer c on c.id = d.customer_id "
                f"where c.business_unit_id = {bu} and c.customer_number = {cust} "
                f"and d.department_number = {dept_num} "
                f"and o.object_number = '{obj_str}' limit 1)"
            )
        else:
            obj_lookup = "NULL"

        hyg_plan_code = r["_hyg_plan_code"]
        if hyg_plan_code is not None and not (isinstance(hyg_plan_code, float) and pd.isna(hyg_plan_code)):
            chp_lookup = _hyg_plan_lookup(cust, bu, str(hyg_plan_code))
        else:
            chp_lookup = "NULL"

        wd = r.get("weekday_schedule")
        wd_sql = "NULL" if not wd else f"'{wd.replace(chr(39), chr(39)+chr(39))}'::jsonb"
        la = r.get("legacy_attributes")
        la_sql = "NULL" if not la else f"'{la.replace(chr(39), chr(39)+chr(39))}'::jsonb"

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
            chp_lookup,
            _sql_value(r.get("plan_text_snapshot")),
            wd_sql,
            la_sql,
        ]
        stmts.append(
            f"insert into ops.hygiene_control_plan ({', '.join(cols)}) values "
            f"({', '.join(values)}) on conflict (legacy_id) do nothing;"
        )
    return stmts


def write_seed(sections: list[tuple[str, list[str]]]) -> Path:
    SEEDS_DIR.mkdir(parents=True, exist_ok=True)
    lines = [
        "-- Auto-generiert von etl/rewe_hygiene_etl.py",
        "",
        "begin;",
        "set local app.user_id = 'etl/rewe_hygiene_etl.py';",
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
    print(f"Quelle: {REWE_ACCDB}")
    print()

    print("• REWE_BY_PLAN (022_1 HK_nachHygPlan)")
    by_plan = transform_rewe_by_plan()
    write_parquet(by_plan, "rewe_by_plan")

    print("• REWE_TEMP (022_1 tempHK_nachHygPlan)")
    temp_plan = transform_rewe_temp()
    write_parquet(temp_plan, "rewe_temp")

    sections = [
        ("ops.hygiene_control_plan: REWE_BY_PLAN", insert_stmts(by_plan, "REWE_BY_PLAN")),
        ("ops.hygiene_control_plan: REWE_TEMP", insert_stmts(temp_plan, "REWE_TEMP")),
    ]
    seed_path = write_seed(sections)

    # Stats
    plan_link_rate = by_plan["_hyg_plan_code"].notna().sum() if "_hyg_plan_code" in by_plan.columns else 0
    weekday_rate = by_plan["weekday_schedule"].notna().sum() if "weekday_schedule" in by_plan.columns else 0
    temp_plan_link_rate = temp_plan["_hyg_plan_code"].notna().sum() if "_hyg_plan_code" in temp_plan.columns else 0

    report = [
        "# ETL-Lauf: REWE-Sonderformat Hygienekontroll-Plan",
        "",
        f"**Quelle:** `{REWE_ACCDB}`",
        f"**Zeitstempel:** {datetime.now().isoformat(timespec='seconds')}",
        "",
        "| Variante | Quelltabelle | Zeilen | Plan-Bezug | Wochenrhythmus |",
        "|---|---|---:|---:|---:|",
        f"| REWE_BY_PLAN | 022_1 HK_nachHygPlan | {len(by_plan)} | {plan_link_rate} | {weekday_rate} |",
        f"| REWE_TEMP | 022_1 tempHK_nachHygPlan | {len(temp_plan)} | {temp_plan_link_rate} | "
        f"{temp_plan['weekday_schedule'].notna().sum() if 'weekday_schedule' in temp_plan.columns else 0} |",
        "",
        f"**Total:** {len(by_plan) + len(temp_plan)} neue Plan-Zeilen für Kunde 60 (REWE).",
        f"**Seed-SQL:** `{seed_path.relative_to(REPO_ROOT)}`",
        "",
        "## Modellierungs-Entscheidungen",
        "",
        "- **REWE-spezifische ENUM-Werte**: `ops.hygiene_control_type` wurde um zwei",
        "  Werte erweitert (`REWE_BY_PLAN`, `REWE_TEMP`). Bei einem Re-Apply mit "
        "  vorhandener Datenbank fügt `ALTER TYPE ... ADD VALUE IF NOT EXISTS` die "
        "  fehlenden Werte hinzu — idempotent.",
        "- **customer_hygiene_plan_id** (neue Spalte): Lookup auf "
        "  `ops.customer_hygiene_plan.code` per `HygPlan` (in REWE_BY_PLAN) bzw. "
        "  `NachHygPlan` (in REWE_TEMP). Wenn der Code nicht in den 14 REWE-Plänen "
        "  vorkommt, bleibt der FK NULL.",
        "- **weekday_schedule** (neue Spalte, JSONB): die Wochentag-Schichten "
        "  `{Mo, Di, Mi, Do, Fr, Sa, So, uebrige}` aus REWE — REWE nutzt SMALLINT-Codes "
        "  (vermutlich Schicht-Markierung), kein 0/1-Flag wie in den anderen DBs. "
        "  Daher als JSON serialisiert.",
        "- **legacy_attributes** (neue Spalte, JSONB): `Etage`, `KontrolleEinzeln`, "
        "  `Abteilungs-Nr Kunde`, `Abteilungsleiter-Nr` als unstrukturierte Zusatz-Daten.",
        "",
        "## Spezielle Beobachtungen",
        "",
        f"- {plan_link_rate}/{len(by_plan)} REWE_BY_PLAN-Zeilen mit Plan-Code "
        "(HygPlan): Lookup gegen `ops.customer_hygiene_plan.code` ergibt FK oder NULL.",
        "- 022_1 tempHK_nachHygPlan hat zusätzlich `AusführungReinigung` (Münstermann/Kunde) — "
        "  das fehlt in 022_1 HK_nachHygPlan, daher dort Default `MUENSTERMANN`.",
        "- `KontrolleEinzeln` ist in beiden Tabellen konstant (1 Distinct) — als JSONB-Attribut "
        "  mitgeführt, falls die Bedeutung später relevant wird.",
    ]
    REPORT_PATH.write_text("\n".join(report), encoding="utf-8")
    print()
    print(f"→ Seed SQL: {seed_path}")
    print(f"→ Report:   {REPORT_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

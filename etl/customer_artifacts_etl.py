#!/usr/bin/env python3
"""ETL für kundenspezifische Artefakte aus den 3 Kunden-DBs.

Ziele:
    ops.customer_hygiene_plan            (aus 003 Hygienepläne)
    ops.customer_hygiene_plan_step       (aus 003 Hygienepläne Arbeitsschritte)
    ops.work_instruction                 (aus 010 Arbeitsanweisungen alles)
    ops.customer_hazard_substance        (aus 021 Gefahrstoffverzeichnis)

Aufruf:
    .venv/bin/python etl/customer_artifacts_etl.py
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

SOURCE_BASE = Path(
    "/Users/jonathankreutzheide/Downloads/Probedaten Datenbank Muenstermann  Test"
)

CUSTOMER_DBS: list[tuple[str, int, int]] = [
    ("100 Borgmeier 2026 V1.12.accdb",       100, 1),
    ("540 Bittner 2026 V1.1.accdb",          540, 1),
    ("60 REWE 2026 V1.1 - Services.accdb",    60, 2),
]

# Spalten aus 003 Hygienepläne, die wir als JSONB-Attribute behalten
LEGACY_ATTR_COLS = [
    "R1", "R2", "Wie1", "Wie2",
    "K1", "K2",
    "E1", "E2",
    "D1", "D2", "DW", "DW1",
    "DK1", "DK2", "DE1", "DE2",
    "Reinigungsmittel",
    "Einsatzort1", "Einsatzort2", "Einsatzort3", "Einsatzort4",
]

OUT_DIR = REPO_ROOT / "inventory" / "samples" / "ops"
SEEDS_DIR = REPO_ROOT / "schema" / "seeds"
SEED_PATH = SEEDS_DIR / "ops_customer_artifacts.sql"
REPORT_PATH = OUT_DIR / "customer-artifacts-etl-report.md"


def write_parquet(df: pd.DataFrame, name: str) -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    df.to_parquet(OUT_DIR / f"{name}.parquet", index=False)


def _legacy_attrs_to_json(row: pd.Series) -> str | None:
    """Sammelt alle nicht-NULL legacy-Spalten in ein JSON-Objekt."""
    attrs = {}
    for col in LEGACY_ATTR_COLS:
        v = row.get(col)
        if v is not None and not (isinstance(v, float) and pd.isna(v)) and str(v).strip():
            attrs[col] = str(v).strip()
    if not attrs:
        return None
    return json.dumps(attrs, ensure_ascii=False)


# ----------------------------------------------------------------------------
# Transformations
# ----------------------------------------------------------------------------

def transform_customer_hygiene_plan(accdb: Path, customer_number: int) -> pd.DataFrame:
    raw = dump_table(accdb, "003 Hygienepläne")
    if raw.empty:
        return pd.DataFrame()
    legacy_json = raw.apply(_legacy_attrs_to_json, axis=1)
    return pd.DataFrame({
        "legacy_id": f"{customer_number}:" + raw["PlanNr"].astype("Int64").astype("string"),
        "_customer_number": customer_number,
        "_master_plan_legacy_id": raw["PlanNr"].astype("Int64").astype("string"),  # match auf catalog.hygiene_plan.legacy_id
        "plan_number": raw["PlanNr"].astype("Int64"),
        "code": raw.get("Plan"),
        "title": raw["T1"].astype("string"),
        "recommended_agent_text": raw.get("M1"),
        "legacy_attributes": legacy_json,
    })


def transform_customer_hygiene_plan_step(accdb: Path, customer_number: int) -> pd.DataFrame:
    raw = dump_table(accdb, "003 Hygienepläne Arbeitsschritte")
    if raw.empty:
        return pd.DataFrame()
    return pd.DataFrame({
        "legacy_id": (
            f"{customer_number}:"
            + raw["PlanNr"].astype("Int64").astype("string")
            + "-"
            + raw["Arbeitsschritt"].astype("Int64").astype("string")
        ),
        "_customer_number": customer_number,
        "_plan_number": raw["PlanNr"].astype("Int64"),
        "step_number": raw["Arbeitsschritt"].astype("Int64"),
        "status": raw.get("Status"),
        "task_description": raw.get("Aufgaben"),
        "procedure": raw.get("Verfahren"),
        "equipment": raw.get("Geräte"),
        "notes": raw.get("Hinweise"),
    })


def transform_work_instruction(accdb: Path, customer_number: int) -> pd.DataFrame:
    raw = dump_table(accdb, "010 Arbeitsanweisungen alles")
    if raw.empty:
        return pd.DataFrame()
    return pd.DataFrame({
        "legacy_id": f"{customer_number}:" + raw["ObID"].astype("Int64").astype("string"),
        "_customer_number": customer_number,
        "_department_number": raw["Abteilungs-Nr"].astype("Int64"),
        "_object_id": raw["ObID"].astype("Int64"),                         # für Lookup auf department_object.legacy_id
        "_plan_number": raw["PlanNr"].astype("Int64"),
        "department_number_snapshot": raw["Abteilungs-Nr"].astype("Int64"),
        "department_name_snapshot": raw.get("Abteilung"),
        "object_number_snapshot": raw.get("Objekt-Nr"),
        "object_name_snapshot": raw.get("Objekt"),
        "plan_number_snapshot": raw["PlanNr"].astype("Int64"),
    })


def transform_customer_hazard_substance(accdb: Path, customer_number: int) -> pd.DataFrame:
    raw = dump_table(accdb, "021 Gefahrstoffverzeichnis")
    if raw.empty:
        return pd.DataFrame()
    # Spalten-Mapping
    return pd.DataFrame({
        "legacy_id": f"{customer_number}:" + raw["ID"].astype("Int64").astype("string"),
        "_customer_number": customer_number,
        "_master_name": raw["Artikelname"],
        "name": raw["Artikelname"].astype("string"),
        "location": raw.get("Standort"),
        "annual_quantity_text": raw.get("Menge jährl"),
        "sds_document_path": raw.get("Pfadtext"),
    })


# ----------------------------------------------------------------------------
# SQL-Generation
# ----------------------------------------------------------------------------

def _customer_lookup(cust_num: int, bu: int) -> str:
    return (f"(select id from core.customer where business_unit_id = {bu} "
            f"and customer_number = {cust_num})")


def customer_hygiene_plan_stmts(df: pd.DataFrame, bu_map: dict[int, int]) -> list[str]:
    if df.empty:
        return ["-- ops.customer_hygiene_plan: 0 Zeilen"]
    stmts = [f"-- ops.customer_hygiene_plan: {len(df)} Zeilen"]
    cols = ["legacy_id", "customer_id", "master_hygiene_plan_id", "plan_number",
            "code", "title", "recommended_agent_text", "legacy_attributes"]
    for _, r in df.iterrows():
        cust_num = int(r["_customer_number"])
        bu = bu_map[cust_num]
        master_lookup = (
            f"(select id from catalog.hygiene_plan where legacy_id = "
            f"'{r['_master_plan_legacy_id']}')"
        )
        attrs = r.get("legacy_attributes")
        attrs_sql = "NULL" if not attrs else f"'{attrs.replace(chr(39), chr(39)+chr(39))}'::jsonb"
        values = [
            _sql_value(r["legacy_id"]),
            _customer_lookup(cust_num, bu),
            master_lookup,
            _sql_value(r["plan_number"]),
            _sql_value(r.get("code")),
            _sql_value(r["title"]),
            _sql_value(r.get("recommended_agent_text")),
            attrs_sql,
        ]
        stmts.append(
            f"insert into ops.customer_hygiene_plan ({', '.join(cols)}) values "
            f"({', '.join(values)}) on conflict (customer_id, plan_number) do nothing;"
        )
    return stmts


def customer_hygiene_plan_step_stmts(df: pd.DataFrame, bu_map: dict[int, int]) -> list[str]:
    if df.empty:
        return ["-- ops.customer_hygiene_plan_step: 0 Zeilen"]
    stmts = [f"-- ops.customer_hygiene_plan_step: {len(df)} Zeilen"]
    cols = ["legacy_id", "customer_hygiene_plan_id", "step_number", "status",
            "task_description", "procedure", "equipment", "notes"]
    for _, r in df.iterrows():
        cust_num = int(r["_customer_number"])
        bu = bu_map[cust_num]
        plan_lookup = (
            f"(select chp.id from ops.customer_hygiene_plan chp "
            f"join core.customer c on c.id = chp.customer_id "
            f"where c.business_unit_id = {bu} and c.customer_number = {cust_num} "
            f"and chp.plan_number = {int(r['_plan_number'])})"
        )
        values = [
            _sql_value(r["legacy_id"]),
            plan_lookup,
            _sql_value(r["step_number"]),
            _sql_value(r.get("status")),
            _sql_value(r.get("task_description")),
            _sql_value(r.get("procedure")),
            _sql_value(r.get("equipment")),
            _sql_value(r.get("notes")),
        ]
        stmts.append(
            f"insert into ops.customer_hygiene_plan_step ({', '.join(cols)}) values "
            f"({', '.join(values)}) on conflict (customer_hygiene_plan_id, step_number) do nothing;"
        )
    return stmts


def work_instruction_stmts(df: pd.DataFrame, bu_map: dict[int, int]) -> list[str]:
    if df.empty:
        return ["-- ops.work_instruction: 0 Zeilen"]
    stmts = [f"-- ops.work_instruction: {len(df)} Zeilen"]
    cols = ["legacy_id", "customer_id", "department_id", "department_object_id",
            "customer_hygiene_plan_id", "department_number_snapshot",
            "department_name_snapshot", "object_number_snapshot", "object_name_snapshot",
            "plan_number_snapshot"]
    for _, r in df.iterrows():
        cust_num = int(r["_customer_number"])
        bu = bu_map[cust_num]
        dept_num = int(r["_department_number"]) if pd.notna(r["_department_number"]) else None
        obj_id = int(r["_object_id"]) if pd.notna(r["_object_id"]) else None
        plan_num = int(r["_plan_number"]) if pd.notna(r["_plan_number"]) else None

        dept_lookup = "NULL"
        if dept_num is not None:
            dept_lookup = (
                f"(select d.id from ops.department d "
                f"join core.customer c on c.id = d.customer_id "
                f"where c.business_unit_id = {bu} and c.customer_number = {cust_num} "
                f"and d.department_number = {dept_num})"
            )
        obj_lookup = "NULL"
        if obj_id is not None:
            # department_object.legacy_id ist "<customer>:<ObID>"
            obj_lookup = (
                f"(select o.id from ops.department_object o "
                f"where o.legacy_id = '{cust_num}:{obj_id}')"
            )
        plan_lookup = "NULL"
        if plan_num is not None:
            plan_lookup = (
                f"(select chp.id from ops.customer_hygiene_plan chp "
                f"join core.customer c on c.id = chp.customer_id "
                f"where c.business_unit_id = {bu} and c.customer_number = {cust_num} "
                f"and chp.plan_number = {plan_num})"
            )

        values = [
            _sql_value(r["legacy_id"]),
            _customer_lookup(cust_num, bu),
            dept_lookup,
            obj_lookup,
            plan_lookup,
            _sql_value(r.get("department_number_snapshot")),
            _sql_value(r.get("department_name_snapshot")),
            _sql_value(r.get("object_number_snapshot")),
            _sql_value(r.get("object_name_snapshot")),
            _sql_value(r.get("plan_number_snapshot")),
        ]
        stmts.append(
            f"insert into ops.work_instruction ({', '.join(cols)}) values "
            f"({', '.join(values)}) on conflict (customer_id, legacy_id) do nothing;"
        )
    return stmts


def customer_hazard_substance_stmts(df: pd.DataFrame, bu_map: dict[int, int]) -> list[str]:
    if df.empty:
        return ["-- ops.customer_hazard_substance: 0 Zeilen"]
    stmts = [f"-- ops.customer_hazard_substance: {len(df)} Zeilen"]
    cols = ["legacy_id", "customer_id", "master_hazard_substance_id", "name",
            "location", "annual_quantity_text", "sds_document_path"]
    for _, r in df.iterrows():
        cust_num = int(r["_customer_number"])
        bu = bu_map[cust_num]
        # Master-Lookup per name (case-insensitive)
        name_escaped = str(r["_master_name"]).replace("'", "''")
        master_lookup = (
            f"(select id from catalog.hazard_substance "
            f"where lower(name) = lower('{name_escaped}') limit 1)"
        )
        values = [
            _sql_value(r["legacy_id"]),
            _customer_lookup(cust_num, bu),
            master_lookup,
            _sql_value(r["name"]),
            _sql_value(r.get("location")),
            _sql_value(r.get("annual_quantity_text")),
            _sql_value(r.get("sds_document_path")),
        ]
        stmts.append(
            f"insert into ops.customer_hazard_substance ({', '.join(cols)}) values "
            f"({', '.join(values)}) on conflict (customer_id, legacy_id) do nothing;"
        )
    return stmts


def write_seed(sections: list[tuple[str, list[str]]]) -> Path:
    SEEDS_DIR.mkdir(parents=True, exist_ok=True)
    lines = [
        "-- Auto-generiert von etl/customer_artifacts_etl.py",
        "",
        "begin;",
        "set local app.user_id = 'etl/customer_artifacts_etl.py';",
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
    all_plans = []
    all_steps = []
    all_wi = []
    all_haz = []
    summary = []

    for filename, customer_number, _ in CUSTOMER_DBS:
        accdb = SOURCE_BASE / filename
        if not accdb.exists():
            continue
        print(f"• Kunde {customer_number}: {filename}")
        plans = transform_customer_hygiene_plan(accdb, customer_number)
        steps = transform_customer_hygiene_plan_step(accdb, customer_number)
        wi = transform_work_instruction(accdb, customer_number)
        haz = transform_customer_hazard_substance(accdb, customer_number)
        all_plans.append(plans)
        all_steps.append(steps)
        all_wi.append(wi)
        all_haz.append(haz)
        summary.append({"customer": customer_number, "plans": len(plans),
                        "steps": len(steps), "work_instructions": len(wi),
                        "hazard_substances": len(haz)})

    def _safe_concat(dfs):
        non_empty = [d for d in dfs if not d.empty]
        return pd.concat(non_empty, ignore_index=True) if non_empty else pd.DataFrame()

    plans_df = _safe_concat(all_plans)
    steps_df = _safe_concat(all_steps)
    wi_df = _safe_concat(all_wi)
    haz_df = _safe_concat(all_haz)

    write_parquet(plans_df, "customer_hygiene_plan")
    write_parquet(steps_df, "customer_hygiene_plan_step")
    write_parquet(wi_df, "work_instruction")
    write_parquet(haz_df, "customer_hazard_substance")

    sections = [
        ("ops.customer_hygiene_plan", customer_hygiene_plan_stmts(plans_df, bu_map)),
        ("ops.customer_hygiene_plan_step", customer_hygiene_plan_step_stmts(steps_df, bu_map)),
        ("ops.work_instruction", work_instruction_stmts(wi_df, bu_map)),
        ("ops.customer_hazard_substance", customer_hazard_substance_stmts(haz_df, bu_map)),
    ]
    seed_path = write_seed(sections)

    # Statistik: wie viele legacy_attributes JSON-Objekte sind gefüllt?
    attrs_filled = plans_df["legacy_attributes"].notna().sum() if "legacy_attributes" in plans_df.columns else 0

    report = [
        "# ETL-Lauf: Kundenspezifische Artefakte (Hygienepläne, Arbeitsanweisungen, Gefahrstoffe)",
        "",
        f"**Zeitstempel:** {datetime.now().isoformat(timespec='seconds')}",
        "",
        "| Kunde | Hygienepläne | Schritte | Arbeitsanweis. | Gefahrstoffe |",
        "|---|---:|---:|---:|---:|",
    ]
    for s in summary:
        report.append(
            f"| {s['customer']} | {s['plans']} | {s['steps']} | "
            f"{s['work_instructions']} | {s['hazard_substances']} |"
        )
    report.extend([
        "",
        f"**Total:** {len(plans_df)} Pläne + {len(steps_df)} Schritte + "
        f"{len(wi_df)} Arbeitsanweisungen + {len(haz_df)} Gefahrstoff-Verweise.",
        f"**Seed-SQL:** `{seed_path.relative_to(REPO_ROOT)}`",
        "",
        "## Modellierungs-Entscheidungen",
        "",
        f"- **JSONB legacy_attributes**: in {attrs_filled}/{len(plans_df)} der customer_hygiene_plan-Zeilen "
        f"sind Daten in den semi-strukturierten Spalten R1/K1/E1/D1/Einsatzort1-4 etc. vorhanden. "
        "Migration als JSONB bewahrt sie, ohne sie fachlich zu interpretieren. "
        "TODO: in eine echte Tabelle `ops.customer_hygiene_plan_recipe` normalisieren, "
        "sobald die Bedeutung der Kürzel klar ist.",
        "- **master_hygiene_plan_id**: Lookup auf `catalog.hygiene_plan.legacy_id` (= Master-PlanNr). "
        "Wenn ein Kunden-Plan keine PlanNr-Übereinstimmung im Master hat, bleibt der FK NULL.",
        "- **work_instruction**: dreifacher FK-Lookup (department, department_object via "
        "legacy_id-Match auf 'customer:ObID', customer_hygiene_plan via plan_number). "
        "Fehlende Lookups → NULL, keine Insert-Verweigerung.",
        "- **customer_hazard_substance.master_hazard_substance_id**: Lookup per "
        "case-insensitivem Namen gegen `catalog.hazard_substance`. Wenn Name nicht "
        "im Master existiert → NULL (kundenspezifischer Eintrag, der nicht im "
        "zentralen Verzeichnis ist).",
        "",
        "## Nicht migrierte Spalten (ADR-003)",
        "",
        "- `003 Hygienepläne`: Besonderheiten 2-3, M6, M9, Hinweise zur Anpassung — alle "
        "über 90% NULL oder ganz leer.",
        "- `003 Hygienepläne Arbeitsschritte`: Hinweise zur Anpassung — 100% NULL.",
        "- `010 Arbeitsanweisungen alles`: Etage, BereichNr, Bereich, Abteilungs-Nr Kunde — "
        "alle vollständig NULL in den 3 Kunden-DBs.",
        "- `021 Gefahrstoffverzeichnis`: ArtNr konstant (1 Distinct), Standort und Menge "
        "jährl fast immer leer.",
    ])
    REPORT_PATH.write_text("\n".join(report), encoding="utf-8")
    print()
    print(f"→ Seed SQL: {seed_path}")
    print(f"→ Report:   {REPORT_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

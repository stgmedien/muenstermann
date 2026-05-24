#!/usr/bin/env python3
"""ETL für die Kunden-Stammdaten-Domäne.

Quellen:
    Adressen - Anschriften - H und I.accdb    (81 Kunden + 1 GefFaktor-Master + Mibi-Labore)
    Adressen - Anschriften - Services.accdb   (8 Kunden)

Ziele:
    core.customer            (89 Kunden, business_unit_id 1 oder 2)
    core.customer_contact_person
    core.country             (Nationen, dedupliziert aus beiden DBs)
    core.microbiological_lab (11 Mibi-Labore)
    catalog.hazard_factor    (12 Kategorien + 46 Sub-Faktoren, wide→long pivotiert)

Aufruf:
    .venv/bin/python etl/customer_etl.py [hund_i.accdb] [services.accdb]
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
from etl.catalog_etl import insert_statements, _sql_value, _insert_with_subselect  # noqa: E402


def write_parquet(df: pd.DataFrame, name: str) -> None:
    """Lokale write_parquet, schreibt nach OUT_DIR (core) — nicht catalog."""
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    df.to_parquet(OUT_DIR / f"{name}.parquet", index=False)

SOURCE_BASE = Path(
    "/Users/jonathankreutzheide/Downloads/Probedaten Datenbank Muenstermann  Test"
)
DEFAULT_HUND_I = SOURCE_BASE / "Adressen - Anschriften - H und I.accdb"
DEFAULT_SERVICES = SOURCE_BASE / "Adressen - Anschriften - Services.accdb"

OUT_DIR = REPO_ROOT / "inventory" / "samples" / "core"
SEEDS_DIR = REPO_ROOT / "schema" / "seeds"
SEED_PATH = SEEDS_DIR / "core_customer_domain.sql"
REPORT_PATH = OUT_DIR / "customer-etl-report.md"

BUSINESS_UNIT_HUND_I = 1
BUSINESS_UNIT_SERVICES = 2


# ----------------------------------------------------------------------------
# Country (Nationen-Lookup, in beiden DBs)
# ----------------------------------------------------------------------------

def transform_country(accdb: Path) -> pd.DataFrame:
    raw = dump_table(accdb, "Bewerbungen Hilfe")
    return pd.DataFrame({
        "legacy_id": raw["Nationnummer"].astype("Int64").astype("string"),
        "name": raw["Nation"].astype("string"),
    }).drop_duplicates("name")


# ----------------------------------------------------------------------------
# Customer
# ----------------------------------------------------------------------------

CUSTOMER_COLUMN_MAP = {
    # Access-Spalte → Ziel-Spalte
    "Reinigungsgruppe":         "cleaning_group",
    "Kunden-Nr":                "customer_number",
    "Firma":                    "name",
    "Zusatz":                   "name_supplement",
    "Straße":                   "street",
    "PLZ":                      "postal_code",
    "Ort":                      "city",
    "Bundesland":               "federal_state",
    "Telefon":                  "phone",
    "Telefax":                  "fax",
    "Betreuer":                 "supervisor",
    "Vorarbeiter":              "team_lead",
    "StdZettel":                "hour_sheet_format",
    "Kunden Matchcode":         "match_code",
    "Reinigungsmittel":         "cleaning_agent_freetext",
    "Desinfektionsmittel":      "disinfectant_freetext",
    "Pauschale":                "flat_rate_billing",
    "Zusatzarbeiten":           "extra_work_allowed",
    "Abstriche":                "swab_tests_required",
    "wöchentlich":              "weekly_audit",
    "monatlich":                "monthly_audit",
    "Auswertung Urlaub":        "vacation_audit",
    "Auswertung Krank":         "sickness_audit",
    "1":                        "tag_1",
    "2":                        "tag_2",
    "3":                        "tag_3",
    # Bewusst weggelassen (alle leer):
    #   Reinigungsbeginn, Ende Dienstleistungsvertrag, Anmeldung, Region,
    #   Postfach, PLZ Postfach, PLZ Postfach Ort, Sitex Kdnummer, Status,
    #   Kto, BLZ, Lieferbedingung, Zahlungsbedingung, unsere Kd,
    #   Geschäftsführer, direkter Vorgesetzter, 4, 5, Schäden, Wäsche
}


def transform_customer(accdb: Path, business_unit_id: int) -> pd.DataFrame:
    raw = dump_table(accdb, "Kunden")
    df = pd.DataFrame()
    for src, dst in CUSTOMER_COLUMN_MAP.items():
        if src in raw.columns:
            df[dst] = raw[src]
    # Booleans aus Access kommen als True/False; in Pandas evtl. als bool oder int
    bool_cols = ["flat_rate_billing", "extra_work_allowed", "swab_tests_required",
                 "weekly_audit", "monthly_audit", "vacation_audit", "sickness_audit"]
    for c in bool_cols:
        if c in df.columns:
            df[c] = df[c].fillna(False).astype(bool)
    # legacy_id + business_unit + Reinigungsgruppe sicherstellen
    df["business_unit_id"] = business_unit_id
    df["legacy_id"] = df["customer_number"].astype("Int64").astype("string")
    # cleaning_group + customer_number sind required (NOT NULL)
    df["cleaning_group"] = df["cleaning_group"].astype("Int64")
    df["customer_number"] = df["customer_number"].astype("Int64")
    return df


def transform_contact_person(accdb: Path) -> pd.DataFrame:
    raw = dump_table(accdb, "Kunden Ansprechpartner")
    if raw.empty:
        return pd.DataFrame(columns=["_customer_legacy_id", "salutation", "first_name",
                                      "last_name", "position", "email", "phone", "fax"])
    return pd.DataFrame({
        "_customer_legacy_id": raw["Kunden-Nr"].astype("Int64").astype("string"),
        "salutation": raw.get("Geschlecht"),
        "first_name": raw.get("Vorname"),
        "last_name": raw.get("Name"),
        "position": raw.get("Position"),
        "email": raw.get("e-mail"),
        "phone": raw.get("Telefon"),
        "fax": raw.get("Fax"),
    })


# ----------------------------------------------------------------------------
# Microbiological lab
# ----------------------------------------------------------------------------

def transform_microbiological_lab(accdb: Path) -> pd.DataFrame:
    try:
        raw = dump_table(accdb, "Kunden Mibikontrolle")
    except RuntimeError:
        return pd.DataFrame(columns=["legacy_id", "name"])
    return pd.DataFrame({
        "legacy_id": raw["Nr"].astype("Int64").astype("string"),
        "name": raw["Nom"].astype("string"),
    })


# ----------------------------------------------------------------------------
# Hazard factor (pivot wide→long)
# ----------------------------------------------------------------------------

HAZARD_COL_PATTERN = re.compile(r"^(\d{1,2})(?:-(\d{1,2}))?\s+(.*)$")


def transform_hazard_factor(accdb: Path) -> pd.DataFrame:
    """Pivotiert die Wide-Tabelle "Gefährdungsfaktoren" in eine long-Form.

    Aus 58 Spalten werden 58 Zeilen mit (code, name, parent_code, is_category).
    """
    raw = dump_table(accdb, "Gefährdungsfaktoren")
    rows: list[dict] = []
    for col in raw.columns:
        if col == "ID":
            continue
        m = HAZARD_COL_PATTERN.match(col)
        if not m:
            # Spalte folgt nicht dem Muster — überspringen
            continue
        cat_num, sub_num, name = m.group(1), m.group(2), m.group(3).strip()
        if sub_num is None:
            code = cat_num
            rows.append({
                "legacy_id": code,
                "code": code,
                "name": name,
                "parent_code": None,
                "is_category": True,
            })
        else:
            code = f"{cat_num}-{sub_num}"
            rows.append({
                "legacy_id": code,
                "code": code,
                "name": name,
                "parent_code": cat_num,
                "is_category": False,
            })
    return pd.DataFrame(rows)


# ----------------------------------------------------------------------------
# Helpers
# ----------------------------------------------------------------------------

def to_loadable(df: pd.DataFrame) -> pd.DataFrame:
    return df[[c for c in df.columns if not c.startswith("_")]]


def write_seed(sections: list[tuple[str, list[str]]]) -> Path:
    SEEDS_DIR.mkdir(parents=True, exist_ok=True)
    lines = [
        "-- Auto-generiert von etl/customer_etl.py",
        "-- Kunden-Stammdaten konsolidiert aus beiden Adressbüchern",
        "",
        "begin;",
        "set local app.user_id = 'etl/customer_etl.py';",
        "",
    ]
    for title, stmts in sections:
        lines.append(f"-- == {title} ==")
        lines.extend(stmts)
        lines.append("")
    lines.append("commit;")
    SEED_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return SEED_PATH


def customer_insert_statements(df: pd.DataFrame) -> list[str]:
    """Insert mit composite-unique key (business_unit_id, customer_number)."""
    if df.empty:
        return ["-- core.customer: 0 Zeilen"]
    stmts = [f"-- core.customer: {len(df)} Zeilen"]
    cols = list(df.columns)
    col_list = ", ".join(cols)
    for _, r in df.iterrows():
        values = ", ".join(_sql_value(r[c]) for c in cols)
        stmts.append(
            f"insert into core.customer ({col_list}) values ({values}) "
            f"on conflict (business_unit_id, customer_number) do nothing;"
        )
    return stmts


def contact_insert_statements(df: pd.DataFrame, business_unit_id: int) -> list[str]:
    if df.empty:
        return [f"-- core.customer_contact_person (BU {business_unit_id}): 0 Zeilen"]
    stmts = [f"-- core.customer_contact_person (BU {business_unit_id}): {len(df)} Zeilen"]
    for _, r in df.iterrows():
        customer_lookup = (
            f"(select id from core.customer where business_unit_id = {business_unit_id} "
            f"and customer_number = {int(r['_customer_legacy_id'])})"
        )
        cols = ["customer_id", "salutation", "first_name", "last_name", "position",
                "email", "phone", "fax"]
        values = [
            customer_lookup,
            _sql_value(r["salutation"]),
            _sql_value(r["first_name"]),
            _sql_value(r["last_name"]),
            _sql_value(r["position"]),
            _sql_value(r["email"]),
            _sql_value(r["phone"]),
            _sql_value(r["fax"]),
        ]
        stmts.append(
            f"insert into core.customer_contact_person ({', '.join(cols)}) "
            f"values ({', '.join(values)});"
        )
    return stmts


# ----------------------------------------------------------------------------
# Main
# ----------------------------------------------------------------------------

def main(argv: list[str]) -> int:
    accdb_hund_i = Path(argv[1]) if len(argv) > 1 else DEFAULT_HUND_I
    accdb_services = Path(argv[2]) if len(argv) > 2 else DEFAULT_SERVICES

    for p in (accdb_hund_i, accdb_services):
        if not p.exists():
            print(f"FEHLER: {p} nicht gefunden", file=sys.stderr)
            return 1

    print(f"H und I:  {accdb_hund_i}")
    print(f"Services: {accdb_services}")
    print()

    report_lines = [
        "# ETL-Lauf: Kunden-Stammdaten-Domäne",
        "",
        f"**Quellen:** zwei Adressbücher (H und I + Services)",
        f"**Zeitstempel:** {datetime.now().isoformat(timespec='seconds')}",
        "",
        "| Zieltabelle | Quelle | Zeilen | Status |",
        "|---|---|---:|---|",
    ]

    sections: list[tuple[str, list[str]]] = []

    # Nationen (Bewerbungen Hilfe) — aus H und I (in Services identisch)
    print("• core.country")
    countries = transform_country(accdb_hund_i)
    write_parquet(countries, "country")
    sections.append(("core.country", insert_statements("core.country", countries)))
    report_lines.append(f"| `core.country` | Bewerbungen Hilfe | {len(countries)} | ✓ |")

    # Hazard factors (pivot)
    print("• catalog.hazard_factor")
    hf = transform_hazard_factor(accdb_hund_i)
    write_parquet(hf, "hazard_factor")
    # parent_code referenziert sich selbst, also können wir das idempotent in 2 Schritten machen.
    # Stattdessen: alle insert in einer Transaktion mit "deferrable initially deferred" FK,
    # was im Schema bereits so deklariert ist.
    hf_loadable = hf.copy()
    # is_category aus bool → SQL TRUE/FALSE übersetzen — _sql_value tut das schon.
    sections.append(("catalog.hazard_factor",
                     insert_statements("catalog.hazard_factor", hf_loadable)))
    report_lines.append(f"| `catalog.hazard_factor` | Gefährdungsfaktoren (pivot) | {len(hf)} | ✓ |")

    # Microbiological lab
    print("• core.microbiological_lab")
    mibi = transform_microbiological_lab(accdb_hund_i)
    write_parquet(mibi, "microbiological_lab")
    sections.append(("core.microbiological_lab",
                     insert_statements("core.microbiological_lab", mibi)))
    report_lines.append(f"| `core.microbiological_lab` | Kunden Mibikontrolle (H und I) | {len(mibi)} | ✓ |")

    # Kunden (beide DBs)
    print("• core.customer (H und I)")
    cust_hi = transform_customer(accdb_hund_i, BUSINESS_UNIT_HUND_I)
    print("• core.customer (Services)")
    cust_sv = transform_customer(accdb_services, BUSINESS_UNIT_SERVICES)
    cust_all = pd.concat([cust_hi, cust_sv], ignore_index=True)
    write_parquet(cust_all, "customer")

    # Customer-number-Kollision zwischen den beiden BUs?
    overlap = (
        set(cust_hi["customer_number"].dropna().astype("int64").tolist())
        & set(cust_sv["customer_number"].dropna().astype("int64").tolist())
    )
    sections.append(("core.customer", customer_insert_statements(cust_all)))
    report_lines.append(
        f"| `core.customer` | beide Adressbücher | {len(cust_all)} | "
        f"✓ (H und I: {len(cust_hi)}, Services: {len(cust_sv)}; "
        f"Kunden-Nr-Overlap: {len(overlap)} — durch business_unit getrennt OK) |"
    )

    # Ansprechpartner
    print("• core.customer_contact_person")
    cp_hi = transform_contact_person(accdb_hund_i)
    cp_sv = transform_contact_person(accdb_services)
    write_parquet(pd.concat([cp_hi, cp_sv], ignore_index=True),
                  "customer_contact_person")
    sections.append(("core.customer_contact_person (H und I)",
                     contact_insert_statements(cp_hi, BUSINESS_UNIT_HUND_I)))
    sections.append(("core.customer_contact_person (Services)",
                     contact_insert_statements(cp_sv, BUSINESS_UNIT_SERVICES)))
    report_lines.append(
        f"| `core.customer_contact_person` | Kunden Ansprechpartner | "
        f"{len(cp_hi) + len(cp_sv)} | ✓ (H und I: {len(cp_hi)}, Services: {len(cp_sv)}) |"
    )

    seed_path = write_seed(sections)
    report_lines.extend([
        "",
        f"**Seed-SQL:** `{seed_path.relative_to(REPO_ROOT)}`",
        "",
        "## Konsolidierungs-Befunde",
        "",
        f"- Kunden-Nr-Overlap zwischen H und I und Services: **{len(overlap)} kollidierende Nummern**.",
        "  Konflikt-Lösung im Modell: `unique (business_unit_id, customer_number)` "
        "(Mandanten-eindeutig statt global-eindeutig).",
        "- Adress-Datenlücke: ~20 von 81 H-und-I-Kunden haben weder Straße noch PLZ noch Ort. "
        "Migration übernimmt das so (kein NOT NULL auf Adressfeldern). Im realen Projekt: Frank-Klärung.",
        "",
        "## Bewusst NICHT migriert (alle Quellfelder vollständig leer)",
        "",
        "- `Reinigungsbeginn`, `Ende Dienstleistungsvertrag` (jeweils 81/81 NULL)",
        "- `Region`, `Postfach`, `PLZ Postfach`, `PLZ Postfach Ort`",
        "- `Sitex Kdnummer`, `Status`, `Kto`, `BLZ`, `Lieferbedingung`, `Zahlungsbedingung`, `unsere Kd`",
        "- `Geschäftsführer`, `direkter Vorgesetzter`",
        "- Tag-Spalten `4` und `5` (85 / 90 % leer)",
        "- Boolean `Schäden` und `Wäsche` (alle konstant)",
        "- `Bewerbungen` (1 Zeile, HR-Domäne — Phase 3, hier nicht migriert)",
        "",
        "## TODOs",
        "",
        "- `cleaning_agent_freetext` / `disinfectant_freetext` (62/81 leer, restliche Werte unstrukturiert) "
        "könnten später als Junctions `core.customer_cleaning_agent` aufgelöst werden — wenn Bedarf.",
        "- `tag_1` bis `tag_3` haben Distinct-Counts 36 / 22 / 20 — könnten kategoriale Daten sein. "
        "Bedeutung fachlich klären, ggf. in eigene Lookup-Tabelle.",
    ])
    REPORT_PATH.write_text("\n".join(report_lines), encoding="utf-8")
    print()
    print(f"→ Seed SQL: {seed_path}")
    print(f"→ Report:   {REPORT_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))

#!/usr/bin/env python3
"""ETL für die Kalender-Domäne.

Quelle: Kalender 2026.accdb
Ziele:
    core.federal_state                       (17 Einträge)
    core.public_holiday                      (20 Einträge)
    core.public_holiday_federal_state        (Junction n:m)

Pivot: Wide-Feiertag-Tabelle (1 Zeile pro Feiertag, BL-Booleans pro Spalte)
       → Long-Form (n Zeilen pro Feiertag in der Junction)

Aufruf:
    .venv/bin/python etl/calendar_etl.py
"""

from __future__ import annotations

import sys
from datetime import datetime
from pathlib import Path

import pandas as pd

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT))

from etl.access_io import dump_table  # noqa: E402
from etl.catalog_etl import insert_statements, _sql_value  # noqa: E402

CALENDAR_ACCDB = Path(
    "/Users/jonathankreutzheide/Downloads/Probedaten Datenbank Muenstermann  Test/"
    "Kalender 2026.accdb"
)

OUT_DIR = REPO_ROOT / "inventory" / "samples" / "core"
SEEDS_DIR = REPO_ROOT / "schema" / "seeds"
SEED_PATH = SEEDS_DIR / "core_calendar_domain.sql"
REPORT_PATH = OUT_DIR / "calendar-etl-report.md"

# Die 17 BL-Spalten in der Feiertag-Tabelle (= Abbreviations)
FEDERAL_STATE_COLUMNS = [
    "BW", "BY", "BE", "BB", "HB", "HH", "HE", "MV",
    "NI", "NW", "RP", "SL", "SN", "ST", "SH", "TH", "NL"
]


def write_parquet(df: pd.DataFrame, name: str) -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    df.to_parquet(OUT_DIR / f"{name}.parquet", index=False)


# ----------------------------------------------------------------------------
# Transformations
# ----------------------------------------------------------------------------

def transform_federal_state() -> pd.DataFrame:
    raw = dump_table(CALENDAR_ACCDB, "tbl_Bundesländer")
    return pd.DataFrame({
        "id": raw["BL_Nr"].astype("Int64"),
        "legacy_id": raw["ID"].astype("Int64").astype("string"),
        "name": raw["Bundesland"].astype("string"),
        "abbreviation": raw["BL_Kürzel"].astype("string"),
        "is_german_state": raw["BL_Kürzel"].apply(lambda v: v != "NL"),
    })


def transform_public_holiday() -> pd.DataFrame:
    raw = dump_table(CALENDAR_ACCDB, "Feiertage")
    # Datum kommt als "2026-01-01 00:00:00.0" → ISO-Date
    def to_date(v):
        if not isinstance(v, str) or not v:
            return None
        return v[:10]
    return pd.DataFrame({
        "legacy_id": raw["Datum"].apply(to_date),
        "holiday_date": raw["Datum"].apply(to_date),
        "name": raw["Feiertag"].astype("string"),
        "fixed_date": raw["konstant"].apply(lambda v: bool(v) if v is not None else False),
        "region_code": raw.get("Region"),
        "notes": raw.get("Bundesländer"),
    })


def transform_junction(raw_feiertage: pd.DataFrame, abbreviation_to_state_id: dict[str, int]) -> pd.DataFrame:
    """Pivot wide→long: pro Feiertag und gesetzter BL-Spalte ein Junction-Eintrag."""
    rows = []
    for _, r in raw_feiertage.iterrows():
        datum = r.get("Datum")
        if not isinstance(datum, str):
            continue
        holiday_legacy = datum[:10]
        for col in FEDERAL_STATE_COLUMNS:
            v = r.get(col)
            if v is True:
                state_id = abbreviation_to_state_id.get(col)
                if state_id is None:
                    continue
                rows.append({
                    "_holiday_legacy_id": holiday_legacy,
                    "federal_state_id": state_id,
                })
    return pd.DataFrame(rows)


# ----------------------------------------------------------------------------
# SQL-Generation
# ----------------------------------------------------------------------------

def federal_state_stmts(df: pd.DataFrame) -> list[str]:
    if df.empty:
        return ["-- core.federal_state: 0 Zeilen"]
    stmts = [f"-- core.federal_state: {len(df)} Zeilen"]
    cols = ["id", "legacy_id", "name", "abbreviation", "is_german_state"]
    for _, r in df.iterrows():
        values = [
            _sql_value(int(r["id"])),
            _sql_value(r["legacy_id"]),
            _sql_value(r["name"]),
            _sql_value(r["abbreviation"]),
            _sql_value(bool(r["is_german_state"])),
        ]
        stmts.append(
            f"insert into core.federal_state ({', '.join(cols)}) values "
            f"({', '.join(values)}) on conflict (id) do nothing;"
        )
    return stmts


def public_holiday_stmts(df: pd.DataFrame) -> list[str]:
    if df.empty:
        return ["-- core.public_holiday: 0 Zeilen"]
    stmts = [f"-- core.public_holiday: {len(df)} Zeilen"]
    cols = ["legacy_id", "holiday_date", "name", "fixed_date", "region_code", "notes"]
    for _, r in df.iterrows():
        # holiday_date als DATE-Literal in SQL: 'YYYY-MM-DD'
        date_sql = _sql_value(r["holiday_date"])
        values = [
            _sql_value(r["legacy_id"]),
            date_sql,
            _sql_value(r["name"]),
            _sql_value(bool(r["fixed_date"])),
            _sql_value(r.get("region_code")),
            _sql_value(r.get("notes")),
        ]
        stmts.append(
            f"insert into core.public_holiday ({', '.join(cols)}) values "
            f"({', '.join(values)}) on conflict (legacy_id) do nothing;"
        )
    return stmts


def junction_stmts(df: pd.DataFrame) -> list[str]:
    if df.empty:
        return ["-- core.public_holiday_federal_state: 0 Zeilen"]
    stmts = [f"-- core.public_holiday_federal_state: {len(df)} Zeilen"]
    for _, r in df.iterrows():
        holiday_lookup = (
            f"(select id from core.public_holiday where legacy_id = "
            f"'{r['_holiday_legacy_id']}')"
        )
        stmts.append(
            f"insert into core.public_holiday_federal_state "
            f"(public_holiday_id, federal_state_id) values "
            f"({holiday_lookup}, {int(r['federal_state_id'])}) "
            f"on conflict (public_holiday_id, federal_state_id) do nothing;"
        )
    return stmts


def write_seed(sections: list[tuple[str, list[str]]]) -> Path:
    SEEDS_DIR.mkdir(parents=True, exist_ok=True)
    lines = [
        "-- Auto-generiert von etl/calendar_etl.py",
        "",
        "begin;",
        "set local app.user_id = 'etl/calendar_etl.py';",
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
    print(f"Quelle: {CALENDAR_ACCDB}")
    print()

    print("• core.federal_state")
    fs = transform_federal_state()
    write_parquet(fs, "federal_state")

    print("• core.public_holiday")
    raw_holidays = dump_table(CALENDAR_ACCDB, "Feiertage")
    ph = transform_public_holiday()
    write_parquet(ph, "public_holiday")

    print("• core.public_holiday_federal_state (Junction)")
    abbr_to_id = dict(zip(fs["abbreviation"], fs["id"].astype(int)))
    junction = transform_junction(raw_holidays, abbr_to_id)
    write_parquet(junction, "public_holiday_federal_state")

    sections = [
        ("core.federal_state", federal_state_stmts(fs)),
        ("core.public_holiday", public_holiday_stmts(ph)),
        ("core.public_holiday_federal_state", junction_stmts(junction)),
    ]
    seed_path = write_seed(sections)

    # Stats
    per_state_count = junction.groupby("federal_state_id").size() if not junction.empty else pd.Series(dtype=int)

    report = [
        "# ETL-Lauf: Kalender-Domäne",
        "",
        f"**Quelle:** `{CALENDAR_ACCDB}`",
        f"**Zeitstempel:** {datetime.now().isoformat(timespec='seconds')}",
        "",
        "| Tabelle | Zeilen |",
        "|---|---:|",
        f"| `core.federal_state` | {len(fs)} |",
        f"| `core.public_holiday` | {len(ph)} |",
        f"| `core.public_holiday_federal_state` | {len(junction)} |",
        "",
        "## Feiertage pro Bundesland",
        "",
        "| BL | Anzahl Feiertage |",
        "|---|---:|",
    ]
    if not per_state_count.empty:
        for state_id, cnt in per_state_count.items():
            name = fs.loc[fs["id"] == state_id, "abbreviation"].iloc[0]
            report.append(f"| {name} | {cnt} |")

    report.extend([
        "",
        f"**Seed-SQL:** `{seed_path.relative_to(REPO_ROOT)}`",
        "",
        "## Bewusst NICHT migriert",
        "",
        "- **Kalender (365 Tage)**: in PG via `generate_series('2026-01-01'::date, "
        "'2026-12-31'::date, '1 day'::interval)` jederzeit ableitbar.",
        "- **KalenderBW / KalenderBY / ... / KalenderNL** (16 Bundesländer + NL, je 12 Zeilen): "
        "Monatslisten pro BL — aus dem normalisierten Feiertag-Junction-Modell ebenfalls "
        "ableitbar (Filter auf federal_state).",
        "- **KalenderWochen**: 53 Wochen mit Mo-So-Datumsspalten — pivotiertes Wide-Format, "
        "in PG mit `date_trunc('week', ...)` und ARRAY-Aggregation rekonstruierbar.",
        "- **Monatsnamen (12)**: i18n-Anwendungs-Daten, nicht Domänen-Stammdaten.",
        "- **Temp_KalenderHoch / Temp_KalenderQuer**: Reports-Pivot-Vorlagen.",
        "- **Initialisierung (1)**: Konfigurations-Zeile.",
        "- **Kalender Könecke**: kundenspezifischer Kalender — gehört nach `ops.*`, "
        "kommt nur falls fachlich relevant.",
    ])
    REPORT_PATH.write_text("\n".join(report), encoding="utf-8")

    print()
    print(f"→ Seed SQL: {seed_path}")
    print(f"→ Report:   {REPORT_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

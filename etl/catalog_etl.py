#!/usr/bin/env python3
"""ETL Catalog-Domäne (Reinigungsmittel).

Quelle: Reinigungsmittel_2025.accdb
Ziel:   catalog.* (siehe schema/ddl/catalog/100_catalog_domain.sql)

Verfahren:
1. Lookup-Tabellen 1:1 mappen (Spaltenname-Translation, legacy_id mitführen).
2. cleaning_agent: 93 Spalten → ~12 fachlich relevante (siehe ADR-003).
3. Multi-Column-Spalten (Gefahrstoffe 1-5) und CSV-Spalten (H-Sätze)
   in Junction-Tabellen explodieren.
4. Hersteller-Fuzzy-Match gegen catalog.manufacturer.

Output:
- inventory/samples/catalog/*.parquet     — DataFrame-Snapshots pro Zieltabelle
- schema/seeds/catalog_reinigungsmittel.sql — INSERT-Statements (idempotent)
- inventory/samples/catalog/etl-report.md   — Lauf-Zusammenfassung + Quarantäne

Aufruf:
    .venv/bin/python etl/catalog_etl.py [accdb-pfad]
"""

from __future__ import annotations

import difflib
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Optional

import pandas as pd

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT))

from etl.access_io import dump_table  # noqa: E402

DEFAULT_ACCDB = Path(
    "/Users/jonathankreutzheide/Downloads/Probedaten Datenbank Muenstermann  Test/"
    "Reinigungsmittel_2025.accdb"
)

OUT_DIR = REPO_ROOT / "inventory" / "samples" / "catalog"
SEEDS_DIR = REPO_ROOT / "schema" / "seeds"
REPORT_PATH = OUT_DIR / "etl-report.md"


# ----------------------------------------------------------------------------
# Helfer: SQL-Insert-Generierung
# ----------------------------------------------------------------------------

def _sql_value(v) -> str:
    """SQL-Literal aus einem Python-Wert. Pragmatisch, ohne ORM."""
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return "NULL"
    if isinstance(v, bool):
        return "TRUE" if v else "FALSE"
    if isinstance(v, (int, float)):
        return str(v)
    # alles andere: String, mit doppelten Hochkommata escapen
    s = str(v).replace("'", "''")
    return f"'{s}'"


def insert_statements(table: str, df: pd.DataFrame) -> list[str]:
    """Erzeugt eine Liste von INSERT-Statements für ein DataFrame in eine PG-Tabelle.

    Die Spalten in df müssen den Spaltennamen in der Zieltabelle entsprechen.
    Idempotenz: per ON CONFLICT (legacy_id) DO NOTHING — setzt voraus, dass
    legacy_id ein UNIQUE-Constraint hat (in unserem Catalog-Schema gegeben).
    """
    if df.empty:
        return [f"-- {table}: 0 Zeilen, kein INSERT"]
    cols = list(df.columns)
    col_list = ", ".join(cols)
    stmts: list[str] = [f"-- {table}: {len(df)} Zeilen"]
    for _, row in df.iterrows():
        values = ", ".join(_sql_value(row[c]) for c in cols)
        stmt = (
            f"insert into {table} ({col_list}) values ({values}) "
            f"on conflict (legacy_id) do nothing;"
        )
        stmts.append(stmt)
    return stmts


# ----------------------------------------------------------------------------
# Transformations pro Tabelle
# ----------------------------------------------------------------------------

def transform_hazard_phrase_category(accdb: Path) -> pd.DataFrame:
    raw = dump_table(accdb, "tblGefHinweis_Kategorien")
    return pd.DataFrame({
        "legacy_id": raw["GefHinw_KatNr"].astype("Int64").astype("string"),
        "code": raw["GefHinw_KatNr"].astype("Int64"),
        "name": raw["GefHinw_Kategorie"],
    })


def transform_hazard_phrase(accdb: Path, categories: pd.DataFrame) -> pd.DataFrame:
    """Mapping tblGefHhinweise_H-Sätze → catalog.hazard_phrase.

    Kategorie wird aus dem H-Satz-Präfix (z. B. H2xx) abgeleitet:
       H2xx → Kategorie 200 (Physikalisch)
       H3xx → Kategorie 300 (Gesundheit)
       H4xx → Kategorie 400 (Umwelt)
       EUHxxx → keine Kategorie zugewiesen (ergänzende EU-Hinweise)
    """
    raw = dump_table(accdb, "tblGefHhinweise_H-Sätze")
    # Spalten heißen mit Sonderzeichen — sicher referenzieren
    h_satz_col = "H-Satz"
    h_satz_nr_col = "H-Satz-Nr"

    def map_category(code: str) -> Optional[int]:
        if not isinstance(code, str):
            return None
        if code.startswith("EUH"):
            return None
        if code.startswith("H2"):
            return 200
        if code.startswith("H3"):
            return 300
        if code.startswith("H4"):
            return 400
        return None

    cat_code_to_legacy = dict(zip(categories["code"], categories["legacy_id"]))
    # legacy_id der Kategorie statt code — wird beim Insert gegen die DB aufgelöst,
    # hier hängen wir die Referenz noch nicht auf, sondern reichen sie zum Loader durch.
    df = pd.DataFrame({
        "legacy_id": raw[h_satz_nr_col].astype("string"),
        "code": raw[h_satz_col].astype("string"),
        "description": raw["Beschreibung"].astype("string"),
        "_category_code": raw[h_satz_col].map(map_category),
    })
    df["_category_legacy_id"] = df["_category_code"].map(lambda c: cat_code_to_legacy.get(c) if c else None)
    return df


def transform_hazard_phrase_meta(accdb: Path) -> pd.DataFrame:
    raw = dump_table(accdb, "tblGefHinweis_Stand")
    # "Juni 2020" → 2020-06-01. Simple Heuristik, sonst NULL.
    months = {
        "januar": 1, "februar": 2, "märz": 3, "maerz": 3, "april": 4,
        "mai": 5, "juni": 6, "juli": 7, "august": 8, "september": 9,
        "oktober": 10, "november": 11, "dezember": 12,
    }
    def parse_de_date(s):
        if not isinstance(s, str) or " " not in s:
            return None
        parts = s.strip().split()
        if len(parts) != 2:
            return None
        m = months.get(parts[0].lower())
        try:
            y = int(parts[1])
        except ValueError:
            return None
        if not m:
            return None
        return datetime(y, m, 1).date().isoformat()

    return pd.DataFrame({
        "legacy_id": raw["ID"].astype("Int64").astype("string"),
        "revision": raw["GefHinwStand"].astype("string"),
        "source_short": raw["Quelle_kurzText"].astype("string"),
        "source_long": raw["Quelle_langText"].astype("string"),
        "published_at": raw["Quelle_Datum"].map(parse_de_date),
    })


def transform_poison_information_center(accdb: Path) -> pd.DataFrame:
    raw = dump_table(accdb, "tblGIZ")
    return pd.DataFrame({
        "legacy_id": raw["GizID"].astype("Int64").astype("string"),
        "city": raw["GizOrt"].astype("string"),
        "name": raw["GizName"].astype("string"),
        "phone": raw["GizTel"].astype("string"),
        "email": raw["GizE-Mail"].astype("string"),
    })


def transform_manufacturer(accdb: Path) -> pd.DataFrame:
    raw = dump_table(accdb, "tblRGM_Hersteller")
    return pd.DataFrame({
        "legacy_id": raw["HerstellerID"].astype("Int64").astype("string"),
        "name": raw["RgmFirma"].astype("string"),
        "street": raw["RgmStraße"].astype("string"),
        # PLZ aus Access kommt als INTEGER (z. B. 3961, 87700) — als zero-padded
        # 5-stellige PLZ ausgeben (DE-Norm). Für ausländische PLZ ggf. anpassen.
        "postal_code": raw["RgmPLZ"].apply(
            lambda v: f"{int(v):05d}" if pd.notna(v) else None
        ),
        "city": raw["RgmOrt"].astype("string"),
        "department": raw["RgmAbt"].astype("string"),
        "internal_emergency_phone": raw["RgmNotrufnummer intern"].astype("string"),
        "email": raw["RgmEMail"].astype("string"),
        "_poison_center_legacy_id": raw["zuständige Giftzentrale"].astype("Int64").astype("string"),
    })


def transform_storage_class(accdb: Path) -> pd.DataFrame:
    raw = dump_table(accdb, "tbl_TRGS 510")
    # Spalten-Namen aus tbl_TRGS 510 — die echten Namen sind unsicher,
    # weil das Schema beim Lesen aufgedeckt wurde. Fallback: erste zwei
    # nicht-leere Spalten als (code, description).
    cols = list(raw.columns)
    code_col = "LGK" if "LGK" in cols else cols[0]
    # Beschreibungs-Spalte ist die textreichste — heuristisch erste Text-Spalte nach code
    desc_col = None
    for c in cols:
        if c == code_col:
            continue
        if raw[c].dtype == object and raw[c].astype(str).str.len().mean() > 5:
            desc_col = c
            break
    if desc_col is None:
        desc_col = cols[1] if len(cols) > 1 else cols[0]

    return pd.DataFrame({
        "legacy_id": raw[code_col].astype("string"),
        "code": raw[code_col].astype("string"),
        "description": raw[desc_col].astype("string"),
    })


def transform_hazard_symbol(accdb: Path) -> pd.DataFrame:
    raw = dump_table(accdb, "tblSymboleGefahren")
    return pd.DataFrame({
        "legacy_id": raw["ID"].astype("Int64").astype("string"),
        "code": "GHS" + raw["ID"].astype("Int64").astype("string").str.zfill(2),
        "name": raw["Eigenschaft"].astype("string"),
        # Piktogramm-BLOB wird in dieser Stufe nicht migriert — separater Schritt.
    })


def transform_ppe_symbol(accdb: Path) -> pd.DataFrame:
    raw = dump_table(accdb, "tblSymbolePSA")
    return pd.DataFrame({
        "legacy_id": raw["ID"].astype("Int64").astype("string"),
        "code": "PSA-" + raw["ID"].astype("Int64").astype("string").str.zfill(2),
        "name": raw["Bezeichnung"].astype("string"),
    })


def _normalize_manufacturer(s: str) -> str:
    """Normalisiert einen Hersteller-Freitext für Fuzzy-Match.

    Entfernt Rechtsformen, Whitespace-Auffälligkeiten, Case.
    """
    if not isinstance(s, str):
        return ""
    s = s.lower()
    s = s.replace("\r\n", " ").replace("\n", " ")
    # Rechtsformen entfernen
    for token in ["gmbh & co. kg", "gmbh & co.kg", "gmbh &co.kg", "gmbh", "& co.", "ag", "ohg", "b.v.", "kg"]:
        s = s.replace(token, " ")
    # Sonderzeichen + Mehrfach-Whitespace bereinigen
    s = re.sub(r"[^\w\säöüß]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def _match_manufacturer(freitext: Optional[str], short_name: Optional[str],
                        manu_df: pd.DataFrame) -> tuple[Optional[str], float, str]:
    """Liefert (manufacturer_legacy_id, match_score, methode) für einen Freitext.

    Match-Strategie:
    1. Wenn short_name (Herstellerkurzbezeichnung) im Hersteller-Stammdaten-Name vorkommt → match
    2. Fuzzy-Match (difflib SequenceMatcher) auf normalisierten Hersteller-Namen
    3. Best-Match nur wenn Score >= 0.7

    Returns:
        (legacy_id_of_manufacturer | None, score, method_description)
    """
    if not isinstance(freitext, str) and not isinstance(short_name, str):
        return (None, 0.0, "no_input")

    # Vorbereitung: Hersteller-Stammdaten normalisieren
    manu_normalized = manu_df.assign(_norm=manu_df["name"].map(_normalize_manufacturer))

    # 1) Kurzbezeichnung exact in name (case-insensitive)?
    if isinstance(short_name, str) and short_name.strip():
        sn_lower = short_name.lower().strip()
        for _, row in manu_normalized.iterrows():
            name_lower = (row["name"] or "").lower()
            if sn_lower and sn_lower in name_lower:
                return (row["legacy_id"], 1.0, f"short_name_in_name ({short_name!r})")

    # 2) Fuzzy auf vollem Namen
    if isinstance(freitext, str) and freitext.strip():
        norm_freitext = _normalize_manufacturer(freitext)
        scores = manu_normalized["_norm"].map(
            lambda n: difflib.SequenceMatcher(None, n, norm_freitext).ratio()
        )
        if scores.max() >= 0.7:
            best_idx = scores.idxmax()
            return (manu_normalized.loc[best_idx, "legacy_id"],
                    round(float(scores.max()), 3),
                    "fuzzy")

    return (None, 0.0, "no_match")


def transform_cleaning_agent(accdb: Path, manu_df: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame, list[dict]]:
    """Transformiert tbl_RGM_Eigenschaften_2025 zu cleaning_agent + Junction.

    Returns:
        (cleaning_agent_df, hazard_substance_junction_df, quarantine_records)
    """
    raw = dump_table(accdb, "tbl_RGM_Eigenschaften_2025")
    print(f"  Quell-Zeilen: {len(raw)}")

    # Hersteller-Match pro Zeile
    quarantine: list[dict] = []
    matched_legacy_ids: list[Optional[str]] = []
    match_methods: list[str] = []
    for _, row in raw.iterrows():
        leg_id, score, method = _match_manufacturer(
            row.get("Hersteller"), row.get("Herstellerkurzbezeichnung"), manu_df
        )
        if leg_id is None and row.get("Hersteller"):
            quarantine.append({
                "ID": row.get("ID"),
                "Artikelname": row.get("Artikelname"),
                "Hersteller_freitext": row.get("Hersteller"),
                "Kurzbezeichnung": row.get("Herstellerkurzbezeichnung"),
                "match_score": score,
                "match_method": method,
            })
        matched_legacy_ids.append(leg_id)
        match_methods.append(method)

    # WGK aus Text in Smallint
    def parse_wgk(v):
        if v is None:
            return None
        try:
            i = int(str(v).strip())
            if 1 <= i <= 3:
                return i
        except (ValueError, TypeError):
            pass
        return None

    cleaning_agent = pd.DataFrame({
        "legacy_id": raw["ID"].astype("Int64").astype("string"),
        "name": raw["Artikelname"].astype("string"),
        "operations_number": raw.get("Betriebs-Nr"),
        "short_info": raw.get("Kurz Info"),
        "measurement_instructions": raw.get("Anleitung Messung"),
        "ph_value": raw.get("pH-Wert SDB"),
        "water_hazard_class": raw.get("WGK").apply(parse_wgk) if "WGK" in raw.columns else None,
        "flammability_class": raw.get("Vbf"),
        "adr_rid": raw.get("ADR/RID"),
        "hazard_legacy_text": raw.get("H-Sätze"),
        "precaution_legacy_text": raw.get("P-Sätze"),
        "_manufacturer_legacy_id": matched_legacy_ids,
        # storage_class wird per FK über Lagerklasse-Code aufgelöst — wenn überhaupt
        "_storage_class_text": raw.get("Lagerklasse"),
    })

    # Junction: Gefahrstoffe 1-5 → cleaning_agent_hazard_substance
    junction_rows: list[dict] = []
    for _, row in raw.iterrows():
        for pos in range(1, 6):
            col = f"Gefahrstoffe {pos}"
            val = row.get(col)
            if isinstance(val, str) and val.strip():
                junction_rows.append({
                    "cleaning_agent_legacy_id": str(row["ID"]),
                    "position": pos,
                    "substance_name": val.strip(),
                })
    hazard_substance = pd.DataFrame(junction_rows)
    return cleaning_agent, hazard_substance, quarantine


# ----------------------------------------------------------------------------
# Pipeline: alles ausführen, Parquet + SQL schreiben
# ----------------------------------------------------------------------------

def write_parquet(df: pd.DataFrame, name: str) -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    df.to_parquet(OUT_DIR / f"{name}.parquet", index=False)


def write_seed_sql(sections: list[tuple[str, list[str]]]) -> Path:
    SEEDS_DIR.mkdir(parents=True, exist_ok=True)
    out_path = SEEDS_DIR / "catalog_reinigungsmittel.sql"
    lines: list[str] = [
        "-- Auto-generiert von etl/catalog_etl.py",
        "-- Reinigungsmittel-Stammdaten aus Reinigungsmittel_2025.accdb",
        "",
        "begin;",
        "set local app.user_id = 'etl/catalog_etl.py';",
        "set local search_path = catalog, public;",
        "",
    ]
    for title, stmts in sections:
        lines.append(f"-- == {title} ==")
        lines.extend(stmts)
        lines.append("")
    lines.append("commit;")
    out_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return out_path


def to_loadable(df: pd.DataFrame) -> pd.DataFrame:
    """Spalten mit führendem Underscore (ETL-Helper) für den Insert herausfiltern."""
    return df[[c for c in df.columns if not c.startswith("_")]]


def main(argv: list[str]) -> int:
    accdb = Path(argv[1]) if len(argv) > 1 else DEFAULT_ACCDB
    if not accdb.exists():
        print(f"FEHLER: Quelldatei nicht gefunden: {accdb}", file=sys.stderr)
        return 1

    print(f"Quelle: {accdb}")
    print(f"Output: {OUT_DIR}")
    print()

    report_lines: list[str] = [
        f"# ETL-Lauf: Catalog-Domäne",
        "",
        f"**Quelle:** `{accdb}`",
        f"**Zeitstempel:** {datetime.now().isoformat(timespec='seconds')}",
        "",
        "| Zieltabelle | Quelltabelle | Zeilen | Status |",
        "|---|---|---:|---|",
    ]

    sections: list[tuple[str, list[str]]] = []

    # 1) Kategorien (referenziert von hazard_phrase)
    print("• catalog.hazard_phrase_category")
    cats = transform_hazard_phrase_category(accdb)
    write_parquet(cats, "hazard_phrase_category")
    sections.append(("catalog.hazard_phrase_category", insert_statements("catalog.hazard_phrase_category", to_loadable(cats))))
    report_lines.append(f"| `catalog.hazard_phrase_category` | tblGefHinweis_Kategorien | {len(cats)} | ✓ |")

    # 2) H-Sätze (FK auf category)
    print("• catalog.hazard_phrase")
    hp = transform_hazard_phrase(accdb, cats)
    write_parquet(hp, "hazard_phrase")
    # Für SQL: category_id wird beim Insert per subselect aufgelöst
    hp_load = to_loadable(hp).copy()
    # Wir fügen category_id als Subselect-Expression ein, NICHT als Wert
    # → Trick: spezielle Spalten mit Präfix __subselect__ rendern wir anders.
    hp_load["category_id"] = hp["_category_legacy_id"].apply(
        lambda lid: f"(select id from catalog.hazard_phrase_category where legacy_id = '{lid}')" if pd.notna(lid) else None
    )
    sections.append(("catalog.hazard_phrase", _insert_with_subselect("catalog.hazard_phrase", hp_load, subselect_cols=["category_id"])))
    report_lines.append(f"| `catalog.hazard_phrase` | tblGefHhinweise_H-Sätze | {len(hp)} | ✓ |")

    # 3) Stand-Metadaten
    print("• catalog.hazard_phrase_meta")
    meta = transform_hazard_phrase_meta(accdb)
    write_parquet(meta, "hazard_phrase_meta")
    sections.append(("catalog.hazard_phrase_meta", insert_statements("catalog.hazard_phrase_meta", to_loadable(meta))))
    report_lines.append(f"| `catalog.hazard_phrase_meta` | tblGefHinweis_Stand | {len(meta)} | ✓ |")

    # 4) Giftzentralen
    print("• catalog.poison_information_center")
    gizs = transform_poison_information_center(accdb)
    write_parquet(gizs, "poison_information_center")
    sections.append(("catalog.poison_information_center", insert_statements("catalog.poison_information_center", to_loadable(gizs))))
    report_lines.append(f"| `catalog.poison_information_center` | tblGIZ | {len(gizs)} | ✓ |")

    # 5) Hersteller (FK auf poison_information_center)
    print("• catalog.manufacturer")
    mfg = transform_manufacturer(accdb)
    write_parquet(mfg, "manufacturer")
    mfg_load = to_loadable(mfg).copy()
    mfg_load["poison_center_id"] = mfg["_poison_center_legacy_id"].apply(
        lambda lid: f"(select id from catalog.poison_information_center where legacy_id = '{lid}')" if pd.notna(lid) else None
    )
    sections.append(("catalog.manufacturer", _insert_with_subselect("catalog.manufacturer", mfg_load, subselect_cols=["poison_center_id"])))
    report_lines.append(f"| `catalog.manufacturer` | tblRGM_Hersteller | {len(mfg)} | ✓ |")

    # 6) Lagerklassen
    print("• catalog.storage_class")
    sc = transform_storage_class(accdb)
    write_parquet(sc, "storage_class")
    sections.append(("catalog.storage_class", insert_statements("catalog.storage_class", to_loadable(sc))))
    report_lines.append(f"| `catalog.storage_class` | tbl_TRGS 510 | {len(sc)} | ✓ |")

    # 7) Gefahrenpiktogramme
    print("• catalog.hazard_symbol")
    hs = transform_hazard_symbol(accdb)
    write_parquet(hs, "hazard_symbol")
    sections.append(("catalog.hazard_symbol", insert_statements("catalog.hazard_symbol", to_loadable(hs))))
    report_lines.append(f"| `catalog.hazard_symbol` | tblSymboleGefahren | {len(hs)} | ✓ (ohne Piktogramme) |")

    # 8) PSA-Symbole
    print("• catalog.ppe_symbol")
    ppe = transform_ppe_symbol(accdb)
    write_parquet(ppe, "ppe_symbol")
    sections.append(("catalog.ppe_symbol", insert_statements("catalog.ppe_symbol", to_loadable(ppe))))
    report_lines.append(f"| `catalog.ppe_symbol` | tblSymbolePSA | {len(ppe)} | ✓ (ohne Piktogramme) |")

    # 9) cleaning_agent + Junction-Tabelle Gefahrstoffe
    print("• catalog.cleaning_agent")
    ca, hs_junction, quarantine = transform_cleaning_agent(accdb, mfg)
    write_parquet(ca, "cleaning_agent")
    write_parquet(hs_junction, "cleaning_agent_hazard_substance")
    # SQL: manufacturer_id via subselect; storage_class_id vorerst nicht aufgelöst
    ca_load = to_loadable(ca).copy()
    ca_load["manufacturer_id"] = ca["_manufacturer_legacy_id"].apply(
        lambda lid: f"(select id from catalog.manufacturer where legacy_id = '{lid}')" if pd.notna(lid) else None
    )
    sections.append(("catalog.cleaning_agent",
        _insert_with_subselect("catalog.cleaning_agent", ca_load, subselect_cols=["manufacturer_id"])))
    matched_count = ca["_manufacturer_legacy_id"].notna().sum()
    report_lines.append(
        f"| `catalog.cleaning_agent` | tbl_RGM_Eigenschaften_2025 | {len(ca)} | "
        f"✓ ({matched_count}/{len(ca)} Hersteller gematcht, {len(quarantine)} Quarantäne) |"
    )

    # Junction: über Subselects auf cleaning_agent.legacy_id
    print("• catalog.cleaning_agent_hazard_substance")
    if not hs_junction.empty:
        jstmts: list[str] = [f"-- catalog.cleaning_agent_hazard_substance: {len(hs_junction)} Zeilen"]
        for _, r in hs_junction.iterrows():
            jstmts.append(
                f"insert into catalog.cleaning_agent_hazard_substance "
                f"(cleaning_agent_id, position, substance_name) values ("
                f"(select id from catalog.cleaning_agent where legacy_id = '{r['cleaning_agent_legacy_id']}'), "
                f"{int(r['position'])}, "
                f"{_sql_value(r['substance_name'])}"
                f") on conflict (cleaning_agent_id, position) do nothing;"
            )
        sections.append(("catalog.cleaning_agent_hazard_substance", jstmts))
        report_lines.append(
            f"| `catalog.cleaning_agent_hazard_substance` | Gefahrstoffe 1-5 (auflöst) | {len(hs_junction)} | ✓ |"
        )

    # Quarantäne separat speichern
    if quarantine:
        q_df = pd.DataFrame(quarantine)
        q_df.to_parquet(OUT_DIR / "manufacturer_match_quarantine.parquet", index=False)
        q_md = ["# Hersteller-Quarantäne", ""]
        q_md.append(f"{len(quarantine)} Reinigungsmittel ohne automatischen Hersteller-Match.")
        q_md.append("")
        q_md.append("| ID | Artikelname | Hersteller (Freitext) | Kurzbez. | Methode |")
        q_md.append("|---|---|---|---|---|")
        for q in quarantine[:50]:
            q_md.append(f"| {q['ID']} | `{q['Artikelname']}` | `{q['Hersteller_freitext']}` | {q['Kurzbezeichnung']} | {q['match_method']} |")
        if len(quarantine) > 50:
            q_md.append(f"| ... | ... | ... | ... | (insgesamt {len(quarantine)}) |")
        (OUT_DIR / "manufacturer_match_quarantine.md").write_text("\n".join(q_md), encoding="utf-8")

    seed_path = write_seed_sql(sections)
    report_lines.extend([
        "",
        f"**Seed-SQL:** `{seed_path.relative_to(REPO_ROOT)}`",
        f"**Parquet-Snapshots:** `{OUT_DIR.relative_to(REPO_ROOT)}/`",
        "",
        "## Bewusst NICHT migriert",
        "",
        "- **Piktogramme (BLOB)** der Hazard- und PSA-Symbole — separater Schritt, OLE-Object-Extraktion via Jackcess oder Access-Export.",
        "- **catalog.cleaning_agent_hazard_phrase Junction**: die `H-Sätze`-Spalte in Access enthält in den Probedaten **R-Sätze nach alter Stoffrichtlinie 67/548/EWG**, nicht die neuen H-Sätze nach CLP. Beispiel: `\"35, 22, 36, 38, 41\"` = R35, R22, R36, R38, R41. Diese Werte sind in unserer `catalog.hazard_phrase`-Tabelle (echte H-Sätze) nicht auflösbar. Workaround: der Rohtext wandert in `cleaning_agent.hazard_legacy_text`; die Junction bleibt leer. Fachliche Re-Klassifizierung auf H-Sätze ist ein separater Compliance-Auftrag.",
        "- **catalog.cleaning_agent_hazard_symbol Junction**: die `Gefahrenbezeichnung`-Spalte in Access enthält alte EWG-Codes (C/Xn/Xi etc.), nicht GHS-Piktogramm-Codes (GHS01-GHS09). Gleicher Workaround wie oben.",
        "- **storage_class_id-Auflösung**: die `Lagerklasse`-Spalte ist Freitext (z. B. \"10/12\"), das match-Verfahren auf `catalog.storage_class.code` ist nicht trivial und wird in einem späteren ETL-Schritt nachgeholt.",
        "- **~20 fast-leere bis vollständig leere Spalten** aus `tbl_RGM_Eigenschaften_2025` (BioWirksam1-10, Abfallschlüssel, Gefahrenbezeichnung1/2 etc.) — siehe ADR-003 Regel 3.",
    ])
    REPORT_PATH.write_text("\n".join(report_lines), encoding="utf-8")
    print()
    print(f"→ Seed SQL: {seed_path}")
    print(f"→ Report:   {REPORT_PATH}")
    return 0


def _insert_with_subselect(table: str, df: pd.DataFrame, subselect_cols: list[str]) -> list[str]:
    """Wie insert_statements, aber bestimmte Spalten enthalten Subselect-Expressions
    (kein SQL-Literal, sondern direkt eingebettetes SQL).
    """
    if df.empty:
        return [f"-- {table}: 0 Zeilen"]
    cols = list(df.columns)
    col_list = ", ".join(cols)
    stmts: list[str] = [f"-- {table}: {len(df)} Zeilen"]
    for _, row in df.iterrows():
        parts: list[str] = []
        for c in cols:
            if c in subselect_cols and isinstance(row[c], str):
                parts.append(row[c])  # rohe SQL-Expression
            else:
                parts.append(_sql_value(row[c]))
        stmts.append(
            f"insert into {table} ({col_list}) values ({', '.join(parts)}) "
            f"on conflict (legacy_id) do nothing;"
        )
    return stmts


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))

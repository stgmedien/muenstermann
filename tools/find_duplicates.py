#!/usr/bin/env python3
"""Sucht Duplikate in der Münstermann-DB, die NICHT durch UNIQUE-Constraints
abgefangen werden — also "potentiell falsche" Duplikate aus der Migration.

Output: Markdown-Bericht nach inventory/reports/duplicate-check.md
"""

from __future__ import annotations

import os
from datetime import datetime
from pathlib import Path

import psycopg
from dotenv import load_dotenv

REPO_ROOT = Path(__file__).resolve().parents[1]
load_dotenv(REPO_ROOT / ".env")
OUT = REPO_ROOT / "inventory" / "reports" / "duplicate-check.md"


CHECKS = [
    # (label, sql, description)
    (
        "catalog.cleaning_agent: identische Namen (case-insensitive)",
        """
        select lower(trim(name)) as name_key, count(*) as n, array_agg(id order by id) as ids
        from catalog.cleaning_agent
        group by lower(trim(name))
        having count(*) > 1
        order by count(*) desc, name_key
        """,
        "Mehrere cleaning_agent-Zeilen mit identischem Artikelnamen — vermutlich Migrations-Duplikate aus Access.",
    ),
    (
        "catalog.manufacturer: identische Namen (case-insensitive)",
        """
        select lower(trim(name)) as name_key, count(*) as n, array_agg(id order by id) as ids
        from catalog.manufacturer
        group by lower(trim(name))
        having count(*) > 1
        order by count(*) desc, name_key
        """,
        "Hersteller doppelt — Stammdaten-Hygiene.",
    ),
    (
        "catalog.manufacturer: Tipp-Varianten (ähnliche Namen)",
        """
        -- Strikteres Trigram-Verfahren statt simpler "alle Sonderzeichen weg"-
        -- Normalisierung. Wir vergleichen den signifikanten Wortstamm
        -- (alphanumerisch, ohne Rechtsformen, mind. 6 Zeichen).
        with normalized as (
          select id, name,
                 -- Rechtsformen + Punktuation weg, alphanumerisch + Umlaute behalten
                 lower(regexp_replace(
                   regexp_replace(name, '\\m(gmbh|kg|ag|ohg|co|bv|sa|inc|ltd|llc|chemie|werk|fabrik)\\M', ' ', 'gi'),
                   '[^a-zäöüß0-9]+', '', 'g'
                 )) as norm
          from catalog.manufacturer
        )
        select norm, array_agg(name order by id) as variants, array_agg(id) as ids
        from normalized
        where length(norm) >= 6
        group by norm
        having count(*) > 1
        """,
        "Hersteller die sich nur in Whitespace/Case/Punktuation/Rechtsform unterscheiden.",
    ),
    (
        "core.customer: identische Namen pro business_unit",
        """
        select business_unit_id, lower(trim(name)) as name_key,
               count(*) as n, array_agg(customer_number order by customer_number) as numbers
        from core.customer
        group by business_unit_id, lower(trim(name))
        having count(*) > 1
        order by n desc
        """,
        "Kunden mit identischem Namen innerhalb eines Mandanten.",
    ),
    (
        "core.customer: identische Namen über Mandanten hinweg",
        """
        select lower(trim(name)) as name_key,
               array_agg(business_unit_id || ':' || customer_number order by customer_number) as keys
        from core.customer
        group by lower(trim(name))
        having count(*) > 1
          and count(distinct business_unit_id) > 1
        """,
        "Derselbe Kunde unter Nr X in H_UND_I und Nr Y in SERVICES — Konsolidierungs-Kandidaten.",
    ),
    (
        "ops.department: identische Namen pro Kunde",
        """
        select customer_id, lower(trim(name)) as name_key,
               count(*) as n, array_agg(department_number order by department_number) as numbers
        from ops.department
        group by customer_id, lower(trim(name))
        having count(*) > 1
        order by n desc
        limit 20
        """,
        "Abteilungen mit identischem Namen innerhalb eines Kunden.",
    ),
    (
        "ops.department_object: identische Namen pro Abteilung",
        """
        select department_id, lower(trim(name)) as name_key,
               count(*) as n, array_agg(object_number order by id) as obj_nums
        from ops.department_object
        group by department_id, lower(trim(name))
        having count(*) > 1
        order by n desc
        limit 20
        """,
        "Objekte mit identischem Namen innerhalb einer Abteilung.",
    ),
    (
        "ops.hygiene_control_plan: identische Snapshots",
        """
        select customer_id, control_type::text, department_id, object_number_snapshot,
               interval_label, responsible_party::text,
               count(*) as n, array_agg(id order by id) as ids
        from ops.hygiene_control_plan
        group by customer_id, control_type, department_id, object_number_snapshot,
                 interval_label, responsible_party
        having count(*) > 1
        order by n desc
        limit 20
        """,
        "Hygienekontroll-Plan-Zeilen mit identischem Tupel (Kunde, Typ, Abteilung, Objekt, Intervall, Verantwortlicher).",
    ),
    (
        "ops.inspection_task: identische Cell-Position innerhalb eines Sheets",
        """
        select cleaning_sheet_id, hygiene_control_plan_id, scheduled_date,
               count(*) as n, array_agg(id) as ids
        from ops.inspection_task
        where cleaning_sheet_id is not null
        group by cleaning_sheet_id, hygiene_control_plan_id, scheduled_date
        having count(*) > 1
        """,
        "Doppelte Zellen in der Sheet-Matrix — wäre ein Generator-Bug.",
    ),
    (
        "ops.inspection_task: identische Position innerhalb einer Tour",
        """
        select tour_id, hygiene_control_plan_id, scheduled_date,
               count(*) as n, array_agg(id) as ids
        from ops.inspection_task
        where tour_id is not null
        group by tour_id, hygiene_control_plan_id, scheduled_date
        having count(*) > 1
        """,
        "Doppelte Inspection-Tasks innerhalb derselben Tour.",
    ),
    (
        "catalog.hygiene_plan_step: identische step_number pro Plan",
        """
        select hygiene_plan_id, step_number, count(*) as n, array_agg(id) as ids
        from catalog.hygiene_plan_step
        group by hygiene_plan_id, step_number
        having count(*) > 1
        """,
        "Identische step_number innerhalb eines Hygieneplans — verstößt gegen Reihenfolge.",
    ),
    (
        "catalog.cleaning_agent_hazard_substance: identische Komponenten pro Reinigungsmittel",
        """
        select cleaning_agent_id, lower(trim(substance_name)) as substance_key,
               count(*) as n, array_agg(position) as positions
        from catalog.cleaning_agent_hazard_substance
        group by cleaning_agent_id, lower(trim(substance_name))
        having count(*) > 1
        """,
        "Derselbe Gefahrstoff mehrfach pro Reinigungsmittel.",
    ),
    (
        "ops.customer_hazard_substance: gleicher Name pro Kunde",
        """
        select customer_id, lower(trim(name)) as name_key,
               count(*) as n, array_agg(id) as ids
        from ops.customer_hazard_substance
        group by customer_id, lower(trim(name))
        having count(*) > 1
        """,
        "Identische Gefahrstoff-Einträge innerhalb des Kunden-Verzeichnisses.",
    ),
    (
        "core.public_holiday: gleicher Name + Datum",
        """
        select holiday_date, lower(trim(name)) as name_key,
               count(*) as n, array_agg(id) as ids
        from core.public_holiday
        group by holiday_date, lower(trim(name))
        having count(*) > 1
        """,
        "Doppelte Feiertage.",
    ),
    (
        "core.public_holiday_federal_state: doppelte (Feiertag, BL)",
        """
        select public_holiday_id, federal_state_id, count(*) as n
        from core.public_holiday_federal_state
        group by public_holiday_id, federal_state_id
        having count(*) > 1
        """,
        "Junction-Duplikate (sollte durch PK verhindert sein).",
    ),
]


def main() -> int:
    out_lines = [
        "# Duplikat-Check",
        "",
        f"**Zeitstempel:** {datetime.now().isoformat(timespec='seconds')}",
        "",
        "Suche nach Duplikaten, die NICHT durch UNIQUE-Constraints abgefangen werden — "
        "also potentielle Migrations-Altlasten oder Datenqualitätsprobleme. "
        "Constraint-geprüfte Felder (legacy_id-Eindeutigkeit etc.) stehen hier nicht drin.",
        "",
    ]

    total_findings = 0

    with psycopg.connect(os.environ["DATABASE_URL"]) as conn:
        for label, sql, desc in CHECKS:
            with conn.cursor() as cur:
                cur.execute(sql)
                rows = cur.fetchall()
                cols = [c.name for c in cur.description] if cur.description else []
            count = len(rows)
            total_findings += count
            print(f"  {'✓' if count == 0 else '⚠'} {label}: {count}")
            out_lines.append(f"## {label}")
            out_lines.append("")
            out_lines.append(f"_{desc}_")
            out_lines.append("")
            if count == 0:
                out_lines.append("✅ Keine Duplikate.")
            else:
                out_lines.append(f"⚠ **{count} Duplikat-Cluster gefunden:**")
                out_lines.append("")
                out_lines.append("| " + " | ".join(cols) + " |")
                out_lines.append("|" + "|".join(["---"] * len(cols)) + "|")
                for r in rows[:15]:
                    formatted = []
                    for v in r:
                        if v is None:
                            formatted.append("—")
                        elif isinstance(v, list):
                            formatted.append(", ".join(str(x) for x in v[:5]) + ("…" if len(v) > 5 else ""))
                        else:
                            s = str(v)
                            formatted.append(s[:80] + "…" if len(s) > 80 else s)
                    out_lines.append("| " + " | ".join(formatted) + " |")
                if count > 15:
                    out_lines.append(f"| … _+{count - 15} weitere Cluster_ | | |")
            out_lines.append("")

    out_lines.insert(4, f"**Befundsumme:** {total_findings} Cluster über {len(CHECKS)} Checks.")
    out_lines.insert(5, "")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text("\n".join(out_lines), encoding="utf-8")
    print()
    print(f"→ {OUT.relative_to(REPO_ROOT)}")
    return 0 if total_findings == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())

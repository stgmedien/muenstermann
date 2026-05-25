# Duplikat-Check

**Zeitstempel:** 2026-05-25T13:18:38

**Befundsumme:** 53 Cluster über 15 Checks.

Suche nach Duplikaten, die NICHT durch UNIQUE-Constraints abgefangen werden — also potentielle Migrations-Altlasten oder Datenqualitätsprobleme. Constraint-geprüfte Felder (legacy_id-Eindeutigkeit etc.) stehen hier nicht drin.

## catalog.cleaning_agent: identische Namen (case-insensitive)

_Mehrere cleaning_agent-Zeilen mit identischem Artikelnamen — vermutlich Migrations-Duplikate aus Access._

✅ Keine Duplikate.

## catalog.manufacturer: identische Namen (case-insensitive)

_Hersteller doppelt — Stammdaten-Hygiene._

✅ Keine Duplikate.

## catalog.manufacturer: Tipp-Varianten (ähnliche Namen)

_Hersteller die sich nur in Whitespace/Case/Punktuation/Rechtsform unterscheiden._

✅ Keine Duplikate.

## core.customer: identische Namen pro business_unit

_Kunden mit identischem Namen innerhalb eines Mandanten._

⚠ **7 Duplikat-Cluster gefunden:**

| business_unit_id | name_key | n | numbers |
|---|---|---|---|
| 1 | apetito ag | 2 | 271, 273 |
| 1 | düpmann gmbh & co. kg | 2 | 180, 182 |
| 1 | frostkrone | 2 | 500, 530 |
| 1 | großekathöfer convenience food | 2 | 210, 211 |
| 1 | mchef gmbh & co. kg | 2 | 185, 510 |
| 1 | verwaltung | 2 | 90, 999 |
| 1 | wulff convenience gmbh | 2 | 480, 485 |

## core.customer: identische Namen über Mandanten hinweg

_Derselbe Kunde unter Nr X in H_UND_I und Nr Y in SERVICES — Konsolidierungs-Kandidaten._

⚠ **2 Duplikat-Cluster gefunden:**

| name_key | keys |
|---|---|
| ausgeschieden | 1:0, 2:0 |
| verwaltung | 1:90, 1:999, 2:999 |

## ops.department: identische Namen pro Kunde

_Abteilungen mit identischem Namen innerhalb eines Kunden._

⚠ **8 Duplikat-Cluster gefunden:**

| customer_id | name_key | n | numbers |
|---|---|---|---|
| 88 | gang | 9 | 240, 530, 600, 1310, 1320… |
| 88 | hygieneschleuse | 6 | 396, 680, 690, 710, 720… |
| 88 | kühlhaus | 5 | 320, 430, 580, 590, 610 |
| 88 | vorraum | 4 | 90, 210, 220, 650 |
| 88 | kühlraum | 3 | 70, 80, 540 |
| 88 | wcs damen & herren | 2 | 1080, 1100 |
| 88 | rgm-raum | 2 | 1200, 1220 |
| 88 | damen- & herrenumkleide weiß | 2 | 970, 1000 |

## ops.department_object: identische Namen pro Abteilung

_Objekte mit identischem Namen innerhalb einer Abteilung._

⚠ **16 Duplikat-Cluster gefunden:**

| department_id | name_key | n | obj_nums |
|---|---|---|---|
| 24 | inkl. fächer, schneidbretter, untergestell | 2 | 220, 240 |
| 27 | podeste | 2 | 090, 270 |
| 34 | bizerba waage inkl. etikettierer | 2 | 080, 140 |
| 96 | bodenfläche, gullys, ablaufrinnen soweit frei | 2 | 010, 020 |
| 98 | bodenfläche, gullys, ablaufrinnen soweit frei | 2 | 020, 010 |
| 102 | bodenfläche, gullys, ablaufrinnen soweit frei | 2 | 010, 020 |
| 103 | bodenfläche, gullys, ablaufrinnen soweit frei | 2 | 020, 010 |
| 104 | bodenfläche, gullys, ablaufrinnen soweit frei | 2 | 020, 010 |
| 105 | bodenfläche, gullys, ablaufrinnen soweit frei | 2 | 010, 020 |
| 109 | bodenfläche, gullys, ablaufrinnen soweit frei | 2 | 020, 010 |
| 127 | bodenfläche, gullys, ablaufrinnen soweit frei | 2 | 010, 015 |
| 128 | bodenfläche, gullys, ablaufrinnen soweit frei | 2 | 010, 020 |
| 129 | bodenfläche, gullys, ablaufrinnen soweit frei | 2 | 010, 020 |
| 135 | bodenfläche, gullys, ablaufrinnen soweit frei | 2 | 010, 015 |
| 166 | handtuchhalter | 2 | 100, 130 |
| … _+1 weitere Cluster_ | | |

## ops.hygiene_control_plan: identische Snapshots

_Hygienekontroll-Plan-Zeilen mit identischem Tupel (Kunde, Typ, Abteilung, Objekt, Intervall, Verantwortlicher)._

⚠ **20 Duplikat-Cluster gefunden:**

| customer_id | control_type | department_id | object_number_snapshot | interval_label | responsible_party | n | ids |
|---|---|---|---|---|---|---|---|
| 10 | STANDARD | — | — | wöchentlich | MUENSTERMANN | 23 | 49, 50, 51, 52, 53… |
| 88 | STANDARD | 105 | — | wöchentlich | MUENSTERMANN | 18 | 1571, 1572, 1574, 1575, 1576… |
| 88 | STANDARD | 109 | — | wöchentlich | MUENSTERMANN | 16 | 1588, 1591, 1592, 1593, 1594… |
| 10 | SPECIAL_15 | — | 020 | wöchentlich | MUENSTERMANN | 15 | 803, 855, 860, 862, 864… |
| 88 | STANDARD | 96 | — | wöchentlich | MUENSTERMANN | 14 | 1521, 1523, 1524, 1526, 1527… |
| 88 | STANDARD | 102 | — | wöchentlich | MUENSTERMANN | 14 | 1544, 1546, 1547, 1548, 1549… |
| 10 | SPECIAL_15 | — | 010 | täglich | MUENSTERMANN | 13 | 796, 799, 801, 854, 859… |
| 10 | SPECIAL_15 | — | 030 | täglich | MUENSTERMANN | 13 | 798, 856, 871, 874, 883… |
| 10 | STANDARD | — | 010 | 10 | MUENSTERMANN | 13 | 485, 493, 500, 503, 505… |
| 10 | STANDARD | — | 030 | 10 | MUENSTERMANN | 13 | 487, 495, 502, 507, 511… |
| 10 | STANDARD | — | 040 | 10 | MUENSTERMANN | 12 | 488, 496, 508, 512, 516… |
| 10 | SPECIAL_15 | — | 040 | täglich | MUENSTERMANN | 12 | 857, 868, 875, 884, 886… |
| 88 | STANDARD | 103 | — | wöchentlich | MUENSTERMANN | 12 | 1554, 1555, 1557, 1558, 1559… |
| 88 | STANDARD | 138 | — | 2 x wöchentlich | MUENSTERMANN | 12 | 1706, 1708, 1709, 1710, 1711… |
| 88 | STANDARD | 127 | — | wöchentlich | MUENSTERMANN | 10 | 1653, 1654, 1657, 1658, 1659… |
| … _+5 weitere Cluster_ | | |

## ops.inspection_task: identische Cell-Position innerhalb eines Sheets

_Doppelte Zellen in der Sheet-Matrix — wäre ein Generator-Bug._

✅ Keine Duplikate.

## ops.inspection_task: identische Position innerhalb einer Tour

_Doppelte Inspection-Tasks innerhalb derselben Tour._

✅ Keine Duplikate.

## catalog.hygiene_plan_step: identische step_number pro Plan

_Identische step_number innerhalb eines Hygieneplans — verstößt gegen Reihenfolge._

✅ Keine Duplikate.

## catalog.cleaning_agent_hazard_substance: identische Komponenten pro Reinigungsmittel

_Derselbe Gefahrstoff mehrfach pro Reinigungsmittel._

✅ Keine Duplikate.

## ops.customer_hazard_substance: gleicher Name pro Kunde

_Identische Gefahrstoff-Einträge innerhalb des Kunden-Verzeichnisses._

✅ Keine Duplikate.

## core.public_holiday: gleicher Name + Datum

_Doppelte Feiertage._

✅ Keine Duplikate.

## core.public_holiday_federal_state: doppelte (Feiertag, BL)

_Junction-Duplikate (sollte durch PK verhindert sein)._

✅ Keine Duplikate.

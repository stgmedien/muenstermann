# Inventar: Kalender 2026

**Quelle:** `/Users/jonathankreutzheide/Downloads/Probedaten Datenbank Muenstermann  Test/Kalender 2026.accdb`
**Treiber:** UCanAccess driver for Microsoft Access databases using HSQLDB V2010 [VERSION_14]
**Tabellen gesamt:** 27
**Linked Tables:** 0

## Tabellen-Übersicht

| Tabelle | Zeilen | Spalten | PK | Indizes | FKs |
|---|---:|---:|---|---:|---:|
| `Feiertage` | 20 | 23 | Datum | 1 | 0 |
| `Initialisierung` | 1 | 4 | — | 0 | 0 |
| `Kalender` | 365 | 9 | Datum | 3 | 0 |
| `Kalender Könecke` | 12 | 35 | — | 1 | 0 |
| `KalenderBB` | 12 | 35 | — | 1 | 0 |
| `KalenderBE` | 12 | 35 | — | 1 | 0 |
| `KalenderBW` | 12 | 35 | — | 1 | 0 |
| `KalenderBY` | 12 | 35 | — | 1 | 0 |
| `KalenderHB` | 12 | 35 | — | 1 | 0 |
| `KalenderHE` | 12 | 35 | — | 1 | 0 |
| `KalenderHH` | 12 | 35 | — | 1 | 0 |
| `KalenderMV` | 12 | 35 | — | 1 | 0 |
| `KalenderNI` | 12 | 35 | — | 1 | 0 |
| `KalenderNL` | 12 | 35 | — | 1 | 0 |
| `KalenderNW` | 12 | 35 | — | 1 | 0 |
| `KalenderRP` | 12 | 35 | — | 1 | 0 |
| `KalenderSH` | 12 | 35 | — | 1 | 0 |
| `KalenderSL` | 12 | 35 | — | 1 | 0 |
| `KalenderSN` | 12 | 35 | — | 1 | 0 |
| `KalenderST` | 12 | 35 | — | 1 | 0 |
| `KalenderTH` | 12 | 35 | — | 1 | 0 |
| `KalenderWochen` | 53 | 17 | — | 0 | 0 |
| `Monatsnamen` | 12 | 2 | tblMNameMonat | 1 | 0 |
| `Temp_KalenderHoch` | 365 | 9 | Datum | 3 | 0 |
| `Temp_KalenderQuer` | 12 | 35 | — | 1 | 0 |
| `Wartungsplan` | 11 | 9 | — | 0 | 0 |
| `tbl_Bundesländer` | 17 | 4 | ID | 1 | 0 |

## Auffälligkeiten

- `Feiertage.Bundesländer` ist ein **Memo-Feld** (16 MB max) — 10 Nulls von 20, max_len=134
- `Initialisierung` hat **keinen Primary Key** (1 Zeilen)
- `Kalender.KW Zahl` hat **nur 1 Distinct-Wert** über 365 Zeilen — tote Spalte?
- `Kalender.Region` ist **vollständig NULL** (365 Zeilen)
- `Kalender.Jahr` hat **nur 1 Distinct-Wert** über 365 Zeilen — tote Spalte?
- `Kalender.MonatText` ist **vollständig NULL** (365 Zeilen)
- `Kalender Könecke` hat **keinen Primary Key** (12 Zeilen)
- `KalenderBB` hat **keinen Primary Key** (12 Zeilen)
- `KalenderBE` hat **keinen Primary Key** (12 Zeilen)
- `KalenderBW` hat **keinen Primary Key** (12 Zeilen)
- `KalenderBY` hat **keinen Primary Key** (12 Zeilen)
- `KalenderHB` hat **keinen Primary Key** (12 Zeilen)
- `KalenderHE` hat **keinen Primary Key** (12 Zeilen)
- `KalenderHH` hat **keinen Primary Key** (12 Zeilen)
- `KalenderMV` hat **keinen Primary Key** (12 Zeilen)
- `KalenderNI` hat **keinen Primary Key** (12 Zeilen)
- `KalenderNL` hat **keinen Primary Key** (12 Zeilen)
- `KalenderNW` hat **keinen Primary Key** (12 Zeilen)
- `KalenderRP` hat **keinen Primary Key** (12 Zeilen)
- `KalenderSH` hat **keinen Primary Key** (12 Zeilen)
- `KalenderSL` hat **keinen Primary Key** (12 Zeilen)
- `KalenderSN` hat **keinen Primary Key** (12 Zeilen)
- `KalenderST` hat **keinen Primary Key** (12 Zeilen)
- `KalenderTH` hat **keinen Primary Key** (12 Zeilen)
- `KalenderWochen` hat **keinen Primary Key** (53 Zeilen)
- `KalenderWochen.Jahr` hat **nur 1 Distinct-Wert** über 53 Zeilen — tote Spalte?
- `KalenderWochen.T1` ist **vollständig NULL** (53 Zeilen)
- `KalenderWochen.T2` ist **vollständig NULL** (53 Zeilen)
- `KalenderWochen.T3` ist **vollständig NULL** (53 Zeilen)
- `KalenderWochen.T4` ist **vollständig NULL** (53 Zeilen)
- `KalenderWochen.T5` ist **vollständig NULL** (53 Zeilen)
- `KalenderWochen.T6` ist **vollständig NULL** (53 Zeilen)
- `KalenderWochen.T7` ist **vollständig NULL** (53 Zeilen)
- `Temp_KalenderHoch.KW Zahl` hat **nur 1 Distinct-Wert** über 365 Zeilen — tote Spalte?
- `Temp_KalenderHoch.Region` ist **vollständig NULL** (365 Zeilen)
- `Temp_KalenderHoch.Jahr` hat **nur 1 Distinct-Wert** über 365 Zeilen — tote Spalte?
- `Temp_KalenderHoch.MonatText` ist **vollständig NULL** (365 Zeilen)
- `Temp_KalenderQuer` hat **keinen Primary Key** (12 Zeilen)
- `Wartungsplan` hat **keinen Primary Key** (11 Zeilen)

## Driver-Warnungen / Logs (gefiltert)

```
WARNING:Error in the metadata of the table Kalender Könecke: table's row count in the metadata is 24 but 12 records have been found and loaded by UCanAccess. All will work fine, but it's better to repair your database.
WARNING:Error in the metadata of the table Temp_KalenderQuer: table's row count in the metadata is 156 but 12 records have been found and loaded by UCanAccess. All will work fine, but it's better to repair your database.
WARNING:Error in the metadata of the table Kalender Könecke: table's row count in the metadata is 24 but 12 records have been found and loaded by UCanAccess. All will work fine, but it's better to repair your database.
WARNING:Error in the metadata of the table Temp_KalenderQuer: table's row count in the metadata is 156 but 12 records have been found and loaded by UCanAccess. All will work fine, but it's better to repair your database.
### profile (rc=0)
WARNING:Error in the metadata of the table Kalender Könecke: table's row count in the metadata is 24 but 12 records have been found and loaded by UCanAccess. All will work fine, but it's better to repair your database.
WARNING:Error in the metadata of the table Temp_KalenderQuer: table's row count in the metadata is 156 but 12 records have been found and loaded by UCanAccess. All will work fine, but it's better to repair your database.
```

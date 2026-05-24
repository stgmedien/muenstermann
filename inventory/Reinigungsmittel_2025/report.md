# Inventar: Reinigungsmittel_2025

**Quelle:** `/Users/jonathankreutzheide/Downloads/Probedaten Datenbank Muenstermann  Test/Reinigungsmittel_2025.accdb`
**Treiber:** UCanAccess driver for Microsoft Access databases using HSQLDB V2010 [VERSION_14]
**Tabellen gesamt:** 9
**Linked Tables:** 0

## Tabellen-Übersicht

| Tabelle | Zeilen | Spalten | PK | Indizes | FKs |
|---|---:|---:|---|---:|---:|
| `tblGIZ` | 9 | 5 | GizID | 1 | 0 |
| `tblGefHhinweise_H-Sätze` | 58 | 3 | — | 0 | 0 |
| `tblGefHinweis_Kategorien` | 3 | 2 | GefHinw_KatNr | 1 | 0 |
| `tblGefHinweis_Stand` | 1 | 5 | ID | 1 | 0 |
| `tblRGM_Hersteller` | 15 | 9 | HerstellerID | 2 | 0 |
| `tblSymboleGefahren` | 10 | 3 | ID | 2 | 0 |
| `tblSymbolePSA` | 6 | 3 | ID | 1 | 0 |
| `tbl_RGM_Eigenschaften_2025` | 292 | 93 | ID | 3 | 0 |
| `tbl_TRGS 510` | 25 | 26 | LGK | 1 | 0 |

## Auffälligkeiten

- `tblGefHhinweise_H-Sätze` hat **keinen Primary Key** (58 Zeilen)
- `tbl_RGM_Eigenschaften_2025.Kurz Info` ist ein **Memo-Feld** (16 MB max)
- `tbl_RGM_Eigenschaften_2025.Anleitung Messung` ist ein **Memo-Feld** (16 MB max)

## Driver-Warnungen / Logs (gefiltert)

```
WARNING:Error in the metadata of the table tbl_RGM_Eigenschaften_2025: table's row count in the metadata is 293 but 292 records have been found and loaded by UCanAccess. All will work fine, but it's better to repair your database.
WARNING:Error in the metadata of the table tbl_RGM_Eigenschaften_2025: table's row count in the metadata is 293 but 292 records have been found and loaded by UCanAccess. All will work fine, but it's better to repair your database.
```

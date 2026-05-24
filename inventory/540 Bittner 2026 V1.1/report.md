# Inventar: 540 Bittner 2026 V1.1

**Quelle:** `/Users/jonathankreutzheide/Downloads/Probedaten Datenbank Muenstermann  Test/540 Bittner 2026 V1.1.accdb`
**Treiber:** UCanAccess driver for Microsoft Access databases using HSQLDB V2007 [VERSION_12]
**Tabellen gesamt:** 16
**Linked Tables:** 9

## Linked Tables

| Lokaler Name | Verlinkte DB | Tabelle dort |
|---|---|---|
| `Gefährdungsfaktoren` | `C:\OneDrive - Münstermann H. & I. GmbH & Co. KG\Personal\Personal KG\Adressen - Anschriften.accdb` | `Gefährdungsfaktoren` |
| `Hygienepläne` | `C:\OneDrive - Münstermann H. & I. GmbH & Co. KG\Kunden\Reinigungspläne.accdb` | `003 Hygienepläne` |
| `Hygienepläne Arbeitsschritte` | `C:\OneDrive - Münstermann H. & I. GmbH & Co. KG\Kunden\Reinigungspläne.accdb` | `003 Hygienepläne Arbeitsschritte` |
| `Kalender` | `C:\OneDrive - Münstermann H. & I. GmbH & Co. KG\Büro\Kalender\Kalender 2026.accdb` | `KalenderNW` |
| `KalenderWochen` | `C:\OneDrive - Münstermann H. & I. GmbH & Co. KG\Büro\Kalender\Kalender 2026.accdb` | `KalenderWochen` |
| `Kunden` | `C:\OneDrive - Münstermann H. & I. GmbH & Co. KG\Personal\Personal KG\Adressen - Anschriften.accdb` | `Kunden` |
| `tblSymboleGefahren` | `C:\OneDrive - Münstermann H. & I. GmbH & Co. KG\Büro\Reinigungsmittel\Reinigungsmittel_2025.accdb` | `tblSymboleGefahren` |
| `tblSymbolePSA` | `C:\OneDrive - Münstermann H. & I. GmbH & Co. KG\Büro\Reinigungsmittel\Reinigungsmittel_2025.accdb` | `tblSymbolePSA` |
| `tbl_RGM_Eigenschaften_2025` | `C:\OneDrive - Münstermann H. & I. GmbH & Co. KG\Büro\Reinigungsmittel\Reinigungsmittel_2025.accdb` | `tbl_RGM_Eigenschaften_2025` |

## Tabellen-Übersicht

| Tabelle | Zeilen | Spalten | PK | Indizes | FKs |
|---|---:|---:|---|---:|---:|
| `001 Abteilungen` | 30 | 34 | Abteilungs-Nr | 3 | 0 |
| `002 Abt-Objekte` | 162 | 36 | — | 9 | 0 |
| `003 Hygienepläne` | 4 | 37 | PlanNr | 2 | 0 |
| `003 Hygienepläne Arbeitsschritte` | 25 | 8 | — | 1 | 0 |
| `010 Arbeitsanweisungen alles` | 165 | 10 | — | 2 | 0 |
| `011 Arbeitsanweisungen Abteilungen` | 0 | 8 | — | 1 | 0 |
| `021 Gefahrstoffverzeichnis` | 9 | 5 | — | 2 | 0 |
| `022 Hygienekontrollen` | 236 | 11 | — | 3 | 0 |
| `022 Hygienekontrollen Spezial 15` | 162 | 15 | — | 4 | 0 |
| `050 Kontrollintervalle` | 17 | 5 | ID | 1 | 0 |
| `100 Firmendaten` | 1 | 10 | Kunden-Code | 3 | 0 |
| `101 Maschinenpark` | 0 | 7 | Maschinennummer | 1 | 0 |
| `Hilfe` | 12 | 1 | ID | 1 | 0 |
| `Version` | 1 | 5 | ID | 1 | 0 |
| `tmpBerichte` | 15 | 3 | BerichtName | 2 | 0 |
| `tmpGefStoffe` | 9 | 3 | GefStoffID | 2 | 0 |

## Auffälligkeiten

- `001 Abteilungen.Hygienekontrolle täglich` ist ein **Memo-Feld** (16 MB max)
- `002 Abt-Objekte` hat **keinen Primary Key** (162 Zeilen)
- `002 Abt-Objekte.Besonderheiten` ist ein **Memo-Feld** (16 MB max)
- `003 Hygienepläne.M1` ist ein **Memo-Feld** (16 MB max)
- `003 Hygienepläne.M2` ist ein **Memo-Feld** (16 MB max)
- `003 Hygienepläne.M3` ist ein **Memo-Feld** (16 MB max)
- `003 Hygienepläne.M4` ist ein **Memo-Feld** (16 MB max)
- `003 Hygienepläne.M5` ist ein **Memo-Feld** (16 MB max)
- `003 Hygienepläne.M6` ist ein **Memo-Feld** (16 MB max)
- `003 Hygienepläne.M7` ist ein **Memo-Feld** (16 MB max)
- `003 Hygienepläne.M8` ist ein **Memo-Feld** (16 MB max)
- `003 Hygienepläne.M9` ist ein **Memo-Feld** (16 MB max)
- `003 Hygienepläne.Hinweise zur Anpassung` ist ein **Memo-Feld** (16 MB max)
- `003 Hygienepläne Arbeitsschritte` hat **keinen Primary Key** (25 Zeilen)
- `003 Hygienepläne Arbeitsschritte.Aufgaben` ist ein **Memo-Feld** (16 MB max)
- `003 Hygienepläne Arbeitsschritte.Verfahren` ist ein **Memo-Feld** (16 MB max)
- `003 Hygienepläne Arbeitsschritte.Geräte` ist ein **Memo-Feld** (16 MB max)
- `003 Hygienepläne Arbeitsschritte.Hinweise` ist ein **Memo-Feld** (16 MB max)
- `003 Hygienepläne Arbeitsschritte.Hinweise zur Anpassung` ist ein **Memo-Feld** (16 MB max)
- `010 Arbeitsanweisungen alles` hat **keinen Primary Key** (165 Zeilen)
- `011 Arbeitsanweisungen Abteilungen` hat **keinen Primary Key** (0 Zeilen)
- `021 Gefahrstoffverzeichnis` hat **keinen Primary Key** (9 Zeilen)
- `022 Hygienekontrollen` hat **keinen Primary Key** (236 Zeilen)
- `022 Hygienekontrollen.Hygienekontrollen` ist ein **Memo-Feld** (16 MB max)
- `022 Hygienekontrollen Spezial 15` hat **keinen Primary Key** (162 Zeilen)
- `101 Maschinenpark.Memo` ist ein **Memo-Feld** (16 MB max)

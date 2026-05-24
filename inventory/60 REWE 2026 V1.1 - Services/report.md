# Inventar: 60 REWE 2026 V1.1 - Services

**Quelle:** `/Users/jonathankreutzheide/Downloads/Probedaten Datenbank Muenstermann  Test/60 REWE 2026 V1.1 - Services.accdb`
**Treiber:** UCanAccess driver for Microsoft Access databases using HSQLDB V2007 [VERSION_12]
**Tabellen gesamt:** 22
**Linked Tables:** 8

## Linked Tables

| Lokaler Name | Verlinkte DB | Tabelle dort |
|---|---|---|
| `003 Hygienepläne Arbeitsschritte1` | `C:\OneDrive - Münstermann H. & I. GmbH & Co. KG\Kunden\Reinigungspläne.accdb` | `003 Hygienepläne Arbeitsschritte` |
| `003 Hygienepläne1` | `C:\OneDrive - Münstermann H. & I. GmbH & Co. KG\Kunden\Reinigungspläne.accdb` | `003 Hygienepläne` |
| `Kalender` | `C:\OneDrive - Münstermann H. & I. GmbH & Co. KG\Büro\Kalender\Kalender 2026.accdb` | `KalenderNW` |
| `KalenderWochen` | `C:\OneDrive - Münstermann H. & I. GmbH & Co. KG\Büro\Kalender\Kalender 2026.accdb` | `KalenderWochen` |
| `Kunden` | `C:\OneDrive - Münstermann H. & I. GmbH & Co. KG\Personal\Personal KG\Adressen - Anschriften.accdb` | `Kunden` |
| `tblSymboleGefahren` | `C:\OneDrive - Münstermann H. & I. GmbH & Co. KG\Büro\Reinigungsmittel\Reinigungsmittel_2025.accdb` | `tblSymboleGefahren` |
| `tblSymbolePSA` | `C:\OneDrive - Münstermann H. & I. GmbH & Co. KG\Büro\Reinigungsmittel\Reinigungsmittel_2025.accdb` | `tblSymbolePSA` |
| `tbl_RGM_Eigenschaften_2025` | `C:\OneDrive - Münstermann H. & I. GmbH & Co. KG\Büro\Reinigungsmittel\Reinigungsmittel_2025.accdb` | `tbl_RGM_Eigenschaften_2025` |

## Tabellen-Übersicht

| Tabelle | Zeilen | Spalten | PK | Indizes | FKs |
|---|---:|---:|---|---:|---:|
| `001 Abteilungen` | 124 | 34 | Abteilungs-Nr | 3 | 0 |
| `002 Abt-Objekte` | 869 | 60 | — | 10 | 0 |
| `003 Hygienepläne` | 14 | 37 | PlanNr | 2 | 0 |
| `003 Hygienepläne Arbeitsschritte` | 87 | 8 | — | 1 | 0 |
| `003a HP Arbeitsschritte` | 83 | 8 | — | 1 | 0 |
| `003a HP Arbeitsschritte V01` | 96 | 16 | — | 1 | 0 |
| `010 Arbeitsanweisungen alles` | 1062 | 10 | — | 2 | 0 |
| `021 GefahrstofflisteLWM` | 13 | 1 | — | 1 | 0 |
| `021 Gefahrstoffverzeichnis` | 22 | 6 | — | 2 | 0 |
| `022 Hygienekontrollen` | 1858 | 11 | — | 3 | 0 |
| `022 Hygienekontrollen Spezial 15` | 0 | 19 | — | 4 | 0 |
| `022 Hygienekontrollen Unterhaltsreinigung` | 0 | 17 | — | 4 | 0 |
| `022_1 HK_nachHygPlan` | 388 | 23 | — | 2 | 0 |
| `022_1 tempHK_nachHygPlan` | 1636 | 24 | — | 1 | 0 |
| `050 Kontrollintervalle` | 18 | 5 | ID | 1 | 0 |
| `100 Firmendaten` | 1 | 10 | Kunden-Code | 3 | 0 |
| `101 Maschinenpark` | 0 | 7 | Maschinennummer | 1 | 0 |
| `Hilfe` | 12 | 1 | ID | 1 | 0 |
| `Version` | 1 | 5 | ID | 1 | 0 |
| `Versionnierung` | 1 | 10 | ID | 1 | 0 |
| `tmpBerichte` | 29 | 3 | BerichtName | 2 | 0 |
| `tmpGefStoffe` | 21 | 3 | GefStoffID | 2 | 0 |

## Auffälligkeiten

- `001 Abteilungen.Hygienekontrolle täglich` ist ein **Memo-Feld** (16 MB max)
- `002 Abt-Objekte` hat **keinen Primary Key** (869 Zeilen)
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
- `003 Hygienepläne Arbeitsschritte` hat **keinen Primary Key** (87 Zeilen)
- `003 Hygienepläne Arbeitsschritte.Aufgaben` ist ein **Memo-Feld** (16 MB max)
- `003 Hygienepläne Arbeitsschritte.Verfahren` ist ein **Memo-Feld** (16 MB max)
- `003 Hygienepläne Arbeitsschritte.Geräte` ist ein **Memo-Feld** (16 MB max)
- `003 Hygienepläne Arbeitsschritte.Hinweise` ist ein **Memo-Feld** (16 MB max)
- `003 Hygienepläne Arbeitsschritte.Hinweise zur Anpassung` ist ein **Memo-Feld** (16 MB max)
- `003a HP Arbeitsschritte` hat **keinen Primary Key** (83 Zeilen)
- `003a HP Arbeitsschritte.Aufgaben` ist ein **Memo-Feld** (16 MB max)
- `003a HP Arbeitsschritte.Verfahren` ist ein **Memo-Feld** (16 MB max)
- `003a HP Arbeitsschritte.Geräte` ist ein **Memo-Feld** (16 MB max)
- `003a HP Arbeitsschritte.Hinweise` ist ein **Memo-Feld** (16 MB max)
- `003a HP Arbeitsschritte.Hinweise zur Anpassung` ist ein **Memo-Feld** (16 MB max)
- `003a HP Arbeitsschritte V01` hat **keinen Primary Key** (96 Zeilen)
- `003a HP Arbeitsschritte V01.Aufgaben` ist ein **Memo-Feld** (16 MB max)
- `003a HP Arbeitsschritte V01.Verfahren1` ist ein **Memo-Feld** (16 MB max)
- `003a HP Arbeitsschritte V01.txtRGM1` ist ein **Memo-Feld** (16 MB max)
- `003a HP Arbeitsschritte V01.txtRGM2` ist ein **Memo-Feld** (16 MB max)
- `003a HP Arbeitsschritte V01.txtRGM3` ist ein **Memo-Feld** (16 MB max)
- `003a HP Arbeitsschritte V01.Geräte` ist ein **Memo-Feld** (16 MB max)
- `003a HP Arbeitsschritte V01.Hinweise` ist ein **Memo-Feld** (16 MB max)
- `003a HP Arbeitsschritte V01.Hinweise zur Anpassung` ist ein **Memo-Feld** (16 MB max)
- `010 Arbeitsanweisungen alles` hat **keinen Primary Key** (1062 Zeilen)
- `021 GefahrstofflisteLWM` hat **keinen Primary Key** (13 Zeilen)
- `021 Gefahrstoffverzeichnis` hat **keinen Primary Key** (22 Zeilen)
- `022 Hygienekontrollen` hat **keinen Primary Key** (1858 Zeilen)
- `022 Hygienekontrollen.Hygienekontrollen` ist ein **Memo-Feld** (16 MB max)
- `022 Hygienekontrollen Spezial 15` hat **keinen Primary Key** (0 Zeilen)
- `022 Hygienekontrollen Unterhaltsreinigung` hat **keinen Primary Key** (0 Zeilen)
- `022_1 HK_nachHygPlan` hat **keinen Primary Key** (388 Zeilen)
- `022_1 HK_nachHygPlan.Objekt` ist ein **Memo-Feld** (16 MB max)
- `022_1 tempHK_nachHygPlan` hat **keinen Primary Key** (1636 Zeilen)
- `101 Maschinenpark.Memo` ist ein **Memo-Feld** (16 MB max)

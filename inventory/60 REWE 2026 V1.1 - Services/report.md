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

- `001 Abteilungen.Hygienekontrolle täglich` ist ein **Memo-Feld** (16 MB max) — 123 Nulls von 124, max_len=26
- `001 Abteilungen.Kostenstelle` ist **vollständig NULL** (124 Zeilen)
- `001 Abteilungen.Kostenträger` ist **vollständig NULL** (124 Zeilen)
- `001 Abteilungen.Filter1` hat **nur 1 Distinct-Wert** über 124 Zeilen — tote Spalte?
- `001 Abteilungen.Filter2` hat **nur 1 Distinct-Wert** über 124 Zeilen — tote Spalte?
- `001 Abteilungen.Filter3` hat **nur 1 Distinct-Wert** über 124 Zeilen — tote Spalte?
- `001 Abteilungen.ABIstSu` hat **nur 1 Distinct-Wert** über 124 Zeilen — tote Spalte?
- `001 Abteilungen.Filter4` hat **nur 1 Distinct-Wert** über 124 Zeilen — tote Spalte?
- `001 Abteilungen.ABSollSu` hat **nur 1 Distinct-Wert** über 124 Zeilen — tote Spalte?
- `001 Abteilungen.Raum-Nr` ist **vollständig NULL** (124 Zeilen)
- `001 Abteilungen.High Risk` hat **nur 1 Distinct-Wert** über 124 Zeilen — tote Spalte?
- `001 Abteilungen.Low Risk` hat **nur 1 Distinct-Wert** über 124 Zeilen — tote Spalte?
- `001 Abteilungen.Hygienekontrolle täglich` ist **99.2% NULL** (123/124)
- `001 Abteilungen.HyTWert` ist **vollständig NULL** (124 Zeilen)
- `001 Abteilungen.Bericht1` ist **vollständig NULL** (124 Zeilen)
- `001 Abteilungen.Bericht2` ist **vollständig NULL** (124 Zeilen)
- `001 Abteilungen.Bericht3` ist **vollständig NULL** (124 Zeilen)
- `001 Abteilungen.Kontroll_intervall` ist **vollständig NULL** (124 Zeilen)
- `001 Abteilungen.Stunden` ist **vollständig NULL** (124 Zeilen)
- `001 Abteilungen.KFaktor` ist **vollständig NULL** (124 Zeilen)
- `001 Abteilungen.täglich` ist **vollständig NULL** (124 Zeilen)
- `001 Abteilungen.wöchentlich` ist **vollständig NULL** (124 Zeilen)
- `001 Abteilungen.monatlich` ist **vollständig NULL** (124 Zeilen)
- `001 Abteilungen.jährlich` ist **vollständig NULL** (124 Zeilen)
- `001 Abteilungen.Zusatz` ist **vollständig NULL** (124 Zeilen)
- `001 Abteilungen.proMonat` ist **vollständig NULL** (124 Zeilen)
- `001 Abteilungen.Maschinennummer` ist **vollständig NULL** (124 Zeilen)
- `001 Abteilungen.Abteilungsleiter` ist **vollständig NULL** (124 Zeilen)
- `002 Abt-Objekte` hat **keinen Primary Key** (869 Zeilen)
- `002 Abt-Objekte.Besonderheiten` ist ein **Memo-Feld** (16 MB max) — 868 Nulls von 869, max_len=31
- `002 Abt-Objekte.Letzte Reinigung` ist **vollständig NULL** (869 Zeilen)
- `002 Abt-Objekte.Status` ist **vollständig NULL** (869 Zeilen)
- `002 Abt-Objekte.Besonderheiten` ist **99.9% NULL** (868/869)
- `002 Abt-Objekte.KontrolleEinzeln` hat **nur 1 Distinct-Wert** über 869 Zeilen — tote Spalte?
- `002 Abt-Objekte.Maschinen Innenreinigung` ist **vollständig NULL** (869 Zeilen)
- `002 Abt-Objekte.nicht im HY` hat **nur 1 Distinct-Wert** über 869 Zeilen — tote Spalte?
- `002 Abt-Objekte.ZusatzText` ist **vollständig NULL** (869 Zeilen)
- `002 Abt-Objekte.Dienstag` ist **98.0% NULL** (852/869)
- `002 Abt-Objekte.DienstagT` ist **98.0% NULL** (852/869)
- `002 Abt-Objekte.Donnerstag` ist **96.9% NULL** (842/869)
- `002 Abt-Objekte.DonnerstagT` ist **96.9% NULL** (842/869)
- `002 Abt-Objekte.Samstag` ist **vollständig NULL** (869 Zeilen)
- `002 Abt-Objekte.SamstagT` ist **vollständig NULL** (869 Zeilen)
- `002 Abt-Objekte.Sonntag` ist **vollständig NULL** (869 Zeilen)
- `002 Abt-Objekte.SonntagT` ist **vollständig NULL** (869 Zeilen)
- `002 Abt-Objekte.Stunden` ist **vollständig NULL** (869 Zeilen)
- `002 Abt-Objekte.täglich` hat **nur 1 Distinct-Wert** über 869 Zeilen — tote Spalte?
- `002 Abt-Objekte.wöchentlich` hat **nur 1 Distinct-Wert** über 869 Zeilen — tote Spalte?
- `002 Abt-Objekte.monatlich` hat **nur 1 Distinct-Wert** über 869 Zeilen — tote Spalte?
- `002 Abt-Objekte.jährlich` hat **nur 1 Distinct-Wert** über 869 Zeilen — tote Spalte?
- `002 Abt-Objekte.Zusatz` hat **nur 1 Distinct-Wert** über 869 Zeilen — tote Spalte?
- `002 Abt-Objekte.proMonat` hat **nur 1 Distinct-Wert** über 869 Zeilen — tote Spalte?
- `002 Abt-Objekte.Bericht1` ist **vollständig NULL** (869 Zeilen)
- `002 Abt-Objekte.Bericht2` ist **vollständig NULL** (869 Zeilen)
- `002 Abt-Objekte.Bericht3` ist **vollständig NULL** (869 Zeilen)
- `002 Abt-Objekte.Maschinennummer` ist **vollständig NULL** (869 Zeilen)
- `002 Abt-Objekte.DurchführungMonat3` ist **98.4% NULL** (855/869)
- `002 Abt-Objekte.DurchführungMonat4` ist **98.8% NULL** (859/869)
- `002 Abt-Objekte.DurchführungKW1` ist **99.8% NULL** (867/869)
- `002 Abt-Objekte.DurchführungKW2` ist **99.8% NULL** (867/869)
- `002 Abt-Objekte.DurchführungKW3` ist **99.8% NULL** (867/869)
- `002 Abt-Objekte.DurchführungKW4` ist **99.8% NULL** (867/869)
- `002 Abt-Objekte.DurchführungKW5` ist **99.8% NULL** (867/869)
- `002 Abt-Objekte.DurchführungKW6` ist **99.8% NULL** (867/869)
- `002 Abt-Objekte.DurchführungKW7` ist **99.8% NULL** (867/869)
- `002 Abt-Objekte.DurchführungKW8` ist **99.8% NULL** (867/869)
- `002 Abt-Objekte.DurchführungKW9` ist **99.8% NULL** (867/869)
- `003 Hygienepläne.M1` ist ein **Memo-Feld** (16 MB max) — 4 Nulls von 14, max_len=167
- `003 Hygienepläne.M2` ist ein **Memo-Feld** (16 MB max) — 14 Nulls von 14, max_len=0
- `003 Hygienepläne.M3` ist ein **Memo-Feld** (16 MB max) — 14 Nulls von 14, max_len=0
- `003 Hygienepläne.M4` ist ein **Memo-Feld** (16 MB max) — 14 Nulls von 14, max_len=0
- `003 Hygienepläne.M5` ist ein **Memo-Feld** (16 MB max) — 14 Nulls von 14, max_len=0
- `003 Hygienepläne.M6` ist ein **Memo-Feld** (16 MB max) — 14 Nulls von 14, max_len=0
- `003 Hygienepläne.M7` ist ein **Memo-Feld** (16 MB max) — 14 Nulls von 14, max_len=0
- `003 Hygienepläne.M8` ist ein **Memo-Feld** (16 MB max) — 14 Nulls von 14, max_len=0
- `003 Hygienepläne.M9` ist ein **Memo-Feld** (16 MB max) — 14 Nulls von 14, max_len=0
- `003 Hygienepläne.Hinweise zur Anpassung` ist ein **Memo-Feld** (16 MB max) — 14 Nulls von 14, max_len=0
- `003 Hygienepläne.M2` ist **vollständig NULL** (14 Zeilen)
- `003 Hygienepläne.M3` ist **vollständig NULL** (14 Zeilen)
- `003 Hygienepläne.M4` ist **vollständig NULL** (14 Zeilen)
- `003 Hygienepläne.M5` ist **vollständig NULL** (14 Zeilen)
- `003 Hygienepläne.M6` ist **vollständig NULL** (14 Zeilen)
- `003 Hygienepläne.M7` ist **vollständig NULL** (14 Zeilen)
- `003 Hygienepläne.M8` ist **vollständig NULL** (14 Zeilen)
- `003 Hygienepläne.M9` ist **vollständig NULL** (14 Zeilen)
- `003 Hygienepläne.Besonderheiten 1` ist **vollständig NULL** (14 Zeilen)
- `003 Hygienepläne.Besonderheiten 2` ist **vollständig NULL** (14 Zeilen)
- `003 Hygienepläne.Besonderheiten 3` ist **vollständig NULL** (14 Zeilen)
- `003 Hygienepläne.Reinigungsmittel` ist **vollständig NULL** (14 Zeilen)
- `003 Hygienepläne.Hinweise zur Anpassung` ist **vollständig NULL** (14 Zeilen)
- `003 Hygienepläne Arbeitsschritte` hat **keinen Primary Key** (87 Zeilen)
- `003 Hygienepläne Arbeitsschritte.Aufgaben` ist ein **Memo-Feld** (16 MB max) — 4 Nulls von 87, max_len=306
- `003 Hygienepläne Arbeitsschritte.Verfahren` ist ein **Memo-Feld** (16 MB max) — 4 Nulls von 87, max_len=478
- `003 Hygienepläne Arbeitsschritte.Geräte` ist ein **Memo-Feld** (16 MB max) — 31 Nulls von 87, max_len=142
- `003 Hygienepläne Arbeitsschritte.Hinweise` ist ein **Memo-Feld** (16 MB max) — 40 Nulls von 87, max_len=101
- `003 Hygienepläne Arbeitsschritte.Hinweise zur Anpassung` ist ein **Memo-Feld** (16 MB max) — 87 Nulls von 87, max_len=0
- `003 Hygienepläne Arbeitsschritte.Hinweise zur Anpassung` ist **vollständig NULL** (87 Zeilen)
- `003a HP Arbeitsschritte` hat **keinen Primary Key** (83 Zeilen)
- `003a HP Arbeitsschritte.Aufgaben` ist ein **Memo-Feld** (16 MB max) — 0 Nulls von 83, max_len=306
- `003a HP Arbeitsschritte.Verfahren` ist ein **Memo-Feld** (16 MB max) — 4 Nulls von 83, max_len=478
- `003a HP Arbeitsschritte.Geräte` ist ein **Memo-Feld** (16 MB max) — 25 Nulls von 83, max_len=81
- `003a HP Arbeitsschritte.Hinweise` ist ein **Memo-Feld** (16 MB max) — 41 Nulls von 83, max_len=101
- `003a HP Arbeitsschritte.Hinweise zur Anpassung` ist ein **Memo-Feld** (16 MB max) — 83 Nulls von 83, max_len=0
- `003a HP Arbeitsschritte.Hinweise zur Anpassung` ist **vollständig NULL** (83 Zeilen)
- `003a HP Arbeitsschritte V01` hat **keinen Primary Key** (96 Zeilen)
- `003a HP Arbeitsschritte V01.Aufgaben` ist ein **Memo-Feld** (16 MB max) — 4 Nulls von 96, max_len=309
- `003a HP Arbeitsschritte V01.Verfahren1` ist ein **Memo-Feld** (16 MB max) — 15 Nulls von 96, max_len=295
- `003a HP Arbeitsschritte V01.txtRGM1` ist ein **Memo-Feld** (16 MB max) — 70 Nulls von 96, max_len=171
- `003a HP Arbeitsschritte V01.txtRGM2` ist ein **Memo-Feld** (16 MB max) — 93 Nulls von 96, max_len=177
- `003a HP Arbeitsschritte V01.txtRGM3` ist ein **Memo-Feld** (16 MB max) — 96 Nulls von 96, max_len=0
- `003a HP Arbeitsschritte V01.Geräte` ist ein **Memo-Feld** (16 MB max) — 38 Nulls von 96, max_len=81
- `003a HP Arbeitsschritte V01.Hinweise` ist ein **Memo-Feld** (16 MB max) — 55 Nulls von 96, max_len=101
- `003a HP Arbeitsschritte V01.Hinweise zur Anpassung` ist ein **Memo-Feld** (16 MB max) — 96 Nulls von 96, max_len=0
- `003a HP Arbeitsschritte V01.Verfahren2` ist **97.9% NULL** (94/96)
- `003a HP Arbeitsschritte V01.txtRGM2` ist **96.9% NULL** (93/96)
- `003a HP Arbeitsschritte V01.Verfahren3` ist **vollständig NULL** (96 Zeilen)
- `003a HP Arbeitsschritte V01.txtRGM3` ist **vollständig NULL** (96 Zeilen)
- `003a HP Arbeitsschritte V01.NrRGM3` hat **nur 1 Distinct-Wert** über 96 Zeilen — tote Spalte?
- `003a HP Arbeitsschritte V01.Hinweise zur Anpassung` ist **vollständig NULL** (96 Zeilen)
- `010 Arbeitsanweisungen alles` hat **keinen Primary Key** (1062 Zeilen)
- `021 GefahrstofflisteLWM` hat **keinen Primary Key** (13 Zeilen)
- `021 Gefahrstoffverzeichnis` hat **keinen Primary Key** (22 Zeilen)
- `021 Gefahrstoffverzeichnis.ArtNr` hat **nur 1 Distinct-Wert** über 22 Zeilen — tote Spalte?
- `021 Gefahrstoffverzeichnis.Menge jährl` ist **vollständig NULL** (22 Zeilen)
- `021 Gefahrstoffverzeichnis.Standort` hat **nur 1 Distinct-Wert** über 22 Zeilen — tote Spalte?
- `022 Hygienekontrollen` hat **keinen Primary Key** (1858 Zeilen)
- `022 Hygienekontrollen.Hygienekontrollen` ist ein **Memo-Feld** (16 MB max) — 0 Nulls von 1858, max_len=62
- `022 Hygienekontrollen.ObID` ist **vollständig NULL** (1858 Zeilen)
- `022 Hygienekontrollen.Anzahl` ist **vollständig NULL** (1858 Zeilen)
- `022 Hygienekontrollen Spezial 15` hat **keinen Primary Key** (0 Zeilen)
- `022 Hygienekontrollen Unterhaltsreinigung` hat **keinen Primary Key** (0 Zeilen)
- `022_1 HK_nachHygPlan` hat **keinen Primary Key** (388 Zeilen)
- `022_1 HK_nachHygPlan.Objekt` ist ein **Memo-Feld** (16 MB max) — 0 Nulls von 388, max_len=371
- `022_1 HK_nachHygPlan.Bereichs-Nr` ist **vollständig NULL** (388 Zeilen)
- `022_1 HK_nachHygPlan.KontrolleEinzeln` hat **nur 1 Distinct-Wert** über 388 Zeilen — tote Spalte?
- `022_1 HK_nachHygPlan.Sa` hat **nur 1 Distinct-Wert** über 388 Zeilen — tote Spalte?
- `022_1 HK_nachHygPlan.So` hat **nur 1 Distinct-Wert** über 388 Zeilen — tote Spalte?
- `022_1 HK_nachHygPlan.uebrige` hat **nur 1 Distinct-Wert** über 388 Zeilen — tote Spalte?
- `022_1 tempHK_nachHygPlan` hat **keinen Primary Key** (1636 Zeilen)
- `022_1 tempHK_nachHygPlan.KontrolleEinzeln` hat **nur 1 Distinct-Wert** über 1636 Zeilen — tote Spalte?
- `022_1 tempHK_nachHygPlan.Di` ist **98.0% NULL** (1604/1636)
- `022_1 tempHK_nachHygPlan.Do` ist **96.7% NULL** (1582/1636)
- `022_1 tempHK_nachHygPlan.Sa` ist **vollständig NULL** (1636 Zeilen)
- `022_1 tempHK_nachHygPlan.So` ist **vollständig NULL** (1636 Zeilen)
- `100 Firmendaten.Anrede` ist **vollständig NULL** (1 Zeilen)
- `101 Maschinenpark.Memo` ist ein **Memo-Feld** (16 MB max)
- `Version.überarbeitet am` ist **vollständig NULL** (1 Zeilen)
- `tmpBerichte.BerichtAuswahl` hat **nur 1 Distinct-Wert** über 29 Zeilen — tote Spalte?
- `tmpBerichte.BerichtOrdnungsnummer` ist **vollständig NULL** (29 Zeilen)
- `tmpGefStoffe.GefStoffAuswahl` hat **nur 1 Distinct-Wert** über 21 Zeilen — tote Spalte?

## Driver-Warnungen / Logs (gefiltert)

```
### profile (rc=0)
```

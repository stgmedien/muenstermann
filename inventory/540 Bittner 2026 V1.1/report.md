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

- `001 Abteilungen.Hygienekontrolle täglich` ist ein **Memo-Feld** (16 MB max) — 29 Nulls von 30, max_len=0
- `001 Abteilungen.Etage` ist **vollständig NULL** (30 Zeilen)
- `001 Abteilungen.BereichNr` ist **vollständig NULL** (30 Zeilen)
- `001 Abteilungen.Bereich` ist **vollständig NULL** (30 Zeilen)
- `001 Abteilungen.Abteilungs-Nr Kunde` ist **vollständig NULL** (30 Zeilen)
- `001 Abteilungen.Kostenstelle` ist **vollständig NULL** (30 Zeilen)
- `001 Abteilungen.Kostenträger` ist **vollständig NULL** (30 Zeilen)
- `001 Abteilungen.Filter1` hat **nur 1 Distinct-Wert** über 30 Zeilen — tote Spalte?
- `001 Abteilungen.Filter2` hat **nur 1 Distinct-Wert** über 30 Zeilen — tote Spalte?
- `001 Abteilungen.Filter3` hat **nur 1 Distinct-Wert** über 30 Zeilen — tote Spalte?
- `001 Abteilungen.ABIstSu` hat **nur 1 Distinct-Wert** über 30 Zeilen — tote Spalte?
- `001 Abteilungen.Filter4` hat **nur 1 Distinct-Wert** über 30 Zeilen — tote Spalte?
- `001 Abteilungen.ABSollSu` hat **nur 1 Distinct-Wert** über 30 Zeilen — tote Spalte?
- `001 Abteilungen.Raum-Nr` ist **vollständig NULL** (30 Zeilen)
- `001 Abteilungen.High Risk` hat **nur 1 Distinct-Wert** über 30 Zeilen — tote Spalte?
- `001 Abteilungen.Low Risk` hat **nur 1 Distinct-Wert** über 30 Zeilen — tote Spalte?
- `001 Abteilungen.Hygienekontrolle täglich` ist **96.7% NULL** (29/30)
- `001 Abteilungen.HyTWert` ist **vollständig NULL** (30 Zeilen)
- `001 Abteilungen.Bericht1` ist **vollständig NULL** (30 Zeilen)
- `001 Abteilungen.Bericht2` ist **vollständig NULL** (30 Zeilen)
- `001 Abteilungen.Bericht3` ist **vollständig NULL** (30 Zeilen)
- `001 Abteilungen.Kontroll_intervall` ist **vollständig NULL** (30 Zeilen)
- `001 Abteilungen.Stunden` ist **vollständig NULL** (30 Zeilen)
- `001 Abteilungen.KFaktor` ist **vollständig NULL** (30 Zeilen)
- `001 Abteilungen.täglich` ist **vollständig NULL** (30 Zeilen)
- `001 Abteilungen.wöchentlich` ist **vollständig NULL** (30 Zeilen)
- `001 Abteilungen.monatlich` ist **vollständig NULL** (30 Zeilen)
- `001 Abteilungen.jährlich` ist **vollständig NULL** (30 Zeilen)
- `001 Abteilungen.Zusatz` ist **vollständig NULL** (30 Zeilen)
- `001 Abteilungen.proMonat` ist **vollständig NULL** (30 Zeilen)
- `001 Abteilungen.Maschinennummer` ist **vollständig NULL** (30 Zeilen)
- `001 Abteilungen.Abteilungsleiter-Nr` ist **vollständig NULL** (30 Zeilen)
- `001 Abteilungen.Abteilungsleiter` ist **vollständig NULL** (30 Zeilen)
- `002 Abt-Objekte` hat **keinen Primary Key** (162 Zeilen)
- `002 Abt-Objekte.Besonderheiten` ist ein **Memo-Feld** (16 MB max) — 162 Nulls von 162, max_len=0
- `002 Abt-Objekte.Letzte Reinigung` ist **vollständig NULL** (162 Zeilen)
- `002 Abt-Objekte.Status` ist **vollständig NULL** (162 Zeilen)
- `002 Abt-Objekte.Besonderheiten` ist **vollständig NULL** (162 Zeilen)
- `002 Abt-Objekte.Kontrollpunkt` hat **nur 1 Distinct-Wert** über 162 Zeilen — tote Spalte?
- `002 Abt-Objekte.Maschinen Innenreinigung` ist **vollständig NULL** (162 Zeilen)
- `002 Abt-Objekte.nicht im HY` hat **nur 1 Distinct-Wert** über 162 Zeilen — tote Spalte?
- `002 Abt-Objekte.ZusatzText` ist **vollständig NULL** (162 Zeilen)
- `002 Abt-Objekte.Dienstag` ist **96.3% NULL** (156/162)
- `002 Abt-Objekte.DienstagT` ist **96.3% NULL** (156/162)
- `002 Abt-Objekte.Mittwoch` ist **99.4% NULL** (161/162)
- `002 Abt-Objekte.MittwochT` ist **99.4% NULL** (161/162)
- `002 Abt-Objekte.Stunden` ist **vollständig NULL** (162 Zeilen)
- `002 Abt-Objekte.täglich` hat **nur 1 Distinct-Wert** über 162 Zeilen — tote Spalte?
- `002 Abt-Objekte.wöchentlich` hat **nur 1 Distinct-Wert** über 162 Zeilen — tote Spalte?
- `002 Abt-Objekte.monatlich` hat **nur 1 Distinct-Wert** über 162 Zeilen — tote Spalte?
- `002 Abt-Objekte.jährlich` hat **nur 1 Distinct-Wert** über 162 Zeilen — tote Spalte?
- `002 Abt-Objekte.Zusatz` hat **nur 1 Distinct-Wert** über 162 Zeilen — tote Spalte?
- `002 Abt-Objekte.proMonat` hat **nur 1 Distinct-Wert** über 162 Zeilen — tote Spalte?
- `002 Abt-Objekte.Bericht1` ist **vollständig NULL** (162 Zeilen)
- `002 Abt-Objekte.Bericht2` ist **vollständig NULL** (162 Zeilen)
- `002 Abt-Objekte.Bericht3` ist **vollständig NULL** (162 Zeilen)
- `002 Abt-Objekte.Maschinennummer` ist **vollständig NULL** (162 Zeilen)
- `003 Hygienepläne.M1` ist ein **Memo-Feld** (16 MB max) — 0 Nulls von 4, max_len=118
- `003 Hygienepläne.M2` ist ein **Memo-Feld** (16 MB max) — 4 Nulls von 4, max_len=0
- `003 Hygienepläne.M3` ist ein **Memo-Feld** (16 MB max) — 4 Nulls von 4, max_len=0
- `003 Hygienepläne.M4` ist ein **Memo-Feld** (16 MB max) — 4 Nulls von 4, max_len=0
- `003 Hygienepläne.M5` ist ein **Memo-Feld** (16 MB max) — 4 Nulls von 4, max_len=0
- `003 Hygienepläne.M6` ist ein **Memo-Feld** (16 MB max) — 4 Nulls von 4, max_len=0
- `003 Hygienepläne.M7` ist ein **Memo-Feld** (16 MB max) — 4 Nulls von 4, max_len=0
- `003 Hygienepläne.M8` ist ein **Memo-Feld** (16 MB max) — 4 Nulls von 4, max_len=0
- `003 Hygienepläne.M9` ist ein **Memo-Feld** (16 MB max) — 4 Nulls von 4, max_len=0
- `003 Hygienepläne.Hinweise zur Anpassung` ist ein **Memo-Feld** (16 MB max) — 4 Nulls von 4, max_len=0
- `003 Hygienepläne.M2` ist **vollständig NULL** (4 Zeilen)
- `003 Hygienepläne.M3` ist **vollständig NULL** (4 Zeilen)
- `003 Hygienepläne.M4` ist **vollständig NULL** (4 Zeilen)
- `003 Hygienepläne.M5` ist **vollständig NULL** (4 Zeilen)
- `003 Hygienepläne.M6` ist **vollständig NULL** (4 Zeilen)
- `003 Hygienepläne.M7` ist **vollständig NULL** (4 Zeilen)
- `003 Hygienepläne.M8` ist **vollständig NULL** (4 Zeilen)
- `003 Hygienepläne.M9` ist **vollständig NULL** (4 Zeilen)
- `003 Hygienepläne.Besonderheiten 1` ist **vollständig NULL** (4 Zeilen)
- `003 Hygienepläne.Besonderheiten 2` ist **vollständig NULL** (4 Zeilen)
- `003 Hygienepläne.Besonderheiten 3` ist **vollständig NULL** (4 Zeilen)
- `003 Hygienepläne.Hinweise zur Anpassung` ist **vollständig NULL** (4 Zeilen)
- `003 Hygienepläne Arbeitsschritte` hat **keinen Primary Key** (25 Zeilen)
- `003 Hygienepläne Arbeitsschritte.Aufgaben` ist ein **Memo-Feld** (16 MB max) — 0 Nulls von 25, max_len=187
- `003 Hygienepläne Arbeitsschritte.Verfahren` ist ein **Memo-Feld** (16 MB max) — 0 Nulls von 25, max_len=439
- `003 Hygienepläne Arbeitsschritte.Geräte` ist ein **Memo-Feld** (16 MB max) — 8 Nulls von 25, max_len=81
- `003 Hygienepläne Arbeitsschritte.Hinweise` ist ein **Memo-Feld** (16 MB max) — 9 Nulls von 25, max_len=87
- `003 Hygienepläne Arbeitsschritte.Hinweise zur Anpassung` ist ein **Memo-Feld** (16 MB max) — 25 Nulls von 25, max_len=0
- `003 Hygienepläne Arbeitsschritte.Hinweise zur Anpassung` ist **vollständig NULL** (25 Zeilen)
- `010 Arbeitsanweisungen alles` hat **keinen Primary Key** (165 Zeilen)
- `010 Arbeitsanweisungen alles.Etage` ist **vollständig NULL** (165 Zeilen)
- `010 Arbeitsanweisungen alles.BereichNr` ist **vollständig NULL** (165 Zeilen)
- `010 Arbeitsanweisungen alles.Bereich` ist **vollständig NULL** (165 Zeilen)
- `010 Arbeitsanweisungen alles.Abteilungs-Nr Kunde` ist **vollständig NULL** (165 Zeilen)
- `011 Arbeitsanweisungen Abteilungen` hat **keinen Primary Key** (0 Zeilen)
- `021 Gefahrstoffverzeichnis` hat **keinen Primary Key** (9 Zeilen)
- `021 Gefahrstoffverzeichnis.Menge jährl` ist **vollständig NULL** (9 Zeilen)
- `021 Gefahrstoffverzeichnis.Standort` ist **vollständig NULL** (9 Zeilen)
- `022 Hygienekontrollen` hat **keinen Primary Key** (236 Zeilen)
- `022 Hygienekontrollen.Hygienekontrollen` ist ein **Memo-Feld** (16 MB max) — 0 Nulls von 236, max_len=45
- `022 Hygienekontrollen.Anzahl` ist **vollständig NULL** (236 Zeilen)
- `022 Hygienekontrollen.ObID` ist **vollständig NULL** (236 Zeilen)
- `022 Hygienekontrollen.BereichNr` ist **vollständig NULL** (236 Zeilen)
- `022 Hygienekontrollen.Bereich` ist **vollständig NULL** (236 Zeilen)
- `022 Hygienekontrollen Spezial 15` hat **keinen Primary Key** (162 Zeilen)
- `022 Hygienekontrollen Spezial 15.Objekt Filter` ist **vollständig NULL** (162 Zeilen)
- `022 Hygienekontrollen Spezial 15.Seitennummer` ist **vollständig NULL** (162 Zeilen)
- `022 Hygienekontrollen Spezial 15.Bereichs-Nr` ist **vollständig NULL** (162 Zeilen)
- `022 Hygienekontrollen Spezial 15.Bereich` ist **vollständig NULL** (162 Zeilen)
- `022 Hygienekontrollen Spezial 15.Abteilungs-Nr Kunde` ist **vollständig NULL** (162 Zeilen)
- `022 Hygienekontrollen Spezial 15.Abteilungsleiter-Nr` ist **vollständig NULL** (162 Zeilen)
- `100 Firmendaten.Anrede` ist **vollständig NULL** (1 Zeilen)
- `101 Maschinenpark.Memo` ist ein **Memo-Feld** (16 MB max)
- `tmpBerichte.BerichtOrdnungsnummer` ist **vollständig NULL** (15 Zeilen)

## Driver-Warnungen / Logs (gefiltert)

```
### profile (rc=0)
```

# Inventar: 100 Borgmeier 2026 V1.12

**Quelle:** `/Users/jonathankreutzheide/Downloads/Probedaten Datenbank Muenstermann  Test/100 Borgmeier 2026 V1.12.accdb`
**Treiber:** UCanAccess driver for Microsoft Access databases using HSQLDB V2007 [VERSION_12]
**Tabellen gesamt:** 16
**Linked Tables:** 8

## Linked Tables

| Lokaler Name | Verlinkte DB | Tabelle dort |
|---|---|---|
| `Gefährdungsfaktoren` | `C:\OneDrive - Münstermann H. & I. GmbH & Co. KG\Personal\Personal KG\Adressen - Anschriften.accdb` | `Gefährdungsfaktoren` |
| `Hygienepläne` | `C:\OneDrive - Münstermann H. & I. GmbH & Co. KG\Kunden\Reinigungspläne.accdb` | `003 Hygienepläne` |
| `Hygienepläne Arbeitsschritte` | `C:\OneDrive - Münstermann H. & I. GmbH & Co. KG\Kunden\Reinigungspläne.accdb` | `003 Hygienepläne Arbeitsschritte` |
| `Kalender` | `C:\OneDrive - Münstermann H. & I. GmbH & Co. KG\Büro\Kalender\Kalender 2026.accdb` | `KalenderNW` |
| `Kunden` | `C:\OneDrive - Münstermann H. & I. GmbH & Co. KG\Personal\Personal KG\Adressen - Anschriften.accdb` | `Kunden` |
| `tblSymboleGefahren` | `C:\OneDrive - Münstermann H. & I. GmbH & Co. KG\Büro\Reinigungsmittel\Reinigungsmittel_2025.accdb` | `tblSymboleGefahren` |
| `tblSymbolePSA` | `C:\OneDrive - Münstermann H. & I. GmbH & Co. KG\Büro\Reinigungsmittel\Reinigungsmittel_2025.accdb` | `tblSymbolePSA` |
| `tbl_RGM_Eigenschaften_2025` | `C:\OneDrive - Münstermann H. & I. GmbH & Co. KG\Büro\Reinigungsmittel\Reinigungsmittel_2025.accdb` | `tbl_RGM_Eigenschaften_2025` |

## Tabellen-Übersicht

| Tabelle | Zeilen | Spalten | PK | Indizes | FKs |
|---|---:|---:|---|---:|---:|
| `001 Abteilungen` | 37 | 34 | Abteilungs-Nr | 3 | 0 |
| `002 Abt-Objekte` | 390 | 36 | — | 9 | 0 |
| `003 Hygienepläne` | 10 | 37 | PlanNr | 2 | 0 |
| `003 Hygienepläne Arbeitsschritte` | 71 | 8 | — | 1 | 0 |
| `010 Arbeitsanweisungen alles` | 468 | 10 | — | 2 | 0 |
| `011 Arbeitsanweisungen Abteilungen` | 0 | 8 | — | 1 | 0 |
| `021 Gefahrstoffverzeichnis` | 21 | 6 | — | 2 | 0 |
| `022 Hygienekontrollen` | 570 | 11 | — | 3 | 0 |
| `022 Hygienekontrollen Spezial 15` | 476 | 15 | — | 4 | 0 |
| `050 Kontrollintervalle` | 18 | 5 | ID | 1 | 0 |
| `100 Firmendaten` | 1 | 11 | Kunden-Code | 3 | 0 |
| `101 Maschinenpark` | 0 | 7 | Maschinennummer | 1 | 0 |
| `Hilfe` | 12 | 1 | ID | 1 | 0 |
| `Version` | 1 | 5 | ID | 1 | 0 |
| `tmpBerichte` | 14 | 3 | BerichtName | 2 | 0 |
| `tmpGefStoffe` | 15 | 3 | GefStoffID | 2 | 0 |

## Auffälligkeiten

- `001 Abteilungen.Hygienekontrolle täglich` ist ein **Memo-Feld** (16 MB max) — 37 Nulls von 37, max_len=0
- `001 Abteilungen.Etage` ist **vollständig NULL** (37 Zeilen)
- `001 Abteilungen.BereichNr` ist **vollständig NULL** (37 Zeilen)
- `001 Abteilungen.Bereich` ist **vollständig NULL** (37 Zeilen)
- `001 Abteilungen.Abteilungs-Nr Kunde` ist **vollständig NULL** (37 Zeilen)
- `001 Abteilungen.Kostenstelle` ist **vollständig NULL** (37 Zeilen)
- `001 Abteilungen.Kostenträger` ist **vollständig NULL** (37 Zeilen)
- `001 Abteilungen.Filter1` hat **nur 1 Distinct-Wert** über 37 Zeilen — tote Spalte?
- `001 Abteilungen.Filter2` hat **nur 1 Distinct-Wert** über 37 Zeilen — tote Spalte?
- `001 Abteilungen.Filter3` hat **nur 1 Distinct-Wert** über 37 Zeilen — tote Spalte?
- `001 Abteilungen.ABIstSu` hat **nur 1 Distinct-Wert** über 37 Zeilen — tote Spalte?
- `001 Abteilungen.Filter4` hat **nur 1 Distinct-Wert** über 37 Zeilen — tote Spalte?
- `001 Abteilungen.ABSollSu` hat **nur 1 Distinct-Wert** über 37 Zeilen — tote Spalte?
- `001 Abteilungen.Raum-Nr` ist **vollständig NULL** (37 Zeilen)
- `001 Abteilungen.High Risk` hat **nur 1 Distinct-Wert** über 37 Zeilen — tote Spalte?
- `001 Abteilungen.Low Risk` hat **nur 1 Distinct-Wert** über 37 Zeilen — tote Spalte?
- `001 Abteilungen.Hygienekontrolle täglich` ist **vollständig NULL** (37 Zeilen)
- `001 Abteilungen.HyTWert` ist **vollständig NULL** (37 Zeilen)
- `001 Abteilungen.Bericht1` ist **vollständig NULL** (37 Zeilen)
- `001 Abteilungen.Bericht2` ist **vollständig NULL** (37 Zeilen)
- `001 Abteilungen.Bericht3` ist **vollständig NULL** (37 Zeilen)
- `001 Abteilungen.Kontroll_intervall` ist **vollständig NULL** (37 Zeilen)
- `001 Abteilungen.Stunden` ist **vollständig NULL** (37 Zeilen)
- `001 Abteilungen.KFaktor` ist **vollständig NULL** (37 Zeilen)
- `001 Abteilungen.täglich` ist **vollständig NULL** (37 Zeilen)
- `001 Abteilungen.wöchentlich` ist **vollständig NULL** (37 Zeilen)
- `001 Abteilungen.monatlich` ist **vollständig NULL** (37 Zeilen)
- `001 Abteilungen.jährlich` ist **vollständig NULL** (37 Zeilen)
- `001 Abteilungen.Zusatz` ist **vollständig NULL** (37 Zeilen)
- `001 Abteilungen.proMonat` ist **vollständig NULL** (37 Zeilen)
- `001 Abteilungen.Maschinennummer` ist **vollständig NULL** (37 Zeilen)
- `001 Abteilungen.Abteilungsleiter-Nr` ist **vollständig NULL** (37 Zeilen)
- `001 Abteilungen.Abteilungsleiter` ist **vollständig NULL** (37 Zeilen)
- `002 Abt-Objekte` hat **keinen Primary Key** (390 Zeilen)
- `002 Abt-Objekte.Besonderheiten` ist ein **Memo-Feld** (16 MB max) — 390 Nulls von 390, max_len=0
- `002 Abt-Objekte.Letzte Reinigung` ist **vollständig NULL** (390 Zeilen)
- `002 Abt-Objekte.Status` ist **99.5% NULL** (388/390)
- `002 Abt-Objekte.Besonderheiten` ist **vollständig NULL** (390 Zeilen)
- `002 Abt-Objekte.Kontrollpunkt` hat **nur 1 Distinct-Wert** über 390 Zeilen — tote Spalte?
- `002 Abt-Objekte.Maschinen Innenreinigung` ist **vollständig NULL** (390 Zeilen)
- `002 Abt-Objekte.nicht im HY` hat **nur 1 Distinct-Wert** über 390 Zeilen — tote Spalte?
- `002 Abt-Objekte.ZusatzText` ist **vollständig NULL** (390 Zeilen)
- `002 Abt-Objekte.Dienstag` ist **96.4% NULL** (376/390)
- `002 Abt-Objekte.DienstagT` ist **96.4% NULL** (376/390)
- `002 Abt-Objekte.Mittwoch` ist **vollständig NULL** (390 Zeilen)
- `002 Abt-Objekte.MittwochT` ist **vollständig NULL** (390 Zeilen)
- `002 Abt-Objekte.Stunden` ist **vollständig NULL** (390 Zeilen)
- `002 Abt-Objekte.täglich` hat **nur 1 Distinct-Wert** über 390 Zeilen — tote Spalte?
- `002 Abt-Objekte.wöchentlich` hat **nur 1 Distinct-Wert** über 390 Zeilen — tote Spalte?
- `002 Abt-Objekte.monatlich` hat **nur 1 Distinct-Wert** über 390 Zeilen — tote Spalte?
- `002 Abt-Objekte.jährlich` hat **nur 1 Distinct-Wert** über 390 Zeilen — tote Spalte?
- `002 Abt-Objekte.Zusatz` hat **nur 1 Distinct-Wert** über 390 Zeilen — tote Spalte?
- `002 Abt-Objekte.proMonat` hat **nur 1 Distinct-Wert** über 390 Zeilen — tote Spalte?
- `002 Abt-Objekte.Bericht1` ist **vollständig NULL** (390 Zeilen)
- `002 Abt-Objekte.Bericht2` ist **vollständig NULL** (390 Zeilen)
- `002 Abt-Objekte.Bericht3` ist **vollständig NULL** (390 Zeilen)
- `002 Abt-Objekte.Maschinennummer` ist **vollständig NULL** (390 Zeilen)
- `003 Hygienepläne.M1` ist ein **Memo-Feld** (16 MB max) — 0 Nulls von 10, max_len=160
- `003 Hygienepläne.M2` ist ein **Memo-Feld** (16 MB max) — 9 Nulls von 10, max_len=204
- `003 Hygienepläne.M3` ist ein **Memo-Feld** (16 MB max) — 9 Nulls von 10, max_len=151
- `003 Hygienepläne.M4` ist ein **Memo-Feld** (16 MB max) — 9 Nulls von 10, max_len=284
- `003 Hygienepläne.M5` ist ein **Memo-Feld** (16 MB max) — 9 Nulls von 10, max_len=175
- `003 Hygienepläne.M6` ist ein **Memo-Feld** (16 MB max) — 10 Nulls von 10, max_len=0
- `003 Hygienepläne.M7` ist ein **Memo-Feld** (16 MB max) — 9 Nulls von 10, max_len=263
- `003 Hygienepläne.M8` ist ein **Memo-Feld** (16 MB max) — 9 Nulls von 10, max_len=196
- `003 Hygienepläne.M9` ist ein **Memo-Feld** (16 MB max) — 10 Nulls von 10, max_len=0
- `003 Hygienepläne.Hinweise zur Anpassung` ist ein **Memo-Feld** (16 MB max) — 10 Nulls von 10, max_len=0
- `003 Hygienepläne.M6` ist **vollständig NULL** (10 Zeilen)
- `003 Hygienepläne.M9` ist **vollständig NULL** (10 Zeilen)
- `003 Hygienepläne.Besonderheiten 2` ist **vollständig NULL** (10 Zeilen)
- `003 Hygienepläne.Besonderheiten 3` ist **vollständig NULL** (10 Zeilen)
- `003 Hygienepläne.Reinigungsmittel` ist **vollständig NULL** (10 Zeilen)
- `003 Hygienepläne.Hinweise zur Anpassung` ist **vollständig NULL** (10 Zeilen)
- `003 Hygienepläne Arbeitsschritte` hat **keinen Primary Key** (71 Zeilen)
- `003 Hygienepläne Arbeitsschritte.Aufgaben` ist ein **Memo-Feld** (16 MB max) — 0 Nulls von 71, max_len=177
- `003 Hygienepläne Arbeitsschritte.Verfahren` ist ein **Memo-Feld** (16 MB max) — 3 Nulls von 71, max_len=567
- `003 Hygienepläne Arbeitsschritte.Geräte` ist ein **Memo-Feld** (16 MB max) — 17 Nulls von 71, max_len=81
- `003 Hygienepläne Arbeitsschritte.Hinweise` ist ein **Memo-Feld** (16 MB max) — 20 Nulls von 71, max_len=138
- `003 Hygienepläne Arbeitsschritte.Hinweise zur Anpassung` ist ein **Memo-Feld** (16 MB max) — 71 Nulls von 71, max_len=0
- `003 Hygienepläne Arbeitsschritte.Hinweise zur Anpassung` ist **vollständig NULL** (71 Zeilen)
- `010 Arbeitsanweisungen alles` hat **keinen Primary Key** (468 Zeilen)
- `010 Arbeitsanweisungen alles.Etage` ist **vollständig NULL** (468 Zeilen)
- `010 Arbeitsanweisungen alles.BereichNr` ist **vollständig NULL** (468 Zeilen)
- `010 Arbeitsanweisungen alles.Bereich` ist **vollständig NULL** (468 Zeilen)
- `010 Arbeitsanweisungen alles.Abteilungs-Nr Kunde` ist **vollständig NULL** (468 Zeilen)
- `011 Arbeitsanweisungen Abteilungen` hat **keinen Primary Key** (0 Zeilen)
- `021 Gefahrstoffverzeichnis` hat **keinen Primary Key** (21 Zeilen)
- `021 Gefahrstoffverzeichnis.Pfadtext` ist ein **Memo-Feld** (16 MB max) — 16 Nulls von 21, max_len=0
- `021 Gefahrstoffverzeichnis.ArtNr` hat **nur 1 Distinct-Wert** über 21 Zeilen — tote Spalte?
- `022 Hygienekontrollen` hat **keinen Primary Key** (570 Zeilen)
- `022 Hygienekontrollen.Hygienekontrollen` ist ein **Memo-Feld** (16 MB max) — 0 Nulls von 570, max_len=46
- `022 Hygienekontrollen.Anzahl` ist **vollständig NULL** (570 Zeilen)
- `022 Hygienekontrollen.ObID` ist **vollständig NULL** (570 Zeilen)
- `022 Hygienekontrollen.BereichNr` ist **vollständig NULL** (570 Zeilen)
- `022 Hygienekontrollen.Bereich` ist **vollständig NULL** (570 Zeilen)
- `022 Hygienekontrollen Spezial 15` hat **keinen Primary Key** (476 Zeilen)
- `022 Hygienekontrollen Spezial 15.Objekt Filter` ist **vollständig NULL** (476 Zeilen)
- `022 Hygienekontrollen Spezial 15.Seitennummer` ist **vollständig NULL** (476 Zeilen)
- `022 Hygienekontrollen Spezial 15.Bereichs-Nr` ist **vollständig NULL** (476 Zeilen)
- `022 Hygienekontrollen Spezial 15.Bereich` ist **vollständig NULL** (476 Zeilen)
- `022 Hygienekontrollen Spezial 15.Abteilungs-Nr Kunde` ist **vollständig NULL** (476 Zeilen)
- `022 Hygienekontrollen Spezial 15.Abteilungsleiter-Nr` ist **vollständig NULL** (476 Zeilen)
- `101 Maschinenpark.Memo` ist ein **Memo-Feld** (16 MB max)
- `Version.überarbeitet am` ist **vollständig NULL** (1 Zeilen)
- `tmpBerichte.BerichtOrdnungsnummer` ist **vollständig NULL** (14 Zeilen)

## Driver-Warnungen / Logs (gefiltert)

```
### profile (rc=0)
```

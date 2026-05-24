# Inventar: Musterdatenbank 2026

**Quelle:** `/Users/jonathankreutzheide/Downloads/Probedaten Datenbank Muenstermann  Test/Musterdatenbank 2026.accdb`
**Treiber:** UCanAccess driver for Microsoft Access databases using HSQLDB V2007 [VERSION_12]
**Tabellen gesamt:** 18
**Linked Tables:** 8

## Linked Tables

| Lokaler Name | Verlinkte DB | Tabelle dort |
|---|---|---|
| `003 Hygienepläne Arbeitsschritte1` | `C:\OneDrive - Münstermann H. & I. GmbH\Kunden\Reinigungspläne.accdb` | `003 Hygienepläne Arbeitsschritte` |
| `003 Hygienepläne1` | `C:\OneDrive - Münstermann H. & I. GmbH\Kunden\Reinigungspläne.accdb` | `003 Hygienepläne` |
| `Kalender` | `C:\OneDrive - Münstermann H. & I. GmbH\Büro\Kalender\Kalender 2026.accdb` | `KalenderNW` |
| `KalenderWochen` | `C:\OneDrive - Münstermann H. & I. GmbH\Büro\Kalender\Kalender 2026.accdb` | `KalenderWochen` |
| `Kunden` | `C:\OneDrive - Münstermann H. & I. GmbH\Personal\Personal KG\Adressen - Anschriften.accdb` | `Kunden` |
| `tblSymboleGefahren` | `C:\OneDrive - Münstermann H. & I. GmbH\Büro\Reinigungsmittel\Reinigungsmittel_2025.accdb` | `tblSymboleGefahren` |
| `tblSymbolePSA` | `C:\OneDrive - Münstermann H. & I. GmbH\Büro\Reinigungsmittel\Reinigungsmittel_2025.accdb` | `tblSymbolePSA` |
| `tbl_RGM_Eigenschaften_2025` | `C:\OneDrive - Münstermann H. & I. GmbH\Büro\Reinigungsmittel\Reinigungsmittel_2025.accdb` | `tbl_RGM_Eigenschaften_2025` |

## Tabellen-Übersicht

| Tabelle | Zeilen | Spalten | PK | Indizes | FKs |
|---|---:|---:|---|---:|---:|
| `001 Abteilungen` | 27 | 34 | Abteilungs-Nr | 3 | 0 |
| `002 Abt-Objekte` | 217 | 36 | — | 9 | 0 |
| `003 Hygienepläne` | 9 | 37 | PlanNr | 2 | 0 |
| `003 Hygienepläne Arbeitsschritte` | 63 | 8 | — | 1 | 0 |
| `010 Arbeitsanweisungen alles` | 462 | 10 | — | 2 | 0 |
| `011 Arbeitsanweisungen Abteilungen` | 0 | 8 | — | 1 | 0 |
| `021 GefahrstofflisteLWM` | 16 | 1 | — | 1 | 0 |
| `021 Gefahrstoffverzeichnis` | 21 | 5 | — | 2 | 0 |
| `022 Hygienekontrollen` | 242 | 11 | — | 3 | 0 |
| `022 Hygienekontrollen Spezial 15` | 217 | 15 | — | 4 | 0 |
| `050 Kontrollintervalle` | 18 | 5 | ID | 1 | 0 |
| `100 Firmendaten` | 1 | 10 | Kunden-Code | 3 | 0 |
| `101 Maschinenpark` | 0 | 7 | Maschinennummer | 1 | 0 |
| `Hilfe` | 12 | 1 | ID | 1 | 0 |
| `Version` | 1 | 5 | ID | 1 | 0 |
| `Wartungsplan` | 11 | 9 | — | 0 | 0 |
| `tmpBerichte` | 26 | 3 | BerichtName | 2 | 0 |
| `tmpGefStoffe` | 19 | 3 | GefStoffID | 2 | 0 |

## Auffälligkeiten

- `001 Abteilungen.Hygienekontrolle täglich` ist ein **Memo-Feld** (16 MB max) — 27 Nulls von 27, max_len=0
- `001 Abteilungen.Etage` ist **vollständig NULL** (27 Zeilen)
- `001 Abteilungen.BereichNr` ist **vollständig NULL** (27 Zeilen)
- `001 Abteilungen.Bereich` ist **vollständig NULL** (27 Zeilen)
- `001 Abteilungen.Abteilungs-Nr Kunde` ist **vollständig NULL** (27 Zeilen)
- `001 Abteilungen.Kostenstelle` ist **vollständig NULL** (27 Zeilen)
- `001 Abteilungen.Kostenträger` ist **vollständig NULL** (27 Zeilen)
- `001 Abteilungen.Filter1` hat **nur 1 Distinct-Wert** über 27 Zeilen — tote Spalte?
- `001 Abteilungen.Filter2` hat **nur 1 Distinct-Wert** über 27 Zeilen — tote Spalte?
- `001 Abteilungen.Filter3` hat **nur 1 Distinct-Wert** über 27 Zeilen — tote Spalte?
- `001 Abteilungen.ABIstSu` hat **nur 1 Distinct-Wert** über 27 Zeilen — tote Spalte?
- `001 Abteilungen.Filter4` hat **nur 1 Distinct-Wert** über 27 Zeilen — tote Spalte?
- `001 Abteilungen.ABSollSu` hat **nur 1 Distinct-Wert** über 27 Zeilen — tote Spalte?
- `001 Abteilungen.Raum-Nr` ist **vollständig NULL** (27 Zeilen)
- `001 Abteilungen.High Risk` hat **nur 1 Distinct-Wert** über 27 Zeilen — tote Spalte?
- `001 Abteilungen.Low Risk` hat **nur 1 Distinct-Wert** über 27 Zeilen — tote Spalte?
- `001 Abteilungen.Hygienekontrolle täglich` ist **vollständig NULL** (27 Zeilen)
- `001 Abteilungen.HyTWert` ist **vollständig NULL** (27 Zeilen)
- `001 Abteilungen.Bericht1` ist **vollständig NULL** (27 Zeilen)
- `001 Abteilungen.Bericht2` ist **vollständig NULL** (27 Zeilen)
- `001 Abteilungen.Bericht3` ist **vollständig NULL** (27 Zeilen)
- `001 Abteilungen.Kontroll_intervall` ist **vollständig NULL** (27 Zeilen)
- `001 Abteilungen.Stunden` ist **vollständig NULL** (27 Zeilen)
- `001 Abteilungen.KFaktor` ist **vollständig NULL** (27 Zeilen)
- `001 Abteilungen.täglich` ist **vollständig NULL** (27 Zeilen)
- `001 Abteilungen.wöchentlich` ist **vollständig NULL** (27 Zeilen)
- `001 Abteilungen.monatlich` ist **vollständig NULL** (27 Zeilen)
- `001 Abteilungen.jährlich` ist **vollständig NULL** (27 Zeilen)
- `001 Abteilungen.Zusatz` ist **vollständig NULL** (27 Zeilen)
- `001 Abteilungen.proMonat` ist **vollständig NULL** (27 Zeilen)
- `001 Abteilungen.Maschinennummer` ist **vollständig NULL** (27 Zeilen)
- `001 Abteilungen.Abteilungsleiter-Nr` ist **vollständig NULL** (27 Zeilen)
- `001 Abteilungen.Abteilungsleiter` ist **vollständig NULL** (27 Zeilen)
- `002 Abt-Objekte` hat **keinen Primary Key** (217 Zeilen)
- `002 Abt-Objekte.Besonderheiten` ist ein **Memo-Feld** (16 MB max) — 217 Nulls von 217, max_len=0
- `002 Abt-Objekte.Letzte Reinigung` ist **vollständig NULL** (217 Zeilen)
- `002 Abt-Objekte.Status` ist **vollständig NULL** (217 Zeilen)
- `002 Abt-Objekte.Besonderheiten` ist **vollständig NULL** (217 Zeilen)
- `002 Abt-Objekte.Kontrollpunkt` hat **nur 1 Distinct-Wert** über 217 Zeilen — tote Spalte?
- `002 Abt-Objekte.Maschinen Innenreinigung` ist **vollständig NULL** (217 Zeilen)
- `002 Abt-Objekte.AusführungReinigung` hat **nur 1 Distinct-Wert** über 217 Zeilen — tote Spalte?
- `002 Abt-Objekte.nicht im HY` hat **nur 1 Distinct-Wert** über 217 Zeilen — tote Spalte?
- `002 Abt-Objekte.ZusatzText` ist **vollständig NULL** (217 Zeilen)
- `002 Abt-Objekte.Mittwoch` ist **vollständig NULL** (217 Zeilen)
- `002 Abt-Objekte.MittwochT` ist **vollständig NULL** (217 Zeilen)
- `002 Abt-Objekte.Stunden` ist **vollständig NULL** (217 Zeilen)
- `002 Abt-Objekte.täglich` hat **nur 1 Distinct-Wert** über 217 Zeilen — tote Spalte?
- `002 Abt-Objekte.wöchentlich` hat **nur 1 Distinct-Wert** über 217 Zeilen — tote Spalte?
- `002 Abt-Objekte.monatlich` hat **nur 1 Distinct-Wert** über 217 Zeilen — tote Spalte?
- `002 Abt-Objekte.jährlich` hat **nur 1 Distinct-Wert** über 217 Zeilen — tote Spalte?
- `002 Abt-Objekte.Zusatz` hat **nur 1 Distinct-Wert** über 217 Zeilen — tote Spalte?
- `002 Abt-Objekte.proMonat` hat **nur 1 Distinct-Wert** über 217 Zeilen — tote Spalte?
- `002 Abt-Objekte.Bericht1` ist **vollständig NULL** (217 Zeilen)
- `002 Abt-Objekte.Bericht2` ist **vollständig NULL** (217 Zeilen)
- `002 Abt-Objekte.Bericht3` ist **vollständig NULL** (217 Zeilen)
- `002 Abt-Objekte.Maschinennummer` ist **vollständig NULL** (217 Zeilen)
- `003 Hygienepläne.M1` ist ein **Memo-Feld** (16 MB max) — 5 Nulls von 9, max_len=125
- `003 Hygienepläne.M2` ist ein **Memo-Feld** (16 MB max) — 8 Nulls von 9, max_len=8
- `003 Hygienepläne.M3` ist ein **Memo-Feld** (16 MB max) — 8 Nulls von 9, max_len=9
- `003 Hygienepläne.M4` ist ein **Memo-Feld** (16 MB max) — 8 Nulls von 9, max_len=24
- `003 Hygienepläne.M5` ist ein **Memo-Feld** (16 MB max) — 8 Nulls von 9, max_len=7
- `003 Hygienepläne.M6` ist ein **Memo-Feld** (16 MB max) — 8 Nulls von 9, max_len=9
- `003 Hygienepläne.M7` ist ein **Memo-Feld** (16 MB max) — 8 Nulls von 9, max_len=10
- `003 Hygienepläne.M8` ist ein **Memo-Feld** (16 MB max) — 8 Nulls von 9, max_len=8
- `003 Hygienepläne.M9` ist ein **Memo-Feld** (16 MB max) — 8 Nulls von 9, max_len=3
- `003 Hygienepläne.Hinweise zur Anpassung` ist ein **Memo-Feld** (16 MB max) — 9 Nulls von 9, max_len=0
- `003 Hygienepläne.Besonderheiten 2` ist **vollständig NULL** (9 Zeilen)
- `003 Hygienepläne.Hinweise zur Anpassung` ist **vollständig NULL** (9 Zeilen)
- `003 Hygienepläne Arbeitsschritte` hat **keinen Primary Key** (63 Zeilen)
- `003 Hygienepläne Arbeitsschritte.Aufgaben` ist ein **Memo-Feld** (16 MB max) — 0 Nulls von 63, max_len=305
- `003 Hygienepläne Arbeitsschritte.Verfahren` ist ein **Memo-Feld** (16 MB max) — 5 Nulls von 63, max_len=429
- `003 Hygienepläne Arbeitsschritte.Geräte` ist ein **Memo-Feld** (16 MB max) — 20 Nulls von 63, max_len=81
- `003 Hygienepläne Arbeitsschritte.Hinweise` ist ein **Memo-Feld** (16 MB max) — 27 Nulls von 63, max_len=100
- `003 Hygienepläne Arbeitsschritte.Hinweise zur Anpassung` ist ein **Memo-Feld** (16 MB max) — 63 Nulls von 63, max_len=0
- `003 Hygienepläne Arbeitsschritte.Hinweise zur Anpassung` ist **vollständig NULL** (63 Zeilen)
- `010 Arbeitsanweisungen alles` hat **keinen Primary Key** (462 Zeilen)
- `010 Arbeitsanweisungen alles.Etage` ist **vollständig NULL** (462 Zeilen)
- `010 Arbeitsanweisungen alles.BereichNr` ist **vollständig NULL** (462 Zeilen)
- `010 Arbeitsanweisungen alles.Bereich` ist **vollständig NULL** (462 Zeilen)
- `010 Arbeitsanweisungen alles.Abteilungs-Nr Kunde` ist **vollständig NULL** (462 Zeilen)
- `011 Arbeitsanweisungen Abteilungen` hat **keinen Primary Key** (0 Zeilen)
- `021 GefahrstofflisteLWM` hat **keinen Primary Key** (16 Zeilen)
- `021 Gefahrstoffverzeichnis` hat **keinen Primary Key** (21 Zeilen)
- `021 Gefahrstoffverzeichnis.ArtNr` hat **nur 1 Distinct-Wert** über 21 Zeilen — tote Spalte?
- `021 Gefahrstoffverzeichnis.Menge jährl` ist **vollständig NULL** (21 Zeilen)
- `022 Hygienekontrollen` hat **keinen Primary Key** (242 Zeilen)
- `022 Hygienekontrollen.Hygienekontrollen` ist ein **Memo-Feld** (16 MB max) — 0 Nulls von 242, max_len=45
- `022 Hygienekontrollen.Anzahl` ist **vollständig NULL** (242 Zeilen)
- `022 Hygienekontrollen.ObID` ist **vollständig NULL** (242 Zeilen)
- `022 Hygienekontrollen.BereichNr` ist **vollständig NULL** (242 Zeilen)
- `022 Hygienekontrollen.Bereich` ist **vollständig NULL** (242 Zeilen)
- `022 Hygienekontrollen.AusführungReinigung` hat **nur 1 Distinct-Wert** über 242 Zeilen — tote Spalte?
- `022 Hygienekontrollen Spezial 15` hat **keinen Primary Key** (217 Zeilen)
- `022 Hygienekontrollen Spezial 15.Objekt Filter` ist **vollständig NULL** (217 Zeilen)
- `022 Hygienekontrollen Spezial 15.Seitennummer` ist **vollständig NULL** (217 Zeilen)
- `022 Hygienekontrollen Spezial 15.Bereichs-Nr` ist **vollständig NULL** (217 Zeilen)
- `022 Hygienekontrollen Spezial 15.Bereich` ist **vollständig NULL** (217 Zeilen)
- `022 Hygienekontrollen Spezial 15.Abteilungs-Nr Kunde` ist **vollständig NULL** (217 Zeilen)
- `022 Hygienekontrollen Spezial 15.Abteilungsleiter-Nr` ist **vollständig NULL** (217 Zeilen)
- `022 Hygienekontrollen Spezial 15.AusführungReinigung` hat **nur 1 Distinct-Wert** über 217 Zeilen — tote Spalte?
- `100 Firmendaten.Anrede` ist **vollständig NULL** (1 Zeilen)
- `101 Maschinenpark.Memo` ist ein **Memo-Feld** (16 MB max)
- `Version.überarbeitet am` ist **vollständig NULL** (1 Zeilen)
- `Wartungsplan` hat **keinen Primary Key** (11 Zeilen)
- `tmpBerichte.BerichtAuswahl` hat **nur 1 Distinct-Wert** über 26 Zeilen — tote Spalte?
- `tmpBerichte.BerichtOrdnungsnummer` ist **vollständig NULL** (26 Zeilen)

## Driver-Warnungen / Logs (gefiltert)

```
### profile (rc=0)
```

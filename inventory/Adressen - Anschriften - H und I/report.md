# Inventar: Adressen - Anschriften - H und I

**Quelle:** `/Users/jonathankreutzheide/Downloads/Probedaten Datenbank Muenstermann  Test/Adressen - Anschriften - H und I.accdb`
**Treiber:** UCanAccess driver for Microsoft Access databases using HSQLDB V2007 [VERSION_12]
**Tabellen gesamt:** 6
**Linked Tables:** 2

## Linked Tables

| Lokaler Name | Verlinkte DB | Tabelle dort |
|---|---|---|
| `Bundesländer` | `C:\OneDrive - Münstermann H. & I. GmbH & Co. KG\Büro\# Büro Allgemein\ListenAllgemein.accdb` | `Bundesländer` |
| `Personalstammdaten` | `Z:\Abrechnungen 2019\Personalstamm 2019.accdb` | `Personalstammdaten` |

## Tabellen-Übersicht

| Tabelle | Zeilen | Spalten | PK | Indizes | FKs |
|---|---:|---:|---|---:|---:|
| `Bewerbungen` | 1 | 24 | — | 0 | 0 |
| `Bewerbungen Hilfe` | 23 | 2 | — | 1 | 0 |
| `Gefährdungsfaktoren` | 1 | 58 | — | 0 | 0 |
| `Kunden` | 81 | 47 | Reinigungsgruppe | 6 | 0 |
| `Kunden Ansprechpartner` | 1 | 9 | — | 1 | 0 |
| `Kunden Mibikontrolle` | 11 | 2 | Nr | 3 | 0 |

## Auffälligkeiten

- `Bewerbungen` hat **keinen Primary Key** (1 Zeilen)
- `Bewerbungen.Geschlecht` ist **vollständig NULL** (1 Zeilen)
- `Bewerbungen.Name` ist **vollständig NULL** (1 Zeilen)
- `Bewerbungen.Vorname` ist **vollständig NULL** (1 Zeilen)
- `Bewerbungen.Straße` ist **vollständig NULL** (1 Zeilen)
- `Bewerbungen.PLZ` ist **vollständig NULL** (1 Zeilen)
- `Bewerbungen.Ort` ist **vollständig NULL** (1 Zeilen)
- `Bewerbungen.Beworben am` ist **vollständig NULL** (1 Zeilen)
- `Bewerbungen.Tel-Nr` ist **vollständig NULL** (1 Zeilen)
- `Bewerbungen.zu erreichen ab` ist **vollständig NULL** (1 Zeilen)
- `Bewerbungen.Bemerkungen` ist **vollständig NULL** (1 Zeilen)
- `Bewerbungen.Art` ist **vollständig NULL** (1 Zeilen)
- `Bewerbungen.Zur Zeit` ist **vollständig NULL** (1 Zeilen)
- `Bewerbungen.seid dem` ist **vollständig NULL** (1 Zeilen)
- `Bewerbungen.Familienstand` ist **vollständig NULL** (1 Zeilen)
- `Bewerbungen.Nation` ist **vollständig NULL** (1 Zeilen)
- `Bewerbungen.Geb-Datum` ist **vollständig NULL** (1 Zeilen)
- `Bewerbungen Hilfe` hat **keinen Primary Key** (23 Zeilen)
- `Gefährdungsfaktoren` hat **keinen Primary Key** (1 Zeilen)
- `Gefährdungsfaktoren.1 Mechanische Gefährdung` ist **vollständig NULL** (1 Zeilen)
- `Gefährdungsfaktoren.2 Elektrische Gefährdung` ist **vollständig NULL** (1 Zeilen)
- `Gefährdungsfaktoren.3 Chemische Gefährdung` ist **vollständig NULL** (1 Zeilen)
- `Gefährdungsfaktoren.4 Biologische Gefährdung` ist **vollständig NULL** (1 Zeilen)
- `Gefährdungsfaktoren.5 Brand- und Exlosionsgefährdung` ist **vollständig NULL** (1 Zeilen)
- `Gefährdungsfaktoren.6 Thermische Gefährdung` ist **vollständig NULL** (1 Zeilen)
- `Gefährdungsfaktoren.7 Physikalische Gefährdung` ist **vollständig NULL** (1 Zeilen)
- `Gefährdungsfaktoren.8 Gefährdung durch die Arbeitsumgebung` ist **vollständig NULL** (1 Zeilen)
- `Gefährdungsfaktoren.9 Physische Gefährdung` ist **vollständig NULL** (1 Zeilen)
- `Gefährdungsfaktoren.10 Gefährdung aus Wahrnehmung und Handbarkeit` ist **vollständig NULL** (1 Zeilen)
- `Gefährdungsfaktoren.11 Psychomentale Fehlbelastung` ist **vollständig NULL** (1 Zeilen)
- `Gefährdungsfaktoren.12 Gefährdung durch Mängel in der Arbeitsorganisation` ist **vollständig NULL** (1 Zeilen)
- `Kunden.Anmeldung` ist ein **Memo-Feld** (16 MB max) — 70 Nulls von 81, max_len=117
- `Kunden.Reinigungsbeginn` ist **vollständig NULL** (81 Zeilen)
- `Kunden.Ende Dienstleistungsvertrag` ist **vollständig NULL** (81 Zeilen)
- `Kunden.Region` ist **vollständig NULL** (81 Zeilen)
- `Kunden.Reinigungsmittel` hat **nur 1 Distinct-Wert** über 81 Zeilen — tote Spalte?
- `Kunden.Postfach` ist **vollständig NULL** (81 Zeilen)
- `Kunden.PLZ Postfach` ist **vollständig NULL** (81 Zeilen)
- `Kunden.PLZ Postfach Ort` ist **vollständig NULL** (81 Zeilen)
- `Kunden.5` hat **nur 1 Distinct-Wert** über 81 Zeilen — tote Spalte?
- `Kunden.Schäden` hat **nur 1 Distinct-Wert** über 81 Zeilen — tote Spalte?
- `Kunden.Sitex Kdnummer` ist **vollständig NULL** (81 Zeilen)
- `Kunden.Status` ist **vollständig NULL** (81 Zeilen)
- `Kunden.Kto` ist **vollständig NULL** (81 Zeilen)
- `Kunden.BLZ` ist **vollständig NULL** (81 Zeilen)
- `Kunden.Lieferbedingung` ist **vollständig NULL** (81 Zeilen)
- `Kunden.Zahlungsbedingung` ist **vollständig NULL** (81 Zeilen)
- `Kunden.ab frei Haus` hat **nur 1 Distinct-Wert** über 81 Zeilen — tote Spalte?
- `Kunden.unsere Kd` ist **vollständig NULL** (81 Zeilen)
- `Kunden.Geschäftsführer` ist **vollständig NULL** (81 Zeilen)
- `Kunden.direkter Vorgesetzter` ist **98.8% NULL** (80/81)
- `Kunden.wöchentlich` hat **nur 1 Distinct-Wert** über 81 Zeilen — tote Spalte?
- `Kunden.Wäsche` hat **nur 1 Distinct-Wert** über 81 Zeilen — tote Spalte?
- `Kunden Ansprechpartner` hat **keinen Primary Key** (1 Zeilen)

## Driver-Warnungen / Logs (gefiltert)

```
### profile (rc=0)
```

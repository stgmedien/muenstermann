# Inventar: Reinigungspläne

**Quelle:** `/Users/jonathankreutzheide/Downloads/Probedaten Datenbank Muenstermann  Test/Reinigungspläne.accdb`
**Treiber:** UCanAccess driver for Microsoft Access databases using HSQLDB V2007 [VERSION_12]
**Tabellen gesamt:** 4
**Linked Tables:** 1

## Linked Tables

| Lokaler Name | Verlinkte DB | Tabelle dort |
|---|---|---|
| `Reinigungsmittel Eigenschaften` | `Z:\sonstige Datenbanken\Reinigungsmittel1.accdb` | `Reinigungsmittel Eigenschaften` |

## Tabellen-Übersicht

| Tabelle | Zeilen | Spalten | PK | Indizes | FKs |
|---|---:|---:|---|---:|---:|
| `003 Hygienepläne` | 40 | 16 | PlanNr | 2 | 0 |
| `003 Hygienepläne Arbeitsschritte` | 244 | 8 | — | 1 | 0 |
| `021 Gefahrstoffverzeichnis` | 23 | 6 | — | 2 | 0 |
| `GullyCheck` | 1 | 7 | ID | 1 | 0 |

## Auffälligkeiten

- `003 Hygienepläne.M1` ist ein **Memo-Feld** (16 MB max) — 31 Nulls von 40, max_len=155
- `003 Hygienepläne.M2` ist ein **Memo-Feld** (16 MB max) — 40 Nulls von 40, max_len=0
- `003 Hygienepläne.M3` ist ein **Memo-Feld** (16 MB max) — 40 Nulls von 40, max_len=0
- `003 Hygienepläne.M4` ist ein **Memo-Feld** (16 MB max) — 40 Nulls von 40, max_len=0
- `003 Hygienepläne.M5` ist ein **Memo-Feld** (16 MB max) — 40 Nulls von 40, max_len=0
- `003 Hygienepläne.M6` ist ein **Memo-Feld** (16 MB max) — 40 Nulls von 40, max_len=0
- `003 Hygienepläne.M7` ist ein **Memo-Feld** (16 MB max) — 40 Nulls von 40, max_len=0
- `003 Hygienepläne.M8` ist ein **Memo-Feld** (16 MB max) — 40 Nulls von 40, max_len=0
- `003 Hygienepläne.M9` ist ein **Memo-Feld** (16 MB max) — 40 Nulls von 40, max_len=0
- `003 Hygienepläne.Hinweise zur Anpassung` ist ein **Memo-Feld** (16 MB max) — 40 Nulls von 40, max_len=0
- `003 Hygienepläne.M2` ist **vollständig NULL** (40 Zeilen)
- `003 Hygienepläne.M3` ist **vollständig NULL** (40 Zeilen)
- `003 Hygienepläne.M4` ist **vollständig NULL** (40 Zeilen)
- `003 Hygienepläne.M5` ist **vollständig NULL** (40 Zeilen)
- `003 Hygienepläne.M6` ist **vollständig NULL** (40 Zeilen)
- `003 Hygienepläne.M7` ist **vollständig NULL** (40 Zeilen)
- `003 Hygienepläne.M8` ist **vollständig NULL** (40 Zeilen)
- `003 Hygienepläne.M9` ist **vollständig NULL** (40 Zeilen)
- `003 Hygienepläne.Besonderheiten 1` ist **vollständig NULL** (40 Zeilen)
- `003 Hygienepläne.Besonderheiten 2` ist **vollständig NULL** (40 Zeilen)
- `003 Hygienepläne.Besonderheiten 3` ist **vollständig NULL** (40 Zeilen)
- `003 Hygienepläne.Hinweise zur Anpassung` ist **vollständig NULL** (40 Zeilen)
- `003 Hygienepläne Arbeitsschritte` hat **keinen Primary Key** (244 Zeilen)
- `003 Hygienepläne Arbeitsschritte.Aufgaben` ist ein **Memo-Feld** (16 MB max) — 0 Nulls von 244, max_len=313
- `003 Hygienepläne Arbeitsschritte.Verfahren` ist ein **Memo-Feld** (16 MB max) — 14 Nulls von 244, max_len=552
- `003 Hygienepläne Arbeitsschritte.Geräte` ist ein **Memo-Feld** (16 MB max) — 76 Nulls von 244, max_len=81
- `003 Hygienepläne Arbeitsschritte.Hinweise` ist ein **Memo-Feld** (16 MB max) — 119 Nulls von 244, max_len=101
- `003 Hygienepläne Arbeitsschritte.Hinweise zur Anpassung` ist ein **Memo-Feld** (16 MB max) — 244 Nulls von 244, max_len=0
- `003 Hygienepläne Arbeitsschritte.Hinweise zur Anpassung` ist **vollständig NULL** (244 Zeilen)
- `021 Gefahrstoffverzeichnis` hat **keinen Primary Key** (23 Zeilen)
- `021 Gefahrstoffverzeichnis.Pfadtext` ist ein **Memo-Feld** (16 MB max) — 1 Nulls von 23, max_len=164
- `021 Gefahrstoffverzeichnis.ArtNr` hat **nur 1 Distinct-Wert** über 23 Zeilen — tote Spalte?
- `021 Gefahrstoffverzeichnis.Menge jährl` ist **vollständig NULL** (23 Zeilen)
- `021 Gefahrstoffverzeichnis.Standort` ist **vollständig NULL** (23 Zeilen)

## Driver-Warnungen / Logs (gefiltert)

```
### profile (rc=0)
```

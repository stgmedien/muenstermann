# ADR-003: Konsolidierungs-Strategie für Multi-Column- und Memo-Antipatterns

**Datum:** 2026-05-24
**Status:** akzeptiert
**Kontext:** Phase 1 — PostgreSQL-Modellierung der Catalog-Domäne (Reinigungsmittel)

## Befund

Das Profiling über alle 9 .accdb hat zwei wiederkehrende Access-Antipatterns
sichtbar gemacht, die in PostgreSQL **nicht 1:1** abgebildet werden sollen:

### Antipattern 1: Multi-Column-Wiederholung statt n:m-Beziehung

Tabellen mit fixen, durchnummerierten Spalten, die fachlich für "0 bis N
Werte derselben Sache" stehen:

| Tabelle | Spalten | Befund |
|---|---|---|
| `tbl_RGM_Eigenschaften_2025` | `Gefahrstoffe 1-5` | 9 / 54 / 136 / 203 / 244 Nulls (von 292) — typisch 1-2 Werte |
| `tbl_RGM_Eigenschaften_2025` | `BioWirksam1-10` | **alle 10 vollständig leer** |
| `tbl_RGM_Eigenschaften_2025` | `Gefahrenbezeichnung1/2` | 97 % / 99 % NULL |
| `003 Hygienepläne` | `M1-M9` (Memo) | Maßnahmen-Texte als 9 Memo-Felder |
| `002 Abt-Objekte` (REWE) | `DurchführungKW1-9`, `DurchführungMonat1-4` | Zeitliche Ausführungs-Slots |

**Probleme:**
- Wertanzahl-Limit hartkodiert im Schema (was bei 6 Gefahrstoffen? Spalte 6 hinzufügen?)
- Abfragen werden zu OR-Disjunktionen über alle N Spalten
- NULL-Statistik verfälscht (90 % NULL ist normal, nicht außergewöhnlich)
- Refactoring bricht alle Anwendungen, die die Spalten direkt nutzen

### Antipattern 2: Memo-Felder für strukturierte Daten

Access' "Long Text" (Memo, 16 MB max) wird genutzt für:
- Mehrzeilige Anleitungstexte (legitim — bleiben Memo/`text`)
- Listen-artige Daten in CSV-Strings (`H-Sätze` in `tbl_RGM_Eigenschaften_2025`: 147 distinct Strings → vermutlich kommagetrennt)
- 9 nebeneinanderliegende Memo-Felder als pseudo-Liste (`003 Hygienepläne.M1-M9`)

## Entscheidung

### Regel 1: Multi-Column-Slots → n:m-Junction-Tabelle

Spalten der Form `<Sache>1`, `<Sache>2`, …, `<Sache>N` werden in PostgreSQL als
**eine Junction-Tabelle** modelliert.

**Beispiel:**
```
catalog.cleaning_agent             (PK: id, legacy_id, name, hersteller_id, …)
catalog.cleaning_agent_hazard_substance  -- ersetzt "Gefahrstoffe 1-5"
    (cleaning_agent_id, hazard_substance, position SMALLINT, …)
```

`position` bewahrt die Reihenfolge aus dem Access-Original (1 = "Gefahrstoffe 1" etc.),
falls die fachlich relevant ist. Beim ETL-Schritt wird pro Quelle-Zeile geschaut,
welche der `Gefahrstoffe 1-5` nicht-NULL sind, und für jede ein Junction-Datensatz
geschrieben.

### Regel 2: Komma-separierte Werte in Text-Spalten → n:m-Junction-Tabelle

Spalten wie `H-Sätze = "H290, H315, H319"` werden im ETL **getrennt und in eine
Junction-Tabelle verteilt**:

```
catalog.cleaning_agent_hazard_phrase
    (cleaning_agent_id, hazard_phrase_id)
```

Vor dem Insert: Trennung an Komma + Whitespace-Trim, dann Lookup auf
`catalog.hazard_phrase`. Wenn der H-Satz im Katalog nicht existiert →
Quarantäne-Eintrag, nicht silent verwerfen.

### Regel 3: Vollständig leere Spalten → nicht migrieren

Spalten, die im Quell-Datenbestand **vollständig NULL** sind, werden im PG-Modell
**weggelassen**. Beispiele:

- `tbl_RGM_Eigenschaften_2025.Abfallschlüssel` (292 Nulls)
- `tbl_RGM_Eigenschaften_2025.BioWirksam1` bis `BioWirksam10` (alle leer)

Falls eine dieser Eigenschaften später fachlich gebraucht wird, kann man sie
gezielt nachpflegen — das Risiko, eine "potenziell mal genutzte" Spalte zu
verlieren, ist gering, weil:
- Sie war so lange leer, dass sie offensichtlich kein produktives Feld ist
- Das Schema-Migrations-Script ist versioniert; rück-Add ist eine reine `ALTER TABLE`

Im Migrations-Skript wird das Weglassen mit einem `-- LASSEN AUS: <begründung>`-
Kommentar dokumentiert. Damit ist die Entscheidung re-konstruierbar.

### Regel 4: Fast-leere Spalten (≥95% NULL) → individuell prüfen

Spalten mit ≥95% NULL aber nicht 100%:
- Wenn die wenigen Werte konsistent erscheinen → migrieren (selten genutzte Eigenschaft)
- Wenn die Werte chaotisch sind (Tippfehler, Test-Strings) → weglassen, in Quarantäne dokumentieren

Diese Entscheidung treffen wir **pro Spalte mit der Datengrundlage**, nicht
algorithmisch.

### Regel 5: Memo-Felder mit echtem Mehrzeilen-Text → `text` in PG

Memos, die tatsächlich Freitext sind (Anweisungen, Hinweise, Beschreibungen),
bleiben in PostgreSQL `text`-Typ. Beispiele:
- `tbl_RGM_Eigenschaften_2025.Kurz Info` (max_len 1659 chars)
- `tbl_RGM_Eigenschaften_2025.Anleitung Messung` (max_len 1130 chars)

Diese behalten ihre semantische Position als Spalte in der Haupttabelle.

### Regel 6: Hersteller-Drift → strikte FK + Quarantäne im ETL

In `tbl_RGM_Eigenschaften_2025.Hersteller` (Freitext, 41 Distinct) hat Münstermann
Hersteller-Namen pro Reinigungsmittel eingegeben, OHNE auf `tblRGM_Hersteller`
(15 Hersteller-Stammdaten) zu referenzieren. Beim Migrieren:

1. Stammdaten zuerst migrieren (15 Hersteller-Datensätze in `catalog.manufacturer`)
2. Beim Laden der Reinigungsmittel: Fuzzy-Match `Hersteller` → `manufacturer.name`
3. Match-Score ≥ 0.85 → automatisch zuordnen, Match-Score notieren im Audit-Trail
4. Niedriger Score → in `migration_quarantine.cleaning_agent_manufacturer_lookup` ablegen, manuelle Klärung
5. **Im PG-Modell hat `cleaning_agent.manufacturer_id` einen FK auf `manufacturer.id`** — kein Freitext mehr, kein zweites Drift-Risiko in der Zukunft

## Konsequenzen

- Die 93 Spalten von `tbl_RGM_Eigenschaften_2025` reduzieren sich auf vermutlich
  **40-50 Spalten** in `catalog.cleaning_agent`, plus 3-4 Junction-Tabellen.
- Datenverlust-Risiko: minimal — alle weggelassenen Spalten waren bei der Datenanalyse
  leer; alle multi-column-aufgelösten Spalten werden in Junction-Tabellen vollständig
  übertragen.
- Konsequenz fürs ETL: explizite Logik für (a) NULL-Filterung in Multi-Column-Auflösung,
  (b) String-Split bei kommagetrennten Werten, (c) Fuzzy-Match-Lookup bei Hersteller.
- Konsequenz fürs Datenmodell: PG-Schema ist deutlich kleiner und sauberer als die
  Access-Quelle. Das ist gewollt und passt zum Grundsatz in Plan §5
  ("3NF als Default, Altlasten bleiben in Access").

## Was wir NICHT tun

- **Wir lösen keine Memo-Felder mit echtem Freitext in n:m-Tabellen auf**, nur weil sie groß sind.
  Maßstab ist die fachliche Bedeutung: ist es "ein Text" oder "eine Liste"? Bei `003 Hygienepläne.M1-M9`
  ist es eine Liste (Maßnahme 1, Maßnahme 2, …) → Junction. Bei `Kurz Info` ist es ein Text → Spalte bleibt.
- **Wir verwerfen nicht "97% NULL"-Spalten blind**. Das prüfen wir individuell. Nur 100% NULL fliegt automatisch.

# ADR-002: Linked-Tables-Mesh ist real — Migration adressiert mind. 12 DBs, nicht 9

**Datum:** 2026-05-24
**Status:** akzeptiert
**Kontext:** Phase 0 — Smoke-Test über alle 9 Probedaten-`.accdb` aufgedeckt

## Befund

Der Smoke-Test (siehe `inventory/reports/smoke/findings.md`) hat ergeben, dass die 9 ausgelieferten `.accdb`-Dateien **nicht isoliert** sind, sondern via Access-Linked-Tables auf **3 weitere, im Probe-Bestand fehlende DBs** verweisen:

1. `ListenAllgemein.accdb` (in `OneDrive\Büro\# Büro Allgemein\`)
   — referenziert von beiden Adressbüchern (H und I + Services)
2. `Personalstamm 2019.accdb` (in `Z:\Abrechnungen 2019\`)
   — referenziert von Adressen H und I → **das ist die HR-Domäne!**
3. `Reinigungsmittel1.accdb` (in `Z:\sonstige Datenbanken\`)
   — referenziert von Reinigungspläne → vermutlich obsolete Vorgängerversion

Zusätzlich verlinken alle Kunden-DBs und die Musterdatenbank auf 4 der 9 vorhandenen DBs (`Reinigungspläne`, `Kalender 2026`, `Reinigungsmittel_2025`, `Adressen - Anschriften`).

## Entscheidung

**Die Migration adressiert ein DB-Mesh, keine 9 isolierten DBs.**

Konkret:
1. **Vor dem Inventarisierungs-Skript-Lauf** müssen die 3 fehlenden DBs vom Kunden beschafft werden — oder explizit als "wir migrieren ohne" deklariert sein.
2. **Die Linked-Tables-Pfade werden inventarisiert** (das Inventar-Skript erfasst sie als eigene Datenstruktur), nicht ignoriert.
3. **Das Zielmodell konsolidiert** das Mesh in die im Plan §5 definierten PostgreSQL-Schemas; die DB-Datei-Grenzen aus Access verschwinden.
4. **Plan §9 R3 (Linked Tables) wird von "potentiell" auf "bestätigt, kritisch" hochgestuft.**

## Konsequenzen für den Plan

Plan §1 Phase 0 wird erweitert um:
- **0.5** — Beschaffung der 3 referenzierten Fremd-DBs **als Vorbedingung für Phase 1**
- **0.6** — Klärung mit Frank, ob die Linked-Tables-Pfad-Drift (alte vs. neue Firmierung) auf paralleler produktiver Nutzung verschiedener Vorlagen-Versionen beruht

Plan §3 (Inventarisierung) bekommt einen festen Punkt: **Linked-Tables-Auflistung pro DB ist ein eigenes Inventar-Artefakt** (`inventory/<db>/linked_tables.json`).

Plan §5 (Modellierung) bleibt unverändert — die Konsolidierung war schon vorgesehen ("DB-Datei-Grenzen aus Access verschwinden").

## Implikation Compliance

Wenn `Personalstamm 2019.accdb` tatsächlich die Mitarbeiter-Stammdaten enthält (Name ist eindeutig), dann:
- **DSGVO**: diese DB ist die am stärksten personenbezogene Datenquelle des gesamten Projekts. DSB-Einbindung **vor** dem ersten Lesen.
- **Aufbewahrungspflichten**: "2019" im Namen deutet auf eine alte DB hin, die vermutlich Stammdaten ab 2019 oder das Schema-Jahr trägt. Klären: ist das **die** aktuelle Personal-DB, oder gibt es eine `Personalstamm 2026.accdb`?

Das ist eine offene Frage, die in Plan §9 (Fragen #11–#15) bereits adressiert wurde — jetzt mit konkretem Datei-Bezug.

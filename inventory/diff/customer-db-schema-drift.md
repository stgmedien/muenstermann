# Schema-Drift in der Kunden-DB-Familie

Vergleich der vier Datenbanken mit gleichem (oder ähnlichem) Schema-Erbe:
**Mustervorlage** (vermutlich Vorlage) und drei Kunden-DBs **100 Borgmeier**, **540 Bittner**, **60 REWE - Services**.

Diese Matrix ist die zentrale Eingabe für die Entscheidung, wie konsolidiert in PostgreSQL modelliert wird.

## 1. Tabellen-Existenz und Zeilenzahlen

Symbole in den Spalten: `✓N` = Tabelle vorhanden, N Zeilen. `—` = Tabelle fehlt.

| Tabelle | Muster | Borgmeier | Bittner | REWE |
|---|---:|---:|---:|---:|
| `001 Abteilungen` | ✓ 27 | ✓ 37 | ✓ 30 | ✓ 124 |
| `002 Abt-Objekte` | ✓ 217 | ✓ 390 | ✓ 162 | ✓ 869 |
| `003 Hygienepläne` | ✓ 9 | ✓ 10 | ✓ 4 | ✓ 14 |
| `003 Hygienepläne Arbeitsschritte` | ✓ 63 | ✓ 71 | ✓ 25 | ✓ 87 |
| `003a HP Arbeitsschritte` | — | — | — | ✓ 83 |
| `003a HP Arbeitsschritte V01` | — | — | — | ✓ 96 |
| `010 Arbeitsanweisungen alles` | ✓ 462 | ✓ 468 | ✓ 165 | ✓ 1062 |
| `011 Arbeitsanweisungen Abteilungen` | ✓ 0 | ✓ 0 | ✓ 0 | — |
| `021 GefahrstofflisteLWM` | ✓ 16 | — | — | ✓ 13 |
| `021 Gefahrstoffverzeichnis` | ✓ 21 | ✓ 21 | ✓ 9 | ✓ 22 |
| `022 Hygienekontrollen` | ✓ 242 | ✓ 570 | ✓ 236 | ✓ 1858 |
| `022 Hygienekontrollen Spezial 15` | ✓ 217 | ✓ 476 | ✓ 162 | ✓ 0 |
| `022 Hygienekontrollen Unterhaltsreinigung` | — | — | — | ✓ 0 |
| `022_1 HK_nachHygPlan` | — | — | — | ✓ 388 |
| `022_1 tempHK_nachHygPlan` | — | — | — | ✓ 1636 |
| `050 Kontrollintervalle` | ✓ 18 | ✓ 18 | ✓ 17 | ✓ 18 |
| `100 Firmendaten` | ✓ 1 | ✓ 1 | ✓ 1 | ✓ 1 |
| `101 Maschinenpark` | ✓ 0 | ✓ 0 | ✓ 0 | ✓ 0 |
| `Hilfe` | ✓ 12 | ✓ 12 | ✓ 12 | ✓ 12 |
| `Version` | ✓ 1 | ✓ 1 | ✓ 1 | ✓ 1 |
| `Versionnierung` | — | — | — | ✓ 1 |
| `Wartungsplan` | ✓ 11 | — | — | — |
| `tmpBerichte` | ✓ 26 | ✓ 14 | ✓ 15 | ✓ 29 |
| `tmpGefStoffe` | ✓ 19 | ✓ 15 | ✓ 9 | ✓ 21 |

### Auswertung

- **Überall vorhanden:** 15 Tabellen
- **In ≥2 DBs, aber nicht überall:** 2 Tabellen
- **Nur in 1 DB:** 7 Tabellen

#### Tabellen, die nur in einer DB existieren

- `003a HP Arbeitsschritte` — nur in **REWE**
- `003a HP Arbeitsschritte V01` — nur in **REWE**
- `022 Hygienekontrollen Unterhaltsreinigung` — nur in **REWE**
- `022_1 HK_nachHygPlan` — nur in **REWE**
- `022_1 tempHK_nachHygPlan` — nur in **REWE**
- `Versionnierung` — nur in **REWE**
- `Wartungsplan` — nur in **Muster**

#### Tabellen mit teilweiser Existenz

- `011 Arbeitsanweisungen Abteilungen` — fehlt in: **REWE**
- `021 GefahrstofflisteLWM` — fehlt in: **Borgmeier, Bittner**

## 2. Spalten-Drift pro Tabelle

Für jede Tabelle, die in mindestens 2 DBs existiert, eine Spalten-Matrix.
Typ-Unterschiede werden mit `≠ TYP` markiert.

### `002 Abt-Objekte`

| Spalte | Muster | Borgmeier | Bittner | REWE | Drift |
|---|---|---|---|---|---|
| `Montag` | INTEGER | INTEGER | INTEGER | SMALLINT | Typ-Drift |
| `Dienstag` | INTEGER | INTEGER | INTEGER | SMALLINT | Typ-Drift |
| `Mittwoch` | INTEGER | INTEGER | INTEGER | SMALLINT | Typ-Drift |
| `KontrolleEinzeln` | — | — | — | BOOLEAN | fehlt teilw. |
| `Donnerstag` | — | — | — | SMALLINT | fehlt teilw. |
| `DonnerstagT` | — | — | — | VARCHAR | fehlt teilw. |
| `Freitag` | — | — | — | SMALLINT | fehlt teilw. |
| `FreitagT` | — | — | — | VARCHAR | fehlt teilw. |
| `Samstag` | — | — | — | SMALLINT | fehlt teilw. |
| `SamstagT` | — | — | — | VARCHAR | fehlt teilw. |
| `Sonntag` | — | — | — | SMALLINT | fehlt teilw. |
| `SonntagT` | — | — | — | VARCHAR | fehlt teilw. |
| `übrige` | — | — | — | SMALLINT | fehlt teilw. |
| `übrigeT` | — | — | — | VARCHAR | fehlt teilw. |
| `DurchführungMonat1` | — | — | — | INTEGER | fehlt teilw. |
| `DurchführungMonat2` | — | — | — | INTEGER | fehlt teilw. |
| `DurchführungMonat3` | — | — | — | INTEGER | fehlt teilw. |
| `DurchführungMonat4` | — | — | — | INTEGER | fehlt teilw. |
| `DurchführungKW1` | — | — | — | INTEGER | fehlt teilw. |
| `DurchführungKW2` | — | — | — | INTEGER | fehlt teilw. |
| `DurchführungKW3` | — | — | — | INTEGER | fehlt teilw. |
| `DurchführungKW4` | — | — | — | INTEGER | fehlt teilw. |
| `DurchführungKW5` | — | — | — | INTEGER | fehlt teilw. |
| `DurchführungKW6` | — | — | — | INTEGER | fehlt teilw. |
| `DurchführungKW7` | — | — | — | INTEGER | fehlt teilw. |
| `DurchführungKW8` | — | — | — | INTEGER | fehlt teilw. |
| `DurchführungKW9` | — | — | — | INTEGER | fehlt teilw. |

### `021 Gefahrstoffverzeichnis`

| Spalte | Muster | Borgmeier | Bittner | REWE | Drift |
|---|---|---|---|---|---|
| `Pfadtext` | — | VARCHAR | — | — | fehlt teilw. |
| `Einsatz` | — | — | — | VARCHAR | fehlt teilw. |

### `022 Hygienekontrollen Spezial 15`

| Spalte | Muster | Borgmeier | Bittner | REWE | Drift |
|---|---|---|---|---|---|
| `KontrolleEinzeln` | — | — | — | BOOLEAN | fehlt teilw. |
| `Etage` | — | — | — | VARCHAR | fehlt teilw. |
| `NachHygPlan` | — | — | — | VARCHAR | fehlt teilw. |
| `PlanTxt` | — | — | — | VARCHAR | fehlt teilw. |

### `100 Firmendaten`

| Spalte | Muster | Borgmeier | Bittner | REWE | Drift |
|---|---|---|---|---|---|
| `Bundesland` | — | VARCHAR | — | — | fehlt teilw. |

## 3. Konsequenzen für die PostgreSQL-Modellierung

- Insgesamt 15 Tabellen sind in allen vier DBs gleich strukturiert — diese bilden den **Kern-Schema-Anker** für die Migration der Kunden-Domäne.
- 6 Tabellen existieren **nur in 60 REWE** — typische Kundenanpassung. Klärung mit Frank: bewusst oder gewachsen? Konsolidieren oder als REWE-spezifischen Modellbaustein behalten?
- Spalten-Drift in gemeinsamen Tabellen (Abschnitt 2): bei der Zielmodellierung konsolidiert man auf den **Superset** der Spalten + Datentypen, sonst gehen Daten verloren.

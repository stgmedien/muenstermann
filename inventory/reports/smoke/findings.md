# Smoke-Test über alle 9 .accdb — Befunde

**Datum:** 2026-05-24
**Tool:** UCanAccess 5.0.1 + lokales Temurin JDK 21 (via tools/access-Wrapper)
**Quelle:** [inventory/reports/smoke/all-dbs.txt](all-dbs.txt) (Rohausgabe)

---

## TL;DR

| Befund | Bewertung |
|---|---|
| Alle 9 .accdb sind **ohne Passwort lesbar** | ✅ |
| **3 referenzierte Drittdatenbanken FEHLEN** im Probe-Bestand | 🚨 |
| **Schema-Drift zwischen Kunden-DBs ist real** (16/18/22 Tabellen, REWE eigen erweitert) | ⚠️ |
| **Firmenpfade in Linked Tables sind nicht konsistent** (alte vs neue Firmierung) | ⚠️ |
| Mehrere DBs haben **Metadaten-/Row-Count-Inkonsistenzen** (UCanAccess-Warnungen) | ⚠️ |
| **`tmpBerichte`/`tmpGefStoffe` sind keine Temp-Tabellen** sondern persistent gefüllt | ⚠️ |

---

## 1. Datenbank-Übersicht (sortiert nach Größe)

| DB | Tabellen | Wichtigste Volumen | Anmerkung |
|---|---:|---|---|
| `60 REWE 2026 V1.1 - Services` | 22 | 1858 HK, 1062 AA, 869 Obj, 124 Abt | **größter Kunde, eigenes Schema** |
| `100 Borgmeier 2026 V1.12` | 16 | 570 HK, 468 AA, 390 Obj, 37 Abt | Standard-Schema |
| `Kalender 2026` | 27 | 365 Kalendertage, 17 Bundesländer | siehe §6 |
| `Musterdatenbank 2026` | 18 | 462 AA, 217 Obj — als Master gefüllt | siehe §5 |
| `540 Bittner 2026 V1.1` | 16 | 236 HK, 165 AA, 162 Obj, 30 Abt | Standard-Schema |
| `Reinigungsmittel_2025` | 9 | 292 RGM-Eigenschaften, 58 H-Sätze | **Compliance-Kern** |
| `Adressen - Anschriften - H und I` | 6 | **81 Kunden**, +Bewerbungen, +Mibikontrolle | Hauptbetrieb |
| `Reinigungspläne` | 4 | **40 Hygienepläne / 244 Arbeitsschritte** | zentrale Vorlage |
| `Adressen - Anschriften - Services` | 4 | 8 Kunden | Geschäftsbereich Services |

HK = Hygienekontrollen, AA = Arbeitsanweisungen, Obj = Abt-Objekte, Abt = Abteilungen.

---

## 2. 🚨 Fehlende referenzierte Datenbanken

UCanAccess hat beim Öffnen jeder Kunden-DB Linked-Tables zu folgenden Dateien gemeldet, die **nicht im Probe-Bestand vorhanden sind**:

| Pfad (laut Access-Verknüpfung) | Vermuteter Inhalt | Kritikalität |
|---|---|---|
| `C:\OneDrive...\Büro\# Büro Allgemein\ListenAllgemein.accdb` | unbekannt — wird von beiden Adressbüchern referenziert | **hoch** — taucht in 2 DBs auf |
| `Z:\Abrechnungen 2019\Personalstamm 2019.accdb` | **Mitarbeiter-Stammdaten** | **kritisch** — das ist die HR-Domäne |
| `Z:\sonstige Datenbanken\Reinigungsmittel1.accdb` | alte Reinigungsmittel-Liste (Vorgänger von 2025?) | mittel — vermutlich obsolet |

`Z:\` ist ein Netzlaufwerk — diese Dateien liegen vermutlich auf einem Windows-Server bei Münstermann. **Müssen vom Kunden beschafft werden.**

**Konsequenz:** Das Inventarisierungs-Skript (Plan §3) kann **noch nicht** vollständig laufen — ohne Personalstamm und ListenAllgemein fehlt ein wesentlicher Teil der Stammdaten. Die Phase-1-Reihenfolge im Plan (Stammdaten zuerst) muss um diese 3 DBs erweitert werden.

---

## 3. Schema-Drift zwischen Kunden-DBs (bestätigt)

| Tabelle | Mustervorlage | Borgmeier | Bittner | REWE |
|---|:---:|:---:|:---:|:---:|
| 001 Abteilungen | ✅ 27 | ✅ 37 | ✅ 30 | ✅ 124 |
| 002 Abt-Objekte | ✅ 217 | ✅ 390 | ✅ 162 | ✅ 869 |
| 003 Hygienepläne | ✅ 9 | ✅ 10 | ✅ 4 | ✅ 14 |
| 003 Hygienepläne Arbeitsschritte | ✅ 63 | ✅ 71 | ✅ 25 | ✅ 87 |
| **003a HP Arbeitsschritte** | ❌ | ❌ | ❌ | ✅ 83 |
| **003a HP Arbeitsschritte V01** | ❌ | ❌ | ❌ | ✅ 96 |
| 010 Arbeitsanweisungen alles | ✅ 462 | ✅ 468 | ✅ 165 | ✅ 1062 |
| 011 Arbeitsanweisungen Abteilungen | ✅ 0 | ✅ 0 | ✅ 0 | ❌ |
| **021 GefahrstofflisteLWM** | ✅ 16 | ❌ | ❌ | ✅ 13 |
| 021 Gefahrstoffverzeichnis | ✅ 21 | ✅ 21 | ✅ 9 | ✅ 22 |
| 022 Hygienekontrollen | ✅ 242 | ✅ 570 | ✅ 236 | ✅ 1858 |
| 022 Hygienekontrollen Spezial 15 | ✅ 217 | ✅ 476 | ✅ 162 | ✅ 0 |
| **022 Hygienekontrollen Unterhaltsreinigung** | ❌ | ❌ | ❌ | ✅ 0 |
| **022_1 HK_nachHygPlan** | ❌ | ❌ | ❌ | ✅ 388 |
| **022_1 tempHK_nachHygPlan** | ❌ | ❌ | ❌ | ✅ 1636 |
| 050 Kontrollintervalle | ✅ 18 | ✅ 18 | ✅ 17 | ✅ 18 |
| 100 Firmendaten | ✅ 1 | ✅ 1 | ✅ 1 | ✅ 1 |
| 101 Maschinenpark | ✅ 0 | ✅ 0 | ✅ 0 | ✅ 0 |
| **Wartungsplan** | ✅ 11 | ❌ | ❌ | ❌ |
| **Versionnierung** | ❌ | ❌ | ❌ | ✅ 1 (sic, Tippfehler) |
| Hilfe | ✅ 12 | ✅ 12 | ✅ 12 | ✅ 12 |
| Version | ✅ 1 | ✅ 1 | ✅ 1 | ✅ 1 |
| tmpBerichte | ✅ 26 | ✅ 14 | ✅ 15 | ✅ 29 |
| tmpGefStoffe | ✅ 19 | ✅ 15 | ✅ 9 | ✅ 21 |

**Befunde:**
- **REWE ist ein Sonderfall** mit eigenem `022_1 HK_nachHygPlan`-Konzept und versionierten Arbeitsschritten. Migration muss das berücksichtigen oder REWE eigenständig modellieren.
- **`Wartungsplan` und `021 GefahrstofflisteLWM`** sind nur teilweise vorhanden — die Mustervorlage hat sie, die Kunden-DBs (Borgmeier, Bittner) nicht. Das deutet darauf hin, dass die Mustervorlage **neuer** ist als die Klone — oder die Kunden-DBs sind älter und wurden nicht mit der Vorlage synchronisiert.
- **`101 Maschinenpark` ist überall leer.** Feature nie genutzt? In der Migration ggf. einsparen.
- **`011 Arbeitsanweisungen Abteilungen` ist überall leer außer REWE (fehlt dort).** Vermutlich tote Tabelle.

---

## 4. Pfad-Drift: Umfirmierung sichtbar

Linked-Tables-Pfade unterscheiden sich:
- **`Musterdatenbank 2026.accdb`** → `OneDrive - Münstermann H. & I. GmbH\...` (alte Firma)
- **Kunden-DBs (Borgmeier, Bittner, REWE)** → `OneDrive - Münstermann H. & I. GmbH & Co. KG\...` (neue Firma, "& Co. KG")

**Interpretation:** Münstermann hat irgendwann von "GmbH" zu "GmbH & Co. KG" umfirmiert. Die Mustervorlage wurde danach nicht mehr aktualisiert, oder die Kunden-DBs sind aus einer neueren Vorlagen-Version geklont. **Frage an Frank klären** vor jeder Modellierungs-Entscheidung.

---

## 5. Musterdatenbank ist nicht "leer" sondern befüllt

`100 Firmendaten` enthält in der Musterdatenbank **1 Zeile** — das heißt, die Musterdatenbank trägt **echte Kundendaten** eines bestimmten Kunden. Die Vermutung "leerer Master-Template" stimmt also nicht. **Frage:** für welchen Kunden ist die Musterdatenbank gefüllt? Wird sie produktiv genutzt?

---

## 6. Kalender 2026: Bundesländer + Sonderfall + Auslandsbezug

`Kalender 2026.accdb` enthält 27 Tabellen, davon:
- 16 deutsche Bundesländer (`KalenderBB`, `KalenderBE`, `KalenderBW`, `KalenderBY`, `KalenderHB`, `KalenderHE`, `KalenderHH`, `KalenderMV`, `KalenderNI`, `KalenderNW`, `KalenderRP`, `KalenderSH`, `KalenderSL`, `KalenderSN`, `KalenderST`, `KalenderTH`)
- **`KalenderNL` — Niederlande!** Münstermann hat offenbar Auslandsbezug oder einen niederländischen Kunden. **Frage an Frank.**
- **`Kalender Könecke` — kundenspezifischer Kalender für "Könecke"** → unbekannter Kunde, möglicher Sonderfall (Sonderschichten, abweichende Feiertage?). Frank fragen.
- 365 Tage in `Kalender`, 53 Wochen in `KalenderWochen`, 12 Monate in `Monatsnamen`, 17 Einträge in `tbl_Bundesländer` (was wäre der 17. neben den 16 deutschen — vermutlich Niederlande).

---

## 7. Reinigungsmittel-Domäne: bereits gut strukturiert (Compliance-Kern)

`Reinigungsmittel_2025.accdb`:
- `tbl_RGM_Eigenschaften_2025` (292 Mittel)
- `tblGefHhinweise_H-Sätze` (58, GHS-Konformität)
- `tblGefHinweis_Kategorien` (3)
- `tblGefHinweis_Stand` (1, vermutlich Stand-Datum)
- `tbl_TRGS 510` (25 brennbare-Stoffe-Einträge, GefStoffV-relevant)
- `tblSymboleGefahren` (10) + `tblSymbolePSA` (6) — Piktogramme
- `tblRGM_Hersteller` (15)
- `tblGIZ` (9 Giftinformationszentralen)

**Bewertung:** Diese DB ist **schon nahe an einem sauberen Stammdaten-Modell**. Die `tbl_`-Prefix-Konvention und die fachliche Trennung deuten darauf hin, dass jemand hier mal aufgeräumt hat. Migration sollte sich an dieser Struktur orientieren.

---

## 8. Reinigungspläne: zentrale Vorlage mit Stille-Tabelle

`Reinigungspläne.accdb`:
- `003 Hygienepläne` (40)
- `003 Hygienepläne Arbeitsschritte` (244)
- `021 Gefahrstoffverzeichnis` (23)
- `GullyCheck` (1 Zeile) — was ist das? **Frage an Frank**.

Hier sieht es so aus, als ob diese DB als "Master-Katalog" der Hygienepläne dient, von der die Kunden-DBs ihre `003*`-Tabellen kopieren. Aber: Kunde Bittner hat nur 4 Hygienepläne, Master-Katalog 40 — also wird **nicht 1:1 kopiert**, sondern selektiv. Mechanismus muss geklärt werden.

---

## 9. Adressbücher — Trennung

| DB | Kunden | Spezifika |
|---|---:|---|
| `Adressen H und I` | 81 | + Bewerbungen, Bewerbungen-Hilfe, **Gefährdungsfaktoren**, **Kunden Mibikontrolle** |
| `Adressen Services` | 8 | + Bewerbungen, Bewerbungen-Hilfe |

**Interpretation:** "H und I" trägt zusätzliche Tabellen für **Mikrobiologische Kontrolle** (Mibikontrolle) und **Gefährdungsbeurteilung** — das deutet auf einen produktiveren/regulierten Bereich hin (Hauptbetrieb Lebensmittelreinigung). "Services" ist ein abgespaltenes, kleineres Geschäft.

Die in Plan §9 Frage #5 ("welcher Adress-Bestand ist führend?") lässt sich **vorläufig** beantworten: beide nebeneinander, **fachlich getrennt**. Bestätigung Frank nötig.

---

## 10. Daten-Integritätswarnungen (UCanAccess)

| DB | Tabelle | Metadaten-Count | Tatsächlich |
|---|---|---:|---:|
| Kalender 2026 | `Kalender Könecke` | 24 | 12 |
| Kalender 2026 | `Temp_KalenderQuer` | 156 | 12 |
| Reinigungsmittel_2025 | `tbl_RGM_Eigenschaften_2025` | 293 | 292 |

UCanAccess sagt jeweils: *"All will work fine, but it's better to repair your database."* — Diese Inkonsistenzen sind ungefährlich für unseren Lesepfad, aber **Indikator** für eine über die Jahre nicht gepflegte Datenbank. Bei der Migration werden wir die tatsächlichen Zeilen lesen, nicht die Metadaten-Counts.

---

## 11. Konsequenzen für den Migrationsplan

| Aus dem Plan | Status nach Smoke-Test |
|---|---|
| §1 Phase 0 Inventarisierung | Vorbedingung: **3 fehlende DBs beschaffen** |
| §1 Phase 1 Reihenfolge "Reinigungsmittel zuerst" | ✅ richtig — diese DB ist die sauberste |
| §3 Inventarisierung "Linked Tables prüfen" | ✅ bestätigt — Linked Tables sind massiv |
| §9 R3 (Linked Tables / externe Quellen) | **Realisiert**, höher priorisieren |
| §9 Frage #3 (weitere Access-Dateien?) | **3 neue Dateien identifiziert** |
| §9 Frage #5 (führender Adress-Bestand?) | Vorläufig: parallel, getrennt nach Geschäftsbereich |
| §9 Frage #11 (Festlohn?) | Noch offen — Personalstamm-DB fehlt |

---

## 12. Nächste konkrete Schritte

1. **Frank/Edel Peter Nachfrage** zu den 3 fehlenden DBs:
   - `ListenAllgemein.accdb`
   - `Personalstamm 2019.accdb`
   - `Reinigungsmittel1.accdb` (vermutlich obsolet — bestätigen)
2. **Frank-Klärungen** zu den Befunden:
   - Niederlande-Bezug im Kalender?
   - Kunde "Könecke" — Sonderfall?
   - Kunde "GullyCheck" — was ist das?
   - Musterdatenbank gefüllt mit echten Daten von welchem Kunden?
   - Umfirmierung GmbH → GmbH & Co. KG (wann passiert? warum nicht synchronisiert?)
   - REWE Sonderschema — bewusst oder gewachsen?
3. **Inventarisierungs-Skript** (Plan §3) mit den 6 vollständig vorhandenen DBs ausführen, sobald die 3 fehlenden beschafft sind (oder explizit "ohne" deklariert ist).

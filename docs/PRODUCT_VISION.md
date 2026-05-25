# Produktvision: Münstermann Cleaning Operations Platform

**Status:** Konzept v1
**Datum:** 2026-05-25
**Autor:** Migrations-Team

> Aus der Access-Migration ist eine PostgreSQL-Datenbank + ein lese-/edit-fähiges
> Backoffice-Frontend geworden. Dieses Dokument beschreibt den Weg von dort zu
> einer **vollumfänglichen, dokumentationssicheren Operationsplattform**, die
> den gesamten Lebenszyklus eines Reinigungsauftrags abdeckt — von der
> Stammdatenpflege über die tägliche Ausführung durch den Vorarbeiter bis zum
> Audit-Paket für den Wirtschaftsprüfer.

---

## 0. Was schon steht (Phase A — fertig)

| Komponente | Stand |
|---|---|
| Datenbank | PostgreSQL 17 auf Neon EU, 32 Tabellen, ~10.600 Datensätze |
| Audit-Trail | Trigger-basiert, JSONB-Snapshots, txid+actor pro Änderung |
| Backoffice | Next.js 15 mit Login, Kunden- und Reinigungsmittel-Übersicht inkl. Edit |
| Compliance-Kataloge | H-Sätze, TRGS 510 Lagerklassen, GHS-Piktogramme, GefStoffV-Faktoren |
| Migrations-Tooling | Idempotente DDL+Seeds, ETL aus 9 Access-DBs, SQL-Assertions |

Das ist die **Stammdaten-Schicht**. Die nächsten Phasen bauen die
**operative Schicht** darauf auf.

---

## 1. Vision in einem Satz

> Eine Operationsplattform, in der jeder Reinigungseinsatz vom Plan bis zum
> beweissicheren Audit-Paket digital begleitet wird, ohne dass jemand
> Zettel ausfüllen, abtippen oder im Schrank suchen muss.

---

## 2. Akteure und Rollen (RBAC)

| Rolle | Aufgabe | Sichtbarkeit |
|---|---|---|
| **ADMIN** | Stammdaten + System-Konfig + Audit-Einsicht | alles |
| **BÜRO / DISPONENT** | Touren planen, Berichte erstellen, Stammdaten pflegen | alle Kunden des eigenen Mandanten |
| **VORARBEITER** | Touren ausführen, Probleme melden, Foto-Belege | nur die eigenen Touren |
| **REINIGUNGSKRAFT** | Eigene Stempelzeiten, Schulungen sehen | nur eigene Daten |
| **KUNDE** | Eigene Pläne und Berichte einsehen, Beanstandungen einreichen, Tour abnehmen | nur eigener Standort |
| **BUCHHALTER** | Lohnvorbereitung, Faktura-Abgleich | HR + Billing, kein Operations |
| **DSB / DATENSCHUTZ** | Audit-Trail, Löschanträge bearbeiten | reines Lese-Recht auf audit.*, Workflow-Owner bei DSGVO-Löschungen |
| **AUDITOR (extern)** | Read-only-Audit-Zugang für Kontrollen (IFS, Behörde) | Audit-Paket pro Kunde, kein Personen-PII |

**Technisch:**
- `core.app_user` Tabelle mit `email`, `password_hash`, `is_active`
- `core.role` als Enum
- `core.user_role` n:m mit optionaler `scope_customer_id` (für KUNDE-Rolle nur ein Kunde)
- Row-Level Security in PostgreSQL — jede `select` und `update` wird automatisch nach Rolle gefiltert

---

## 3. Das Herzstück: der Inspection-Workflow

Das ist der konkrete Use Case, den der Geschäftsführer beschrieben hat:
**„Vorarbeiter hakt ab, Kunde streicht durch, alles dokumentationssicher."**

### 3.1 Drei Lebenszyklus-Phasen einer Reinigung

```
       Planung                Ausführung             Abnahme & Doku
   ┌──────────────┐      ┌─────────────────┐      ┌──────────────────┐
   │ Disponent    │      │ Vorarbeiter     │      │ Kunde + System   │
   │              │      │  vor Ort        │      │                  │
   │ - Tour       │ ───▶ │ - hakt ab       │ ───▶ │ - signiert       │
   │   zuweisen   │      │ - Foto/Notizen  │      │ - beanstandet    │
   │ - Plan-      │      │ - Zeit-Tracking │      │ - PDF-Paket      │
   │   Generieren │      │ - offline-fähig │      │   archiviert     │
   └──────────────┘      └─────────────────┘      └──────────────────┘
```

### 3.2 Planung — automatische Tour-Generierung

Aus `ops.hygiene_control_plan` (was-wo-wann pro Kunde) generiert das System
täglich oder wöchentlich konkrete **Inspection-Aufgaben**. Beispiel:

- Plan-Zeile: „Abteilung Wolfraum, Objekt Zerkleinerer, täglich"
- → Generator legt für heute eine `inspection_task` an
- → Disponent weist sie einer Tour zu (= einem Vorarbeiter an einem Tag)

**Generator-Logik** (geplant: Vercel Cron oder Background-Job):
- Liest `ops.control_interval` (Intervall-Stammdaten pro Kunde)
- Liest `ops.hygiene_control_plan` (Plan-Zeilen) inkl. `weekday_schedule` (REWE)
- Berücksichtigt `core.public_holiday` (an Feiertagen ggf. ausfallend)
- Generiert `ops.inspection_task` für die nächsten 14 Tage im Voraus

### 3.3 Ausführung — der Vorarbeiter vor Ort

**Mobile Web-App / PWA** auf Tablet oder Smartphone:

- **Tagestour-Übersicht**: alle Aufgaben für heute, gruppiert nach Kunde
- **Pro Aufgabe**: Plan-Punkte mit Häkchen
  - ✅ **Erledigt** — Standard-Zustand, alles ok
  - ⊘ **Nicht möglich** — mit Pflicht-Begründung (z. B. „Halle gesperrt, Wartung")
  - ⚠️ **Problem** — mit Foto und Beschreibung (z. B. „Sieb fehlt, neues bestellt")
- **Pro Punkt automatisch erfasst:**
  - Zeitstempel (Begin + Ende)
  - GPS-Koordinaten (im Hintergrund, bei Outdoor-Punkten)
  - User-ID des Vorarbeiters
  - Optionale Fotos (lokal komprimiert, beim Sync hochgeladen)
- **Offline-fähig**: Service Worker + IndexedDB cachen alles, beim
  nächsten WLAN/Mobilfunk-Empfang Push der Daten

### 3.4 Abnahme durch den Kunden

Am Ende der Tour übergibt der Vorarbeiter das Tablet an einen vom Kunden
benannten Ansprechpartner:

- Kunde sieht eine **Abnahme-Maske** mit:
  - Allen erledigten Punkten (mit Häkchen)
  - Allen Problemen (mit den Vorarbeiter-Notizen)
- Pro Punkt kann der Kunde:
  - **„Abgenommen"** — Punkt ist offiziell durch
  - **„Beanstandet"** — mit Pflicht-Begründung
- **Digitale Unterschrift** mit Finger/Stift auf dem Tablet
- Bei Beanstandung:
  - Generiert automatisch eine **Nacharbeit-Aufgabe** (`ops.complaint`)
  - Folge-Termin wird vorgeschlagen
  - Bei Wiederholung (>3 in 30 Tagen) Eskalations-E-Mail an Disponent

### 3.5 Dokumentationssicherheit (HACCP / IFS / GefStoffV / DSGVO)

Drei Schichten:

**(a) Append-Only-Datenmodell**
- Inspections und complaints werden **niemals** geupdated
- Statt UPDATE: neue Version-Zeile mit `replaces_id` und `replacement_reason`
- DELETE auf `ops.inspection*` ist per CHECK + Trigger verboten

**(b) Hash-Chain-Beweissicherheit**
- Tabelle `audit.inspection_hash` enthält pro Inspection einen Hash über
  alle Felder PLUS den Hash der vorherigen Inspection
- Daraus baut sich eine **Block-Chain-artige Kette** auf, die Tampering
  sofort sichtbar macht (jede Manipulation invalidiert alle nachfolgenden Hashes)
- Verifikation einmal pro Tag automatisch + manuell auslösbar im Audit-Modul

**(c) Audit-Paket-Export**
- Pro Kunde pro Monat ein **PDF-Bundle**:
  - Alle Inspections + Beanstandungen + Nacharbeiten
  - Eingebettete Fotos
  - Unterschriften
  - Verwendete Reinigungsmittel + deren Sicherheitsdatenblätter
  - Hash-Verifikations-Bericht
- Format: PDF/A-3 (rechtskonform archivierbar)
- Aufbewahrungsfristen pro Datentyp einstellbar (Default: 5 Jahre für
  Hygiene-Doku, 10 Jahre für Lohn)
- DSGVO-Löschung: anonymisiert, nicht hart-löscht (Audit-Trail bleibt
  intakt, persönliche Felder werden auf `[gelöscht: <reason>]` gesetzt)

---

## 4. Datenmodell-Erweiterungen

Neue Schemas/Tabellen, gruppiert nach Phase. Bestehende `audit.*`, `catalog.*`,
`core.*`, `ops.*` bleiben.

### 4.1 Identity & Access (Phase B-Voraussetzung)

| Tabelle | Zweck |
|---|---|
| `core.app_user` | Benutzer-Account mit email, password_hash, status |
| `core.role` (enum) | ADMIN, BUERO, VORARBEITER, REINIGUNGSKRAFT, KUNDE, BUCHHALTER, DSB, AUDITOR |
| `core.user_role` | n:m + optional scope_customer_id |
| `core.user_session` | Aktive Sessions (für Logout-aller-Devices) |
| `core.api_token` | Long-lived Tokens für Mobile-App-Sync |

### 4.2 Inspection-Engine (Phase B)

| Tabelle | Zweck |
|---|---|
| `ops.tour` | Eine Tagestour eines Vorarbeiters bei einem Kunden |
| `ops.tour_assignment` | n:m Vorarbeiter → Tour (für Doppel-Besetzung etc.) |
| `ops.inspection_task` | Eine konkrete Aufgabe (= Plan-Zeile + Datum) |
| `ops.inspection` | Ausführungs-Record: angefangen/beendet/abgenommen |
| `ops.inspection_item` | Pro Plan-Punkt: status, comment, foto_count |
| `ops.complaint` | Kunden-Beanstandung mit Beschreibung |
| `ops.complaint_response` | Nacharbeit-Eintrag dazu |
| `ops.signature` | Digitale Unterschrift (SVG/PNG + Metadaten) |
| `ops.attachment` | Foto-Belege, gespeichert in File-Storage |

**Status-Enums:**
- `inspection_status`: PLANNED, IN_PROGRESS, COMPLETED, ACCEPTED, DISPUTED
- `inspection_item_status`: DONE, SKIPPED, PROBLEM
- `complaint_status`: OPEN, ACKNOWLEDGED, IN_PROGRESS, RESOLVED, ESCALATED

### 4.3 Beweissicherheit (Phase C)

| Tabelle | Zweck |
|---|---|
| `audit.inspection_hash` | Hash-Chain pro Inspection |
| `audit.export_log` | Welcher User hat wann welchen Export erzeugt |
| `audit.retention_rule` | Aufbewahrungsfristen pro Datentyp |
| `audit.gdpr_request` | DSGVO-Löschanfragen (mit Status) |
| `audit.gdpr_anonymization` | Was wurde wann anonymisiert |

### 4.4 HR & Lohn (Phase E)

| Tabelle | Zweck |
|---|---|
| `hr.employee` | Mitarbeiter-Stamm (kommt aus Personalstamm 2019.accdb wenn verfügbar) |
| `hr.contract` | Arbeitsvertrag + Festlohn |
| `hr.time_punch` | Stempelzeit-Rohdaten (Import aus Stempeluhr) |
| `hr.work_session` | Berechnete Schichten (Begin/Ende/Pause) |
| `hr.absence` | Urlaub/Krank |
| `payroll.wage_rule` | Zuschlagsregeln (versionierbar) |
| `payroll.run` | Abrechnungslauf |
| `payroll.run_line` | Pro MA + Lauf: Bruttosumme + Komponenten |
| `hr.training` | Schulungs-Katalog (z. B. §14 GefStoffV) |
| `hr.training_record` | Wer hat wann welche Schulung |
| `hr.medical_check` | Arbeitsmedizinische Vorsorge |
| `hr.risk_assessment` | Gefährdungsbeurteilung pro MA + Arbeitsplatz (nutzt catalog.hazard_factor) |

**Strikte Trennung** bleibt: `hr.*` und `payroll.*` haben **keine FKs** zu `billing.*`.

### 4.5 Customer-Portal (Phase D)

| Tabelle | Zweck |
|---|---|
| `core.customer_user` | Login für Kunden-Mitarbeiter |
| `core.customer_message` | Kunden-Nachrichten an Münstermann |
| `core.customer_notification_pref` | Wer bei welchem Ereignis benachrichtigt wird |

### 4.6 Logistik (Phase G)

| Tabelle | Zweck |
|---|---|
| `ops.material_stock` | Reinigungsmittel-Bestand pro Lager |
| `ops.material_movement` | Eingang/Ausgang/Verbrauch |
| `ops.material_order` | Bestellung beim Hersteller |
| `ops.vehicle` | Firmen-Fahrzeuge |
| `ops.trip` | Fahrtenbuch (KM, Tankungen, Wartung) |

---

## 5. Phasen-Roadmap

> Iterativ, nicht Big-Bang. Jede Phase liefert nutzbaren Mehrwert.

### Phase A — Stammdaten + Backoffice **(fertig)**
- Datenbank, ETL aus Access, Read+Edit für Kunden + Reinigungsmittel.
- Aktueller Stand. Ab hier baut alles auf.

### Phase B — Inspection-Engine + Mobile PWA **(nächste Etappe, 4-6 Wochen)**
- Identity & Access (Auth.js mit RBAC)
- Tour-Generator + Disponenten-UI
- Mobile PWA: Tagestour, Abhaken, Foto, GPS, Offline
- Abnahme-Maske mit digitaler Signatur
- Beanstandungs-Workflow

**Deliverable:** Vorarbeiter kann eine Tour komplett vom Tablet abarbeiten,
Kunde kann sie abnehmen oder beanstanden. **„Zettel abgeschafft."**

### Phase C — Dokumentationssicherheit + Audit-Paket **(2-3 Wochen)**
- Hash-Chain implementiert + verifiziert
- PDF/A-3-Audit-Paket-Export pro Kunde/Monat
- Aufbewahrungsfristen
- DSGVO-Lösch-Workflow

**Deliverable:** Bei einem IFS-Audit kann das System auf Knopfdruck das
komplette Compliance-Paket der letzten 12 Monate generieren.

### Phase D — Kunden-Portal **(3-4 Wochen)**
- Kunden-Subdomain (eigener Theme/Logo)
- Login pro Kunden-Mitarbeiter
- Eigene Berichte/Tour-Historie einsehen
- Beanstandung selbst einreichen (auch ohne Vorarbeiter-Tablet)
- Vertrags-Einsicht

**Deliverable:** Kunden brauchen nicht mehr anrufen, um zu wissen, was wann
gemacht wurde.

### Phase E — HR-Domäne **(5-7 Wochen, blockiert solange Personalstamm fehlt)**
- Personalstamm-Migration (sobald `Personalstamm 2019.accdb` verfügbar oder
  alternativ aus DATEV/Sage importierbar)
- Stempelzeit-Import-Pipeline (CSV oder API der Stempeluhr-Hersteller)
- Schicht-Berechnung mit versionierten Zuschlagsregeln
- Lohn-Vorbereitung als CSV/Datev-Export
- Schulungsmanagement (§14 GefStoffV, IFS)
- Gefährdungsbeurteilung pro MA × Arbeitsplatz (Multi-Step-Formular)

**Deliverable:** Lohnabrechnung läuft ohne manuelle Excel-Schritte. Schulungen
und Vorsorgeuntersuchungen sind vollständig nachweisbar.

### Phase F — Compliance-Vollausbau **(parallel zu E, 4-6 Wochen)**
- Zentrale Sicherheitsdatenblatt-Verwaltung mit Versionierung
- Auto-Hinweis bei abgelaufenen SDS oder geänderten H-Sätzen
- Mikrobiologie-Kontroll-Workflow (Probe → Labor → Befund → Action)
- IFS-/HACCP-Selfcheck-Wizards

**Deliverable:** Compliance-Lage in Echtzeit sichtbar; abgelaufene Dokumente
schlagen Alarm.

### Phase G — Tour-Optimierung + Logistik **(4-5 Wochen)**
- Geo-basiertes Routing (Mapbox o. Ä.)
- Materialbestand pro Lager + Reorder-Punkte
- Verbrauch pro Kunde/Mittel
- Fahrtenbuch

**Deliverable:** Disponenten sparen Zeit bei Tourenplanung; Lager läuft
nicht mehr leer.

### Phase H — Integrationen + BI **(3-4 Wochen)**
- Orgamax-Sync (bidirektional: Rechnungen einspielen, Stundenbasis ausspielen)
- DATEV/Sage-Export für Buchhaltung
- BI-Dashboards (Kunden-Margen, Beanstandungsquote-Trends, MA-Auslastung)

**Deliverable:** Geschäftsführung sieht KPIs in Echtzeit, ohne dass jemand
Reports klickt.

**Gesamt-Zeitrahmen:** 8-12 Monate für alle Phasen, mit jeweils nutzbaren
Zwischenständen.

---

## 6. Architektur-Erweiterungen

### 6.1 Frontend
- **Backoffice:** Next.js bleibt (das was wir haben)
- **Mobile PWA:** zweite Next.js-App `frontend-mobile` oder Subroute
  `/mobile` mit eigenem Layout, Service Worker, Offline-Cache.
- **Kunden-Portal:** dritte App `frontend-customer` mit eigenem Branding
  pro Kunde (per Sub-Domain).

### 6.2 Backend
- **API-Layer:** Server Actions reichen für Web; für Mobile zusätzlich
  REST-Endpoints (oder tRPC) unter `/api/v1/*`.
- **Background Jobs:** Inngest oder Vercel Cron für:
  - Tägliche Tour-Generierung (1x/Tag um 22:00)
  - Hash-Chain-Verifikation (1x/Stunde)
  - Stempelzeit-Import (alle 6 Stunden)
  - PDF-Audit-Paket-Generierung (nachts)
  - Compliance-Alerts (1x/Tag)

### 6.3 File-Storage
- **Vercel Blob** oder **Cloudflare R2** (S3-kompatibel, kein Egress-Cost)
- Signed URLs für Downloads
- Lifecycle: Audit-relevante Files behalten bis Aufbewahrungsfrist, sonst
  nach 90 Tagen archivieren (Cold-Storage)

### 6.4 Auth
- **Auth.js (NextAuth v5)** mit:
  - Email/Password (für Büro + Vorarbeiter)
  - Magic-Link (für gelegentliche Kunden-Logins)
  - WebAuthn/Passkey (für Admins)
- **RBAC** über `core.user_role`
- **Row-Level Security** in PostgreSQL — die DB selbst weigert sich,
  einem `KUNDE`-User Daten anderer Kunden zu liefern, selbst bei einem
  Fehler in der App-Logik. Beweisbar sicher.

### 6.5 Observability
- Sentry für Frontend-Errors
- DB-Slow-Query-Log
- Audit-Trail ist die fachliche Logging-Quelle (bleibt PostgreSQL)

---

## 7. Sicherheits- und Compliance-Prinzipien

| Prinzip | Umsetzung |
|---|---|
| **Datenminimierung** | Nur was fachlich nötig ist wird gespeichert. PII separat von operativen Daten. |
| **Mandantentrennung** | Row-Level Security in PostgreSQL, getestet durch SQL-Assertions |
| **Beweissicherheit** | Append-only + Hash-Chain + signierte PDFs |
| **DSGVO-Right-to-be-forgotten** | Anonymisierung mit Audit-Trail, nicht echtes DELETE bei Compliance-Datenstücken |
| **Aufbewahrungspflichten** | Konfigurierbare Fristen pro Datentyp, automatische Verfallsmeldungen |
| **Backup/DR** | Neon-PITR + tägliche Snapshots in S3-Cold-Storage |
| **Auth** | 2FA Pflicht für ADMIN/BÜRO, Magic-Link für Externe |
| **Auditbarkeit** | Jede Read- und Write-Operation eines DSB-relevanten Datums wird geloggt |

---

## 8. Was sich am bisherigen ändert (Refactor-Punkte)

1. **`audit.activity_log` bekommt Hash-Chain-Spalte** (`previous_hash`, `current_hash`),
   plus tägliche Verifikation.
2. **`core.customer` bekommt `parent_organization_id`** für Kunden mit
   mehreren Standorten (heute hat Münstermann das ggf. nicht, kommt aber).
3. **`ops.hygiene_control_plan` bleibt** — wird Quelle des Tour-Generators.
4. **`ops.work_instruction` bleibt** — bekommt zusätzliche Felder für
   Standard-Foto-Vorlagen (z. B. "vor Reinigung", "nach Reinigung").
5. **Inspection-Tabellen sind NEU**, keine Access-Quelle.
6. **JSONB `legacy_attributes` in `customer_hygiene_plan`** wird in Phase B
   in strukturierte Recipe-Felder aufgelöst (R1/K1/E1/D1 = Reinigungsmittel/
   Konzentration/Einwirkzeit/Desinfektion).

---

## 9. Offene Fragen / Klärungsbedarf

**Tech:**
- Wie soll die digitale Signatur rechtlich abgesichert sein?
  - Variante A: einfache Bilddatei + Hash → reicht für interne Doku
  - Variante B: qualifizierte elektronische Signatur (QES) per DocuSign/D-Trust
    → notwendig wenn Verträge mitsigniert werden, aber für Tour-Abnahme overkill
- Welche Stempeluhren-Modelle sind im Einsatz? Davon hängt der Import-Pfad ab.
- Welche Bandbreite haben die Reinigungsbetriebe vor Ort (Funkloch in Kühlhalle)?

**Fachlich:**
- Wer entscheidet bei Beanstandung über Nachbesserung? Vorarbeiter? Disponent?
- Wer signiert auf Kunden-Seite — der konkrete Produktionsleiter, oder genügt
  jeder anwesende Mitarbeiter mit „Vorgesetzten-Hut"?
- Wieviele Foto-Belege pro Tour sind realistisch (für Storage-Sizing)?
- Welche Auditoren prüfen Münstermann (intern, IFS-Zertifizierer, Behörde)?
  Daraus folgt der Detailgrad des Audit-Pakets.

**Datenschutz:**
- Wer ist DSB? Wie wird der einbezogen für Login + Personen-PII?
- Wie geht das System mit Krank-Daten um (besonders schützenswert)?

---

## 10. Erfolgsmaßstab

Nach 12 Monaten ist die Plattform erfolgreich, wenn:

1. **Kein Vorarbeiter füllt mehr einen Papier-Zettel aus.**
2. **Jeder Kunde kann selbst sehen**, was am Vortag bei ihm gereinigt
   wurde, ohne anzurufen.
3. **Eine externe IFS-Auditorin kann in <30 Minuten** durch das System
   navigieren und ein Audit für einen Stichmonat durchlaufen.
4. **Die Beanstandungsquote sinkt um mindestens 25 %**, weil Probleme
   sofort sichtbar werden und nachgebessert werden können.
5. **Lohnabrechnung dauert maximal 2 Stunden statt 2 Tage** pro Monat.
6. **Die monatliche Compliance-Berichterstattung** für Geschäftsleitung
   passiert automatisch (nicht manuell pro Excel-Datei).

---

## Anhang: Verhältnis zum bisherigen Migrationsplan

Dieses Vision-Dokument **erweitert** den Migrationsplan unter
`~/.claude/plans/aufgabe-migrationsplan-access-jiggly-scroll.md` —
es ersetzt ihn nicht. Der Migrationsplan war "wie kommen wir von Access
nach PostgreSQL" und ist abgeschlossen (Phase 0 + 1 + 2 + 4). Dieses
Dokument ist "wie kommen wir vom migrierten Stammdaten-Backend zu einer
echten Operationsplattform" und definiert Phase B-H.

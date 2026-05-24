# Architektur — Münstermann Migration

Übersicht über die PostgreSQL-Zielstruktur. Alle Diagramme sind in
[Mermaid](https://mermaid.js.org/) — werden direkt in GitHub, GitLab, VS Code
und vielen anderen Markdown-Renderern angezeigt. Wer kein Mermaid hat,
findet weiter unten ASCII-Fallbacks.

---

## 1. Schema-Übersicht — die vier Domänen

```mermaid
flowchart TB
    subgraph audit["📋 audit (Querschnitt)"]
        log["activity_log<br/>JEDE Änderung wird hier protokolliert"]
    end

    subgraph catalog["🧪 catalog — Stammdaten + Compliance"]
        direction LR
        ca["cleaning_agent<br/>292 Reinigungsmittel"]
        hp["hygiene_plan<br/>40 Master-Pläne"]
        hs["hazard_substance / hazard_factor<br/>Gefahrstoffe + GefStoffV"]
    end

    subgraph core["👥 core — Kunden"]
        direction LR
        bu["business_unit<br/>H und I / Services"]
        cust["customer<br/>89 Kunden"]
        cp["customer_contact_person"]
    end

    subgraph ops["⚙️ ops — Operatives pro Kunde"]
        direction LR
        d["department<br/>191 Abteilungen"]
        do["department_object<br/>1421 Objekte"]
    end

    cust ==> d
    bu ==> cust
    d ==> do

    log -. "Trigger" .-> catalog
    log -. "Trigger" .-> core
    log -. "Trigger" .-> ops

    style audit fill:#fff3cd,stroke:#f0ad4e
    style catalog fill:#d1ecf1,stroke:#17a2b8
    style core fill:#d4edda,stroke:#28a745
    style ops fill:#e2e3e5,stroke:#6c757d
```

**Lese-Richtung:** `catalog` enthält Stammdaten (was es gibt), `core` enthält Kunden
(wer es bekommt), `ops` enthält operative Daten (was bei welchem Kunden gemacht wird).
`audit` ist ein Querschnitts-Schema, das jede Änderung in den drei anderen mitschreibt.

---

## 2. Detail — Catalog-Domäne

Die Reinigungsmittel-Welt. Hier liegt der **Compliance-Kern** (GefStoffV / REACH / CLP).

```mermaid
erDiagram
    cleaning_agent }o--|| manufacturer : "produziert von"
    cleaning_agent }o--|| storage_class : "Lagerklasse"
    cleaning_agent ||--o{ cleaning_agent_hazard_substance : "Komponenten"
    cleaning_agent ||--o{ cleaning_agent_hazard_phrase : "H-Sätze"
    cleaning_agent ||--o{ cleaning_agent_hazard_symbol : "Piktogramme"
    cleaning_agent ||--o{ cleaning_agent_ppe_symbol : "PSA"

    manufacturer }o--|| poison_information_center : "Notruf-Stelle"

    hazard_phrase }o--|| hazard_phrase_category : "Kategorie (H200/H300/H400)"

    hygiene_plan ||--o{ hygiene_plan_step : "Arbeitsschritte"

    cleaning_agent {
        bigint id PK
        text name
        text ph_value
        text water_hazard_class
        text hazard_legacy_text "R-Sätze, nicht H-Sätze"
        bigint manufacturer_id FK
        bigint storage_class_id FK
    }
    manufacturer {
        bigint id PK
        text name
        text city
        text email
        bigint poison_center_id FK
    }
    hazard_phrase {
        bigint id PK
        text code "H290, EUH066, ..."
        text description
        bigint category_id FK
    }
    hygiene_plan {
        bigint id PK
        text code "A.1, B.3, ..."
        text title
        text recommended_agent_text
    }
    hygiene_plan_step {
        bigint id PK
        bigint hygiene_plan_id FK
        integer step_number
        text task_description
        text procedure
    }
```

**Junction-Tabellen** (n:m-Beziehungen, aus Access "Gefahrstoffe 1-5" etc. aufgelöst):
`cleaning_agent_hazard_substance`, `cleaning_agent_hazard_phrase`, `cleaning_agent_hazard_symbol`, `cleaning_agent_ppe_symbol`.

Daneben (nicht im Diagramm, weil keine FKs zu cleaning_agent): `hazard_substance`
(Master-Gefahrstoffliste), `hazard_factor` (GefStoffV-Faktoren-Katalog).

---

## 3. Detail — Core + Ops (Kunden-Welt)

```mermaid
erDiagram
    business_unit ||--o{ customer : "Mandantentrennung"
    customer ||--o{ customer_contact_person : "Ansprechpartner"
    customer ||--o{ department : "Abteilungen"
    department ||--o{ department_object : "Objekte / Geräte"

    business_unit {
        smallint id PK
        text code "H_UND_I oder SERVICES"
        text name
    }
    customer {
        bigint id PK
        text name "Firma"
        smallint business_unit_id FK
        integer customer_number "eindeutig pro Mandant"
        text city
        text supervisor "Betreuer"
    }
    customer_contact_person {
        bigint id PK
        bigint customer_id FK
        text first_name
        text last_name
        text email
        text phone
    }
    department {
        bigint id PK
        bigint customer_id FK
        integer department_number
        text name "Abteilung"
        text floor "Etage (REWE)"
    }
    department_object {
        bigint id PK
        bigint department_id FK
        text name "Objekt / Gerät"
        text execution_type
        text control_interval
        text monday_code "+ Dienstag..Sonntag"
    }
```

---

## 4. Vertikaler Datenfluss — Wie laufen die Tabellen zusammen?

Beispiel: ein Reinigungseinsatz beim Kunden Borgmeier in der Abteilung
"Vorraum" mit dem Mittel "Rauchharzentferner FR":

```mermaid
flowchart LR
    bu["business_unit<br/>(1) H und I"]
    cust["customer<br/>(100) Borgmeier"]
    dept["department<br/>Vorraum"]
    obj["department_object<br/>Edelstahlbecken"]
    plan["hygiene_plan<br/>(A.1) alkalisch/sauer"]
    step["hygiene_plan_step<br/>Schritt 1: vorspülen"]
    ca["cleaning_agent<br/>Rauchharzentferner FR"]
    mfg["manufacturer<br/>BÜFA"]
    haz["hazard_substance<br/>Natriumhydroxid"]

    bu --> cust
    cust --> dept
    dept --> obj
    plan --> step
    ca --> mfg
    ca -.-> haz

    obj -. "nutzt" .-> ca
    obj -. "folgt" .-> plan

    style bu fill:#d4edda
    style cust fill:#d4edda
    style dept fill:#e2e3e5
    style obj fill:#e2e3e5
    style plan fill:#d1ecf1
    style step fill:#d1ecf1
    style ca fill:#d1ecf1
    style mfg fill:#d1ecf1
    style haz fill:#d1ecf1
```

Die gepunkteten Verbindungen `obj -. nutzt .-> ca` und `obj -. folgt .-> plan` sind
**noch nicht modelliert** — sie kommen in der nächsten Etappe als
`ops.department_object_cleaning_agent` und `ops.customer_hygiene_plan`.

---

## 5. Audit-Trail (audit-Schema)

Jede `INSERT`/`UPDATE`/`DELETE` auf einer fachlichen Tabelle wird durch einen
Trigger nach `audit.activity_log` geschrieben:

```mermaid
flowchart LR
    A["Anwendung<br/>SET LOCAL app.user_id = 'frank@münstermann'"]
    T["fachliche Tabelle<br/>z.B. catalog.cleaning_agent"]
    L["audit.activity_log<br/>(actor, action, old_row, new_row, txid)"]

    A -- "UPDATE" --> T
    T -- "Trigger" --> L

    style L fill:#fff3cd,stroke:#f0ad4e
```

Das gibt uns rechtssichere Nachvollziehbarkeit (HACCP, GefStoffV, IFS-Audit-Anforderung).

---

## ASCII-Fallback (für Renderer ohne Mermaid)

```
   ┌───────────────────────────────────────────────────────────────┐
   │ audit.activity_log    ←──  Trigger auf jeder fachlichen Tabelle│
   └───────────────────────────────────────────────────────────────┘
                                ↑          ↑          ↑
                                │          │          │
   ╔═══════════════════════════╗  ╔═══════════════╗  ╔══════════════════╗
   ║ catalog (Stammdaten)      ║  ║ core (Kunden) ║  ║ ops (operativ)   ║
   ║                           ║  ║               ║  ║                  ║
   ║  hazard_phrase_category   ║  ║ business_unit ║  ║ department       ║
   ║     ↓                     ║  ║      ↓        ║  ║      ↓           ║
   ║  hazard_phrase            ║  ║ customer ────────→ department_object║
   ║                           ║  ║      ↓        ║  ║                  ║
   ║  poison_information_center║  ║ contact_person║  ╚══════════════════╝
   ║     ↓                     ║  ║               ║          ↑
   ║  manufacturer             ║  ║ country       ║          │
   ║     ↓                     ║  ║ microbio_lab  ║          │
   ║  cleaning_agent ──────────╬──╬───────────────╬──────────┘
   ║   ↓ (n:m Junctions)       ║  ║               ║
   ║  hazard_substance         ║  ╚═══════════════╝
   ║  hazard_phrase            ║
   ║  hazard_symbol            ║
   ║  ppe_symbol               ║
   ║                           ║
   ║  storage_class            ║
   ║                           ║
   ║  hygiene_plan             ║
   ║     ↓                     ║
   ║  hygiene_plan_step        ║
   ║                           ║
   ║  hazard_factor (GefStoffV)║
   ╚═══════════════════════════╝
```

---

## Wie schaue ich die Mermaid-Diagramme an?

- **GitHub-Web-Oberfläche**: rendert das `.md` direkt — diese Datei einfach im Repo öffnen.
- **VS Code**: Markdown-Vorschau (`Cmd+Shift+V`) + Extension "Markdown Preview Mermaid Support".
- **Online**: Code aus den Diagrammen kopieren und in [mermaid.live](https://mermaid.live) einfügen.
- **In der Konsole**: ASCII-Fallback unten reicht.

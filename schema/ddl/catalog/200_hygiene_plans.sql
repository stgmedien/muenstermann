-- Catalog-Domäne: Hygienepläne (Master-Vorlage) + Gefahrstoffverzeichnis
--
-- Quelle: Reinigungspläne.accdb (40 Hygienepläne, 244 Arbeitsschritte,
--         23 Gefahrstoffe).
-- Diese Tabellen sind die zentrale Vorlage, von der Kunden-DBs ihre
-- jeweiligen Plan-/Schritt-Listen ableiten (siehe ADR-002 zur
-- schichten-basierten Architektur).

set search_path = catalog, public;

-- ---------- Hygieneplan (Master-Vorlage) ----------

create table if not exists catalog.hygiene_plan (
    id                       bigint generated always as identity primary key,
    legacy_id                text unique,                  -- aus PlanNr
    plan_number              integer not null unique,      -- numerische PlanNr
    code                     text not null,                -- aus Plan (z. B. "A.1", "B.3", "C.1")
    title                    text not null,                -- aus T1
    recommended_agent_text   text,                         -- aus M1 (Memo, Freitext mit Hersteller/Produkt/Konz/Zeit/Temp)
    created_at               timestamptz not null default now(),
    updated_at               timestamptz not null default now()
);
create index if not exists hygiene_plan_code_idx on catalog.hygiene_plan (code);
comment on table catalog.hygiene_plan is
    'Master-Hygienepläne. Quelle: 003 Hygienepläne in Reinigungspläne.accdb. '
    'Die Multi-Memo-Spalten M2-M9 + Besonderheiten 1-3 + Hinweise zur Anpassung '
    'waren in der Quelle vollständig leer und wurden gemäß ADR-003 Regel 3 nicht migriert.';
comment on column catalog.hygiene_plan.recommended_agent_text is
    'Reinigungsmittel-Empfehlung pro Plan als unstrukturiertes Memo aus Access (M1). '
    'Parsing in eine Junction catalog.hygiene_plan_recommended_agent ist ein separater Schritt.';

-- ---------- Hygieneplan-Arbeitsschritte ----------

create table if not exists catalog.hygiene_plan_step (
    id                bigint generated always as identity primary key,
    legacy_id         text,                                          -- es gibt keinen PK in Access; legacy_id zusammengesetzt aus PlanNr+Arbeitsschritt
    hygiene_plan_id   bigint not null references catalog.hygiene_plan(id) on delete cascade,
    step_number       integer not null,                              -- aus Arbeitsschritt
    status            text,                                          -- aus Status
    task_description  text not null,                                 -- aus Aufgaben (Memo)
    procedure         text,                                          -- aus Verfahren (Memo)
    equipment         text,                                          -- aus Geräte (Memo)
    notes             text,                                          -- aus Hinweise (Memo)
    created_at        timestamptz not null default now(),
    unique (hygiene_plan_id, step_number)
);
create index if not exists hygiene_plan_step_plan_idx
    on catalog.hygiene_plan_step (hygiene_plan_id);
comment on table catalog.hygiene_plan_step is
    'Einzelne Arbeitsschritte pro Hygieneplan. Quelle: 003 Hygienepläne Arbeitsschritte. '
    'Die "Hinweise zur Anpassung"-Spalte war in der Quelle vollständig leer (ADR-003 Regel 3).';

-- ---------- Gefahrstoff-Stammdaten (Master-Verzeichnis) ----------

create table if not exists catalog.hazard_substance (
    id                  bigint generated always as identity primary key,
    legacy_id           text unique,                      -- aus ID
    name                text not null,                    -- aus Artikelname
    sds_document_path   text,                             -- aus Pfadtext (Verweis auf Sicherheitsdatenblatt-Pfad)
    created_at          timestamptz not null default now()
);
create index if not exists hazard_substance_name_idx on catalog.hazard_substance (lower(name));
comment on table catalog.hazard_substance is
    'Master-Verzeichnis Gefahrstoffe. Quelle: 021 Gefahrstoffverzeichnis in Reinigungspläne.accdb. '
    'Die ArtNr-Spalte war konstant (1 Distinct), Menge jährl und Standort waren leer — '
    'alle drei wurden gemäß ADR-003 nicht migriert. '
    'Die Junction catalog.cleaning_agent_hazard_substance.substance_name (Freitext) kann '
    'in einem späteren ETL-Schritt per Fuzzy-Match gegen diese Master-Liste aufgelöst werden.';

-- ---------- Audit ----------

select audit.enable_for('catalog', 'hygiene_plan');
select audit.enable_for('catalog', 'hygiene_plan_step');
select audit.enable_for('catalog', 'hazard_substance');

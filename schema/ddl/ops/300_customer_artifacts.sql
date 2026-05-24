-- Ops-Domäne: kundenspezifische Hygienepläne, Arbeitsanweisungen, Gefahrstoffe
--
-- Quellen (aus den 3 Kunden-DBs):
--   003 Hygienepläne                    → ops.customer_hygiene_plan
--   003 Hygienepläne Arbeitsschritte    → ops.customer_hygiene_plan_step
--   010 Arbeitsanweisungen alles        → ops.work_instruction
--   021 Gefahrstoffverzeichnis          → ops.customer_hazard_substance
--
-- WICHTIG: die kundenspezifischen 003-Hygienepläne haben gegenüber der
-- Master-Tabelle in Reinigungspläne.accdb VIELE zusätzliche Spalten
-- (R1, R2, K1, K2, E1, E2, D1, D2, DW, DK1, DK2, Wie1, Wie2, Einsatzort1-4).
-- Diese Spalten sind kryptisch und nicht eindeutig fachlich zuordenbar.
-- Pragmatisch: sie wandern als JSONB legacy_attributes mit — kein
-- Datenverlust, aber fachliche Re-Strukturierung als TODO.

set search_path = ops, core, catalog, public;

-- ---------- Kundenspezifischer Hygieneplan (n:1 zu catalog.hygiene_plan optional) ----------

create table if not exists ops.customer_hygiene_plan (
    id                       bigint generated always as identity primary key,
    legacy_id                text not null,                                              -- "<customer>:<PlanNr>"
    customer_id              bigint not null references core.customer(id),
    master_hygiene_plan_id   bigint references catalog.hygiene_plan(id),                 -- optional FK auf den Master-Plan
    plan_number              integer not null,                                           -- aus PlanNr
    code                     text,                                                       -- aus Plan (z. B. "A.1")
    title                    text not null,                                              -- aus T1
    recommended_agent_text   text,                                                       -- aus M1 (Memo, Reinigungsmittel-Empfehlung als Freitext)
    legacy_attributes        jsonb,                                                      -- R1, K1, E1, D1, Einsatzort1-4 etc.
    created_at               timestamptz not null default now(),
    updated_at               timestamptz not null default now(),
    unique (customer_id, plan_number)
);
create index if not exists customer_hygiene_plan_customer_idx
    on ops.customer_hygiene_plan (customer_id);
create index if not exists customer_hygiene_plan_master_idx
    on ops.customer_hygiene_plan (master_hygiene_plan_id);
comment on table ops.customer_hygiene_plan is
    'Kundenspezifische Hygienepläne (jede Kunden-DB pflegt eigene Pläne, die häufig '
    'aber nicht immer von einem Master-Plan in catalog.hygiene_plan abstammen). '
    'legacy_attributes enthält semi-strukturierte Felder (R1/K1/E1 etc.), '
    'deren fachliche Bedeutung noch zu klären ist.';
comment on column ops.customer_hygiene_plan.legacy_attributes is
    'Aus Access übernommen: R1/R2 (Reinigungsmittel?), K1/K2 (Konzentration?), '
    'E1/E2 (Einwirkzeit?), D1/D2/DW/DK1/DK2/DE1/DE2 (Desinfektion?), '
    'Wie1/Wie2 (Wie/Verfahren?), Einsatzort1-4 (Anwendungsbereiche). '
    'TODO: in eine strukturierte ops.customer_hygiene_plan_recipe normalisieren, '
    'sobald die Felder fachlich bestätigt sind.';

-- ---------- Arbeitsschritte des kundenspezifischen Hygieneplans ----------

create table if not exists ops.customer_hygiene_plan_step (
    id                          bigint generated always as identity primary key,
    legacy_id                   text not null,                                          -- "<customer>:<PlanNr>-<Arbeitsschritt>"
    customer_hygiene_plan_id    bigint not null references ops.customer_hygiene_plan(id) on delete cascade,
    step_number                 integer not null,                                       -- aus Arbeitsschritt
    status                      text,
    task_description            text not null,                                          -- aus Aufgaben (Memo)
    procedure                   text,                                                   -- aus Verfahren
    equipment                   text,                                                   -- aus Geräte
    notes                       text,                                                   -- aus Hinweise
    created_at                  timestamptz not null default now(),
    unique (customer_hygiene_plan_id, step_number)
);
create index if not exists customer_hygiene_plan_step_plan_idx
    on ops.customer_hygiene_plan_step (customer_hygiene_plan_id);

-- ---------- Arbeitsanweisung pro Objekt (welcher Hygieneplan gilt) ----------

create table if not exists ops.work_instruction (
    id                          bigint generated always as identity primary key,
    legacy_id                   text not null,                                          -- "<customer>:<ObID>"
    customer_id                 bigint not null references core.customer(id),
    department_id               bigint references ops.department(id) on delete set null,
    department_object_id        bigint references ops.department_object(id) on delete cascade,
    customer_hygiene_plan_id    bigint references ops.customer_hygiene_plan(id),
    -- Snapshot-Felder
    department_number_snapshot  integer,
    department_name_snapshot    text,
    object_number_snapshot      text,
    object_name_snapshot        text,
    plan_number_snapshot        integer,
    created_at                  timestamptz not null default now(),
    unique (customer_id, legacy_id)
);
create index if not exists work_instruction_customer_idx
    on ops.work_instruction (customer_id);
create index if not exists work_instruction_object_idx
    on ops.work_instruction (department_object_id);
create index if not exists work_instruction_plan_idx
    on ops.work_instruction (customer_hygiene_plan_id);
comment on table ops.work_instruction is
    'Verknüpfung: für welches Objekt gilt welcher Hygieneplan. Quelle: '
    '010 Arbeitsanweisungen alles. In Access ist das eine flache Liste; in PG '
    'sind FKs auf department / department_object / customer_hygiene_plan gesetzt, '
    'soweit per (Abteilungs-Nr, Objekt-Nr/ObID, PlanNr) auflösbar.';

-- ---------- Kundenspezifisches Gefahrstoffverzeichnis ----------

create table if not exists ops.customer_hazard_substance (
    id                          bigint generated always as identity primary key,
    legacy_id                   text not null,                                          -- "<customer>:<ID>"
    customer_id                 bigint not null references core.customer(id),
    master_hazard_substance_id  bigint references catalog.hazard_substance(id),         -- optional FK auf Master (per Name-Match)
    name                        text not null,                                          -- aus Artikelname
    location                    text,                                                   -- aus Standort (selten befüllt)
    annual_quantity_text        text,                                                   -- aus Menge jährl
    sds_document_path           text,                                                   -- aus Pfadtext
    created_at                  timestamptz not null default now(),
    unique (customer_id, legacy_id)
);
create index if not exists customer_hazard_substance_customer_idx
    on ops.customer_hazard_substance (customer_id);
comment on table ops.customer_hazard_substance is
    'Kundenspezifisches Gefahrstoffverzeichnis (GefStoffV §6 Absatz 1: jeder '
    'Betrieb muss ein eigenes Verzeichnis führen). Quelle: 021 Gefahrstoffverzeichnis. '
    'master_hazard_substance_id verweist optional auf den zentralen catalog-Master.';

select audit.enable_for('ops', 'customer_hygiene_plan');
select audit.enable_for('ops', 'customer_hygiene_plan_step');
select audit.enable_for('ops', 'work_instruction');
select audit.enable_for('ops', 'customer_hazard_substance');

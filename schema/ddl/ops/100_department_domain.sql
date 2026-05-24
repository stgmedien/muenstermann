-- Ops-Domäne: Abteilungen + Objekte (pro Kunde)
--
-- Quellen: pro Kunde eine Access-DB (100 Borgmeier, 540 Bittner, 60 REWE).
-- Tabellen: 001 Abteilungen, 002 Abt-Objekte.
--
-- Modell-Entscheidungen:
-- - department.customer_id verknüpft mit core.customer (über Kunden-Nr-Lookup)
-- - department.department_number ist eindeutig pro Kunde (composite-unique)
-- - department_object.department_id ist die FK, NICHT die Access-Spalte
--   "Abteilungs-Nr" (die in Access nicht foreign-keyed war)
-- - Mehrere Wochentag-Spalten (Montag bis Sonntag, jeweils Count + Code)
--   bleiben als separate Spalten — fachlich klar definiert, kein Antipattern
--   sondern ein Wochenrhythmus-Modell.

set search_path = ops, core, public;

create table if not exists ops.department (
    id                          bigint generated always as identity primary key,
    legacy_id                   text not null,                                       -- "<customer_number>:<Abteilungs-Nr>"
    customer_id                 bigint not null references core.customer(id),
    department_number           integer not null,                                    -- aus Abteilungs-Nr
    name                        text not null,                                       -- aus Abteilung
    floor                       text,                                                -- aus Etage (REWE-spezifisch)
    area_number                 smallint,                                            -- aus BereichNr (REWE)
    area_name                   text,                                                -- aus Bereich (REWE)
    customer_department_number  text,                                                -- aus "Abteilungs-Nr Kunde" (REWE; kundenseitige Nummer)
    created_at                  timestamptz not null default now(),
    unique (customer_id, department_number)
);
create index if not exists department_customer_idx on ops.department (customer_id);
comment on table ops.department is
    'Abteilungen pro Kunde. Quelle: 001 Abteilungen in den Kunden-DBs. '
    'Die meisten Access-Spalten waren leer/konstant (siehe Profil) — auf 7 fachlich befüllte reduziert.';

create table if not exists ops.department_object (
    id                  bigint generated always as identity primary key,
    legacy_id           text not null,                                                -- "<customer_number>:<ObID>"
    department_id       bigint not null references ops.department(id) on delete cascade,
    object_number       text,                                                         -- aus Objekt-Nr (Freitext, kann "0010a" sein)
    name                text not null,                                                -- aus Objekt
    -- "Anzahl" ist in Access VARCHAR, weil teilweise Freitext ("2 Stk", "ca. 5"); als text behalten.
    quantity_text       text,
    execution_count     smallint,                                                     -- aus AusführungZahl
    execution_type      text,                                                         -- aus Ausführung
    execution_code      text,                                                         -- aus AusführungKennziffer
    cleaning_method     text,                                                         -- aus AusführungReinigung
    additional_work     boolean,                                                      -- aus Zusatzarbeiten
    control_interval    text,                                                         -- aus Kontroll_intervall (Freitext)
    k_factor            text,                                                         -- aus KFaktor
    -- Wochenrhythmus: Anzahl + Code pro Wochentag
    monday_count        smallint,
    monday_code         text,
    tuesday_count       smallint,
    tuesday_code        text,
    wednesday_count     smallint,
    wednesday_code      text,
    thursday_count      smallint,
    thursday_code       text,
    friday_count        smallint,
    friday_code         text,
    saturday_count      smallint,
    saturday_code       text,
    sunday_count        smallint,
    sunday_code         text,
    created_at          timestamptz not null default now(),
    unique (department_id, legacy_id)
);
create index if not exists department_object_dept_idx on ops.department_object (department_id);
comment on table ops.department_object is
    'Objekte/Geräte pro Abteilung mit Reinigungs-Rhythmus. Quelle: 002 Abt-Objekte. '
    'Reduziert von 36 Spalten auf ~25 fachlich befüllte (Profil zeigt 15+ leere Spalten).';

select audit.enable_for('ops', 'department');
select audit.enable_for('ops', 'department_object');

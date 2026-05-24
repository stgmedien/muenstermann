-- Core-Domäne: Kunden-Stammdaten
--
-- Quellen: Adressen - Anschriften - H und I.accdb  (81 Kunden)
--          Adressen - Anschriften - Services.accdb (8 Kunden)
--
-- Beide Adressbücher sind nach Geschäftsbereich getrennt geführt, jedoch
-- mit weitgehend gleichem Schema. Die Migration konsolidiert sie in EIN
-- core.customer-Modell mit business_unit-Spalte als Mandantentrennung.

set search_path = core, catalog, public;

-- ---------- Mandanten / Geschäftsbereich ----------

create table if not exists core.business_unit (
    id          smallint primary key,
    code        text not null unique,
    name        text not null
);
comment on table core.business_unit is
    'Münstermann-Geschäftsbereiche: H_UND_I (Hauptbetrieb, regulierte Lebensmittelreinigung), '
    'SERVICES (abgespaltenes Geschäftsfeld). Seed-Daten in schema/ddl/core/100_customer_domain.sql.';
insert into core.business_unit (id, code, name)
values
    (1, 'H_UND_I', 'Münstermann H und I'),
    (2, 'SERVICES', 'Münstermann Services')
on conflict (id) do nothing;

-- ---------- Nationen (Lookup, aus "Bewerbungen Hilfe") ----------

create table if not exists core.country (
    id          bigint generated always as identity primary key,
    legacy_id   text unique,                       -- aus Nationnummer
    name        text not null unique               -- aus Nation
);
comment on table core.country is
    'Nationalitäten-Lookup. Quelle: Bewerbungen Hilfe (in beiden Adress-DBs identisch). '
    'Konsolidiert auf einen Bestand.';

-- ---------- Kundenstammdaten ----------

create table if not exists core.customer (
    id                          bigint generated always as identity primary key,
    legacy_id                   text not null,                                          -- aus Kunden-Nr
    business_unit_id            smallint not null references core.business_unit(id),
    cleaning_group              integer not null,                                       -- aus Reinigungsgruppe
    customer_number             integer not null,                                       -- aus Kunden-Nr (numerisch)
    name                        text not null,                                          -- aus Firma
    name_supplement             text,                                                   -- aus Zusatz
    -- Adresse (in 20/81 Fällen NULL — Datenlücke, kein NOT NULL)
    street                      text,
    postal_code                 text,
    city                        text,
    federal_state               text,                                                   -- aus Bundesland
    -- Kontakt
    phone                       text,
    fax                         text,
    -- Operatives
    supervisor                  text,                                                   -- aus Betreuer
    team_lead                   text,                                                   -- aus Vorarbeiter
    hour_sheet_format           text,                                                   -- aus StdZettel
    match_code                  text,                                                   -- aus "Kunden Matchcode"
    cleaning_agent_freetext     text,                                                   -- aus Reinigungsmittel (62/81 leer; in 19 Fällen Freitext)
    disinfectant_freetext       text,                                                   -- aus Desinfektionsmittel
    -- Boolean-Flags
    flat_rate_billing           boolean not null default false,                         -- aus Pauschale
    extra_work_allowed          boolean not null default false,                         -- aus Zusatzarbeiten
    swab_tests_required         boolean not null default false,                         -- aus Abstriche
    weekly_audit                boolean not null default false,                         -- aus wöchentlich
    monthly_audit               boolean not null default false,                         -- aus monatlich
    vacation_audit              boolean not null default false,                         -- aus Auswertung Urlaub
    sickness_audit              boolean not null default false,                         -- aus Auswertung Krank
    -- "Tags" 1-5 sind Freitext-Spalten in Access mit unklarer Bedeutung.
    -- Erste Spalte ("1") in 40 von 81 Kunden gefüllt mit 36 Distinct-Werten → vermutlich Branche/Tag.
    -- Spalten 4 + 5 sind 85 / 90 % leer → wahrscheinlich unbenutzt.
    -- Pragmatisch behalten als tag_1..tag_3; tag_4/tag_5 weggelassen (ADR-003).
    tag_1                       text,
    tag_2                       text,
    tag_3                       text,
    -- Buchhaltung (in den Probedaten alle leer — siehe Migration-Report)
    -- bank_account, bank_code, delivery_terms, payment_terms wurden ausgelassen
    -- weil 81/81 NULL (ADR-003 Regel 3).
    created_at                  timestamptz not null default now(),
    updated_at                  timestamptz not null default now(),
    unique (business_unit_id, customer_number)                                          -- Kunden-Nr eindeutig pro Mandant
);
create index if not exists customer_business_unit_idx on core.customer (business_unit_id);
create index if not exists customer_name_idx on core.customer (lower(name));
create index if not exists customer_match_code_idx on core.customer (match_code);
comment on table core.customer is
    'Kunden-Stammdaten, konsolidiert aus den beiden Adressbüchern. '
    'business_unit_id trennt Hauptbetrieb (H und I) von Services. '
    'Adresse ist nullable, weil in 20/81 H-und-I-Kunden leer — fachliche Datenlücke aus Access.';
comment on column core.customer.legacy_id is
    'Original Kunden-Nr aus Access (als string, da quellseitig Integer aber Cross-DB potenziell nicht eindeutig).';

-- ---------- Ansprechpartner pro Kunde ----------

create table if not exists core.customer_contact_person (
    id              bigint generated always as identity primary key,
    customer_id     bigint not null references core.customer(id) on delete cascade,
    salutation      text,                                                               -- aus Geschlecht
    first_name      text,                                                               -- aus Vorname
    last_name       text,                                                               -- aus Name
    position        text,
    email           text,
    phone           text,
    fax             text,
    created_at      timestamptz not null default now()
);
create index if not exists customer_contact_person_customer_idx
    on core.customer_contact_person (customer_id);
comment on table core.customer_contact_person is
    'Ansprechpartner pro Kunde. Quelle: Kunden Ansprechpartner (in beiden Adress-DBs).';

-- ---------- Mikrobiologische Labore (Mibi-Kontrolle) ----------

create table if not exists core.microbiological_lab (
    id          bigint generated always as identity primary key,
    legacy_id   text unique,                       -- aus Nr
    name        text not null                      -- aus Nom (Französisch? "Nom" = Name)
);
comment on table core.microbiological_lab is
    'Mikrobiologische Kontroll-Stellen / Labore. Quelle: Kunden Mibikontrolle (Adressen H und I). '
    'Nur 11 Einträge. Die Spalte heißt "Nom" — möglicherweise französisch motiviert.';

select audit.enable_for('core', 'business_unit');
select audit.enable_for('core', 'country');
select audit.enable_for('core', 'customer');
select audit.enable_for('core', 'customer_contact_person');
select audit.enable_for('core', 'microbiological_lab');

-- Core-Domäne: Bundesländer + Feiertage
--
-- Quelle: Kalender 2026.accdb
--   tbl_Bundesländer (17 Einträge)   → core.federal_state
--   Feiertage (20 Einträge)          → core.public_holiday
--                                    + core.public_holiday_federal_state (Junction)
--
-- NICHT migriert (siehe ETL-Report):
--   Kalender (365 Tage des Jahres) — in PG generierbar via generate_series
--   KalenderXX (16 Bundesländer-Kalender + NL, je 12 Zeilen Monatslisten)
--   Monatsnamen (12) — i18n in der Anwendung, keine Domänen-Daten
--   KalenderWochen (53 Wochen mit Tagesdaten) — redundant zum Kalender
--   Temp_Kalender* (Reports-Pivot-Vorlagen)
--   Initialisierung (Konfigurations-Zeile)
--   Kalender Könecke (kundenspezifisch — falls Bedarf, in ops.* nachziehen)

set search_path = core, public;

-- ---------- Bundesländer (inkl. Niederlande) ----------

create table if not exists core.federal_state (
    id              smallint primary key,                                   -- aus BL_Nr (1-17)
    legacy_id       text unique,                                            -- aus ID (Access)
    name            text not null,                                          -- aus Bundesland
    abbreviation    text not null unique,                                   -- aus BL_Kürzel (BW, BY, ..., NL)
    is_german_state boolean not null
);
comment on table core.federal_state is
    '16 deutsche Bundesländer + Niederlande (NL). Quelle: tbl_Bundesländer in Kalender 2026.accdb. '
    'NL ist mit aufgeführt, weil Münstermann mindestens einen niederländischen Kunden hat '
    '(siehe Kalender-NL-Tabelle in der Quelle).';

-- ---------- Feiertage ----------

create table if not exists core.public_holiday (
    id              bigint generated always as identity primary key,
    legacy_id       text unique,                                            -- aus Datum (eindeutig in der Quelle)
    holiday_date    date not null,                                          -- aus Datum
    name            text not null,                                          -- aus Feiertag
    fixed_date      boolean not null default false,                         -- aus konstant
    region_code     smallint,                                               -- aus Region (Bedeutung unklar)
    notes           text                                                    -- aus Bundesländer (Memo, Klartext)
);
create index if not exists public_holiday_date_idx on core.public_holiday (holiday_date);
comment on table core.public_holiday is
    'Feiertage. Quelle: Feiertage in Kalender 2026.accdb. fixed_date = konstantes Datum '
    '(jedes Jahr gleich), sonst variabel (z. B. Ostern).';

-- ---------- Junction: Welche Feiertage gelten in welchem Bundesland? ----------

create table if not exists core.public_holiday_federal_state (
    public_holiday_id   bigint not null references core.public_holiday(id) on delete cascade,
    federal_state_id    smallint not null references core.federal_state(id),
    primary key (public_holiday_id, federal_state_id)
);
comment on table core.public_holiday_federal_state is
    'Junction: welcher Feiertag wird in welchem Bundesland begangen. '
    'Aus den 17 BL-Booleans (BW, BY, ..., NL) der Quell-Tabelle aufgelöst.';

select audit.enable_for('core', 'federal_state');
select audit.enable_for('core', 'public_holiday');
-- Junction-Tabelle hat zusammengesetzten PK ohne id-Spalte:
-- audit-Trigger erwartet eine Spalte "id". Anhängen wir hier nicht (siehe TODO im
-- catalog-Domain DDL).

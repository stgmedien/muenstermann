-- Ops-Domäne: Hygienekontroll-Plan + Intervalle (pro Kunde)
--
-- Quellen (aus den 3 Kunden-DBs):
--   050 Kontrollintervalle         → ops.control_interval (kundenspezifische Stammdaten)
--   022 Hygienekontrollen          → ops.hygiene_control_plan (control_type = 'STANDARD')
--   022 Hygienekontrollen Spezial 15 → ops.hygiene_control_plan (control_type = 'SPECIAL_15')
--
-- WICHTIG: diese Tabellen sind PLAN-Tabellen ("was soll wo wie oft kontrolliert
-- werden") — sie sind NICHT die ausgeführten Kontrollen. Echte Audit-Logs
-- (wer hat wann was gemacht) müssten extern aus einer Stempeluhr- oder
-- Inspektions-App kommen. Das ist in den Probedaten nicht vorhanden.
--
-- REWE hat zusätzlich eigene Tabellen (022 Hygienekontrollen Unterhaltsreinigung,
-- 022_1 HK_nachHygPlan, 022_1 tempHK_nachHygPlan) — die werden in einem
-- späteren ETL-Schritt als REWE-spezifische Varianten ergänzt.

set search_path = ops, core, public;

-- ---------- Kontroll-Intervall-Stammdaten pro Kunde ----------

create table if not exists ops.control_interval (
    id                  bigint generated always as identity primary key,
    legacy_id           text not null,                                       -- "<customer_number>:<ID>"
    customer_id         bigint not null references core.customer(id),
    interval_code       integer not null,                                    -- aus ID (10, 20, 50, ...)
    name                text not null,                                       -- aus KinterV (z. B. "täglich", "wöchentlich")
    correction_factor   numeric(10, 3),                                      -- aus Kfaktor
    execution_count     smallint,                                            -- aus AusführungZahl
    interval_text       text,                                                -- aus IntervallText (z. B. "täglich", "monatlich")
    created_at          timestamptz not null default now(),
    unique (customer_id, interval_code)
);
comment on table ops.control_interval is
    'Kundenspezifische Kontrollintervall-Definitionen. Quelle: 050 Kontrollintervalle. '
    '~18 pro Kunde; die Intervalle überlappen sich häufig (z. B. ID=10 = "täglich") '
    'aber Kfaktor kann variieren — daher kundenspezifisch.';

-- ---------- Hygienekontroll-Plan (PLAN, kein Log) ----------

-- Enums idempotent anlegen (PostgreSQL kennt kein `CREATE TYPE IF NOT EXISTS`).
do $$
begin
    if not exists (
        select 1 from pg_type t
        join pg_namespace n on n.oid = t.typnamespace
        where t.typname = 'responsible_party' and n.nspname = 'ops'
    ) then
        create type ops.responsible_party as enum ('MUENSTERMANN', 'KUNDE');
    end if;
end$$;

do $$
begin
    if not exists (
        select 1 from pg_type t
        join pg_namespace n on n.oid = t.typnamespace
        where t.typname = 'hygiene_control_type' and n.nspname = 'ops'
    ) then
        create type ops.hygiene_control_type as enum (
            'STANDARD',        -- aus 022 Hygienekontrollen
            'SPECIAL_15',      -- aus 022 Hygienekontrollen Spezial 15
            'REWE_BY_PLAN',    -- aus 022_1 HK_nachHygPlan (REWE-spezifisch, kuratiert)
            'REWE_TEMP'        -- aus 022_1 tempHK_nachHygPlan (REWE-spezifisch, Working-Set)
        );
    end if;
end$$;

-- Falls der Typ vorher schon mit weniger Werten existierte: add value idempotent
do $$
begin
    alter type ops.hygiene_control_type add value if not exists 'REWE_BY_PLAN';
exception when undefined_object then null;
end$$;

do $$
begin
    alter type ops.hygiene_control_type add value if not exists 'REWE_TEMP';
exception when undefined_object then null;
end$$;

create table if not exists ops.hygiene_control_plan (
    id                          bigint generated always as identity primary key,
    legacy_id                   text not null,                                                      -- "<customer>:<control_type>:<row_idx>"
    customer_id                 bigint not null references core.customer(id),
    department_id               bigint not null references ops.department(id) on delete cascade,
    department_object_id        bigint references ops.department_object(id) on delete set null,    -- nullable: viele Plan-Zeilen sind nur auf Abteilungs-Ebene
    control_type                ops.hygiene_control_type not null,
    -- Snapshot der Quell-Werte (damit Sortierung/Filter ohne JOIN funktioniert)
    department_number_snapshot  integer,
    object_number_snapshot      text,
    -- Intervall
    interval_count              smallint,                                                            -- aus IntervallZahl (numerisch, manchmal NULL)
    interval_label              text,                                                                -- aus IntV / IntervallText (z. B. "10", "wöchentlich")
    control_count               smallint,                                                            -- aus KontrollZahl (nur bei Spezial 15)
    quantity_text               text,                                                                -- aus Anzahl (Freitext)
    responsible_party           ops.responsible_party not null,                                      -- 'MUENSTERMANN' oder 'KUNDE'
    -- Felder die nur in einer Variante existieren bleiben optional
    area_number                 smallint,                                                            -- aus BereichNr (nur REWE)
    area_name                   text,
    created_at                  timestamptz not null default now()
);
create index if not exists hygiene_control_plan_customer_idx
    on ops.hygiene_control_plan (customer_id);
create index if not exists hygiene_control_plan_department_idx
    on ops.hygiene_control_plan (department_id);
create index if not exists hygiene_control_plan_object_idx
    on ops.hygiene_control_plan (department_object_id);
create index if not exists hygiene_control_plan_legacy_idx
    on ops.hygiene_control_plan (legacy_id);

-- Erweiterung für REWE-Sonderformat (022_1 HK_nachHygPlan):
-- - Verweis auf den Hygieneplan, nach dem kontrolliert wird
-- - Wochentag-Schichten (Mo/Di/Mi/Do/Fr/Sa/So/uebrige) als JSONB,
--   weil REWE ein eigenes Werteset nutzt (Schicht-Codes, nicht 0/1)
do $$
begin
    if not exists (
        select 1 from information_schema.columns
        where table_schema = 'ops' and table_name = 'hygiene_control_plan'
          and column_name = 'customer_hygiene_plan_id'
    ) then
        alter table ops.hygiene_control_plan
            add column customer_hygiene_plan_id bigint
                references ops.customer_hygiene_plan(id) on delete set null;
    end if;
end$$;

do $$
begin
    if not exists (
        select 1 from information_schema.columns
        where table_schema = 'ops' and table_name = 'hygiene_control_plan'
          and column_name = 'plan_text_snapshot'
    ) then
        alter table ops.hygiene_control_plan
            add column plan_text_snapshot text;
    end if;
end$$;

do $$
begin
    if not exists (
        select 1 from information_schema.columns
        where table_schema = 'ops' and table_name = 'hygiene_control_plan'
          and column_name = 'weekday_schedule'
    ) then
        alter table ops.hygiene_control_plan
            add column weekday_schedule jsonb;
    end if;
end$$;

do $$
begin
    if not exists (
        select 1 from information_schema.columns
        where table_schema = 'ops' and table_name = 'hygiene_control_plan'
          and column_name = 'legacy_attributes'
    ) then
        alter table ops.hygiene_control_plan
            add column legacy_attributes jsonb;
    end if;
end$$;

create index if not exists hygiene_control_plan_chp_idx
    on ops.hygiene_control_plan (customer_hygiene_plan_id);

comment on table ops.hygiene_control_plan is
    'Plan-Tabelle: was soll wo wie oft kontrolliert werden. Quellen: '
    '022 Hygienekontrollen (STANDARD) + 022 Hygienekontrollen Spezial 15 (SPECIAL_15). '
    'department_object_id ist NULLABLE — manche Plan-Zeilen sind auf Abteilungs- '
    'statt Objekt-Ebene; zusätzlich gibt es Zeilen, deren Objekt-Nr in 002 Abt-Objekte '
    'nicht aufgelöst werden konnte.';
comment on column ops.hygiene_control_plan.responsible_party is
    'Wer führt die Kontrolle aus: Münstermann (95%+) oder der Kunde selbst.';

select audit.enable_for('ops', 'control_interval');
select audit.enable_for('ops', 'hygiene_control_plan');

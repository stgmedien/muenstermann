-- ops.cleaning_sheet — Mehrtage-Sheet (Wochen/Monatsplan)
--
-- Konzept: parallel zur Tour (1 Tag) ist Sheet ein "Wochenkontrollblatt"
-- über mehrere Tage. Jede Zelle in der Matrix ist ein inspection_task.
-- Ein inspection_task gehört entweder zu einer Tour ODER einem Sheet
-- (cleaning_sheet_id), beides ist möglich.
--
-- Beispiel-Use-Case: "Erstelle für Bittner einen Wochenplan vom 25.05.-31.05.
-- mit allen täglichen Reinigungspunkten." → 1 Sheet + N Plan-Punkte × 7 Tage
-- = N×7 inspection_tasks in einer Matrix abrufbar.

set search_path = ops, core, public;

create table if not exists ops.cleaning_sheet (
    id              bigint generated always as identity primary key,
    customer_id     bigint not null references core.customer(id),
    period_from     date not null,
    period_to       date not null,
    assignee        text,
    title           text,
    status          text not null default 'ACTIVE'
                    check (status in ('ACTIVE', 'COMPLETED', 'ACCEPTED', 'DISPUTED')),
    accepted_at     timestamptz,
    accepted_by_name text,
    accepted_by_role text,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now(),
    check (period_to >= period_from),
    check (period_to - period_from <= 60)   -- max 60 Tage, sonst wird die Matrix unhandlich
);
create index if not exists cleaning_sheet_customer_idx on ops.cleaning_sheet (customer_id);
create index if not exists cleaning_sheet_period_idx on ops.cleaning_sheet (period_from, period_to);

comment on table ops.cleaning_sheet is
    'Mehrtages-Sheet für Wochen/Monatspläne. Pro (Plan-Punkt, Tag) eine '
    'Zelle (inspection_task). Vorarbeiter hakt Status ab, Kunde gegen-haket '
    'Akzeptanz. Konfigurierbar: Zeitraum + Auswahl der Plan-Punkte.';

-- ---------- inspection_task um cleaning_sheet_id erweitern ----------

do $$
begin
    if not exists (
        select 1 from information_schema.columns
        where table_schema = 'ops'
          and table_name = 'inspection_task'
          and column_name = 'cleaning_sheet_id'
    ) then
        alter table ops.inspection_task
            add column cleaning_sheet_id bigint references ops.cleaning_sheet(id) on delete cascade;
    end if;
end$$;

create index if not exists inspection_task_sheet_idx
    on ops.inspection_task (cleaning_sheet_id);

select audit.enable_for('ops', 'cleaning_sheet');

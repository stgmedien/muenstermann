-- Audit-Framework
--
-- Jede fachliche Tabelle wird per `select audit.enable_for('schema', 'tabelle')`
-- mit einem AFTER-Trigger versehen, der INSERT/UPDATE/DELETE in
-- audit.activity_log protokolliert.
--
-- Der Aktor (Anwender / ETL-Job) wird pro Transaktion via
--   SET LOCAL app.user_id = 'etl-migration-2026-05-24';
-- gesetzt. In Phase 1 setzt das jedes ETL-Skript am Anfang einer Transaktion;
-- ab einer späteren Anwendungsschicht kommt der Wert aus dem Auth-Kontext.
--
-- Begründung: Plan §6 (Audit-/Historisierungs-Konzept, Mechanismus (a)).

-- ---------- audit.activity_log ----------

create table if not exists audit.activity_log (
    id              bigint generated always as identity primary key,
    occurred_at     timestamptz not null default now(),
    actor           text,
    action          text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
    schema_name     text not null,
    table_name      text not null,
    row_pk          text,
    old_row         jsonb,
    new_row         jsonb,
    transaction_id  bigint not null default pg_current_xact_id()::text::bigint
);

comment on table audit.activity_log is
    'Universeller Audit-Trail. Jede Änderung an einer ausgewählten Tabelle wird hier'
    ' protokolliert. Befüllt durch den Trigger audit.log_changes.';

create index if not exists activity_log_table_idx
    on audit.activity_log (schema_name, table_name);
create index if not exists activity_log_actor_idx
    on audit.activity_log (actor);
create index if not exists activity_log_occurred_at_idx
    on audit.activity_log (occurred_at);

-- ---------- audit.log_changes ----------

create or replace function audit.log_changes()
returns trigger
language plpgsql
as $$
declare
    v_actor    text;
    v_row_pk   text;
    v_old_json jsonb;
    v_new_json jsonb;
begin
    -- Aktor aus session-local variable (gesetzt durch SET LOCAL app.user_id = ...).
    -- 'true' im current_setting unterdrückt den Fehler, wenn die Variable nicht gesetzt ist.
    v_actor := nullif(current_setting('app.user_id', true), '');

    if (tg_op = 'DELETE') then
        v_row_pk   := old.id::text;
        v_old_json := to_jsonb(old);
        v_new_json := null;
    elsif (tg_op = 'UPDATE') then
        v_row_pk   := new.id::text;
        v_old_json := to_jsonb(old);
        v_new_json := to_jsonb(new);
    else  -- INSERT
        v_row_pk   := new.id::text;
        v_old_json := null;
        v_new_json := to_jsonb(new);
    end if;

    insert into audit.activity_log
        (actor, action, schema_name, table_name, row_pk, old_row, new_row)
    values
        (v_actor, tg_op, tg_table_schema, tg_table_name, v_row_pk, v_old_json, v_new_json);

    if tg_op = 'DELETE' then
        return old;
    end if;
    return new;
end;
$$;

comment on function audit.log_changes() is
    'Trigger-Funktion: schreibt jede Zeilen-Änderung als JSONB-Snapshot in audit.activity_log.'
    ' Erwartet, dass die überwachte Tabelle eine PK-Spalte namens "id" hat.';

-- ---------- audit.enable_for ----------

create or replace function audit.enable_for(p_schema text, p_table text)
returns void
language plpgsql
as $$
declare
    v_trigger_name text := p_table || '_audit_trg';
begin
    execute format(
        'drop trigger if exists %I on %I.%I',
        v_trigger_name, p_schema, p_table
    );
    execute format(
        'create trigger %I '
        'after insert or update or delete on %I.%I '
        'for each row execute function audit.log_changes()',
        v_trigger_name, p_schema, p_table
    );
end;
$$;

comment on function audit.enable_for(text, text) is
    'Hängt den audit.log_changes-Trigger an die angegebene Tabelle. Idempotent — Drop bestehender Trigger gleichen Namens davor.';

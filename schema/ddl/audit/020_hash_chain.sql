-- Hash-Chain auf audit.activity_log
--
-- Ziel: dokumentationssichere Audit-Spur. Jede Zeile enthält:
--   previous_hash : Hash der vorherigen Zeile (per id)
--   current_hash  : sha256(stabile Repräsentation der eigenen Felder + previous_hash)
--
-- Verifikation läuft die Chain durch und meldet die erste id wo der Hash
-- nicht mehr passt. Manipulation einer Zeile (oder Reihenfolgewechsel) wird
-- damit nachträglich sichtbar.
--
-- Voraussetzung: pgcrypto-Extension für digest()/sha256.

create extension if not exists pgcrypto;

-- Schema-Erweiterung idempotent
do $$
begin
    if not exists (
        select 1 from information_schema.columns
        where table_schema = 'audit' and table_name = 'activity_log'
          and column_name = 'current_hash'
    ) then
        alter table audit.activity_log
            add column previous_hash text,
            add column current_hash text;
    end if;
end$$;

-- Stabile Repräsentation einer Zeile (id wird NICHT mit gehasht, damit
-- Backfills neuer Spalten möglich bleiben — sondern die fachlichen Inhalte)
create or replace function audit.activity_log_canonical(p_row audit.activity_log)
returns text
language sql
immutable
as $$
    select concat_ws('|',
        coalesce(p_row.occurred_at::text, ''),
        coalesce(p_row.actor, ''),
        coalesce(p_row.action, ''),
        coalesce(p_row.schema_name, ''),
        coalesce(p_row.table_name, ''),
        coalesce(p_row.row_pk, ''),
        coalesce(p_row.old_row::text, ''),
        coalesce(p_row.new_row::text, ''),
        coalesce(p_row.transaction_id::text, ''),
        coalesce(p_row.previous_hash, '')
    )
$$;

-- Trigger BEFORE INSERT: previous_hash + current_hash setzen.
-- Wir nutzen pg_advisory_xact_lock für atomic Chain-Anhängen, damit zwei
-- parallel laufende Inserts nicht denselben previous_hash bekommen.
create or replace function audit.activity_log_chain()
returns trigger
language plpgsql
as $$
declare
    v_prev text;
begin
    -- Pro-Tabelle-Lock: alle audit-Inserts seriell innerhalb einer Transaktion
    perform pg_advisory_xact_lock(hashtext('audit.activity_log'));

    select current_hash into v_prev
    from audit.activity_log
    where current_hash is not null
    order by id desc
    limit 1;

    new.previous_hash := v_prev;
    new.current_hash := encode(
        digest(audit.activity_log_canonical(new), 'sha256'),
        'hex'
    );
    return new;
end;
$$;

-- Trigger nach dem regulären INSERT-Wert (kein Konflikt mit log_changes,
-- weil das ein AFTER-Trigger auf den fachlichen Tabellen ist, der hier
-- einen normalen INSERT in audit.activity_log auslöst — der dann wiederum
-- diesen BEFORE-Trigger durchläuft.)
drop trigger if exists activity_log_chain_trg on audit.activity_log;
create trigger activity_log_chain_trg
    before insert on audit.activity_log
    for each row
    execute function audit.activity_log_chain();

-- ----- Verify-Function -----
--
-- Liefert genau eine Zeile:
--   ok                : boolean, true wenn die ganze Chain konsistent ist
--   total_rows        : Anzahl Zeilen in audit.activity_log
--   broken_at_id      : id des ersten Mismatches (oder NULL)
--   broken_reason     : Klartext-Begründung
--   verified_at       : Zeitstempel des Laufs

create or replace function audit.verify_chain()
returns table (
    ok boolean,
    total_rows bigint,
    broken_at_id bigint,
    broken_reason text,
    verified_at timestamptz
)
language plpgsql
stable
as $$
declare
    r record;
    expected_prev text := null;
    expected_hash text;
    cnt bigint := 0;
    bad_id bigint := null;
    bad_reason text := null;
begin
    for r in
        select id, occurred_at, actor, action, schema_name, table_name,
               row_pk, old_row, new_row, transaction_id,
               previous_hash, current_hash
        from audit.activity_log
        order by id asc
    loop
        cnt := cnt + 1;

        -- Erste Zeile: previous_hash sollte NULL sein
        if cnt = 1 and r.previous_hash is not null then
            bad_id := r.id;
            bad_reason := 'erste Zeile hat unerwartet previous_hash gesetzt';
            exit;
        end if;

        if cnt > 1 and r.previous_hash is distinct from expected_prev then
            bad_id := r.id;
            bad_reason := format('previous_hash erwartet %s, gefunden %s',
                                 coalesce(expected_prev, 'NULL'),
                                 coalesce(r.previous_hash, 'NULL'));
            exit;
        end if;

        -- Canonical inline (in plpgsql lässt sich ein record nicht ohne Weiteres
        -- in einen composite type casten — daher hier direkt aufgebaut)
        expected_hash := encode(
            digest(
                concat_ws('|',
                    coalesce(r.occurred_at::text, ''),
                    coalesce(r.actor, ''),
                    coalesce(r.action, ''),
                    coalesce(r.schema_name, ''),
                    coalesce(r.table_name, ''),
                    coalesce(r.row_pk, ''),
                    coalesce(r.old_row::text, ''),
                    coalesce(r.new_row::text, ''),
                    coalesce(r.transaction_id::text, ''),
                    coalesce(r.previous_hash, '')
                ),
                'sha256'
            ),
            'hex'
        );
        if r.current_hash is distinct from expected_hash then
            bad_id := r.id;
            bad_reason := format('current_hash mismatch (Zeile manipuliert?): erwartet %s, gefunden %s',
                                 expected_hash, coalesce(r.current_hash, 'NULL'));
            exit;
        end if;

        expected_prev := r.current_hash;
    end loop;

    return query select
        (bad_id is null) as ok,
        cnt as total_rows,
        bad_id as broken_at_id,
        bad_reason as broken_reason,
        now() as verified_at;
end;
$$;

comment on function audit.verify_chain() is
    'Läuft die komplette audit.activity_log-Hash-Chain durch und meldet die erste '
    'Inkonsistenz. ok=true heißt: kein Tampering nachweisbar. Sollte regelmäßig '
    '(z.B. täglich) ausgeführt werden.';

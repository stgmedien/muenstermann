-- Tampering-Demo für die Hash-Chain
--
-- Zweck: für Auditoren und Stakeholder beweisen, dass die Manipulation einer
-- Audit-Zeile durch verify_chain() erkannt wird. Die Funktion:
--   1) Verifiziert die Chain unverändert.
--   2) Manipuliert genau eine Zeile durch UPDATE (das umgeht den BEFORE INSERT
--      Trigger — und ist exakt das Szenario, das wir absichern wollen).
--   3) Verifiziert erneut — verify_chain meldet jetzt die manipulierte Zeile.
--   4) Stellt den Original-Wert wieder her und verifiziert ein drittes Mal.
--
-- Wichtig: Die Funktion fasst NIE den current_hash an. Es wird nur new_row
-- geändert — und genau das soll die Chain erkennen. Im Fehlerfall (RAISE
-- innerhalb der Funktion) wird die Wiederherstellung im EXCEPTION-Handler
-- garantiert.

create or replace function audit.tamper_demo()
returns table (
    step            text,
    ok              boolean,
    total_rows      bigint,
    broken_at_id    bigint,
    broken_reason   text,
    target_id       bigint,
    elapsed_ms      integer
)
language plpgsql
as $$
declare
    v_target_id          bigint;
    v_original_new_row   jsonb;
    v_t0                 timestamptz;
    v_t1                 timestamptz;
    r                    record;
begin
    -- Ziel: jüngste Audit-Zeile (geringste Cascade-Wirkung im worst case)
    select id, new_row
      into v_target_id, v_original_new_row
      from audit.activity_log
     order by id desc
     limit 1;

    if v_target_id is null then
        return;
    end if;

    -- ---- Schritt 1: Verify VOR Manipulation ----
    v_t0 := clock_timestamp();
    for r in select * from audit.verify_chain() loop
        v_t1 := clock_timestamp();
        step          := '1. Vor Manipulation';
        ok            := r.ok;
        total_rows    := r.total_rows;
        broken_at_id  := r.broken_at_id;
        broken_reason := r.broken_reason;
        target_id     := v_target_id;
        elapsed_ms    := extract(milliseconds from v_t1 - v_t0)::int;
        return next;
    end loop;

    -- ---- Schritt 2: Heimliche Manipulation einer Datenfeld-Zelle ----
    -- UPDATE umgeht den BEFORE INSERT Trigger und ist deshalb der relevante
    -- Angriffsvektor. Wir setzen new_row -> setzt sich aus den canonical-Hash
    -- ab und verändert damit den erwarteten Hash dieser Zeile.
    begin
        update audit.activity_log
           set new_row = coalesce(new_row, '{}'::jsonb)
                         || jsonb_build_object('_tampered_demo', true)
         where id = v_target_id;

        v_t0 := clock_timestamp();
        for r in select * from audit.verify_chain() loop
            v_t1 := clock_timestamp();
            step          := '2. Nach simulierter Manipulation';
            ok            := r.ok;
            total_rows    := r.total_rows;
            broken_at_id  := r.broken_at_id;
            broken_reason := r.broken_reason;
            target_id     := v_target_id;
            elapsed_ms    := extract(milliseconds from v_t1 - v_t0)::int;
            return next;
        end loop;

        -- ---- Schritt 3: Original-Zustand wiederherstellen ----
        update audit.activity_log
           set new_row = v_original_new_row
         where id = v_target_id;

        v_t0 := clock_timestamp();
        for r in select * from audit.verify_chain() loop
            v_t1 := clock_timestamp();
            step          := '3. Nach Wiederherstellung';
            ok            := r.ok;
            total_rows    := r.total_rows;
            broken_at_id  := r.broken_at_id;
            broken_reason := r.broken_reason;
            target_id     := v_target_id;
            elapsed_ms    := extract(milliseconds from v_t1 - v_t0)::int;
            return next;
        end loop;

    exception
        when others then
            -- Absoluter Notfall-Restore. Wir wollen die DB NIEMALS tampered
            -- zurücklassen, auch wenn verify_chain abstürzt.
            update audit.activity_log
               set new_row = v_original_new_row
             where id = v_target_id;
            raise;
    end;
end;
$$;

comment on function audit.tamper_demo() is
    'Beweis-Demo: Simuliert eine Manipulation der Audit-Tabelle und zeigt, '
    'dass verify_chain() sie erkennt. Stellt anschließend den Originalzustand '
    'wieder her. Drei-Schritt-Output: Vor/Nach/Restored.';

-- Domänen-Trennung (Plan §5): hr ⊥ billing, keine Cross-Schema-FKs zwischen
-- HR/Personal/Lohn und Kundenfakturierung.
--
-- Stand jetzt: hr und billing sind in Phase 3 ausgesetzt (anonymisierter Test).
-- Dieser Test stellt sicher, dass wir die Trennung respektieren, falls die
-- Schemas später befüllt werden.

with cross_refs as (
    select n_src.nspname || '.' || c_src.relname || '.' || a_src.attname as source_col,
           n_dst.nspname || '.' || c_dst.relname as target_table
    from pg_constraint con
    join pg_class c_src on c_src.oid = con.conrelid
    join pg_namespace n_src on n_src.oid = c_src.relnamespace
    join pg_class c_dst on c_dst.oid = con.confrelid
    join pg_namespace n_dst on n_dst.oid = c_dst.relnamespace
    join pg_attribute a_src on a_src.attrelid = c_src.oid and a_src.attnum = any(con.conkey)
    where con.contype = 'f'
      and (
        (n_src.nspname = 'hr' and n_dst.nspname = 'billing')
        or (n_src.nspname = 'billing' and n_dst.nspname = 'hr')
        or (n_src.nspname = 'payroll' and n_dst.nspname = 'billing')
        or (n_src.nspname = 'billing' and n_dst.nspname = 'payroll')
      )
)
select 'no FK between hr/payroll and billing' as test_name,
       case when count(*) = 0 then 'OK' else 'FAIL' end as status,
       count(*) as violations,
       string_agg(source_col || ' -> ' || target_table, ', ') as details
from cross_refs;

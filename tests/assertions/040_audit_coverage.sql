-- Audit-Trigger-Abdeckung: ist auf jeder fachlichen Tabelle ein Trigger?
--
-- Plan §6 fordert "von Anfang an, nicht nachgerüstet". Dieser Test stellt
-- sicher, dass keine Tabelle vergessen wurde.

with expected_tables as (
    -- Alle fachlichen Tabellen (ohne audit selbst)
    select n.nspname || '.' || c.relname as full_name,
           n.nspname as schema_name,
           c.relname as table_name
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where c.relkind = 'r'                              -- nur normale Tabellen
      and n.nspname in ('catalog', 'core', 'ops')
      and c.relname not like 'pg_%'
),
covered as (
    select tgrelid::regclass::text as table_name
    from pg_trigger t
    where tgname like '%_audit_trg'
      and not tgisinternal
)
select 'audit trigger present on all fachlichen tables' as test_name,
       case when count(*) = 0 then 'OK' else 'FAIL' end as status,
       count(*) as violations,
       string_agg(full_name, ', ' order by full_name) as details
from expected_tables et
where et.full_name not in (select table_name from covered);

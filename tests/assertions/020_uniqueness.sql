-- Eindeutigkeits-Constraints validieren.
--
-- Die meisten sind durch UNIQUE-Constraints im DDL erzwungen, hier ist
-- ein Snapshot-Check, der die tatsächlichen Duplikate sichtbar macht
-- (eigentlich sollte das immer 0 sein, aber zur Diagnose nützlich).

with results as (

    select 'cleaning_agent.legacy_id unique' as test_name,
           case when count(*) = 0 then 'OK' else 'FAIL' end as status,
           count(*) as violations,
           string_agg(legacy_id, ',') as details
    from (
        select legacy_id from catalog.cleaning_agent
        group by legacy_id having count(*) > 1
    ) dupes

    union all
    select 'customer (business_unit, customer_number) unique',
           case when count(*) = 0 then 'OK' else 'FAIL' end,
           count(*),
           string_agg(business_unit_id::text || ':' || customer_number::text, ',')
    from (
        select business_unit_id, customer_number from core.customer
        group by 1, 2 having count(*) > 1
    ) dupes

    union all
    select 'department (customer_id, department_number) unique',
           case when count(*) = 0 then 'OK' else 'FAIL' end,
           count(*),
           string_agg(customer_id::text || ':' || department_number::text, ',')
    from (
        select customer_id, department_number from ops.department
        group by 1, 2 having count(*) > 1
    ) dupes

    union all
    select 'hygiene_phrase.code unique',
           case when count(*) = 0 then 'OK' else 'FAIL' end,
           count(*),
           string_agg(code, ',')
    from (
        select code from catalog.hazard_phrase
        group by code having count(*) > 1
    ) dupes
)
select * from results order by test_name;

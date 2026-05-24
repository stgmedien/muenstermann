-- Pflichtfeld-Checks: NOT-NULL-Felder + fachliche Mindest-Beziehungen.

with results as (

    select 'cleaning_agent.name not empty' as test_name,
           case when count(*) = 0 then 'OK' else 'FAIL' end as status,
           count(*) as violations,
           string_agg(legacy_id, ',' order by legacy_id) as details
    from catalog.cleaning_agent
    where name is null or trim(name) = ''

    union all
    select 'customer.name not empty',
           case when count(*) = 0 then 'OK' else 'FAIL' end,
           count(*),
           string_agg(legacy_id, ',' order by legacy_id)
    from core.customer
    where name is null or trim(name) = ''

    union all
    select 'department.name not empty',
           case when count(*) = 0 then 'OK' else 'FAIL' end,
           count(*),
           string_agg(legacy_id, ',' order by legacy_id)
    from ops.department
    where name is null or trim(name) = ''

    union all
    select 'hygiene_plan_step.task_description not empty',
           case when count(*) = 0 then 'OK' else 'FAIL' end,
           count(*),
           null
    from catalog.hygiene_plan_step
    where task_description is null or trim(task_description) = ''

    union all
    -- INFO: Adress-Datenlücke aus der Migration übernommen
    select 'customer: complete address (info)',
           'INFO',
           count(*) filter (where street is null or postal_code is null or city is null),
           format('without address: %s / %s',
                  count(*) filter (where street is null or postal_code is null or city is null),
                  count(*))
    from core.customer
)
select * from results order by test_name;

-- Hygieneplan-Konsistenz.

with results as (

    -- Jeder hygiene_plan_step gehört zu einem hygiene_plan
    select 'hygiene_plan_step.hygiene_plan_id is set' as test_name,
           case when count(*) = 0 then 'OK' else 'FAIL' end as status,
           count(*) as violations,
           null as details
    from catalog.hygiene_plan_step
    where hygiene_plan_id is null

    union all
    -- step_number ist > 0 (Steps werden ab 1 gezählt)
    select 'hygiene_plan_step.step_number > 0',
           case when count(*) = 0 then 'OK' else 'FAIL' end,
           count(*),
           string_agg(id::text, ',')
    from catalog.hygiene_plan_step
    where step_number <= 0

    union all
    -- Jeder Master-Plan hat mindestens einen Schritt?
    select 'hygiene_plan: at least one step (info)',
           'INFO',
           count(*) filter (where step_count > 0),
           format('with steps: %s / %s',
                  count(*) filter (where step_count > 0),
                  count(*))
    from (
        select hp.id, count(hps.id) as step_count
        from catalog.hygiene_plan hp
        left join catalog.hygiene_plan_step hps on hps.hygiene_plan_id = hp.id
        group by hp.id
    ) plan_steps

    union all
    -- Kunden-Hygieneplan-Mapping auf Master
    select 'customer_hygiene_plan: master link coverage',
           'INFO',
           count(*) filter (where master_hygiene_plan_id is not null),
           format('linked to master: %s / %s (%.0f%%)',
                  count(*) filter (where master_hygiene_plan_id is not null),
                  count(*),
                  100.0 * count(*) filter (where master_hygiene_plan_id is not null)
                  / nullif(count(*), 0))
    from ops.customer_hygiene_plan
)
select * from results order by test_name;

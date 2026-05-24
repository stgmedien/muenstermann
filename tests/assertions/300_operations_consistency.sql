-- Operative Konsistenz: Abteilungen, Objekte, Hygienekontrollen.

with results as (

    -- Jede Abteilung hat einen Kunden (durch FK garantiert, hier als Snapshot)
    select 'every department has a customer' as test_name,
           case when count(*) = 0 then 'OK' else 'FAIL' end as status,
           count(*) as violations,
           null as details
    from ops.department
    where customer_id is null

    union all
    -- Abteilungs-Verteilung pro Kunde
    select 'department count by customer (info)',
           'INFO',
           sum(dept_count),
           string_agg(format('cust %s: %s', customer_id, dept_count), ', ' order by customer_id)
    from (
        select customer_id, count(*) as dept_count
        from ops.department group by customer_id
    ) per_cust

    union all
    -- Objekt-Verteilung
    select 'department_object count by customer (info)',
           'INFO',
           sum(obj_count),
           string_agg(format('cust %s: %s', customer_id, obj_count), ', ' order by customer_id)
    from (
        select c.id as customer_id, count(*) as obj_count
        from ops.department_object o
        join ops.department d on d.id = o.department_id
        join core.customer c on c.id = d.customer_id
        group by c.id
    ) per_cust

    union all
    -- Hygiene-Kontrollplan-Verteilung
    select 'hygiene_control_plan by control_type',
           'INFO',
           count(*),
           string_agg(distinct control_type::text || ': ' ||
                      count(*) over (partition by control_type)::text, ', ')
    from ops.hygiene_control_plan

    union all
    -- responsible_party-Verteilung
    select 'hygiene_control_plan by responsible_party',
           'INFO',
           count(*),
           format('MUENSTERMANN: %s (%.0f%%), KUNDE: %s (%.0f%%)',
                  count(*) filter (where responsible_party = 'MUENSTERMANN'),
                  100.0 * count(*) filter (where responsible_party = 'MUENSTERMANN')
                  / nullif(count(*), 0),
                  count(*) filter (where responsible_party = 'KUNDE'),
                  100.0 * count(*) filter (where responsible_party = 'KUNDE')
                  / nullif(count(*), 0))
    from ops.hygiene_control_plan

    union all
    -- Arbeitsanweisung ohne Hygieneplan-Bezug (sollte selten sein)
    select 'work_instruction: plan link rate',
           'INFO',
           count(*) filter (where customer_hygiene_plan_id is not null),
           format('with plan: %s / %s (%.0f%%)',
                  count(*) filter (where customer_hygiene_plan_id is not null),
                  count(*),
                  100.0 * count(*) filter (where customer_hygiene_plan_id is not null)
                  / nullif(count(*), 0))
    from ops.work_instruction
)
select * from results order by test_name;

-- Referenzielle Integrität: FK-Auflösungen vollständig?
--
-- Die meisten FKs sind durch CHECK / FOREIGN KEY constraints sowieso erzwungen.
-- Diese Tests fokussieren auf NULLABLE FKs und auf Stellen, wo wir per
-- subselect aufgelöst haben — wenn der Subselect kein Ziel fand, ist die
-- Spalte NULL geblieben. Das ist OK fachlich, aber wir wollen die Quote sehen.

with results as (

    select 'department.customer_id resolved' as test_name,
           case when count(*) = 0 then 'OK' else 'FAIL' end as status,
           count(*) as violations,
           string_agg(distinct customer_id::text, ',' order by customer_id::text)
               filter (where customer_id is null) as details
    from ops.department
    where customer_id is null

    union all
    select 'department_object.department_id resolved',
           case when count(*) = 0 then 'OK' else 'FAIL' end,
           count(*),
           null
    from ops.department_object
    where department_id is null

    union all
    -- hygiene_control_plan.department_object_id ist NULLABLE, aber wir wollen
    -- wissen wieviele Plan-Zeilen einen Objekt-Bezug haben
    select 'hygiene_control_plan: object link rate',
           'INFO',
           count(*) filter (where department_object_id is not null),
           format('with object: %s / %s (%.0f%%)',
                  count(*) filter (where department_object_id is not null),
                  count(*),
                  100.0 * count(*) filter (where department_object_id is not null)
                  / nullif(count(*), 0))
    from ops.hygiene_control_plan

    union all
    select 'work_instruction.department_object_id resolved rate',
           'INFO',
           count(*) filter (where department_object_id is not null),
           format('with object: %s / %s (%.0f%%)',
                  count(*) filter (where department_object_id is not null),
                  count(*),
                  100.0 * count(*) filter (where department_object_id is not null)
                  / nullif(count(*), 0))
    from ops.work_instruction

    union all
    select 'work_instruction.customer_hygiene_plan_id resolved rate',
           'INFO',
           count(*) filter (where customer_hygiene_plan_id is not null),
           format('with plan: %s / %s (%.0f%%)',
                  count(*) filter (where customer_hygiene_plan_id is not null),
                  count(*),
                  100.0 * count(*) filter (where customer_hygiene_plan_id is not null)
                  / nullif(count(*), 0))
    from ops.work_instruction

    union all
    select 'customer_hazard_substance.master_hazard_substance_id link rate',
           'INFO',
           count(*) filter (where master_hazard_substance_id is not null),
           format('linked to master: %s / %s (%.0f%%)',
                  count(*) filter (where master_hazard_substance_id is not null),
                  count(*),
                  100.0 * count(*) filter (where master_hazard_substance_id is not null)
                  / nullif(count(*), 0))
    from ops.customer_hazard_substance

    union all
    select 'cleaning_agent.manufacturer_id resolved rate',
           'INFO',
           count(*) filter (where manufacturer_id is not null),
           format('with manufacturer: %s / %s (%.0f%%)',
                  count(*) filter (where manufacturer_id is not null),
                  count(*),
                  100.0 * count(*) filter (where manufacturer_id is not null)
                  / nullif(count(*), 0))
    from catalog.cleaning_agent
)
select * from results order by test_name;

-- Catalog-Konsistenz: fachliche Plausibilitäts-Checks für Reinigungsmittel,
-- Hersteller, H-Sätze, Lagerklassen.

with results as (

    -- Jeder hazard_phrase.code beginnt mit H oder EUH
    select 'hazard_phrase code format' as test_name,
           case when count(*) = 0 then 'OK' else 'FAIL' end as status,
           count(*) as violations,
           string_agg(code, ',' order by code) as details
    from catalog.hazard_phrase
    where code !~ '^H[0-9]{3}[A-Za-z]?$|^EUH[0-9]{3}$'

    union all
    -- hazard_phrase.category_id ist gesetzt für H-Sätze (EUH-Sätze können NULL haben)
    select 'H-Sätze mit Kategorie zugeordnet',
           'INFO',
           count(*) filter (where category_id is not null),
           format('H mit Kategorie: %s, ohne: %s',
                  count(*) filter (where category_id is not null and code like 'H%'),
                  count(*) filter (where category_id is null and code like 'H%'))
    from catalog.hazard_phrase

    union all
    -- cleaning_agent.water_hazard_class ∈ {1,2,3} oder NULL
    select 'cleaning_agent.water_hazard_class valid range',
           case when count(*) = 0 then 'OK' else 'FAIL' end,
           count(*),
           string_agg(legacy_id, ',' order by legacy_id)
    from catalog.cleaning_agent
    where water_hazard_class is not null
      and (water_hazard_class < 1 or water_hazard_class > 3)

    union all
    -- Hersteller-Match-Quote (sollte bei ~80% liegen, ADR-003 dokumentiert das)
    select 'cleaning_agent: manufacturer match coverage',
           'INFO',
           count(*) filter (where manufacturer_id is not null),
           format('%.0f%% matched (%s of %s)',
                  100.0 * count(*) filter (where manufacturer_id is not null)
                  / nullif(count(*), 0),
                  count(*) filter (where manufacturer_id is not null),
                  count(*))
    from catalog.cleaning_agent

    union all
    -- Junction: jedes cleaning_agent_hazard_substance hat einen substance_name
    select 'cleaning_agent_hazard_substance.substance_name not empty',
           case when count(*) = 0 then 'OK' else 'FAIL' end,
           count(*),
           null
    from catalog.cleaning_agent_hazard_substance
    where substance_name is null or trim(substance_name) = ''

    union all
    -- Plausibilität: kein Reinigungsmittel hat mehr als 5 Gefahrstoff-Komponenten
    -- (Access hatte maximal Gefahrstoffe 1-5 → in PG sollte das auch max 5 sein)
    select 'cleaning_agent: max 5 hazard substances per agent',
           case when count(*) = 0 then 'OK' else 'WARN' end,
           count(*),
           string_agg(cleaning_agent_id::text, ',' order by cleaning_agent_id)
    from (
        select cleaning_agent_id, count(*) as n
        from catalog.cleaning_agent_hazard_substance
        group by cleaning_agent_id
        having count(*) > 5
    ) overpacked
)
select * from results order by test_name;

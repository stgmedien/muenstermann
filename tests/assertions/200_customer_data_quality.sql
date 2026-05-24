-- Kunden + Mandantentrennung.

with results as (

    -- business_unit_id muss 1 oder 2 sein (H_UND_I oder SERVICES)
    select 'customer.business_unit_id in (1, 2)' as test_name,
           case when count(*) = 0 then 'OK' else 'FAIL' end as status,
           count(*) as violations,
           string_agg(distinct business_unit_id::text, ',') as details
    from core.customer
    where business_unit_id not in (1, 2)

    union all
    -- Verteilung der Kunden pro Mandant
    select 'customer count per business_unit',
           'INFO',
           count(*),
           format('H_UND_I: %s, SERVICES: %s',
                  count(*) filter (where business_unit_id = 1),
                  count(*) filter (where business_unit_id = 2))
    from core.customer

    union all
    -- customer_number sollte > 0 sein
    select 'customer.customer_number > 0',
           case when count(*) = 0 then 'OK' else 'FAIL' end,
           count(*),
           string_agg(legacy_id, ',')
    from core.customer
    where customer_number <= 0

    union all
    -- Operative Kunden 100, 540, 60 müssen in core.customer existieren
    -- (Voraussetzung für ops-Daten — siehe ETL-Reports)
    select 'operational customers (100, 540, 60) present',
           case when count(*) = 3 then 'OK' else 'FAIL' end,
           3 - count(*),
           string_agg(customer_number::text || ':' || business_unit_id::text, ',')
    from core.customer
    where (business_unit_id, customer_number) in ((1, 100), (1, 540), (2, 60))

    union all
    -- Ansprechpartner ohne Email + Telefon (Datenqualitäts-Info)
    select 'customer_contact_person: at least email or phone',
           'INFO',
           count(*) filter (where email is null and phone is null),
           format('without contact: %s / %s',
                  count(*) filter (where email is null and phone is null),
                  count(*))
    from core.customer_contact_person
)
select * from results order by test_name;

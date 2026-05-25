-- Inspection-Engine — Phase B des Produkt-Vision (siehe docs/PRODUCT_VISION.md)
--
-- Bildet ab:
--   ops.tour              eine Tagestour bei einem Kunden
--   ops.inspection_task   einzelne Punkte einer Tour (aus hygiene_control_plan generiert)
--   ops.complaint         Beanstandung vom Kunden
--   ops.signature         digitale Unterschrift (Kunde + ggf. Operator)
--
-- Append-only-Prinzip: Inspections und Complaints werden nicht ge-UPDATEd,
-- nur erweitert. Bei Korrekturen entsteht eine Folge-Version (replaces_id).

set search_path = ops, core, public;

-- ---------- Enums ----------

do $$
begin
    if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                   where t.typname = 'tour_status' and n.nspname = 'ops') then
        create type ops.tour_status as enum (
            'PLANNED',       -- generiert, noch nicht losgegangen
            'IN_PROGRESS',   -- Vorarbeiter läuft die Tour ab
            'COMPLETED',     -- alle Punkte bearbeitet, wartet auf Kunden-Abnahme
            'ACCEPTED',      -- Kunde hat unterschrieben, alles ok
            'DISPUTED'       -- Kunde hat mind. 1 Punkt beanstandet
        );
    end if;
end$$;

do $$
begin
    if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                   where t.typname = 'inspection_item_status' and n.nspname = 'ops') then
        create type ops.inspection_item_status as enum (
            'PENDING',   -- noch zu tun
            'DONE',      -- erledigt
            'SKIPPED',   -- nicht möglich (Pflicht: comment)
            'PROBLEM'    -- erledigt, aber mit Auffälligkeit (Pflicht: comment)
        );
    end if;
end$$;

do $$
begin
    if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                   where t.typname = 'customer_acceptance' and n.nspname = 'ops') then
        create type ops.customer_acceptance as enum (
            'ACCEPTED',   -- Kunde hat den Punkt abgenommen
            'DISPUTED'    -- Kunde hat beanstandet
        );
    end if;
end$$;

do $$
begin
    if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                   where t.typname = 'complaint_status' and n.nspname = 'ops') then
        create type ops.complaint_status as enum (
            'OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'ESCALATED'
        );
    end if;
end$$;

-- ---------- ops.tour ----------

create table if not exists ops.tour (
    id              bigint generated always as identity primary key,
    customer_id     bigint not null references core.customer(id),
    tour_date       date not null,
    assignee        text,                                   -- vorerst Username; später FK auf core.app_user
    status          ops.tour_status not null default 'PLANNED',
    started_at      timestamptz,
    completed_at    timestamptz,
    accepted_at     timestamptz,
    accepted_by_name text,                                  -- Kunden-Mitarbeiter, der signiert hat
    accepted_by_role text,                                  -- Position / "Produktionsleiter" etc.
    notes           text,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now(),
    unique (customer_id, tour_date, assignee)
);
create index if not exists tour_customer_date_idx on ops.tour (customer_id, tour_date);
create index if not exists tour_assignee_date_idx on ops.tour (assignee, tour_date);
create index if not exists tour_status_idx on ops.tour (status);
comment on table ops.tour is
    'Tagestour eines Vorarbeiters bei einem Kunden. Enthält keine fachlichen Plan-Punkte (die liegen in inspection_task), nur die Klammer drum.';

-- ---------- ops.inspection_task ----------
--
-- Eine konkrete zu prüfende Plan-Position für einen Tag.
-- Generiert aus ops.hygiene_control_plan; Lookup bewahrt
-- bei späteren Plan-Änderungen die historische Genauigkeit.

create table if not exists ops.inspection_task (
    id                          bigint generated always as identity primary key,
    tour_id                     bigint references ops.tour(id) on delete set null,
    hygiene_control_plan_id     bigint references ops.hygiene_control_plan(id),
    customer_id                 bigint not null references core.customer(id),     -- denormalisiert für schnellen Filter
    department_id               bigint references ops.department(id),
    department_object_id        bigint references ops.department_object(id),

    -- Snapshot des Plans zum Zeitpunkt der Generierung (damit spätere
    -- Plan-Änderungen die Historie nicht verfälschen)
    department_name_snapshot    text,
    object_name_snapshot        text,
    interval_label_snapshot     text,
    responsible_party_snapshot  text,                                                -- 'MUENSTERMANN' / 'KUNDE'

    scheduled_date              date not null,
    status                      ops.inspection_item_status not null default 'PENDING',
    completed_at                timestamptz,
    completed_by                text,
    comment                     text,                                                 -- Pflicht bei SKIPPED/PROBLEM

    -- Kunden-Abnahme
    customer_acceptance         ops.customer_acceptance,
    customer_acceptance_at      timestamptz,
    customer_dispute_reason     text,

    created_at                  timestamptz not null default now(),
    updated_at                  timestamptz not null default now(),

    -- Compliance-Anforderung: bei SKIPPED oder PROBLEM ist ein nicht-leerer
    -- Kommentar Pflicht. Im Frontend (Sheet + Mobile-UI) öffnet sich vor
    -- dem Status-Update ein Comment-Dialog, der die Eingabe einsammelt.
    constraint inspection_task_comment_required
        check (
            status in ('PENDING', 'DONE') or
            (status in ('SKIPPED', 'PROBLEM') and comment is not null and trim(comment) <> '')
        ),
    constraint inspection_task_dispute_reason_required
        check (
            (customer_acceptance <> 'DISPUTED') or
            (customer_acceptance = 'DISPUTED' and customer_dispute_reason is not null
                and trim(customer_dispute_reason) <> '')
        )
);
create index if not exists inspection_task_tour_idx on ops.inspection_task (tour_id);
create index if not exists inspection_task_customer_date_idx on ops.inspection_task (customer_id, scheduled_date);
create index if not exists inspection_task_status_idx on ops.inspection_task (status);
comment on table ops.inspection_task is
    'Konkrete Plan-Position einer Tour. Snapshot der Plan-Daten bewahrt historische Genauigkeit, wenn der Plan später geändert wird.';

-- ---------- ops.complaint ----------

create table if not exists ops.complaint (
    id                  bigint generated always as identity primary key,
    inspection_task_id  bigint not null references ops.inspection_task(id),
    customer_id         bigint not null references core.customer(id),
    description         text not null,
    status              ops.complaint_status not null default 'OPEN',
    resolution_due      date,
    resolved_at         timestamptz,
    resolved_by         text,
    resolution_notes    text,
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now()
);
create index if not exists complaint_inspection_task_idx on ops.complaint (inspection_task_id);
create index if not exists complaint_customer_status_idx on ops.complaint (customer_id, status);
comment on table ops.complaint is
    'Kunden-Beanstandung mit Workflow. Wird automatisch beim Setzen von customer_acceptance=DISPUTED auf einer inspection_task erzeugt (via Server Action).';

-- ---------- ops.signature ----------

create table if not exists ops.signature (
    id              bigint generated always as identity primary key,
    tour_id         bigint not null references ops.tour(id) on delete cascade,
    signer_name     text not null,
    signer_role     text,
    signer_kind     text not null default 'CUSTOMER' check (signer_kind in ('CUSTOMER', 'OPERATOR')),
    signature_png   text not null,                                       -- data:image/png;base64,...
    signed_at       timestamptz not null default now()
);
create index if not exists signature_tour_idx on ops.signature (tour_id);
comment on table ops.signature is
    'Digitale Unterschrift via Tablet-Canvas. signature_png ist ein data:image/png;base64,...-String.';

-- ---------- Append-only-Schutz (verhindert "echtes" DELETE bei abgeschlossenen Touren) ----------

create or replace function ops.guard_inspection_immutable()
returns trigger language plpgsql as $$
begin
    if (old.status in ('ACCEPTED', 'DISPUTED') and tg_op = 'DELETE') then
        raise exception 'Cannot DELETE tour with status %', old.status
            using hint = 'Abgenommene oder beanstandete Touren bleiben aus Compliance-Gründen erhalten.';
    end if;
    return old;
end$$;

drop trigger if exists tour_delete_guard on ops.tour;
create trigger tour_delete_guard
    before delete on ops.tour
    for each row execute function ops.guard_inspection_immutable();

-- ---------- Audit-Trigger ----------

select audit.enable_for('ops', 'tour');
select audit.enable_for('ops', 'inspection_task');
select audit.enable_for('ops', 'complaint');
select audit.enable_for('ops', 'signature');

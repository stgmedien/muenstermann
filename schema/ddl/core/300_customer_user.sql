-- Kunden-Portal: Login pro Kunden-Mitarbeiter
--
-- Sicherheitsmodell:
--   - jedes customer_user gehört zu genau einem customer
--   - Authentifizierung über scrypt-Hash (Node stdlib)
--   - Sessions werden NICHT in der DB gespeichert (HMAC-signiertes Cookie reicht)
--   - Audit-Trail über last_login_at
--
-- Die App MUSS bei jedem Read-Pfad im /portal-Bereich nach customer_id
-- filtern. Eine spätere Iteration kann das per Row-Level-Security in PG
-- erzwingen — für diese Phase reicht App-seitige Filterung.

create table if not exists core.customer_user (
    id                  bigint generated always as identity primary key,
    customer_id         bigint not null references core.customer(id) on delete cascade,
    username            text not null,
    password_hash       text not null,            -- Format: "scrypt$N$saltHex$hashHex"
    display_name        text not null,
    email               text,
    is_active           boolean not null default true,
    last_login_at       timestamptz,
    failed_attempts     integer not null default 0,
    locked_until        timestamptz,
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now(),

    constraint customer_user_username_unique unique (username),
    constraint customer_user_username_format
        check (username ~ '^[a-z0-9._-]{3,50}$'),
    constraint customer_user_email_format
        check (email is null or email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

create index if not exists customer_user_customer_idx
    on core.customer_user (customer_id);

-- Audit aktivieren — Logins werden so im Activity-Log nachvollziehbar
select audit.enable_for('core', 'customer_user');

comment on table core.customer_user is
    'Login-Accounts für Kunden-Portal. Jeder Account ist genau einem Kunden '
    'zugeordnet und sieht ausschließlich dessen Daten.';

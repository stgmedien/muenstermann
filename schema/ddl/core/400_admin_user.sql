-- Backoffice-Login (Münstermann-interne Nutzer)
--
-- Strikt getrennt von core.customer_user. Wer hier login darf, hat
-- potentiell Zugriff auf ALLE Kunden — Authorisierung läuft über `role`.
--
-- Rollen (admin_role enum):
--   ADMIN     — vollständiger Zugriff, kann Stammdaten + Audit-Spur lesen
--               + andere Admin-User anlegen.
--   OPERATOR  — Disponent / Vorarbeiter-Vorgesetzter; darf Touren generieren,
--               Sheets bearbeiten, Reinigungsmittel/Hygienepläne pflegen,
--               aber KEIN Audit-Tampering-Test, KEINE User-Verwaltung.
--   VIEWER    — read-only, kann alles ansehen, nichts ändern.
--
-- Inspections-Eingaben durch Vorarbeiter laufen weiterhin über /m und
-- erfordern aktuell keinen separaten Login (Tablet-Modus). Das kann später
-- pro Vorarbeiter über eine eigene Rolle FOREMAN erweitert werden.

do $$
begin
    if not exists (
        select 1 from pg_type where typname = 'admin_role'
                                 and typnamespace = 'core'::regnamespace
    ) then
        create type core.admin_role as enum ('ADMIN', 'OPERATOR', 'VIEWER');
    end if;
end$$;

create table if not exists core.admin_user (
    id                  bigint generated always as identity primary key,
    username            text not null,
    password_hash       text not null,
    display_name        text not null,
    email               text,
    role                core.admin_role not null default 'OPERATOR',
    is_active           boolean not null default true,
    last_login_at       timestamptz,
    failed_attempts     integer not null default 0,
    locked_until        timestamptz,
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now(),

    constraint admin_user_username_unique unique (username),
    constraint admin_user_username_format
        check (username ~ '^[a-z0-9._-]{3,50}$'),
    constraint admin_user_email_format
        check (email is null or email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

select audit.enable_for('core', 'admin_user');

comment on table core.admin_user is
    'Backoffice-Logins. Strikt getrennt von core.customer_user. '
    'Authorisierung über role-Enum.';

comment on column core.admin_user.role is
    'ADMIN: voll. OPERATOR: Touren/Sheets/Stammdaten, KEIN Audit-Schreiben + KEINE Userverwaltung. '
    'VIEWER: read-only.';

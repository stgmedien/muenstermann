-- Münstermann-Migration: Schema-Wurzel
-- Anlegen aller PostgreSQL-Schemas für die Domänen-Trennung
-- (vgl. Migrationsplan §5).

create schema if not exists audit;
comment on schema audit is
    'Audit-Trail (wer/wann/was) und bitemporale Versionierung.';

create schema if not exists core;
comment on schema core is
    'Stammdaten: Kunden, Mitarbeiter, Adressen, Standorte.';

create schema if not exists catalog;
comment on schema catalog is
    'Reinigungsmittel, Gefahrstoffe, Sicherheitsdatenblätter, Leistungskatalog.';

create schema if not exists ops;
comment on schema ops is
    'Kundenprojekte, Reinigungspläne, Gefahrenanalysen, Einsätze.';

create schema if not exists hr;
comment on schema hr is
    'Mitarbeiterzeit, Stempeluhr-Rohdaten, Arbeitszeitbuchungen. STRIKT GETRENNT von billing.';

create schema if not exists payroll;
comment on schema payroll is
    'Lohnberechnung, Zuschlagsregeln, Abrechnungsläufe. STRIKT GETRENNT von billing.';

create schema if not exists billing;
comment on schema billing is
    'Kundenfakturierung (was wurde beauftragt, was wurde abgerechnet — Orgamax-Anbindung). STRIKT GETRENNT von hr/payroll.';

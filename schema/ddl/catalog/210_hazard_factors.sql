-- Catalog-Domäne: GefStoffV-Gefährdungsfaktoren (Master-Vorlage)
--
-- Quelle: Gefährdungsfaktoren (in Adressen H und I) — eine Wide-Format-Tabelle mit
-- 1 Zeile und 58 Spalten. Die 12 Header-Spalten (Mechanisch / Elektrisch / ...)
-- sind leer, die 46 Sub-Faktor-Spalten haben jeweils 1 Distinct-Wert.
--
-- Modellierung: Pivot wide→long. Die 58 Spaltennamen werden zu 12
-- Kategorien + 46 Sub-Faktoren in einer hierarchischen Tabelle.
--
-- Anwendung: in Phase 2 (ops.risk_assessment) gehören diese als
-- Referenz für die Gefährdungsbeurteilung pro Arbeitsplatz / Einsatz.

set search_path = catalog, public;

create table if not exists catalog.hazard_factor (
    id              bigint generated always as identity primary key,
    legacy_id       text unique,                                  -- aus Spaltennamen-Präfix (z. B. "1", "1-1")
    code            text not null unique,                         -- "1", "1-1", "2", "2-1", ...
    name            text not null,                                -- "Mechanische Gefährdung", "Ungeschützte bewegte Teile"
    parent_code     text references catalog.hazard_factor(code) deferrable initially deferred,
    is_category     boolean not null,                             -- true für die 12 Hauptkategorien
    created_at      timestamptz not null default now()
);
create index if not exists hazard_factor_parent_idx on catalog.hazard_factor (parent_code);
comment on table catalog.hazard_factor is
    'GefStoffV-Gefährdungsfaktoren-Master (12 Kategorien + 46 Unter-Faktoren). '
    'Quelle: Gefährdungsfaktoren-Tabelle (Wide-Format, pivotiert long). '
    'Wird in Phase 2 von ops.risk_assessment referenziert.';

select audit.enable_for('catalog', 'hazard_factor');

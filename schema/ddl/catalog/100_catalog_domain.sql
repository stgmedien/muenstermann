-- Catalog-Domäne: Reinigungsmittel, Gefahrstoffe, Sicherheitsdaten
--
-- Quelle: Reinigungsmittel_2025.accdb (siehe inventory/Reinigungsmittel_2025/).
-- Konsolidierungs-Strategie folgt ADR-003 (Multi-Column- und Memo-Antipattern):
--   - n:m-Beziehungen explizit über Junction-Tabellen
--   - Vollständig leere Spalten werden weggelassen
--   - Hersteller ist Pflicht-FK (statt Freitext wie in Access)
--
-- Tabellen-Reihenfolge im File: referenzierte (Lookup-)Tabellen zuerst,
-- referenzierende (Reinigungsmittel) danach, dann Junctions.

set search_path = catalog, public;

-- ============================================================
-- Lookup-Tabellen
-- ============================================================

-- ---------- H-Satz-Kategorien (Physik / Gesundheit / Umwelt) ----------
create table if not exists catalog.hazard_phrase_category (
    id          bigint generated always as identity primary key,
    legacy_id   text unique,
    code        smallint not null unique check (code in (200, 300, 400)),
    name        text not null,
    created_at  timestamptz not null default now()
);
comment on table catalog.hazard_phrase_category is
    'H-Satz-Hauptgruppen nach GHS: 200 = Physikalische Gefahren, 300 = Gesundheitsgefahren, 400 = Umweltgefahren.';
comment on column catalog.hazard_phrase_category.legacy_id is
    'Original-PK aus tblGefHinweis_Kategorien.GefHinw_KatNr (Access).';

-- ---------- H-Sätze (Hazard Phrases nach GHS / CLP) ----------
create table if not exists catalog.hazard_phrase (
    id          bigint generated always as identity primary key,
    legacy_id   text unique,
    code        text not null unique check (code ~ '^H[0-9]{3}[A-Za-z]?$|^EUH[0-9]{3}$'),
    description text not null,
    category_id bigint references catalog.hazard_phrase_category(id),
    created_at  timestamptz not null default now()
);
comment on table catalog.hazard_phrase is
    'Gefahrenhinweise nach Verordnung (EG) Nr. 1272/2008 (CLP), H-Sätze und EUH-Sätze.'
    ' Quelle: tblGefHhinweise_H-Sätze (Access).';
comment on column catalog.hazard_phrase.code is
    'GHS-konforme H-Satz-Nummer, z. B. H290 oder EUH066.';

-- ---------- Meta: Stand des H-Satz-Katalogs ----------
create table if not exists catalog.hazard_phrase_meta (
    id           bigint generated always as identity primary key,
    legacy_id    text unique,
    revision     text not null,                       -- z. B. "14.ATP"
    source_short text not null,                       -- z. B. "BAuA"
    source_long  text not null,                       -- z. B. "Bundesanstalt für Arbeitsschutz und Arbeitsmedizin"
    published_at date,                                -- aus "Juni 2020" → 2020-06-01
    created_at   timestamptz not null default now()
);
comment on table catalog.hazard_phrase_meta is
    'Welche CLP-Anpassung an den technischen Fortschritt (ATP) der H-Satz-Katalog'
    ' aktuell widerspiegelt. Quelle: tblGefHinweis_Stand (Access).';

-- ---------- Giftnotrufzentralen (GIZ) ----------
create table if not exists catalog.poison_information_center (
    id         bigint generated always as identity primary key,
    legacy_id  text unique,
    city       text not null,
    name       text,
    phone      text,
    email      text,
    created_at timestamptz not null default now()
);
comment on table catalog.poison_information_center is
    'Giftinformationszentralen (regional). Quelle: tblGIZ (Access).';

-- ---------- Hersteller von Reinigungsmitteln ----------
create table if not exists catalog.manufacturer (
    id                         bigint generated always as identity primary key,
    legacy_id                  text unique,
    name                       text not null,
    street                     text,
    postal_code                text,                              -- bewusst text (Führungs-Nullen)
    city                       text,
    department                 text,                              -- aus RgmAbt
    internal_emergency_phone   text,
    email                      text,
    poison_center_id           bigint references catalog.poison_information_center(id),
    created_at                 timestamptz not null default now(),
    updated_at                 timestamptz not null default now()
);
create index if not exists manufacturer_name_idx on catalog.manufacturer (lower(name));
comment on table catalog.manufacturer is
    'Hersteller-Stammdaten. Quelle: tblRGM_Hersteller (Access). FK auf '
    'poison_information_center via "zuständige Giftzentrale".';

-- ---------- Gefahrenpiktogramme (GHS) ----------
create table if not exists catalog.hazard_symbol (
    id              bigint generated always as identity primary key,
    legacy_id       text unique,
    code            text not null unique check (code ~ '^GHS[0-9]{2}$|^[A-Za-z][A-Za-z0-9]*$'),
    name            text not null,                  -- "Entzündbar", "Ätzend", ...
    description     text,
    pictogram       bytea,                          -- aus OLE-Object exportiert
    pictogram_mime  text,                           -- z. B. 'image/png'
    created_at      timestamptz not null default now()
);
comment on table catalog.hazard_symbol is
    'GHS-Gefahrenpiktogramme. Quelle: tblSymboleGefahren (Access). '
    'Bilddaten kommen als bytea; Migration aus Access OLE-Object: ggf. nachträglich.';

-- ---------- PSA-Piktogramme (Persönliche Schutzausrüstung) ----------
create table if not exists catalog.ppe_symbol (
    id              bigint generated always as identity primary key,
    legacy_id       text unique,
    code            text not null unique,
    name            text not null,                  -- "Handschuhe", "Schutzbrille", ...
    description     text,
    pictogram       bytea,
    pictogram_mime  text,
    created_at      timestamptz not null default now()
);
comment on table catalog.ppe_symbol is
    'PSA-Symbole (Personal Protective Equipment). Quelle: tblSymbolePSA (Access).';

-- ---------- Lagerklassen nach TRGS 510 ----------
create table if not exists catalog.storage_class (
    id          bigint generated always as identity primary key,
    legacy_id   text unique,
    code        text not null unique,           -- z. B. "LGK 3", "LGK 6.1A"
    description text not null,
    created_at  timestamptz not null default now()
);
comment on table catalog.storage_class is
    'Lagerklassen nach TRGS 510 (Lagerung von Gefahrstoffen in ortsbeweglichen Behältern). '
    'Quelle: tbl_TRGS 510 (Access).';

-- ============================================================
-- Reinigungsmittel (Haupttabelle der Domäne)
-- ============================================================

create table if not exists catalog.cleaning_agent (
    id                       bigint generated always as identity primary key,
    legacy_id                text unique,                                            -- aus ID (Access)
    name                     text not null,                                          -- "Artikelname"
    -- Hersteller-Beziehung: in Access war 'Hersteller' Freitext (41 distinct vs. 15 Hersteller-Stammdaten);
    -- bei der Migration wird per Fuzzy-Match aufgelöst (ADR-003 Regel 6).
    manufacturer_id          bigint references catalog.manufacturer(id),
    operations_number        text,                                                   -- "Betriebs-Nr"
    short_info               text,                                                   -- Memo: "Kurz Info"
    measurement_instructions text,                                                   -- Memo: "Anleitung Messung"
    ph_value                 text,                                                   -- "pH-Wert SDB" — Access-Spalte ist VARCHAR ("8.5", "neutral", "ca. 7", ...) → Text behalten, im ETL ggf. typisieren
    storage_class_id         bigint references catalog.storage_class(id),
    water_hazard_class       smallint check (water_hazard_class between 1 and 3),    -- "WGK" 1/2/3
    flammability_class       text,                                                   -- "Vbf"
    adr_rid                  text,                                                   -- Gefahrgut-Klassifizierung
    -- Legacy-Text-Spalten: enthalten in Access die ALTEN R-/S-Sätze (Stoffrichtlinie
    -- 67/548/EWG), nicht die neuen H-/P-Sätze nach CLP (1272/2008). Die Spalten sind
    -- als Freitext aufbewahrt, damit kein Datenverlust entsteht; eine korrekte
    -- Auflösung in die n:m-Junctions (cleaning_agent_hazard_phrase) ist erst nach
    -- fachlicher Re-Klassifizierung der Mittel möglich (siehe ETL-Report).
    hazard_legacy_text       text,                                                   -- "H-Sätze" in Access (i. d. R. R-Sätze)
    precaution_legacy_text   text,                                                   -- "P-Sätze" in Access (i. d. R. S-Sätze)
    -- Audit-Felder
    created_at               timestamptz not null default now(),
    updated_at               timestamptz not null default now()
);
create index if not exists cleaning_agent_name_idx on catalog.cleaning_agent (lower(name));
create index if not exists cleaning_agent_manufacturer_idx on catalog.cleaning_agent (manufacturer_id);
comment on table catalog.cleaning_agent is
    'Reinigungsmittel-Stammdaten (Compliance-Kern: GefStoffV / REACH / CLP).'
    ' Quelle: tbl_RGM_Eigenschaften_2025 (Access). '
    ' Reduziert von 93 auf ~12 Spalten — siehe ADR-003 für die ausgelassenen / verlagerten Spalten.';
comment on column catalog.cleaning_agent.ph_value is
    'Wird absichtlich als TEXT migriert, weil Access-Spalte Freitext-Werte wie "neutral", "ca. 7" enthält.'
    ' Eine spätere numerische Spalte ph_value_num kann nachgerüstet werden, wenn Datenqualität es zulässt.';

-- ============================================================
-- Junction-Tabellen (n:m-Auflösung der Access-Multi-Columns)
-- ============================================================

-- "Gefahrstoffe 1-5" (Access) → Liste von Gefahrstoff-Komponenten pro Reinigungsmittel
create table if not exists catalog.cleaning_agent_hazard_substance (
    id                  bigint generated always as identity primary key,
    cleaning_agent_id   bigint not null references catalog.cleaning_agent(id) on delete cascade,
    position            smallint not null check (position between 1 and 10),
    substance_name      text not null,
    unique (cleaning_agent_id, position)
);
comment on table catalog.cleaning_agent_hazard_substance is
    'Auflösung von "Gefahrstoffe 1-5" (Access) in eine echte n:m-Beziehung. '
    'position bewahrt die ursprüngliche Spaltennummer aus dem Access-Original.';

-- "H-Sätze" (Access, kommasepariert) → n:m
create table if not exists catalog.cleaning_agent_hazard_phrase (
    cleaning_agent_id  bigint not null references catalog.cleaning_agent(id) on delete cascade,
    hazard_phrase_id   bigint not null references catalog.hazard_phrase(id),
    primary key (cleaning_agent_id, hazard_phrase_id)
);
comment on table catalog.cleaning_agent_hazard_phrase is
    'H-Sätze pro Reinigungsmittel. ETL: kommasepariertes "H-Sätze"-Freitextfeld an Komma + Whitespace splitten, '
    'pro Token Lookup in catalog.hazard_phrase (Quarantäne wenn unbekannt).';

-- Gefahrenpiktogramme pro Reinigungsmittel (aus Spalte "Gefahrensymbol 1" + ggf. weiteren)
create table if not exists catalog.cleaning_agent_hazard_symbol (
    cleaning_agent_id  bigint not null references catalog.cleaning_agent(id) on delete cascade,
    hazard_symbol_id   bigint not null references catalog.hazard_symbol(id),
    primary key (cleaning_agent_id, hazard_symbol_id)
);

-- PSA-Pflicht pro Reinigungsmittel
create table if not exists catalog.cleaning_agent_ppe_symbol (
    cleaning_agent_id  bigint not null references catalog.cleaning_agent(id) on delete cascade,
    ppe_symbol_id      bigint not null references catalog.ppe_symbol(id),
    primary key (cleaning_agent_id, ppe_symbol_id)
);

-- ============================================================
-- Audit auf alle Tabellen der Domäne anhängen
-- ============================================================

select audit.enable_for('catalog', 'hazard_phrase_category');
select audit.enable_for('catalog', 'hazard_phrase');
select audit.enable_for('catalog', 'hazard_phrase_meta');
select audit.enable_for('catalog', 'poison_information_center');
select audit.enable_for('catalog', 'manufacturer');
select audit.enable_for('catalog', 'hazard_symbol');
select audit.enable_for('catalog', 'ppe_symbol');
select audit.enable_for('catalog', 'storage_class');
select audit.enable_for('catalog', 'cleaning_agent');
select audit.enable_for('catalog', 'cleaning_agent_hazard_substance');
-- Junction-Tabellen mit zusammengesetztem PK: audit.log_changes erwartet 'id'-Spalte;
-- für diese Tabellen muss das Trigger-Framework erweitert werden (Sub-Aufgabe).
-- TODO: audit.log_changes generalisieren für zusammengesetzte PKs, oder Surrogate-ID
--       auch in cleaning_agent_hazard_phrase / _hazard_symbol / _ppe_symbol einführen.
-- select audit.enable_for('catalog', 'cleaning_agent_hazard_phrase');
-- select audit.enable_for('catalog', 'cleaning_agent_hazard_symbol');
-- select audit.enable_for('catalog', 'cleaning_agent_ppe_symbol');

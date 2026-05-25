-- Foto-Belege pro Inspection-Item
--
-- Typischer Use-Case: bei status='PROBLEM' fotografiert der Vorarbeiter den
-- Mangel (z.B. fehlendes Sieb, beschädigter Schlauch). Foto wird mit der
-- Inspection verknüpft und ist Teil des Audit-Pakets.
--
-- Storage-Entscheidung: bytea in PG. Für POC ausreichend (Neon hat 200 MB
-- pro Free-Tier). Bei produktivem Einsatz mit hohem Foto-Volumen sollten
-- die Bilder in Object-Storage (Vercel Blob / Cloudflare R2 / S3) und
-- die Tabelle nur die URL halten. Migrationspfad: photo_data bleibt
-- nullable + url-Spalte hinzufügen.

create table if not exists ops.inspection_photo (
    id                  bigint generated always as identity primary key,
    inspection_task_id  bigint not null references ops.inspection_task(id) on delete cascade,
    uploaded_by         text not null,
    uploaded_at         timestamptz not null default now(),
    mime_type           text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp', 'image/heic')),
    file_size_bytes     integer not null check (file_size_bytes > 0 and file_size_bytes <= 10485760),  -- max 10 MB
    photo_data          bytea not null,
    caption             text,
    -- Für die Spalten-Anzeige: Bilder werden über die URL /api/photo/{id} geholt,
    -- nicht direkt aus dieser bytea-Spalte (Server Components ziehen Bilder nicht inline).
    -- Audit/Hash-Chain-Integration: ein Insert hier wird durch den Standard-Trigger
    -- log_changes in audit.activity_log eingetragen (mit photo_data ALS JSONB-Snapshot;
    -- das wird groß, aber das ist das Trade-off für Beweissicherheit).
    constraint inspection_photo_caption_max_len check (caption is null or length(caption) <= 500)
);
create index if not exists inspection_photo_task_idx
    on ops.inspection_photo (inspection_task_id);
create index if not exists inspection_photo_uploaded_at_idx
    on ops.inspection_photo (uploaded_at desc);

comment on table ops.inspection_photo is
    'Foto-Belege pro inspection_task. Typischerweise zur Dokumentation bei status=PROBLEM. '
    'Bilder werden als bytea gespeichert (POC). Aufbewahrungsfrist: wie inspection_task '
    '(min. 5 Jahre nach IFS).';

-- Audit-Trigger anhängen — Photos sind beweissicher wichtig
select audit.enable_for('ops', 'inspection_photo');

# Seeds

Hier liegen **generierte** SQL-Insert-Skripte für die Initialladung der
PostgreSQL-Datenbank aus den Access-Quellen. Sie sind gitignored, weil:

- sie aus `etl/*.py` reproduzierbar sind (Source + Code → Seeds)
- sie echte Hersteller-, Reinigungsmittel- und ggf. Mitarbeiter-Daten
  enthalten und potenziell personenbezogen sind

## Re-Generierung

| Seed-Datei | Generiert durch |
|---|---|
| `catalog_reinigungsmittel.sql` | `.venv/bin/python etl/catalog_etl.py` |

## Anwendung

```bash
# (Voraussetzung: Schema wurde via schema/ddl/* angelegt)
psql "$DATABASE_URL" -f schema/seeds/catalog_reinigungsmittel.sql
```

Die Seeds sind **idempotent** via `ON CONFLICT (legacy_id) DO NOTHING` — ein
zweiter Aufruf ändert nichts. Damit lässt sich der Lauf auf Neon
gefahrlos wiederholen, z. B. nach einer Schema-Migration.

# etl/extract — Access-Lesepfad

Der Access-Lesepfad läuft **NICHT** über Python-JDBC (JPype/jaydebeapi),
sondern über das Java-CLI-Tool `tools/AccessExtract.java`, aufgerufen via
`tools/access` Bash-Wrapper.

Begründung: siehe [ADR-001](../../docs/decisions/001-toolchain-subprocess-statt-jpype.md).

Python-Code in diesem Verzeichnis wird ETL-Transformationen + Output-Parsing
übernehmen — sobald das Inventarisierungs-Skript geschrieben wird.

Aktuell: Verzeichnis ist leer (außer `__init__.py`).

# SQL-Assertions

Versionierte Geschäftsregel-Tests aus Plan §7 (Validierung).

Jede `*.sql`-Datei ist ein **Test**: sie liefert pro Assertion eine
Zeile mit `(test_name, status, violations, details)` zurück.

- `status = 'OK'` und `violations = 0` → Test bestanden
- `status = 'FAIL'` und `violations > 0` → Test fehlgeschlagen,
  `details` enthält Beispiel-IDs der Verstöße

**Konvention:** jede Assertion ist als `SELECT` formuliert, die das
einheitliche Schema `(test_name text, status text, violations bigint, details text)`
zurückgibt. Damit lassen sich alle Tests in einem Lauf via UNION ALL
aggregieren.

## Anwendung

```bash
# Voraussetzung: schema/apply.sh ist vorher gelaufen, Daten sind geladen
export DATABASE_URL="postgres://..."
bash tests/run.sh
```

Der Runner gibt eine Zusammenfassung aus und exit-codet mit 1, wenn
mindestens ein Test fehlschlägt.

## Test-Kategorien (Reihenfolge im Lauf)

| Datei | Kategorie | Worum geht es |
|---|---|---|
| `010_referential_integrity.sql` | Struktur | FK-Auflösungen vollständig |
| `020_uniqueness.sql` | Struktur | Composite-Unique-Constraints + legacy_id |
| `030_required_fields.sql` | Datenqualität | NOT-NULL-Felder + Pflichtbeziehungen |
| `040_audit_coverage.sql` | Audit | Trigger auf allen fachlichen Tabellen |
| `050_domain_separation.sql` | Architektur | hr ⊥ billing (Plan §5) |
| `100_catalog_consistency.sql` | Fachlich | Reinigungsmittel-Stammdaten |
| `110_hygiene_plan_consistency.sql` | Fachlich | Pläne + Arbeitsschritte |
| `200_customer_data_quality.sql` | Fachlich | Kunden + Mandantentrennung |
| `300_operations_consistency.sql` | Fachlich | Abteilungen + Objekte + Hygienekontrollen |

**Wichtig:** Diese Tests laufen erst sinnvoll **nach** dem Apply-Lauf
(`schema/apply.sh`). Vorher ist das Schema leer und alle Counts sind 0.

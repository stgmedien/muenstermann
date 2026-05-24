import java.io.*;
import java.nio.charset.StandardCharsets;
import java.sql.*;
import java.util.*;

import com.healthmarketscience.jackcess.Database;
import com.healthmarketscience.jackcess.TableMetaData;
import net.ucanaccess.jdbc.UcanaccessConnection;

/**
 * Liest .accdb / .mdb-Dateien via UCanAccess und gibt Inventar-Daten
 * als JSON (oder Klartext) aus.
 *
 * Kommandos:
 *   list-tables                 — Tabellenliste (Klartext, stdout)
 *   row-counts                  — Zeilenzahlen pro Tabelle (Klartext)
 *   schema [--output FILE]      — JSON: vollständige Tabellen- und Spalten-Struktur
 *   linked-tables [--output F]  — JSON: nur Linked-Table-Zuordnungen
 *
 * Bei --output schreibt das Kommando reines JSON in die Datei; stdout
 * bleibt frei für Statusausgaben.
 */
public class AccessExtract {

    public static void main(String[] args) throws Exception {
        if (args.length < 1) {
            usage();
            System.exit(2);
        }
        String path = args[0];
        String cmd = args.length > 1 ? args[1] : "list-tables";
        String outputPath = null;
        for (int i = 2; i < args.length - 1; i++) {
            if ("--output".equals(args[i])) {
                outputPath = args[i + 1];
            }
        }

        Class.forName("net.ucanaccess.jdbc.UcanaccessDriver");
        String url = "jdbc:ucanaccess://" + path
                + ";openExclusive=false;memory=false;immediatelyReleaseResources=true";

        try (Connection c = DriverManager.getConnection(url, "", "")) {
            switch (cmd) {
                case "list-tables":  listTables(c);                    break;
                case "row-counts":   rowCounts(c);                     break;
                case "schema":       schemaJson(c, path, outputPath);  break;
                case "linked-tables": linkedTablesJson(c, outputPath); break;
                default:
                    System.err.println("Unbekanntes Kommando: " + cmd);
                    usage();
                    System.exit(2);
            }
        }
    }

    private static void usage() {
        System.err.println("Usage: AccessExtract <accdb-path> [list-tables|row-counts|schema|linked-tables] [--output FILE]");
    }

    // ---------- Klartext-Kommandos ----------

    private static List<String> userTables(Connection c) throws SQLException {
        DatabaseMetaData md = c.getMetaData();
        List<String> tables = new ArrayList<>();
        try (ResultSet rs = md.getTables(null, null, "%", new String[]{"TABLE"})) {
            while (rs.next()) {
                String name = rs.getString("TABLE_NAME");
                if (name == null || name.startsWith("MSys")) continue;
                tables.add(name);
            }
        }
        Collections.sort(tables);
        return tables;
    }

    private static void listTables(Connection c) throws SQLException {
        List<String> tables = userTables(c);
        System.out.println("Anwendertabellen: " + tables.size());
        for (String t : tables) System.out.println("  - " + t);
    }

    private static void rowCounts(Connection c) throws SQLException {
        List<String> tables = userTables(c);
        System.out.println("Anwendertabellen: " + tables.size());
        try (Statement st = c.createStatement()) {
            for (String t : tables) {
                try (ResultSet r = st.executeQuery("SELECT COUNT(*) FROM [" + t + "]")) {
                    r.next();
                    System.out.println("  - " + t + ": " + r.getInt(1));
                } catch (SQLException e) {
                    System.out.println("  - " + t + ": FEHLER " + e.getMessage());
                }
            }
        }
    }

    // ---------- JSON-Kommandos ----------

    private static void schemaJson(Connection c, String accdbPath, String outputPath) throws Exception {
        DatabaseMetaData md = c.getMetaData();
        List<String> tables = userTables(c);

        StringBuilder out = new StringBuilder();
        out.append("{\n");
        out.append("  \"path\": ").append(jsonStr(accdbPath)).append(",\n");
        out.append("  \"driver_product\": ").append(jsonStr(md.getDatabaseProductName()
                + " " + md.getDatabaseProductVersion())).append(",\n");
        out.append("  \"tables\": [\n");

        for (int ti = 0; ti < tables.size(); ti++) {
            String t = tables.get(ti);
            out.append("    {\n");
            out.append("      \"name\": ").append(jsonStr(t)).append(",\n");

            // Row count
            long rowCount = -1;
            try (Statement st = c.createStatement();
                 ResultSet r = st.executeQuery("SELECT COUNT(*) FROM [" + t + "]")) {
                r.next();
                rowCount = r.getLong(1);
            } catch (SQLException ignored) {}
            out.append("      \"row_count\": ").append(rowCount).append(",\n");

            // Primary key
            Set<String> pkCols = new LinkedHashSet<>();
            try (ResultSet r = md.getPrimaryKeys(null, null, t)) {
                while (r.next()) pkCols.add(r.getString("COLUMN_NAME"));
            }
            out.append("      \"primary_key\": [");
            boolean firstPk = true;
            for (String pk : pkCols) {
                if (!firstPk) out.append(", ");
                out.append(jsonStr(pk));
                firstPk = false;
            }
            out.append("],\n");

            // Columns
            out.append("      \"columns\": [\n");
            try (ResultSet r = md.getColumns(null, null, t, "%")) {
                boolean firstCol = true;
                while (r.next()) {
                    if (!firstCol) out.append(",\n");
                    String colName = r.getString("COLUMN_NAME");
                    String typeName = r.getString("TYPE_NAME");
                    int colSize = r.getInt("COLUMN_SIZE");
                    int nullable = r.getInt("NULLABLE");
                    String defaultVal = r.getString("COLUMN_DEF");
                    out.append("        {");
                    out.append("\"name\": ").append(jsonStr(colName));
                    out.append(", \"type\": ").append(jsonStr(typeName));
                    out.append(", \"size\": ").append(colSize);
                    out.append(", \"nullable\": ").append(nullable == 1);
                    out.append(", \"default\": ").append(jsonStr(defaultVal));
                    out.append(", \"is_pk\": ").append(pkCols.contains(colName));
                    out.append("}");
                    firstCol = false;
                }
            }
            out.append("\n      ],\n");

            // Indexes (excluding PK to avoid duplication)
            out.append("      \"indexes\": [\n");
            try (ResultSet r = md.getIndexInfo(null, null, t, false, true)) {
                Map<String, Map<String, Object>> indexes = new LinkedHashMap<>();
                while (r.next()) {
                    String idxName = r.getString("INDEX_NAME");
                    if (idxName == null) continue;
                    String colName = r.getString("COLUMN_NAME");
                    boolean nonUnique = r.getBoolean("NON_UNIQUE");
                    Map<String, Object> idx = indexes.computeIfAbsent(idxName, k -> {
                        Map<String, Object> m = new LinkedHashMap<>();
                        m.put("unique", !nonUnique);
                        m.put("columns", new ArrayList<String>());
                        return m;
                    });
                    @SuppressWarnings("unchecked")
                    List<String> cols = (List<String>) idx.get("columns");
                    if (colName != null) cols.add(colName);
                }
                boolean firstIdx = true;
                for (Map.Entry<String, Map<String, Object>> e : indexes.entrySet()) {
                    if (!firstIdx) out.append(",\n");
                    out.append("        {");
                    out.append("\"name\": ").append(jsonStr(e.getKey()));
                    out.append(", \"unique\": ").append(e.getValue().get("unique"));
                    out.append(", \"columns\": [");
                    @SuppressWarnings("unchecked")
                    List<String> cols = (List<String>) e.getValue().get("columns");
                    for (int i = 0; i < cols.size(); i++) {
                        if (i > 0) out.append(", ");
                        out.append(jsonStr(cols.get(i)));
                    }
                    out.append("]}");
                    firstIdx = false;
                }
            }
            out.append("\n      ],\n");

            // Foreign keys (von dieser Tabelle ausgehend)
            out.append("      \"foreign_keys\": [\n");
            try (ResultSet r = md.getImportedKeys(null, null, t)) {
                boolean firstFk = true;
                while (r.next()) {
                    if (!firstFk) out.append(",\n");
                    out.append("        {");
                    out.append("\"fk_column\": ").append(jsonStr(r.getString("FKCOLUMN_NAME")));
                    out.append(", \"target_table\": ").append(jsonStr(r.getString("PKTABLE_NAME")));
                    out.append(", \"target_column\": ").append(jsonStr(r.getString("PKCOLUMN_NAME")));
                    out.append("}");
                    firstFk = false;
                }
            }
            out.append("\n      ]\n");

            out.append("    }");
            if (ti < tables.size() - 1) out.append(",");
            out.append("\n");
        }
        out.append("  ]\n");
        out.append("}\n");

        emit(out.toString(), outputPath);
    }

    private static void linkedTablesJson(Connection c, String outputPath) throws Exception {
        // UCanAccess blockt MSysObjects — wir greifen direkt auf die
        // zugrundeliegende Jackcess-Database-Instanz zu, die eine native API
        // für Linked-Table-Auflösung hat.
        StringBuilder out = new StringBuilder();
        out.append("{\n  \"linked_tables\": [\n");
        boolean first = true;

        UcanaccessConnection uc = (UcanaccessConnection) c;
        Database db = uc.getDbIO();

        List<TableMetaData> linked = new ArrayList<>();
        for (TableMetaData tmd : db.newTableMetaDataIterable()) {
            if (tmd.isLinked() && !tmd.isSystem()) linked.add(tmd);
        }
        linked.sort(Comparator.comparing(TableMetaData::getName));

        for (TableMetaData tmd : linked) {
            if (!first) out.append(",\n");
            out.append("    {");
            out.append("\"name\": ").append(jsonStr(tmd.getName()));
            out.append(", \"linked_db\": ").append(jsonStr(tmd.getLinkedDbName()));
            out.append(", \"linked_table\": ").append(jsonStr(tmd.getLinkedTableName()));
            out.append("}");
            first = false;
        }
        out.append("\n  ]\n}\n");

        emit(out.toString(), outputPath);
    }

    // ---------- Helpers ----------

    private static void emit(String json, String outputPath) throws IOException {
        if (outputPath != null) {
            try (Writer w = new OutputStreamWriter(new FileOutputStream(outputPath), StandardCharsets.UTF_8)) {
                w.write(json);
            }
        } else {
            System.out.print(json);
        }
    }

    private static String jsonStr(String s) {
        if (s == null) return "null";
        StringBuilder b = new StringBuilder("\"");
        for (int i = 0; i < s.length(); i++) {
            char ch = s.charAt(i);
            switch (ch) {
                case '"':  b.append("\\\""); break;
                case '\\': b.append("\\\\"); break;
                case '\b': b.append("\\b");  break;
                case '\f': b.append("\\f");  break;
                case '\n': b.append("\\n");  break;
                case '\r': b.append("\\r");  break;
                case '\t': b.append("\\t");  break;
                default:
                    if (ch < 0x20) {
                        b.append(String.format("\\u%04x", (int) ch));
                    } else {
                        b.append(ch);
                    }
            }
        }
        b.append("\"");
        return b.toString();
    }
}

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
 *   profile [--output FILE]     — JSON: Spalten-Profile (Nulls, Distincts, Min/Max, Top-Werte)
 *   dump TABLE [--output FILE]  — JSON: alle Zeilen einer Tabelle (BLOBs werden ausgeblendet)
 *
 * Bei --output schreibt das Kommando reines JSON in die Datei; stdout
 * bleibt frei für Statusausgaben.
 *
 * Profiling-Heuristiken (gegen PII-Leakage):
 *   - Top-N-Werte werden nur für Spalten mit ≤ 30 Distinct-Werten ausgegeben
 *     (Annahme: das sind Enums / Kategorien, keine identifizierenden Werte).
 *   - Für Memo-Felder (size ≥ 1_000_000) wird KEIN Distinct-Count, KEIN Top-N
 *     ausgeführt — nur Null-Quote + max length.
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
        String dumpTable = null;

        // Argumente parsen: für dump das nächste Positional als Tabellenname,
        // --output als Datei-Flag.
        int idx = 2;
        if ("dump".equals(cmd) && idx < args.length && !args[idx].startsWith("--")) {
            dumpTable = args[idx];
            idx++;
        }
        for (int i = idx; i < args.length - 1; i++) {
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
                case "profile":      profileJson(c, path, outputPath); break;
                case "dump":
                    if (dumpTable == null) {
                        System.err.println("dump benötigt einen Tabellennamen als Argument.");
                        System.exit(2);
                    }
                    dumpJson(c, dumpTable, outputPath);
                    break;
                default:
                    System.err.println("Unbekanntes Kommando: " + cmd);
                    usage();
                    System.exit(2);
            }
        }
    }

    private static void usage() {
        System.err.println("Usage: AccessExtract <accdb-path> <cmd> [TABLE] [--output FILE]");
        System.err.println("  Kommandos: list-tables | row-counts | schema | linked-tables | profile | dump TABLE");
    }

    private static final int MEMO_SIZE_THRESHOLD = 1_000_000;
    private static final int TOPVALUES_DISTINCT_THRESHOLD = 30;

    private static boolean isNumericType(String typeName) {
        if (typeName == null) return false;
        String t = typeName.toUpperCase();
        return t.contains("INT") || t.equals("SMALLINT") || t.equals("BIGINT")
                || t.equals("DECIMAL") || t.equals("NUMERIC")
                || t.equals("REAL") || t.equals("DOUBLE") || t.equals("FLOAT")
                || t.equals("COUNTER") || t.equals("CURRENCY");
    }

    private static boolean isDateType(String typeName) {
        if (typeName == null) return false;
        String t = typeName.toUpperCase();
        return t.contains("DATE") || t.contains("TIME") || t.contains("TIMESTAMP");
    }

    private static boolean isTextType(String typeName) {
        if (typeName == null) return false;
        String t = typeName.toUpperCase();
        return t.contains("CHAR") || t.contains("TEXT") || t.equals("MEMO") || t.equals("LONGVARCHAR");
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

    // ---------- Profiling ----------

    private static void profileJson(Connection c, String accdbPath, String outputPath) throws Exception {
        DatabaseMetaData md = c.getMetaData();
        List<String> tables = userTables(c);

        StringBuilder out = new StringBuilder();
        out.append("{\n");
        out.append("  \"path\": ").append(jsonStr(accdbPath)).append(",\n");
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

            // Columns + per-column profile
            List<String[]> cols = new ArrayList<>(); // [name, type, size]
            try (ResultSet r = md.getColumns(null, null, t, "%")) {
                while (r.next()) {
                    cols.add(new String[]{
                            r.getString("COLUMN_NAME"),
                            r.getString("TYPE_NAME"),
                            String.valueOf(r.getInt("COLUMN_SIZE"))
                    });
                }
            }

            out.append("      \"columns\": [\n");
            for (int ci = 0; ci < cols.size(); ci++) {
                String colName = cols.get(ci)[0];
                String typeName = cols.get(ci)[1];
                int colSize = Integer.parseInt(cols.get(ci)[2]);
                boolean isMemo = colSize >= MEMO_SIZE_THRESHOLD;
                String quotedCol = "[" + colName + "]";

                out.append("        {");
                out.append("\"name\": ").append(jsonStr(colName));
                out.append(", \"type\": ").append(jsonStr(typeName));

                if (rowCount <= 0) {
                    out.append("}");
                    if (ci < cols.size() - 1) out.append(",");
                    out.append("\n");
                    continue;
                }

                // Null count + non-null count (immer, billig)
                long nonNull = -1, distinct = -1;
                try (Statement st = c.createStatement();
                     ResultSet r = st.executeQuery(
                             "SELECT COUNT(" + quotedCol + ") FROM [" + t + "]")) {
                    r.next();
                    nonNull = r.getLong(1);
                } catch (SQLException ignored) {}
                long nullCount = rowCount - nonNull;
                out.append(", \"null_count\": ").append(nullCount);
                out.append(", \"non_null_count\": ").append(nonNull);

                if (isMemo) {
                    // Bei Memo-Feldern: nur max length, kein distinct, kein top-N
                    try (Statement st = c.createStatement();
                         ResultSet r = st.executeQuery(
                                 "SELECT MAX(LENGTH(" + quotedCol + ")) FROM [" + t + "]")) {
                        r.next();
                        long maxLen = r.getLong(1);
                        out.append(", \"max_length\": ").append(maxLen);
                    } catch (SQLException e) {
                        out.append(", \"max_length_error\": ").append(jsonStr(e.getMessage()));
                    }
                    out.append(", \"is_memo\": true");
                } else {
                    // Distinct count
                    try (Statement st = c.createStatement();
                         ResultSet r = st.executeQuery(
                                 "SELECT COUNT(DISTINCT " + quotedCol + ") FROM [" + t + "]")) {
                        r.next();
                        distinct = r.getLong(1);
                        out.append(", \"distinct_count\": ").append(distinct);
                    } catch (SQLException e) {
                        out.append(", \"distinct_error\": ").append(jsonStr(e.getMessage()));
                    }

                    // Min / Max für numerische und Datums-Typen
                    if (isNumericType(typeName) || isDateType(typeName)) {
                        try (Statement st = c.createStatement();
                             ResultSet r = st.executeQuery(
                                     "SELECT MIN(" + quotedCol + "), MAX(" + quotedCol + ") FROM [" + t + "]")) {
                            r.next();
                            String minVal = r.getString(1);
                            String maxVal = r.getString(2);
                            out.append(", \"min\": ").append(jsonStr(minVal));
                            out.append(", \"max\": ").append(jsonStr(maxVal));
                        } catch (SQLException ignored) {}
                    }

                    // Max length für Text
                    if (isTextType(typeName)) {
                        try (Statement st = c.createStatement();
                             ResultSet r = st.executeQuery(
                                     "SELECT MAX(LENGTH(" + quotedCol + ")) FROM [" + t + "]")) {
                            r.next();
                            long maxLen = r.getLong(1);
                            out.append(", \"max_length\": ").append(maxLen);
                        } catch (SQLException ignored) {}
                    }

                    // Top-N-Werte nur für low-cardinality
                    if (distinct > 0 && distinct <= TOPVALUES_DISTINCT_THRESHOLD) {
                        out.append(", \"top_values\": [");
                        try (Statement st = c.createStatement();
                             ResultSet r = st.executeQuery(
                                     "SELECT " + quotedCol + ", COUNT(*) AS c FROM [" + t + "] " +
                                             "GROUP BY " + quotedCol + " " +
                                             "ORDER BY c DESC")) {
                            boolean firstTv = true;
                            while (r.next()) {
                                if (!firstTv) out.append(", ");
                                String v = r.getString(1);
                                long cnt = r.getLong(2);
                                out.append("{\"value\": ").append(jsonStr(v));
                                out.append(", \"count\": ").append(cnt).append("}");
                                firstTv = false;
                            }
                        } catch (SQLException ignored) {}
                        out.append("]");
                    }
                }

                out.append("}");
                if (ci < cols.size() - 1) out.append(",");
                out.append("\n");
            }
            out.append("      ]\n");

            out.append("    }");
            if (ti < tables.size() - 1) out.append(",");
            out.append("\n");
        }
        out.append("  ]\n}\n");

        emit(out.toString(), outputPath);
    }

    // ---------- Dump ----------

    private static void dumpJson(Connection c, String tableName, String outputPath) throws Exception {
        StringBuilder out = new StringBuilder();
        out.append("{\n  \"table\": ").append(jsonStr(tableName)).append(",\n");
        out.append("  \"rows\": [\n");

        String quoted = "[" + tableName + "]";
        try (Statement st = c.createStatement();
             ResultSet rs = st.executeQuery("SELECT * FROM " + quoted)) {
            ResultSetMetaData md = rs.getMetaData();
            int ncols = md.getColumnCount();
            String[] colNames = new String[ncols];
            int[] colTypes = new int[ncols];
            for (int i = 0; i < ncols; i++) {
                colNames[i] = md.getColumnLabel(i + 1);
                colTypes[i] = md.getColumnType(i + 1);
            }

            boolean firstRow = true;
            while (rs.next()) {
                if (!firstRow) out.append(",\n");
                out.append("    {");
                for (int i = 0; i < ncols; i++) {
                    if (i > 0) out.append(", ");
                    out.append(jsonStr(colNames[i])).append(": ");
                    appendValue(out, rs, i + 1, colTypes[i]);
                }
                out.append("}");
                firstRow = false;
            }
        }
        out.append("\n  ]\n}\n");
        emit(out.toString(), outputPath);
    }

    private static void appendValue(StringBuilder out, ResultSet rs, int col, int sqlType) throws SQLException {
        // BLOBs/Binary: nicht in JSON serialisieren — Marker stattdessen.
        if (sqlType == Types.BLOB || sqlType == Types.BINARY
                || sqlType == Types.VARBINARY || sqlType == Types.LONGVARBINARY) {
            byte[] bytes = rs.getBytes(col);
            if (bytes == null) { out.append("null"); return; }
            out.append("{\"__blob_size\": ").append(bytes.length).append("}");
            return;
        }

        Object v = rs.getObject(col);
        if (v == null) { out.append("null"); return; }

        if (v instanceof Boolean) {
            out.append(((Boolean) v) ? "true" : "false");
            return;
        }
        if (v instanceof Number) {
            out.append(v.toString());
            return;
        }
        // Datums-/Zeitwerte und Strings: als String serialisieren
        out.append(jsonStr(v.toString()));
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

import java.sql.*;
import java.util.*;

public class AccessExtract {
    public static void main(String[] args) throws Exception {
        if (args.length < 1) {
            System.err.println("Usage: AccessExtract <accdb-path> [command]");
            System.err.println("Commands: list-tables (default) | row-counts");
            System.exit(2);
        }
        String path = args[0];
        String cmd = args.length > 1 ? args[1] : "list-tables";

        Class.forName("net.ucanaccess.jdbc.UcanaccessDriver");
        String url = "jdbc:ucanaccess://" + path
                + ";openExclusive=false;memory=false;immediatelyReleaseResources=true";

        try (Connection c = DriverManager.getConnection(url, "", "")) {
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

            if (cmd.equals("list-tables")) {
                System.out.println("Anwendertabellen: " + tables.size());
                for (String t : tables) System.out.println("  - " + t);
            } else if (cmd.equals("row-counts")) {
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
            } else {
                System.err.println("Unbekanntes Kommando: " + cmd);
                System.exit(2);
            }
        }
    }
}

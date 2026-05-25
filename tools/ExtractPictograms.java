import java.io.*;
import java.nio.file.*;
import java.util.*;

import com.healthmarketscience.jackcess.Database;
import com.healthmarketscience.jackcess.DatabaseBuilder;
import com.healthmarketscience.jackcess.Row;
import com.healthmarketscience.jackcess.Table;
import com.healthmarketscience.jackcess.complex.Attachment;
import com.healthmarketscience.jackcess.complex.ComplexValueForeignKey;
import com.healthmarketscience.jackcess.util.OleBlob;

/**
 * Extrahiert OLE-Object-Bilder aus den Symbol-Tabellen von Reinigungsmittel_2025.accdb
 * via Jackcess (kein UCanAccess/JDBC, weil OLE-Blobs durch JDBC nicht sauber gehen).
 *
 * Output:
 *   ./out/hazard/{ID}.{ext}  aus tblSymboleGefahren
 *   ./out/ppe/{ID}.{ext}     aus tblSymbolePSA
 *
 * Plus mapping.txt: pro File die zugehörige Eigenschaft/Bezeichnung.
 *
 * Aufruf:
 *   java -cp ... ExtractPictograms <accdb> <output-dir>
 */
public class ExtractPictograms {
    public static void main(String[] args) throws Exception {
        if (args.length < 2) {
            System.err.println("Usage: ExtractPictograms <accdb-path> <output-dir>");
            System.exit(2);
        }
        File accdb = new File(args[0]);
        Path outDir = Paths.get(args[1]);
        Files.createDirectories(outDir.resolve("hazard"));
        Files.createDirectories(outDir.resolve("ppe"));

        try (Database db = DatabaseBuilder.open(accdb)) {
            int hazard = extractTable(db, "tblSymboleGefahren", "GefPikto1",
                                       "Eigenschaft", outDir.resolve("hazard"));
            int ppe = extractTable(db, "tblSymbolePSA", "Piktogramm",
                                    "Bezeichnung", outDir.resolve("ppe"));
            System.out.println("hazard: " + hazard + ", ppe: " + ppe);
        }
    }

    /**
     * @param db        Jackcess Database
     * @param tableName Quelltabelle
     * @param blobColumn Name der OLE-Object-Spalte
     * @param labelColumn Name der zugehörigen Beschriftungs-Spalte (für Logging)
     * @param outDir   Zielverzeichnis
     * @return Anzahl extrahierte Bilder
     */
    static int extractTable(Database db, String tableName, String blobColumn,
                             String labelColumn, Path outDir) throws Exception {
        Table tbl = db.getTable(tableName);
        if (tbl == null) {
            System.err.println("Tabelle nicht gefunden: " + tableName);
            return 0;
        }
        BufferedWriter mapping = Files.newBufferedWriter(outDir.resolve("mapping.txt"));
        int count = 0;
        for (Row row : tbl) {
            Object idObj = row.get("ID");
            int id = idObj instanceof Number ? ((Number) idObj).intValue() : -1;
            String label = Objects.toString(row.get(labelColumn), "");
            Object blobObj = row.get(blobColumn);
            byte[] raw = null;
            if (blobObj instanceof ComplexValueForeignKey) {
                // Access "Attachment"-Typ: kann 0..N Files enthalten
                ComplexValueForeignKey cvfk = (ComplexValueForeignKey) blobObj;
                List<Attachment> atts = cvfk.getAttachments();
                if (atts.isEmpty()) {
                    mapping.write(id + "\t" + label + "\t(keine Attachments)\n");
                    continue;
                }
                // ersten Attachment nehmen
                Attachment att = atts.get(0);
                raw = att.getFileData();
                String origName = att.getFileName();
                String fileType = att.getFileType();
                String ext = guessExtension(raw);
                if (ext.equals("bin") && origName != null && origName.contains(".")) {
                    ext = origName.substring(origName.lastIndexOf('.') + 1).toLowerCase();
                }
                Path outFile = outDir.resolve(id + "." + ext);
                Files.write(outFile, raw);
                mapping.write(id + "\t" + label + "\t" + outFile.getFileName() +
                              "\t(orig: " + origName + ", type: " + fileType + ", " +
                              raw.length + " bytes)\n");
                count++;
                continue;
            }
            if (blobObj instanceof byte[]) {
                raw = (byte[]) blobObj;
            }
            if (raw == null || raw.length == 0) {
                mapping.write(id + "\t" + label + "\t(leer/unbekannter Typ: " +
                              (blobObj == null ? "null" : blobObj.getClass().getSimpleName()) + ")\n");
                continue;
            }

            String ext = "bin";
            byte[] payload = raw;

            // Versuche OLE-Blob zu parsen
            try (OleBlob blob = OleBlob.Builder.fromInternalData(raw)) {
                OleBlob.Content content = blob.getContent();
                if (content instanceof OleBlob.EmbeddedContent) {
                    OleBlob.EmbeddedContent emb = (OleBlob.EmbeddedContent) content;
                    payload = emb.getStream().readAllBytes();
                } else if (content instanceof OleBlob.LinkContent) {
                    mapping.write(id + "\t" + label + "\t(link only)\n");
                    continue;
                } else if (content instanceof OleBlob.CompoundContent) {
                    OleBlob.CompoundContent compound = (OleBlob.CompoundContent) content;
                    boolean found = false;
                    for (OleBlob.CompoundContent.Entry entry : compound) {
                        String name = entry.getName().toLowerCase();
                        if (name.contains("contents") || name.endsWith(".png") ||
                            name.endsWith(".jpg") || name.endsWith(".jpeg") ||
                            name.endsWith(".gif") || name.endsWith(".bmp")) {
                            payload = entry.getStream().readAllBytes();
                            found = true;
                            break;
                        }
                    }
                    if (!found) {
                        mapping.write(id + "\t" + label + "\t(compound: keine Bild-Entry)\n");
                        continue;
                    }
                }
            } catch (Exception e) {
                // Kein OLE — payload bleibt raw
            }

            // Datei-Format am Magic-Header erkennen
            ext = guessExtension(payload);
            Path outFile = outDir.resolve(id + "." + ext);
            Files.write(outFile, payload);
            mapping.write(id + "\t" + label + "\t" + outFile.getFileName() + "\n");
            count++;
        }
        mapping.close();
        return count;
    }

    static String guessExtension(byte[] data) {
        if (data.length >= 8 && data[0] == (byte) 0x89 && data[1] == 0x50 &&
            data[2] == 0x4E && data[3] == 0x47) return "png";
        if (data.length >= 3 && data[0] == (byte) 0xFF && data[1] == (byte) 0xD8 &&
            data[2] == (byte) 0xFF) return "jpg";
        if (data.length >= 6 && data[0] == 0x47 && data[1] == 0x49 && data[2] == 0x46) return "gif";
        if (data.length >= 2 && data[0] == 0x42 && data[1] == 0x4D) return "bmp";
        if (data.length >= 4 && data[0] == 0x25 && data[1] == 0x50 && data[2] == 0x44 &&
            data[3] == 0x46) return "pdf";
        if (data.length >= 4 && data[0] == 0x49 && data[1] == 0x49 &&
            data[2] == 0x2A && data[3] == 0x00) return "tif";
        // Manche Access-OLE-Blobs sind Windows Metafile (WMF/EMF)
        if (data.length >= 4 && data[0] == (byte)0xD7 && data[1] == (byte)0xCD &&
            data[2] == (byte)0xC6 && data[3] == (byte)0x9A) return "wmf";
        if (data.length >= 4 && data[0] == 0x01 && data[1] == 0x00 &&
            data[2] == 0x00 && data[3] == 0x00) return "emf";
        return "bin";
    }
}

"""Access (.accdb / .mdb) reader using UCanAccess JDBC via jaydebeapi.

Kein UCanAccess-spezifischer Code außerhalb dieses Moduls — Rest des ETL
arbeitet nur mit standardisierten Datenstrukturen (Tabellenliste, DataFrames).
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

import jaydebeapi
import pandas as pd

REPO_ROOT = Path(__file__).resolve().parents[2]
UCANACCESS_DIR = REPO_ROOT / "tools" / "UCanAccess-5.0.1.bin"

UCANACCESS_JARS = [
    UCANACCESS_DIR / "ucanaccess-5.0.1.jar",
    UCANACCESS_DIR / "lib" / "commons-lang3-3.8.1.jar",
    UCANACCESS_DIR / "lib" / "commons-logging-1.2.jar",
    UCANACCESS_DIR / "lib" / "hsqldb-2.5.0.jar",
    UCANACCESS_DIR / "lib" / "jackcess-3.0.1.jar",
]

UCANACCESS_DRIVER = "net.ucanaccess.jdbc.UcanaccessDriver"


@dataclass
class TableInfo:
    name: str
    row_count: int
    column_count: int


def _classpath() -> list[str]:
    missing = [str(p) for p in UCANACCESS_JARS if not p.exists()]
    if missing:
        raise FileNotFoundError(
            "UCanAccess JARs nicht gefunden:\n  " + "\n  ".join(missing) +
            f"\nErwartet unter: {UCANACCESS_DIR}"
        )
    return [str(p) for p in UCANACCESS_JARS]


def connect(accdb_path: str | os.PathLike, *, read_only: bool = True):
    """Open a JDBC connection to an .accdb / .mdb file.

    read_only=True wird in der Migrationsphase strikt eingehalten —
    wir verändern die Quell-DBs nie.
    """
    accdb_path = Path(accdb_path).resolve()
    if not accdb_path.exists():
        raise FileNotFoundError(f"Access-Datei nicht gefunden: {accdb_path}")

    jdbc_url = f"jdbc:ucanaccess://{accdb_path}"
    if read_only:
        jdbc_url += ";openExclusive=false;memory=false;immediatelyReleaseResources=true"

    return jaydebeapi.connect(
        UCANACCESS_DRIVER,
        jdbc_url,
        ["", ""],  # user, password (Münstermann-DBs vermutlich ohne)
        _classpath(),
    )


def list_user_tables(conn) -> list[str]:
    """Liste der vom Anwender angelegten Tabellen (nicht System-Tabellen)."""
    meta = conn.jconn.getMetaData()
    rs = meta.getTables(None, None, "%", ["TABLE"])
    tables: list[str] = []
    try:
        while rs.next():
            schema = rs.getString("TABLE_SCHEM")
            name = rs.getString("TABLE_NAME")
            # UCanAccess: Anwender-Tabellen liegen meist im Schema "PUBLIC"
            # System-Tabellen heißen "MSys*"
            if name.startswith("MSys"):
                continue
            tables.append(name)
    finally:
        rs.close()
    return sorted(tables)


def table_row_count(conn, table_name: str) -> int:
    quoted = f'"{table_name}"'
    cur = conn.cursor()
    try:
        cur.execute(f"SELECT COUNT(*) FROM {quoted}")
        (count,) = cur.fetchone()
        return int(count)
    finally:
        cur.close()


def table_columns(conn, table_name: str) -> list[tuple[str, str, bool]]:
    """Liste (column_name, jdbc_type_name, nullable) für eine Tabelle."""
    meta = conn.jconn.getMetaData()
    rs = meta.getColumns(None, None, table_name, "%")
    cols: list[tuple[str, str, bool]] = []
    try:
        while rs.next():
            cols.append((
                rs.getString("COLUMN_NAME"),
                rs.getString("TYPE_NAME"),
                rs.getInt("NULLABLE") == 1,
            ))
    finally:
        rs.close()
    return cols


def sample_rows(conn, table_name: str, limit: int = 5) -> pd.DataFrame:
    quoted = f'"{table_name}"'
    return pd.read_sql(f"SELECT * FROM {quoted} FETCH FIRST {limit} ROWS ONLY",
                       conn)

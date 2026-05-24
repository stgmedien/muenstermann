"""Wrapper um tools/access (Java-Subprocess) — liefert DataFrames.

Dieses Modul kapselt den Unterprozess-Aufruf und konvertiert die JSON-
Antworten von AccessExtract in Pandas-DataFrames.
"""

from __future__ import annotations

import json
import subprocess
import tempfile
from pathlib import Path

import pandas as pd

REPO_ROOT = Path(__file__).resolve().parents[1]
ACCESS_TOOL = REPO_ROOT / "tools" / "access"


def _run(accdb: Path, *args: str) -> dict:
    """Ruft tools/access auf und liest dessen --output-Datei als JSON."""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as tmp:
        out_path = tmp.name
    try:
        proc = subprocess.run(
            [str(ACCESS_TOOL), str(accdb), *args, "--output", out_path],
            capture_output=True,
            text=True,
            check=False,
        )
        if proc.returncode != 0:
            raise RuntimeError(
                f"tools/access {' '.join(args)} fehlgeschlagen (rc={proc.returncode}):\n{proc.stderr}"
            )
        return json.loads(Path(out_path).read_text(encoding="utf-8"))
    finally:
        Path(out_path).unlink(missing_ok=True)


def dump_table(accdb: Path, table_name: str) -> pd.DataFrame:
    """Lädt eine ganze Tabelle als DataFrame.

    BLOB-Spalten kommen als dict `{"__blob_size": N}` — der Konsument
    entscheidet, was er damit macht.
    """
    payload = _run(accdb, "dump", table_name)
    rows = payload.get("rows", [])
    return pd.DataFrame(rows)


def load_schema(accdb: Path) -> dict:
    return _run(accdb, "schema")


def load_profile(accdb: Path) -> dict:
    return _run(accdb, "profile")


def load_linked_tables(accdb: Path) -> dict:
    return _run(accdb, "linked-tables")

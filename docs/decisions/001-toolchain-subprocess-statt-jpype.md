# ADR-001: Java als Subprocess, nicht via JPype

**Datum:** 2026-05-24
**Status:** akzeptiert (durch Praxistest erzwungen)
**Kontext:** Phase 0 — Setup der Access-Lesepfads für die Migration

## Problem

Der Plan §2 sah als primäre Toolchain `UCanAccess + Python (jaydebeapi, pandas)` vor — d. h. JVM wird in-process aus Python via JPype geladen. Auf der Zielmaschine (macOS arm64, Apple Silicon, macOS 26.3) crasht jeder Verbindungsversuch mit:

```
SIGBUS (0xa) at pc=...  V  [libjvm.dylib]  CodeHeap::allocate
si_code: BUS_ADRALN
```

Auch mit `-Xint` (JIT deaktiviert) tritt der Crash beim Initialisieren der frühen Stubs auf.

## Ursache

Das System-Python (`/usr/bin/python3` aus dem Xcode Command Line Tools-Bundle) ist mit **Hardened Runtime** signiert und besitzt **kein** `com.apple.security.cs.allow-jit`-Entitlement. Wenn JPype `libjvm.dylib` in diesen Prozess lädt, kann die JVM keine ausführbaren Speicherseiten allokieren (W^X-Policy auf Apple Silicon erfordert `MAP_JIT`, was Entitlements voraussetzt).

Das ist nicht spezifisch für UCanAccess oder jaydebeapi, sondern eine systemweite Restriktion für alle Hardened-Runtime-Prozesse, die nachträglich JIT-Code ausführen wollen.

Versuchte Workarounds, die scheiterten:
- `jpype.startJVM("-Xint", ...)` — Crash früher, in den initial stubs.
- pure-Python-Reader (`access_parser`) — kann `.accdb` mit Overflow-Records nicht parsen.
- `uv` als alternative Python-Distribution installieren — durch Auto-Mode-Policy blockiert (zu Recht, war Scope-Creep).

## Entscheidung

**UCanAccess wird via Java-Subprocess aufgerufen, nicht via JPype.**

Konkret:
- `tools/AccessExtract.java` ist eine kleine Java-CLI, die JDBC-Calls macht und Resultate auf stdout schreibt.
- `tools/access` ist ein Bash-Wrapper, der das lokale JDK + den UCanAccess-Classpath setzt.
- Python (im venv) ruft dieses Java-Tool via `subprocess.run()` auf — kein JPype, kein In-Process-JVM.

## Konsequenzen

**Vorteile:**
- ✅ Funktioniert auf jeder macOS-Konfiguration (Java läuft als eigener Prozess ohne Hardened-Runtime-Einschränkungen).
- ✅ Kein Homebrew, kein sudo, kein Python-Replacement nötig (lokales Temurin JDK 21 in `tools/jdk/`).
- ✅ Sprachgrenzen klar: Java macht das eine (Access lesen), Python macht das andere (ETL/Pandas/Validation).
- ✅ Eine Java-Crashes terminiert nicht den Python-Prozess.

**Nachteile:**
- ⚠️ JVM-Startup-Overhead pro Aufruf (~1–2 Sekunden). Für Inventarisierung & ETL kein Problem (wir batchen Operationen pro DB-Verbindung).
- ⚠️ Eine zusätzliche Java-Quelldatei muss gepflegt werden. Akzeptabel — sie bleibt klein (CLI nach JSON).
- ⚠️ Keine Streaming-API; große Result-Sets müssen über Dateien (Parquet) ausgetauscht werden, nicht über Pipes mit Pandas-DataFrames.

## Was bedeutet das für den Plan

Plan §2 (Toolchain) wird angepasst: Statt "Python via JPype/jaydebeapi" steht **"Java-CLI + Python via Subprocess"**. Funktional identisch, robust gegen die macOS-Restriktion.

`jaydebeapi`/`jpype1` bleiben in `requirements.txt` **vorerst** als toter Code, weil sie ggf. unter einer anderen Python-Distribution (z. B. wenn Frank/Edel Peter eine Windows-VM einsetzen) wieder genutzt werden könnten. Beim ersten Code-Cleanup-Sweep entfernen, wenn klar ist, dass wir bei der Subprocess-Architektur bleiben.

## Alternative, die wir nicht nehmen

- **Brew + brew-installiertes Python** würde JPype zum Laufen bringen. Aber: brew braucht sudo, und der Subprocess-Pfad ist sowieso robuster. Verworfen.
- **Windows-VM** wäre die "richtige" Plattform für Access-Migration (ODBC + Original-Access), aber unverhältnismäßiger Aufwand für eine Lesephase. Bleibt **für VBA-Extraktion** im Plan reserviert (Plan §2 sekundärer Pfad).

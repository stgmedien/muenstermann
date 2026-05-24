# Inventar: Adressen - Anschriften - H und I

**Quelle:** `/Users/jonathankreutzheide/Downloads/Probedaten Datenbank Muenstermann  Test/Adressen - Anschriften - H und I.accdb`
**Treiber:** UCanAccess driver for Microsoft Access databases using HSQLDB V2007 [VERSION_12]
**Tabellen gesamt:** 6
**Linked Tables:** 2

## Linked Tables

| Lokaler Name | Verlinkte DB | Tabelle dort |
|---|---|---|
| `Bundesländer` | `C:\OneDrive - Münstermann H. & I. GmbH & Co. KG\Büro\# Büro Allgemein\ListenAllgemein.accdb` | `Bundesländer` |
| `Personalstammdaten` | `Z:\Abrechnungen 2019\Personalstamm 2019.accdb` | `Personalstammdaten` |

## Tabellen-Übersicht

| Tabelle | Zeilen | Spalten | PK | Indizes | FKs |
|---|---:|---:|---|---:|---:|
| `Bewerbungen` | 1 | 24 | — | 0 | 0 |
| `Bewerbungen Hilfe` | 23 | 2 | — | 1 | 0 |
| `Gefährdungsfaktoren` | 1 | 58 | — | 0 | 0 |
| `Kunden` | 81 | 47 | Reinigungsgruppe | 6 | 0 |
| `Kunden Ansprechpartner` | 1 | 9 | — | 1 | 0 |
| `Kunden Mibikontrolle` | 11 | 2 | Nr | 3 | 0 |

## Auffälligkeiten

- `Bewerbungen` hat **keinen Primary Key** (1 Zeilen)
- `Bewerbungen Hilfe` hat **keinen Primary Key** (23 Zeilen)
- `Gefährdungsfaktoren` hat **keinen Primary Key** (1 Zeilen)
- `Kunden.Anmeldung` ist ein **Memo-Feld** (16 MB max)
- `Kunden Ansprechpartner` hat **keinen Primary Key** (1 Zeilen)

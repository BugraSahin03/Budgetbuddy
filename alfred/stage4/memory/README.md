# Alfred Personal Context Memory

OpenClaw-Plugin fuer bestaetigte, versionierte Langzeiterinnerungen.

## Werkzeuge

- `personal_context_snapshot(view)` liest den bestaetigten Kontext.
- `memory_propose(...)` legt einen ausstehenden Vorschlag an.
- `memory_confirm(...)` uebernimmt ihn nach einer separaten ausdruecklichen
  Bestaetigung in derselben Unterhaltung.
- `memory_cancel(...)` verwirft einen ausstehenden Vorschlag.

Operationen sind `create`, `replace`, `archive` und `forget`. `replace` behaelt
die abgeloeste Revision nachvollziehbar. `archive` behaelt den Inhalt, entfernt
ihn aber aus dem aktiven Kontext. `forget` entfernt den Inhalt aus kanonischem
Store, generiertem Markdown und inhaltsfreien Ereignisprotokollen.

## Produktionspfade

```text
/opt/alfred-memory-tool/
/var/lib/alfred/personal-context/store.json
/var/lib/alfred/personal-context/pending/
/var/lib/alfred/personal-context/events/
/var/lib/alfred/personal-context/markdown/
```

Der Plugin-Code ist root-eigen und nicht durch Alfred veraenderbar. Der feste
Kontextspeicher gehoert dem Benutzer `alfred` und hat Modus `0700`; Dateien
haben `0600`.

## Administration

```bash
sudo -u alfred -H env \
  ALFRED_MEMORY_ROOT=/var/lib/alfred/personal-context \
  node /opt/alfred-memory-tool/admin.mjs init

sudo -u alfred -H env \
  ALFRED_MEMORY_ROOT=/var/lib/alfred/personal-context \
  node /opt/alfred-memory-tool/admin.mjs verify

sudo -u alfred -H env \
  ALFRED_MEMORY_ROOT=/var/lib/alfred/personal-context \
  node /opt/alfred-memory-tool/admin.mjs render
```

`verify` gibt nur Vertrag, Revision, Anzahlen und Datenhash aus, keine privaten
Inhalte.

## Bestaetigungsablauf

1. Alfred klaert den Inhalt fachlich.
2. `memory_propose` erzeugt Proposal-ID, Bestaetigungscode, Ablaufzeit und die
   exakte strukturierte Fassung.
3. Alfred zeigt den Vorschlag und fragt nach dauerhafter Speicherung.
4. Erst eine neue eindeutige Nutzerantwort erlaubt `memory_confirm`.
5. Proposal-ID und Code sind an dieselbe OpenClaw-Unterhaltung gebunden.
6. Der Store wird atomar geschrieben und alle festen Markdown-Ansichten werden
   neu erzeugt.

Vorschlaege verfallen nach sieben Tagen. Proposals und Store besitzen
SHA-256-Integritaetswerte. Symlinks, gruppen- oder weltlesbare Dateien,
Kontrollzeichen, ungueltige IDs, zu grosse Inhalte, falsche Codes und
Sitzungswechsel werden abgelehnt.

## Grenzen

- kein freier Pfad oder Dateiname;
- keine Aenderung von OpenClaw-, Persoenlichkeits-, Werkzeug- oder
  Sicherheitsdateien;
- keine Zugangsdaten, Buchungslisten oder Snapshot-Kopien;
- keine automatische Uebernahme in demselben Turn wie der Vorschlag;
- normale Infrastruktur-Backups koennen geloeschte Inhalte bis zum Ende ihrer
  separat festgelegten Aufbewahrungsfrist enthalten.

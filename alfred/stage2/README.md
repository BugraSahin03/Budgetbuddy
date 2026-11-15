# Alfred – Stufe 2

Stufe 2 verbindet BudgetBuddy über einen deterministischen
read-only Collector und einen separaten Live-Abfragedienst mit Alfred. Der Collector läuft unter einem separaten
Systembenutzer, kann die BudgetBuddy-Datenbank nur lesen und schreibt nur
minimierte JSON-Snapshots in `/var/lib/alfred-snapshots/budgetbuddy/`.

Der Snapshot enthält Aggregate für Monate, Wochen, Kategorien, Sonderbudgets,
Kontostände und Datenqualität. Der Vertrag v2 enthält zusätzlich die einzelnen
Fixkosten-Planpositionen sowie aggregierte erkannte Fixkostenkontrollen und
trennt Gesamt- von variablen Ausgaben. Er enthält keine IBANs, Gegenparteien,
Verwendungszwecke, Import-Rohfelder oder Transaktions-IDs.

Produktionsdateien:

- Collector: `/opt/alfred-budgetbuddy-reader/collector.mjs`
- Snapshot: `/var/lib/alfred-snapshots/budgetbuddy/latest.json`
- Historie: `/var/lib/alfred-snapshots/budgetbuddy/history/`
- Timer: `alfred-budgetbuddy-collector.timer`
- OpenClaw-Tool: `/opt/alfred-budgetbuddy-tool/`

Die Trennung ist absichtlich: `alfred-collector` darf über die Gruppe
`budgetbuddy-readers` die Datenbank lesen und den Snapshot schreiben. Die
separate Gruppe `alfred-snapshots` erlaubt beiden Prozessen ausschließlich den
gemeinsamen Snapshot-Pfad. Der OpenClaw-Benutzer `alfred` darf die Datenbank
nicht lesen und den Snapshot nicht verändern. Das Tool akzeptiert nur eine
vordefinierte Ansicht, aber weder SQL noch einen Dateipfad.

Der Snapshot wird stündlich aktualisiert. Alfred verwirft ihn nach 120 Minuten
als veraltet; der proaktive Monitor meldet einen anhaltenden Ausfall nach 150
Minuten. Beträge werden in Cent gespeichert; Freitexte wie
Verwendungszweck, Gegenpartei und IBAN verlassen die Datenbank nicht.
# Live-Abfragen für Alfred

`budgetbuddy_query` liest über einen lokalen Unix-Socket. Nur Alfreds
Hauptagent mit vom Gateway erkanntem Eigentümer erhält das Werkzeug. Der
Gateway-Benutzer erhält keine Datenbankrechte. Der getrennte Dienst verwendet
SQLite `readonly` und `query_only` und bindet ausschließlich feste SQL-Abfragen
mit validierten Parametern. Er hat keinen TCP-Port und keine Schreibrechte auf
die Datenbank. Die vorhandenen Snapshot-Abfragen bleiben verfügbar.

- `summary`: bis zu 13 Budgetmonate, optional nach Kategorie und bis zum
  gewählten Buchungstag im jeweiligen Kalendermonat. Wirksame Verrechnungen
  zählen am letzten Buchungstag ihrer Mitglieder. Währungen bleiben getrennt.
- `transactions`: Originalbuchungen mit begrenzten Filtern und Seiten, ohne
  IBAN-Spalte, Rohimporte oder Import-Fingerprints.
- `settlements`: Gruppen und ihre Buchungen zur Nachvollziehbarkeit.

Deployment: Collector-Module `collector.mjs`, `live-query.mjs`, `live-server.mjs`
nach `/opt/alfred-budgetbuddy-reader/`; Plugin `index.ts`, `live-tool.ts` und
Manifest nach `/opt/alfred-budgetbuddy-tool/`. Unit installieren, mit
`systemctl daemon-reload` einlesen und den Query-Dienst aktivieren. Als Betreiber
`node alfred/stage2/deploy/enable-live-query.mjs` ausführen, Alfreds AGENTS und
TOOLS aktualisieren, Konfiguration validieren und Gateway neu starten.

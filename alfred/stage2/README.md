# Alfred – Stufe 2

Stufe 2 verbindet BudgetBuddy ausschließlich über einen deterministischen
read-only Collector mit Alfred. Der Collector läuft unter einem separaten
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

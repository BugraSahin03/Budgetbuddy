# ADR 0012: Alfred liest BudgetBuddy ueber minimierte Read-only-Snapshots

## Status

Akzeptiert und fuer Alfred Stufe 2 am 15. Juli 2026 produktiv umgesetzt.

## Kontext

Alfred soll echte Einnahmen, Ausgaben, Budgets und Kontostaende aus
BudgetBuddy analysieren koennen. Ein direkter Datenbankzugriff des
OpenClaw-Prozesses waere zwar einfach, wuerde aber dem Sprachmodell und seiner
Plugin-Laufzeit eine unnoetig grosse Vertrauensgrenze geben. Ein allgemeines
SQL-Werkzeug wuerde ausserdem Schemawissen, Datenschutzfilter und
Schreibschutz zur Laufzeit vom Modellverhalten abhaengig machen.

## Entscheidung

- Ein eigener Systembenutzer `alfred-collector` liest die produktive
  SQLite-Datei mit `readonly`, `fileMustExist` und `PRAGMA query_only=ON`.
- Der Collector akzeptiert ausschliesslich den bekannten BudgetBuddy-
  Schemastand `0020_fin_126` und fest versionierte Abfragen. Unbekannte
  Schemata fuehren zu einem Fehler statt zu einer bestmoeglichen Schaetzung.
- Der Collector erzeugt alle 15 Minuten einen atomaren JSON-Snapshot mit
  Monats-, Wochen-, Kategorie-, Budget-, Konto- und Datenqualitaetsaggregaten.
- Transaktions-IDs, Beschreibungen, Gegenparteien, IBANs, Import-Rohfelder und
  Notizen werden nicht exportiert.
- Inhalt und Herkunft des Snapshots werden mit einem SHA-256-Hash
  abgesichert. Der Erfassungszeitpunkt ist nicht Teil des Datenhashes, damit
  identische Finanzdaten keine unnoetigen Historienkopien erzeugen.
- Der OpenClaw-Benutzer `alfred` ist kein Mitglied von
  `budgetbuddy-readers` und kann die Datenbank nicht lesen. Er kann den
  Snapshot ueber `alfred-snapshots` lesen, aber nicht veraendern.
- Das OpenClaw-Plugin stellt genau das Werkzeug `budgetbuddy_snapshot` mit
  vordefinierten Ansichten bereit. Weder Dateipfade noch SQL koennen als
  Toolparameter uebergeben werden.
- Das Plugin prueft Dateityp, Schreibrechte, Vertrag, Herkunft, Hash und
  Aktualitaet. Nach 45 Minuten gilt ein Snapshot als veraltet und wird nicht
  als aktuelle Faktenquelle verwendet.
- Alfred behaelt das globale Toolprofil `minimal`; nur
  `budgetbuddy_snapshot` wird additiv freigeschaltet. Shell, Dateisystem,
  Browser, Web, Cron, erhoehte Rechte und allgemeiner Datenbankzugriff bleiben
  gesperrt.

## Folgen

- Ein kompromittierter oder fehlgeleiteter Modellturn kann BudgetBuddy weder
  veraendern noch frei abfragen.
- Alfred erhaelt nicht jede Buchungszeile, sondern bewusst nur fuer Coaching
  geeignete Aggregate. Detailfragen zu einzelnen Haendlern oder
  Verwendungszwecken koennen damit nicht beantwortet werden.
- Analysen koennen bis zu 15 Minuten hinter BudgetBuddy liegen. Nach 45
  Minuten muss Alfred die Quelle als nicht aktuell melden.
- BudgetBuddy-Schemaaenderungen benoetigen eine bewusste Anpassung und einen
  Test des Query-Katalogs, bevor der Collector wieder Daten liefert.
- Getquin, Depotdaten, Marktpreise, Ziele und Heartbeats sind nicht Teil
  dieser Entscheidung und folgen in eigenen Stufen.

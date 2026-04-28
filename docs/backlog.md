# Backlog / Tickets

## Arbeitsweise

Tickets werden in diesem Dokument gepflegt, bis ein GitHub-Repository existiert. Spaeter koennen sie als GitHub Issues uebernommen werden.

Neue Codex-Instanzen sollen vor der Umsetzung `docs/project-briefing.md` und `docs/codex-workflow.md` lesen.

Produktive Aenderungen muessen vor Abschluss durch eine Reviewer-Instanz freigegeben werden. Siehe `docs/review-workflow.md`.

Parallel laufende Tickets muessen getrennte Write-Scopes haben. Siehe `docs/parallel-development.md`.

Statuswerte:

- `todo`: noch offen
- `doing`: in Arbeit
- `done`: erledigt
- `blocked`: blockiert

Review-Status:

- `Review: pending`: Umsetzung fertig, Review offen
- `Review: approved`: Reviewer hat freigegeben
- `Review: changes_requested`: Anpassung durch Implementer noetig
- `Review: blocked`: Review kann nicht abgeschlossen werden

Prioritaeten:

- `P0`: notwendig fuer den ersten nutzbaren MVP
- `P1`: wichtig kurz nach dem MVP
- `P2`: spaeterer Ausbau

## MVP 0: Fundament

### FIN-001 Projekt initialisieren

Status: `done`
Prioritaet: `P0`

Ziel: Die technische Basis der App wird angelegt.

Akzeptanzkriterien:

- Projekt laesst sich lokal starten
- TypeScript ist eingerichtet
- React-Oberflaeche existiert
- SQLite-Anbindung ist vorbereitet
- Basisstruktur fuer App, Datenbank und Tests ist vorhanden
- README enthaelt Startbefehle fuer lokale Entwicklung

Notizen:

- Bevorzugter Start: Next.js + TypeScript + SQLite.
- Falls ein anderes Setup gewaehlt wird, Entscheidung in `docs/adr/` dokumentieren.
- Umsetzung vorhanden: App Router UI, vorbereiteter SQLite-Basisclient, Vitest-Basis und README mit Startbefehlen.

### FIN-002 Datenmodell entwerfen und Migrationen anlegen

Status: `done`
Review: `approved`
Prioritaet: `P0`

Ziel: Die wichtigsten fachlichen Objekte werden in SQLite abgebildet.

Akzeptanzkriterien:

- Tabellen fuer Transaktionen, Konten, Kategorien, Monatsbudgets, Sonderbudgets, Fixkosten und Importlaeufe existieren
- Jede Transaktion kann genau einer Kategorie oder einem Sonderbudget zugeordnet werden
- Bargeld kann als Konto gefuehrt werden
- Import-Deduplizierung ist konzeptionell vorbereitet
- Transaktionstypen unterscheiden echte Ausgaben, Einnahmen und Transfers
- Betragskonvention ist dokumentiert

Notizen:

- Sonderbudgets sind direkte Ausgaben, keine reinen Sparziele.
- Fixkosten werden geplant, aber nicht ueber N26 importiert.
- Siehe `docs/domain-model.md`.
- Umsetzung liegt in `src/db/schema.ts` (Migrationsbasis + FIN-002 Schema), `src/db/client.ts` und DB-Tests.

### FIN-003 Erste App-Navigation und Layout bauen

Status: `doing`
Prioritaet: `P0`

Ziel: Die App bekommt eine klare Grundnavigation.

Akzeptanzkriterien:

- Navigation enthaelt Dashboard, Transaktionen, Import, Kategorien, Sonderbudgets, Fixkosten und Einstellungen
- Layout funktioniert am Desktop
- Grunddesign ist ruhig, tabellarisch und finanzfokussiert
- Keine Marketing-Landingpage als erste Ansicht
- Warn- und Statuszustaende sind visuell vorgesehen

Notizen:

- Umsetzung liegt in Review-PR `#4` (Branch `codex/fin-003-clean`).

## MVP 1: Manuelle Nutzung

### FIN-004 Kategorien verwalten

Status: `doing`
Prioritaet: `P0`

Ziel: Feste Kategorien koennen gepflegt werden.

Akzeptanzkriterien:

- Kategorie erstellen, bearbeiten, deaktivieren
- Kategorie hat Name, Farbe/Icon optional und Standardstatus
- Kategorien koennen in Monatsbudgets verwendet werden
- Deaktivierte Kategorien bleiben fuer historische Transaktionen erhalten

Notizen:

- Umsetzung liegt in Review-PR `#5` (Branch `codex/fin-004-clean`, gestapelt auf `#4`).

### FIN-005 Monatsbudgets fuer feste Kategorien pflegen

Status: `todo`
Prioritaet: `P0`

Ziel: Pro Monat koennen Orientierungswerte fuer feste Kategorien gesetzt werden.

Akzeptanzkriterien:

- Monat auswaehlen
- Budget je Kategorie setzen
- Ueberschreitung wird als Hinweis angezeigt, nicht blockiert
- Budgetwerte koennen je Monat unterschiedlich sein
- fehlende Budgetwerte werden klar angezeigt

### FIN-006 Sonderbudgets verwalten

Status: `todo`
Prioritaet: `P0`

Ziel: Monatliche Sonderbudgets fuer konkrete Ausgaben koennen erstellt werden.

Akzeptanzkriterien:

- Sonderbudget mit Name, Monat, geplantem Betrag und optionaler Notiz erstellen
- Sonderbudget kann nur in aktiven Monaten ausgewaehlt werden
- Ausgaben koennen einem Sonderbudget zugeordnet werden
- Ueberschreitung wird deutlich markiert
- Sonderbudgets erscheinen getrennt von festen Kategorien in der Monatsuebersicht

### FIN-007 Transaktionen manuell erfassen

Status: `todo`
Prioritaet: `P0`

Ziel: Ausgaben und Einnahmen koennen manuell eingetragen werden.

Akzeptanzkriterien:

- Transaktion mit Datum, Betrag, Name/Beschreibung, Konto/Zahlungsart erfassen
- Ausgabe muss Kategorie oder Sonderbudget erhalten
- Einnahme kann als Einkommen oder sonstige Einnahme markiert werden
- Transaktionen koennen bearbeitet und geloescht werden
- Transfer kann ohne Kategorie erfasst werden
- unzugeordnete Ausgaben sind nicht dauerhaft unbemerkt moeglich

### FIN-008 Bargeldkonto abbilden

Status: `todo`
Prioritaet: `P0`

Ziel: Bargeld wird als eigener Bestand gefuehrt.

Akzeptanzkriterien:

- Bargeldkonto existiert
- Bargeldabhebung kann als Transfer erfasst werden
- Manuelle Barzahlung reduziert Bargeldbestand
- Bargeldbestand ist im Dashboard sichtbar
- Bargeldabhebungen zaehlen nicht als Kategorie-Ausgabe

### FIN-009 Fixkostenliste pflegen

Status: `todo`
Prioritaet: `P1`

Ziel: Fixkosten werden wie in der Excel separat gepflegt.

Akzeptanzkriterien:

- Fixkosten mit Name, Betrag, Abbuchungsinfo und Notiz pflegen
- Gesamtsumme der Fixkosten wird berechnet
- Fixkosten erscheinen in Monatsuebersicht als geplanter Block
- N26-Abbuchungen werden im ersten MVP nicht importiert

Notizen:

- Fixkosten sind echte Ausgaben.
- Eintraege aus der Fixkostenliste koennen am 01. des Monats oder untermonatlich gebucht werden.
- Die genaue Abbildung in Planung und Ist-Auswertung wird waehrend der Umsetzung konkretisiert.

## MVP 2: Import

### FIN-010 Sparkassen-CSV-Import analysieren

Status: `done`
Prioritaet: `P0`

Ziel: Das echte Sparkassen-CSV-Exportformat wird verstanden.

Akzeptanzkriterien:

- Beispiel-CSV liegt anonymisiert vor
- Spalten/Felder sind dokumentiert
- Buchungstag, Betrag, Beschreibung, Gegenpartei und Info koennen extrahiert werden
- Bargeldabhebungen sind erkennbar
- Importformat und Beispielwerte sind in `docs/import-and-bank-notes.md` dokumentiert

Notizen:

- Startformat fuer den MVP ist Sparkassen-CSV (wie bereitgestellt am 2026-04-26).
- Anonymisierte Referenzdatei liegt in `docs/samples/sparkasse-umsatz-anonymized.csv`.
- Analyse und Mappingdoku sind aktualisiert und in `main` integriert.

### FIN-011 Import-Workflow bauen

Status: `todo`
Prioritaet: `P0`

Ziel: Bankexporte koennen importiert und geprueft werden.

Akzeptanzkriterien:

- Datei hochladen/auswaehlen
- Vorschau der gefundenen Buchungen anzeigen
- Duplikate erkennen
- Import bestaetigen
- importierte Buchungen erscheinen in Transaktionsliste
- unzugeordnete Ausgaben werden im Workflow markiert
- Transfers werden separat von Ausgaben dargestellt

### FIN-012 Zuordnungsregeln fuer Import bauen

Status: `todo`
Prioritaet: `P1`

Ziel: Wiederkehrende Buchungen werden automatisch vorgeschlagen oder zugeordnet.

Akzeptanzkriterien:

- Regel anhand Beschreibung/Gegenpartei erstellen
- Regel setzt Kategorie, Sonderbudget oder Transfer-Typ
- Regelvorschlag wird im Import angezeigt
- Regel kann nachtraeglich angepasst werden
- Regel kann Bargeldabhebung als Transfer vorschlagen

## MVP 3: Auswertungen

### FIN-013 Monatsdashboard bauen

Status: `todo`
Prioritaet: `P0`

Ziel: Die wichtigste Monatsuebersicht ersetzt die Excel-Ansicht.

Akzeptanzkriterien:

- Einnahmen, Ausgaben, Fixkosten und verfuegbarer Betrag sichtbar
- Kategorien mit Budget, Ist-Wert und Rest sichtbar
- Sonderbudgets separat sichtbar
- Ueberschreitungen werden deutlich markiert
- Bargeldbestand ist sichtbar
- Transfers werden nicht als Ausgaben gezaehlt

### FIN-014 Kategorie-Auswertung bauen

Status: `todo`
Prioritaet: `P1`

Ziel: Ausgaben koennen nach Kategorie ausgewertet werden.

Akzeptanzkriterien:

- Monatliche Kategorie-Summen
- Vergleich gegen Budget
- Tabelle und Diagramm
- Filter nach Zeitraum

### FIN-015 Trend-Auswertung bauen

Status: `todo`
Prioritaet: `P2`

Ziel: Entwicklungen ueber mehrere Monate werden sichtbar.

Akzeptanzkriterien:

- Monatlicher Verlauf je Kategorie
- Durchschnittswerte
- erkennbare Ausreisser
- Vergleich aktueller Monat gegen Vormonate

## MVP 4: Betrieb und Sicherheit

### FIN-016 Backup-Konzept umsetzen

Status: `todo`
Prioritaet: `P0`

Ziel: Finanzdaten bleiben langfristig sicher erhalten.

Akzeptanzkriterien:

- SQLite-Datei kann manuell gesichert werden
- automatisches lokales Backup ist vorbereitet
- Backup-Ordner konfigurierbar
- Wiederherstellung ist dokumentiert

### FIN-017 Raspberry-Pi-Deployment vorbereiten

Status: `todo`
Prioritaet: `P2`

Ziel: Die App kann spaeter zuhause laufen.

Akzeptanzkriterien:

- Dockerfile existiert
- Datenbank liegt persistent ausserhalb des Containers
- Start per Docker Compose dokumentiert

### FIN-018 Offline-Erfassung vorbereiten

Status: `todo`
Prioritaet: `P2`

Ziel: Manuelle Eintraege koennen spaeter offline erfasst werden.

Akzeptanzkriterien:

- PWA-Grundlage ist geplant
- lokale Warteschlange fuer Offline-Aenderungen ist konzeptionell dokumentiert
- Konfliktregeln sind definiert

### FIN-019 Sparkassen-Bankanbindung untersuchen

Status: `todo`
Prioritaet: `P2`

Ziel: Eine spaetere automatische Anbindung wird fachlich und technisch bewertet.

Akzeptanzkriterien:

- FinTS mit Sparkasse wurde geprueft
- TAN-/PSD2-Ablauf ist verstanden
- Umgang mit Zugangsdaten ist bewertet
- Entscheidung: selbst bauen, Anbieter nutzen oder bei Import bleiben

## Offene fachliche Klaerungen

Diese Punkte sind noch nicht entschieden und sollten nicht stillschweigend im Code festgelegt werden:

- Behandlung der Sparkassen-Ueberweisung an N26: Transfer, Fixkosten bezahlt oder ignoriert?
- Abbildung von Fixkosten in Planung/Ist bei Buchungen am Monatsersten vs. untermonatlichen Abbuchungen

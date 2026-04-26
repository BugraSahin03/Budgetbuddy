# Projekt-Briefing fuer Codex-Instanzen

Dieses Dokument ist der beste Einstiegspunkt fuer neue Codex-Instanzen. Es fasst den bisherigen Projektkontext, fachliche Entscheidungen und Arbeitsweise zusammen.

## Kurzfassung

Wir bauen eine private Finanz-App als langfristigen Ersatz fuer einen bestehenden Excel-Budgetplaner.

Die App soll zuerst am Rechner laufen, spaeter als Web-App/PWA auf einem Raspberry Pi gehostet werden und ueber Tailscale privat von unterwegs erreichbar sein. Die Daten sind sensibel und sollen nicht unnoetig in eine fremde Cloud.

Der erste echte Nutzen entsteht durch Sparkassen-Importe, manuelle Eintraege, Kategorien, monatliche Sonderbudgets, Fixkosten-Uebersicht, Bargeldbestand und Monatsauswertungen.

## Einstieg fuer neue Codex-Instanzen

Neue Instanzen sollen zuerst dieses Dokument lesen. Danach je nach Aufgabe:

1. `docs/backlog.md` fuer Ticketstatus, Prioritaeten und naechste Arbeit
2. `docs/codex-workflow.md` fuer parallele Arbeitsweise
3. `docs/domain-model.md` fuer Fachmodell und Datenregeln
4. `docs/import-and-bank-notes.md` fuer Sparkassen-Import und Bankthemen
5. `docs/decision-log.md` fuer neue Erkenntnisse und kleinere Entscheidungen
6. `docs/review-workflow.md` fuer Reviewer-Gate und Freigabeprozess
7. `docs/adr/` fuer grundlegende Architekturentscheidungen
8. `docs/prompts.md` fuer kopierbare Prompts an weitere Codex-Instanzen

Neue Erkenntnisse oder Entscheidungen muessen dokumentiert werden. Kleine oder laufende Erkenntnisse gehoeren in `docs/decision-log.md`; grundlegende Projektentscheidungen zusaetzlich als ADR nach `docs/adr/`.

## Nutzer und Nutzung

- Nutzer: eine Person
- Zweck: private Finanzen
- Prioritaet: zuerst Desktop/Rechner
- Langfristig: Laptop, Handy, Tablet
- Offline-Ziel: manuelle Eintraege sollen spaeter offline moeglich sein
- Cloud-Ziel: keine fremde Finanz-Cloud als Kernspeicher
- Betrieb: zuerst lokal, spaeter Raspberry Pi
- Externer Zugriff: spaeter ueber Tailscale

## Ausgangspunkt

Aktuell gibt es eine Excel-Datei:

- `/Users/Bugra/Downloads/Budget planner.xlsx`

Der Planner enthaelt:

- Monatsblatt, z. B. `April`
- rechts eine Transaktionsliste mit `Bar / Karte`, `Preis`, `Art (Produkt)`, `Kategorie`, `Datum`
- links Einnahmen, verfuegbarer Betrag, geplante Ausgaben/Budgets
- rechts/weiter hinten Kategorie-Auswertung mit Budget-Rest und Ist-Ausgaben
- eigenes Blatt `Fix Ausgaben`

Zusaetzlich wurde ein Sparkassen-Export als Numbers-Datei gezeigt:

- `/Users/Bugra/Downloads/20260425-22879003-umsatz-camt52v8.numbers`

Diese Datei ist ein Apple-Numbers-Dokument und fuer einen robusten Import ungeeignet. Fuer die Implementierung wird ein echter Sparkassen-Export als `.csv` oder `.xml/.camt` benoetigt.

## Problem

Die Excel-Loesung kostet zu viel Zeit, weil Ausgaben manuell eingetragen und danach mit Online-Banking abgeglichen werden muessen. Kategorien und Trends sind nur umstaendlich auswertbar. Der Nutzer moechte flexibler sein und eigene Funktionen langfristig selbst oder mit Codex erweitern koennen.

## Produktziel

Eine App, die:

- Sparkassen-Umsaetze importieren kann
- Duplikate erkennt
- Buchungen automatisch oder halbautomatisch Kategorien zuordnet
- manuelle Barzahlungen und Sonderfaelle erlaubt
- feste Kategorien jeden Monat wiederverwendet
- Sonderbudgets pro Monat erlaubt
- Fixkosten separat plant
- Bargeldbestand nachvollziehbar fuehrt
- Monats-, Kategorie- und Trend-Auswertungen bietet
- Daten langfristig ueber Jahre sicher speichert

## Wichtige fachliche Entscheidungen

### Budgets sind Leitplanken

Budgets sind keine harten Sperren. Sie sind Orientierungswerte. Ueberschreitungen sind erlaubt, sollen aber deutlich sichtbar sein.

Gewuenschtes Verhalten:

- unter Budget: neutral oder positiv
- nahe am Budget: dezenter Hinweis
- ueber Budget: deutlich rot/auffaellig
- stark ueber Budget: eigener Warnbereich im Dashboard

### Kennzahl "gesparter Betrag"

Im MVP gibt es keine separate Kennzahl `gesparter Betrag`.

### Feste Kategorien

Feste Kategorien existieren jeden Monat.

Startliste fuer den MVP (festgelegt am 2026-04-26):

- Einkauf
- Tanken
- Freizeit
- Fitness
- Parkhaus
- Kleidung
- Oeffis

### Sonderbudgets

Sonderbudgets sind konkrete, monatlich angelegte Ausgabeziele. Beispiele:

- Raspberry Pi
- Bali Flug
- SSD
- Arzt Rechnung

Wichtig: Sonderbudgets sind direkte Ausgaben, keine reinen virtuellen Sparziele. Wenn eine echte Zahlung existiert, wird diese Ausgabe dem Sonderbudget zugeordnet.

Sonderbudgets sind nur fuer bestimmte Monate aktiv. Sie sollen neben festen Kategorien auftauchen und separat auswertbar sein.

### Jede Ausgabe braucht eine Zuordnung

Ziel ist: Jede echte Ausgabe wird genau einer festen Kategorie oder genau einem Sonderbudget zugeordnet. Unzugeordnete Ausgaben sollten sichtbar sein und abgearbeitet werden koennen.

### Bargeld ist ein Konto/Topf

Bargeldabhebungen sollen nicht direkt als Kategorie-Ausgabe zaehlen.
Der initiale Bargeldbestand fuer den Start ist `0 EUR`.

Beispiel:

1. Sparkasse: `-50 EUR` Abhebung wird als Transfer `Sparkasse -> Bargeld` erkannt.
2. Bargeldbestand steigt um `50 EUR`.
3. Spaeter wird eine Barzahlung manuell eingetragen, z. B. `-10 EUR Doener` aus Konto `Bargeld`, Kategorie `Freizeit`.
4. Bargeldbestand sinkt um `10 EUR`.

### Fixkosten

Fixkosten sind echte Ausgaben. Die Eintraege aus der Fixkostenliste werden real gebucht.

Fixkosten koennen teils direkt zum Monatsersten ueberwiesen werden und teils untermonatlich abgebucht werden. Die genaue Abbildung im Datenmodell und in der UI wird waehrend der Umsetzung konkretisiert.

Aktuell soll der N26-Teil nicht importiert werden. Die App soll eine Fixkostenliste wie in Excel enthalten und deren Summe in Monatsuebersichten beruecksichtigen.

## Nicht-Ziele fuer den Start

- keine Multi-User-App
- kein Rechte-/Rollenmodell
- keine Beleganhaenge
- keine Ausgabeaufteilung zwischen Personen
- keine verpflichtende Exportfunktion
- kein Audit-Log fuer jede Aenderung
- keine direkte Bankanbindung im ersten MVP
- kein N26-Import im ersten MVP

## Technische Richtung

Aktuelle Zielrichtung:

- Web-App/PWA
- React + TypeScript
- Next.js auf Node.js Runtime
- SQLite
- Sparkassen-CSV-Import zuerst
- Docker spaeter fuer Raspberry Pi
- Tailscale fuer privaten Zugriff von unterwegs
- Goldene Quelle: `/Volumes/Intenso/Dev/Budgetbuddy`

Siehe auch:

- `docs/adr/0001-tech-stack.md`
- `docs/domain-model.md`
- `docs/import-and-bank-notes.md`

## Empfohlene MVP-Reihenfolge

1. Projekt initialisieren
2. Datenmodell und Migrationen
3. Grundnavigation/Layout
4. Kategorien
5. Monatsbudgets
6. Sonderbudgets
7. manuelle Transaktionen
8. Bargeldkonto
9. Sparkassen-Import analysieren
10. Import-Workflow
11. Monatsdashboard
12. Backup-Konzept

## Offene Fragen

- Soll die Sparkassen-Ueberweisung an N26 als Fixkosten bezahlt, als Transfer oder in Auswertungen komplett ignoriert werden?
- Wie sollen Fixkosten, die am Monatsersten ueberwiesen werden vs. untermonatlich abgebucht werden, in Planung und Ist-Auswertung am besten abgebildet werden?

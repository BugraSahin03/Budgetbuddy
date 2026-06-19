# Projekt-Briefing fuer Codex-Instanzen

Dieses Dokument ist der beste Einstiegspunkt fuer neue Codex-Instanzen. Es fasst den bisherigen Projektkontext, fachliche Entscheidungen und Arbeitsweise zusammen.

## Kurzfassung

Wir bauen eine private Finanz-App als langfristigen Ersatz fuer einen bestehenden Excel-Budgetplaner.

Die App soll zuerst am Rechner laufen und fuer den ersten privaten Produktivbetrieb auf einem kleinen Hetzner-Cloud-VPS gehostet werden. Der Zugriff bleibt zum Start Tailscale-only; es gibt keine oeffentliche BudgetBuddy-URL und keine Cloud-DB-Migration. Die Daten sind sensibel und sollen nicht unnoetig in eine fremde Cloud.

Der erste echte Nutzen entsteht durch Sparkassen-Importe, manuelle Eintraege, Kategorien, monatliche Sonderkategorien, Fixkosten-Uebersicht, Bargeldbestand und Monatsauswertungen.

Aktueller Navigationsfokus:

- Das Dashboard bleibt die monatliche Detailansicht fuer KPIs.
- Die Monatsarbeit bekommt zusaetzlich einen eigenen Haupttab `Monate` als lueckenlosen Einstieg ueber alle verfuegbaren Monate.
- Die Monatsdetailseite unter `/monate/[monthKey]` ist die zentrale Vollsicht fuer einen einzelnen Monat.
- Der Haupttab `Monatsvergleich` zeigt eine kompakte Vergleichsliste aller Monate seit der ersten Buchung bis zum aktuellen Monat.
- Die Verwaltungslogik fuer Kategorien, Standardbudgets und Sonderkategorien wird unter dem Haupttab `Budgets` gebuendelt, damit die Navigation ruhiger und kompakter bleibt.

Aktuelles UI-Leitbild:

- BudgetBuddy soll wie ein ruhiges, helles Premium-Finanzprodukt wirken, nicht wie ein internes Admin-Tool.
- Die Oberflaeche priorisiert Monatsfokus, starke Primaerzahlen, klare Blickfuehrung und wenige eindeutige Hauptwege.
- Dashboard und Monatsansicht sind beide prioritaer; die Monatsansicht bleibt der wichtigste Arbeitsort fuer Budgetpflege, Zuordnung und Monatskontrolle.
- Karten, Listen und Tabellen sollen reduziert, elegant und gut lesbar sein. Tabellen bleiben erlaubt, wenn sie fuer dichte Monatsarbeit effizienter sind.
- Visuelle Modernisierung darf keine Fachlogik zu Budgets, Sonderkategorien, Fixkosten, Transfers oder `effective_month_key` stillschweigend aendern.

## Einstieg fuer neue Codex-Instanzen

Neue Instanzen sollen zuerst dieses Dokument lesen. Danach je nach Aufgabe:

1. GitHub Issues fuer Ticketstatus, Prioritaeten und naechste Arbeit
2. `docs/codex-workflow.md` fuer parallele Arbeitsweise
3. `docs/domain-model.md` fuer Fachmodell und Datenregeln
4. `docs/import-and-bank-notes.md` fuer Sparkassen-Import und Bankthemen
5. `docs/decision-log.md` fuer neue Erkenntnisse und kleinere Entscheidungen
6. `docs/parallel-development.md` fuer Branches, Worktrees und Write-Scopes
7. `docs/review-workflow.md` fuer Reviewer-Gate und Freigabeprozess
8. `docs/adr/` fuer grundlegende Architekturentscheidungen
9. `docs/prompts.md` fuer kopierbare Prompts an weitere Codex-Instanzen

Issue-Konventionen:

- FIN-Referenz bleibt im Titel, z. B. `[FIN-003] Erste App-Navigation und Layout bauen`
- Status wird ueber genau ein `status:*` Label gepflegt (`status:todo|doing|visual-check|review|ready-to-merge|blocked|done`)
- `status:visual-check` ist ein optionales Produkt-/UI-Pruefgate vor dem Reviewer. Es wird vor allem bei sichtbaren UI-/UX-Aenderungen genutzt, wenn der Nutzer die laufende Umsetzung zuerst im Browser testen soll.
- Prioritaet wird ueber `priority:p0|p1|p2` gepflegt
- MVP-Phasen laufen ueber Milestones (`MVP 0` bis `MVP 4`)
- aktive Issues enthalten Write-Scope, Read-Scope, Nicht-Ziele und Abhaengigkeiten
- jede produktive Umsetzung nutzt eigenen Branch und eigenen Worktree
- der Hauptordner `/Volumes/Intenso/Dev/Budgetbuddy` bleibt auf `main`; Ticketarbeit findet in Worktrees wie `../Budgetbuddy-issue-<nr>` statt

Neue Erkenntnisse oder Entscheidungen muessen dokumentiert werden. Kleine oder laufende Erkenntnisse gehoeren in `docs/decision-log.md`; grundlegende Projektentscheidungen zusaetzlich als ADR nach `docs/adr/`.

## Nutzer und Nutzung

- Nutzer: eine Person
- Zweck: private Finanzen
- Prioritaet: zuerst Desktop/Rechner
- Langfristig: Laptop, Handy, Tablet
- Offline-Ziel: manuelle Eintraege sollen spaeter offline moeglich sein
- Cloud-Ziel: keine fremde Finanz-Cloud als Kernspeicher
- Betrieb: zuerst lokal, erster privater Produktivbetrieb auf kleinem Hetzner-Cloud-VPS
- Externer Zugriff: Tailscale-only, keine oeffentliche BudgetBuddy-URL zum Start

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
- Sonderkategorien pro Monat oder mehrmonatigem Vorhaben erlaubt
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

Der Monatsvergleich zeigt fuer Version 1 trotzdem eine einfache Spalte `Gespart` als Ueberschussrechnung `Einnahmen - Ausgaben`. Das ist keine echte Sparlogik und keine eigene Sparkategorie; die fachliche Ausarbeitung aktiven Sparens bleibt separater Folgearbeit vorbehalten.

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

### Sonderkategorien

Sonderkategorien sind konkrete Ausgabeziele fuer einen Monat oder ein mehrmonatiges Vorhaben. Beispiele:

- Raspberry Pi
- Bali Flug
- SSD
- Arzt Rechnung

Wichtig: Sonderkategorien sind direkte Ausgaben, keine reinen virtuellen Sparziele. Wenn eine echte Zahlung existiert, wird diese Ausgabe dem konkreten Monatsanteil der Sonderkategorie zugeordnet.

Sonderkategorien sind nur fuer bestimmte Monate oder Zeitraeume aktiv. Mehrmonatige Vorhaben buendeln mehrere Monatsanteile, bleiben aber von Kategorien, Transfers und spaeterer Sparlogik getrennt. Erledigte Vorhaben werden archiviert und nicht in der normalen Budgetpflege angezeigt.

### Jede Ausgabe braucht eine Zuordnung

Ziel ist: Jede echte Ausgabe wird genau einer festen Kategorie oder genau einer Sonderkategorie zugeordnet. Unzugeordnete Ausgaben sollten sichtbar sein und abgearbeitet werden koennen.

### Bargeld ist ein Konto/Topf

Bargeldabhebungen sollen nicht direkt als Kategorie-Ausgabe zaehlen.
Der initiale Bargeldbestand fuer den Start ist `0 EUR`.

Beispiel:

1. Sparkasse: `-50 EUR` Abhebung wird als Transfer `Sparkasse -> Bargeld` erkannt.
2. Bargeldbestand steigt um `50 EUR`.
3. Spaeter wird eine Barzahlung manuell eingetragen, z. B. `-10 EUR Doener` aus Konto `Bargeld`, Kategorie `Freizeit`.
4. Bargeldbestand sinkt um `10 EUR`.

FIN-078 ergaenzt:

- Nicht ausgegebenes Bargeld bleibt als separater Bestand bestehen und wird in
  Folgemonate mitgenommen.
- Bargeldbestand ist kein automatischer Monatsrest, keine automatische Ausgabe
  und keine automatische Sparbuchung.
- Die Monatsansicht zeigt den Bargeldbestand als ruhige Transparenz-Kachel,
  ohne den Monatsrest dadurch zu erhoehen oder zu senken.

### Fixkosten

Fixkosten werden im MVP als monatlicher Planungsblock aus der Fixkostenliste gefuehrt.

Leitregel (FIN-024):

- Die aktive Fixkostensumme wird direkt vom Monatsbudget abgezogen.
- `wirkt_fuer_monat` ist nicht Teil des Zielmodells.
- Einzelne Transaktionen werden nicht mehr manuell als Fixkosten markiert.
- N26 ist kein eigenes Fachobjekt, sondern nur ein technischer Zahlungsweg fuer bereits bekannte Fixkosten.
- Erkannte N26-Sammeltransfers und direkte Sparkassen-Fixkostenmatches bleiben als Kontrollsicht sichtbar, werden aber nicht als normale variable Monats-Transaktionen behandelt.
- Es gibt keine direkte N26-Bankanbindung; N26-Hinweise entstehen nur aus dem Sparkassen-Import.

## Nicht-Ziele fuer den Start

- keine Multi-User-App
- kein Rechte-/Rollenmodell
- keine Beleganhaenge
- keine Ausgabeaufteilung zwischen Personen
- keine verpflichtende Exportfunktion
- kein Audit-Log fuer jede Aenderung
- keine direkte Bankanbindung im ersten MVP
- kein direkter N26-Import im ersten MVP

## Technische Richtung

Aktuelle Zielrichtung:

- Web-App/PWA
- React + TypeScript
- Next.js auf Node.js Runtime
- SQLite
- Sparkassen-CSV-Import zuerst
- erster Produktivbetrieb: kleiner Hetzner-Cloud-VPS mit Ubuntu 24.04 LTS
- Produktionspfade: App `/opt/budgetbuddy`, DB `/var/lib/budgetbuddy/budgetbuddy.db`, Backups `/var/backups/budgetbuddy`
- Tailscale-only fuer privaten Zugriff von unterwegs
- Docker/Raspberry Pi bleibt spaetere Option, ist aber nicht mehr der erste Produktivpfad
- Goldene Quelle: `/Volumes/Intenso/Dev/Budgetbuddy`

Siehe auch:

- `docs/adr/0001-tech-stack.md`
- `docs/adr/0009-private-vps-tailscale-hosting.md`
- `docs/production-vps-basissetup.md`
- `docs/domain-model.md`
- `docs/import-and-bank-notes.md`

## Empfohlene MVP-Reihenfolge

1. Projekt initialisieren
2. Datenmodell und Migrationen
3. Grundnavigation/Layout
4. Kategorien
5. Monatsbudgets
6. Sonderkategorien
7. manuelle Transaktionen
8. Bargeldkonto
9. Sparkassen-Import analysieren
10. Import-Workflow
11. Monatsdashboard
12. Backup-Konzept

## Offene Fragen

- (aktuell keine offenen Kernfragen)

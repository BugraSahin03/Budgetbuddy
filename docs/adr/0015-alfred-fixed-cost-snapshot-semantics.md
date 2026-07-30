# ADR 0015: Alfred trennt Fixkostenplan, Kontroll-Ist und Ausgaben

Status: Accepted
Datum: 22. Juli 2026

## Kontext

Der erste BudgetBuddy-Snapshot lieferte je Monat nur den geplanten
Fixkostenbetrag. Gleichzeitig enthielt `expenseCents` alle gebuchten
Ausgabentransaktionen, darunter bereits abgebuchte und in BudgetBuddy als
Fixkostenkontrolle erkannte Betraege. Ein Modell konnte dadurch den Planbetrag
als vollstaendige Ist-Sicht missverstehen oder bereits gebuchte Fixkosten
doppelt vom verfuegbaren Betrag abziehen.

BudgetBuddy unterscheidet fachlich bereits zwischen dem aktuellen
Fixkostenplan, eingefrorenen Planpositionen abgeschlossener Monate und einer
Kontrollsicht erkannter Buchungen. Diese Trennung muss auch im Alfred-Snapshot
explizit sein.

## Entscheidung

Der Snapshotvertrag wird auf `budgetbuddy.coach.snapshot.v2` angehoben.

- Die aktuelle aktive Fixkostenliste wird mit Name, Planbetrag und optionalem
  Abbuchungstag exportiert. Zahlungsnotizen und freie Notizen bleiben intern.
- Abgeschlossene Monate mit Fixkosten-Snapshot verwenden ausschliesslich den
  eingefrorenen Plan. Auch ein bewusst leerer Snapshot bleibt bei null und
  faellt nicht auf die aktuelle aktive Liste zurueck.
- Der Collector reproduziert die BudgetBuddy-Kontrolllogik fuer importierte
  Kontrollmuster, direkte Betrag-/Token-Matches sowie manuelle Include- und
  Exclude-Overrides. Exportiert werden nur Summen und Trefferanzahlen, keine
  Transaktions-IDs, Texte oder Gegenparteien.
- `totalExpenseCents` bezeichnet alle gebuchten Ausgabentransaktionen.
- `fixedCostControlCents` bezeichnet die davon erkannten Fixkostenkontrollen.
- `expenseCents` bezeichnet die nach Herausnahme dieser Kontrollen
  verbleibenden variablen Ausgaben.
- `consumerExpenseCents` zieht hiervon zusaetzlich Sparbuchungen ab.
- `netCashflowCents` bleibt ein echter Kontofluss und verwendet deshalb alle
  gebuchten Ausgaben.
- Das OpenClaw-Werkzeug erhaelt die feste Ansicht `fixed_costs` und erklaert
  die Semantik im Werkzeugvertrag.

## Konsequenzen

Alfred kann den ungefaehren Fixkostenblock des Haushalts auf seine einzelnen
Planpositionen zurueckfuehren und den bisherigen Monats-Iststand separat
beurteilen. Bereits gebuchte Fixkosten werden nicht mehr versehentlich
doppelt gezaehlt.

Die Kontrollsumme bleibt eine Erkennungssicht und keine buchhalterische
Garantie. Nicht erkannte Abbuchungen koennen fehlen; Sammelkontrolltreffer
lassen sich nicht immer einer einzelnen Planposition zuordnen. Einzelne
Buchungstexte bleiben absichtlich ausserhalb von Alfreds Datenzugriff.

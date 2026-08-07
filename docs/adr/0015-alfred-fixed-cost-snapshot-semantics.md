# ADR 0015: Alfred trennt Fixkostenplan, Kontroll-Ist und Ausgaben

Status: Accepted
Datum: 22. Juli 2026
Aktualisiert: 4. August 2026 (`FIN-126`)

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
- Automatische Kontrolltreffer entstehen ausschliesslich durch explizite,
  aktive Regeln beim Import. BudgetBuddy persistiert den Kontrollstatus
  atomar mit der importierten Buchung; Fixkosten-Stammdaten und spaetere
  Regelzustaende werden nicht erneut als Erkennungsquelle ausgewertet.
- Beim Schemawechsel von `0018_fin_120` wird der unmittelbar zuvor dynamisch
  sichtbare Regelstand einmalig aus den gespeicherten Importfeldern und der
  bestehenden Regelprioritaet reproduziert. Der Backfill ist idempotent,
  uebernimmt keine direkten Fixkosten-Stammdatenmatches und laesst manuelle
  Include-/Exclude-Overrides als eigene Korrekturebene bestehen.
- Eine noch nicht lazy aktualisierte `import_rules`-Tabelle aus Schema 0018
  erhaelt vorher `rule_purpose` und die bestehende FIN-117-Klassifizierung;
  Migration und Runtime-Repository teilen dafuer dieselbe
  Kompatibilitaetslogik.
- Der Collector liest diese persistierten Kontrolltreffer und wendet darauf
  manuelle Include- und Exclude-Overrides an. Exportiert werden nur Summen und
  Trefferanzahlen, keine Transaktions-IDs, Texte oder Gegenparteien.
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
Garantie. Ohne explizite Kontrollregel bleiben auch Betrag und Buchungstext
passende Abbuchungen normale variable Ausgaben; Sammelkontrolltreffer lassen
sich nicht immer einer einzelnen Planposition zuordnen. Einzelne Buchungstexte
bleiben absichtlich ausserhalb von Alfreds Datenzugriff.

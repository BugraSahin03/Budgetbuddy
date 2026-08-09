# ADR 0016: Aktueller Monatsstand und Fixkostenplan-Projektion trennen

## Status

Angenommen

## Kontext

Der bisherige Wert `Verfuegbar` zog vom bereinigten Monatseinkommen die
variablen Ausgaben und den vollstaendigen Fixkostenplan ab. In der UI wurde
dieser Planwert zugleich als `Aktueller Budgetstand` bezeichnet. Seit
BudgetBuddy Fixkosten-Kontrolltreffer persistent speichert, sind jedoch zwei
unterschiedliche Fragen belastbar beantwortbar:

- Was ist aufgrund der bisher gebuchten Ausgaben aktuell passiert?
- Wo landet der Monat, wenn der vollstaendige Fixkostenplan beruecksichtigt
  wird?

Ein gemeinsames, mehrdeutiges Feld kann diese Bedeutungen nicht verlaesslich
transportieren.

## Entscheidung

Das zentrale Monats-Readmodel fuehrt zwei explizite Werte und entfernt
`availableCents`:

```
currentBudgetCents
= bereinigte Einnahmen
- variable Ist-Ausgaben
- Fixkosten-Ist

projectedAfterFixedCostsCents
= bereinigte Einnahmen
- variable Ist-Ausgaben
- Fixkostenplan
```

`currentBudgetCents` ist der verbindliche Wert fuer `Aktueller Budgetstand`
in Monatsansicht und Dashboard. Noch nicht gebuchte geplante Fixkosten werden
dort nicht vorweggenommen.

`projectedAfterFixedCostsCents` wird ausschliesslich in der
Fixkostenkontrolle mit dem verbindlichen Wording
`Voraussichtlich nach Fixkostenplan` angezeigt. Der Wert wird nicht als
`sicher verfuegbar` bezeichnet.

Fixkosten-Ist besteht aus persistierten automatischen Kontrolltreffern plus
manuellen Includes minus manuellen Excludes. Der spaetere Aktivstatus der
urspruenglichen Regel aendert einen persistierten Treffer nicht. Eine manuelle
Include-/Exclude-Korrektur verschiebt denselben Betrag zwischen variablen
Ausgaben und Fixkosten-Ist; dadurch bleibt der aktuelle Budgetstand
betragsgleich und der reale Betrag wird genau einmal abgezogen.

Die Projektion darf und soll sich bei dieser Umklassifizierung veraendern:
Solange eine bereits gebuchte Fixkostenausgabe noch als variabel gilt, wird sie
vorlaeufig sowohl in den variablen Ausgaben als auch im vollstaendigen
Fixkostenplan beruecksichtigt. Ein Include beseitigt diese
Doppelberuecksichtigung; ein Exclude macht sie wieder sichtbar. Ohne eine
eindeutige Zuordnung jedes Kontrolltreffers zu einer einzelnen Planposition
kann die Projektion nicht zugleich der festgelegten Formel folgen und bei der
Umklassifizierung invariant bleiben.

Der Dialog weist deshalb dezent darauf hin:
`Die Projektion setzt eine vollständige Fixkostenkontrolle voraus.`

Verbindliches Beispiel: Bei `3.000 EUR` Einnahmen, `1.000 EUR`
Fixkostenplan, einer bereits gebuchten, aber noch variabel gefuehrten Miete von
`600 EUR` und weiteren variablen Ausgaben von `500 EUR` betraegt der aktuelle
Budgetstand vor und nach dem Include `1.900 EUR`. Die Projektion steigt
bewusst von `900 EUR` auf `1.500 EUR`, weil die Miete nach dem Include nicht
mehr zugleich als variable Ausgabe und im Fixkostenplan beruecksichtigt wird.

Die Fixkostenkontrolle zeigt Plan, Ist und die aggregierte Differenz:

- Ist unter Plan: `Noch nicht als Fixkosten gebucht`
- Ist gleich Plan: `Plan und Ist stimmen ueberein`
- Ist ueber Plan: `Fixkosten-Ist liegt ueber Plan`

Die Differenz ist eine Kontrollinformation. Sie ordnet Kontrolltreffer nicht
automatisch einzelnen Fixkostenpositionen zu.

Fuer offene Monate ohne Fixkosten-Snapshot kommt der Plan aus der aktiven
Fixkostenpflege. Geschlossene und wieder geoeffnete Monate mit Snapshot
verwenden nur fuer die Projektion weiterhin den beim ersten Abschluss
eingefrorenen Fixkostenplan aus ADR 0007. Fixkosten-Ist und aktueller
Budgetstand bleiben aus den gespeicherten Buchungen und Kontrollentscheidungen
nachvollziehbar.

## Konsequenzen

- Dashboard und Monats-Hero verwenden dieselbe Ist-Semantik.
- Die planbasierte Projektion wird nicht als weitere dauerhafte Haupt-KPI
  dupliziert.
- Die drei Differenzzustaende werden sichtbar, ohne neue Erkennungs- oder
  Zuordnungslogik einzufuehren.
- Nur der aktuelle Budgetstand bleibt bei Include/Exclude invariant; die
  Projektion wird durch die korrigierte Klassifizierung bewusst aktualisiert.
- Bargeld, Kategorien, Sonderkategorien, Sparen, Monatsabschluss und
  bestehende Transaktionen bleiben unveraendert.
- Alfreds Snapshotvertrag bleibt unveraendert: Er liefert Plan,
  Kontroll-Ist, alle Ausgaben und variable Ausgaben bereits als getrennte
  Fakten nach ADR 0015 und exportiert keinen BudgetBuddy-Monatsstand.

## Abgrenzung

Diese Entscheidung fuehrt keine automatische Fixkostenerkennung aus
Stammdaten, keine Zuordnung von Kontrolltreffern zu einzelnen Planpositionen
und keine Neuberechnung bestehender Transaktionen ein.

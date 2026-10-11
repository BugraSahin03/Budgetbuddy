# ADR 0017: Sparbuchungen aus Ausgaben-KPIs trennen und budgetwirksam halten

## Status

Angenommen

## Kontext

BudgetBuddy speichert echte Sparbuchungen gemaess ADR 0006 als
`expense`-Transaktionen der geschuetzten Systemkategorie `savings`. Dadurch
werden sie korrekt vom Monatsbudget abgezogen. Monatsansicht, Dashboard und
Monatsvergleich haben denselben Betrag bisher jedoch zugleich unter
`Ausgaben` und unter `Gespart` gezeigt.

Die Budgetrechnung war damit betragsmaessig korrekt, die sichtbare
Ausgabenkennzahl aber missverstaendlich: Sie vermischte Konsum beziehungsweise
Kosten mit einem bewusst zur Seite gelegten Betrag. Besonders im
Monatsvergleich liess die Doppelrolle die Ausgaben hoeher erscheinen, obwohl
die eigene Spar-KPI den Betrag bereits getrennt erklaert.

## Entscheidung

Die technische Buchungsart bleibt unveraendert. Eine Sparbuchung ist weiterhin
eine echte `expense`-Transaktion mit `system_key = savings` und reduziert den
verfuegbaren Monatsbetrag.

Fuer die sichtbaren Monats-KPIs gilt ab FIN-130:

- `Gespart` summiert alle echten Sparbuchungen des Monats.
- `Ausgaben` in Monatsansicht und Dashboard zeigt variable Ausgaben ohne
  Sparbuchungen und ohne den getrennten Fixkosten-Kontrollblock.
- `Ausgaben` im Monatsvergleich zeigt alle echten Nicht-Spar-Ausgaben. Damit
  sind dort sowohl variable Ausgaben als auch gebuchte Fixkosten enthalten;
  Transfers bleiben ausgeschlossen.
- Kategorien, Sonderkategorien und einzelne Transaktionen behalten ihre
  bisherigen Zuordnungen und Ist-Werte.

Die Budgetwirkung bleibt unveraendert:

```text
Aktueller Budgetstand
= bereinigte Einnahmen
- variable Nicht-Spar-Ausgaben
- Gespart
- Fixkosten-Ist

Voraussichtlich nach Fixkostenplan
= bereinigte Einnahmen
- variable Nicht-Spar-Ausgaben
- Gespart
- Fixkostenplan
```

Die Implementierung behaelt die bisherige budgetwirksame variable Summe als
interne Rechengroesse bei und loest den darin enthaltenen Sparanteil nur fuer
den sichtbaren Ausgabenwert heraus. Dadurch bleiben aktueller Budgetstand und
Fixkostenplan-Projektion fuer identische Buchungsdaten exakt unveraendert.
Fixkosten-Umklassifizierungen ziehen denselben realen Betrag weiterhin genau
einmal ab.

## Begruendung

Die drei sichtbaren Kennzahlen beantworten damit getrennte Fragen:

- `Ausgaben`: Was wurde fuer Konsum, Sonderkategorien und Kosten ausgegeben?
- `Gespart`: Was wurde bewusst zur Seite gelegt?
- `Aktueller Budgetstand`: Welcher Betrag steht nach allen bisher
  budgetwirksamen Abgaengen noch zur Verfuegung?

Eine neue Transaktionsart waere dafuer nicht notwendig und wuerde bestehende
Import-, Zuordnungs- und Kontologik unnoetig veraendern. Der stabile
Systemschluessel aus ADR 0006 liefert bereits die benoetigte fachliche
Trennung.

## Konsequenzen

- Bestehende Daten werden weder migriert noch neu klassifiziert.
- Sparbuchungen bleiben Kontoabgaenge und budgetwirksame Buchungen.
- Monatsansicht, Dashboard und Monatsvergleich weisen Sparen nicht mehr
  doppelt als Ausgabe aus.
- Die sichtbare Ausgabensumme sinkt in Monaten mit Sparbuchungen; der aktuelle
  Budgetstand und die Projektion bleiben unveraendert.
- ADR 0006 bleibt fuer Schutz, Zuordnung und technische Buchungsart gueltig;
  seine bisherige Aussage zur sichtbaren Ausgabenaggregation wird durch diese
  ADR praezisiert.
- ADR 0016 bleibt fuer die Trennung von Fixkosten-Ist und Fixkostenplan
  gueltig; seine Formeln werden um den separat ausgewiesenen Sparanteil
  praezisiert.

## Abgrenzung

- Keine Sparziele und kein geplanter Sparbetrag.
- Keine neue Transfer- oder Umbuchungslogik.
- Keine Aenderung an Importregeln oder Kategoriezuordnungen.
- Keine Aenderung an historischen Buchungen.
- FIN-130 aendert die Monatsansicht, das Dashboard und den Monatsvergleich;
  weitere Statistik- oder Analysebereiche sind nicht Teil dieser Entscheidung.

# ADR 0018: Monatsinterne Verrechnungen sind keine Kontobuchungen

## Status

Angenommen für FIN-131.

## Kontext

Gegenläufige Zahlungen, etwa eine Auslage und die spätere Erstattung, sollen in
Budget- und Auswertungskennzahlen nur mit ihrem Saldo erscheinen. Die realen
Kontobewegungen müssen dennoch unverändert erhalten bleiben, weil sie den
Bank- oder Bargeldbestand tatsächlich bewegt haben.

## Entscheidung

Eine Verrechnung ist eine eigene, monatsgebundene Entität mit unveränderlichen
Verweisen auf ihre Ursprungsbuchungen. Ihr Ergebnis wird aus der Summe dieser
Buchungen berechnet und nicht als neue Transaktion gespeichert.

Eine gemeinsame Datenbanksicht liefert die budgetwirksamen Einträge: normale,
nicht verrechnete Transaktionen sowie genau ein berechnetes Ergebnis je
Verrechnung. Kontostände lesen weiterhin ausschließlich echte Transaktionen.

Verrechnungen dürfen nur in offenen Monaten und nur aus mindestens einer
positiven und einer negativen zulässigen Buchung entstehen. Transfers,
Sparbuchungen, Einkommensabzüge und Fixkosten-Kontrollbuchungen sind in der
ersten Version ausgeschlossen. Verrechnete Ursprungsbuchungen sind bis zur
Auflösung gegen Änderung und Löschung geschützt.

## Folgen

- Der aktuelle Budgetstand bleibt vor und nach einer Verrechnung gleich.
- Einnahmen- und Ausgabenkennzahlen zeigen nur den wirtschaftlichen Saldo.
- Bank- und Bargeldbestände werden nicht doppelt verändert.
- Die Historie bleibt vollständig nachvollziehbar.
- Neue budgetbezogene Auswertungen müssen die gemeinsame Sicht verwenden;
  reine Kontoauswertungen verwenden weiterhin `transactions`.

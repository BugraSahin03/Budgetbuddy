# ADR 0011: Einkommensabzüge als eigener Transaktionstyp

## Status

Akzeptiert fuer FIN-120.

## Kontext

Bestimmte importierte Abbuchungen, etwa eine separat abgebuchte private
Krankenversicherung, sind fachlich weder Konsumausgabe noch Fixkosten-
Kontrolltreffer. Sie sollen das verfügbare Monatseinkommen reduzieren, ohne
Kategorieverbrauch oder offene Zuordnungen zu erzeugen.

Eine Markierung auf normalen Ausgaben würde erfordern, jede bestehende
Ausgabenabfrage defensiv um Sonderfälle zu ergänzen. Das wäre für zentrale
Finanzberechnungen fehleranfällig.

## Entscheidung

- Importierte Einkommensabzüge werden als eigener Transaktionstyp
  `income_deduction` gespeichert.
- Der Typ ist nur für negative Importbuchungen zulässig und hat weder Kategorie,
  Sonderkategorie noch Zielkonto.
- Die originale Importbuchung und ihr Duplikat-Fingerprint bleiben vollständig
  erhalten.
- Regeln werden getrennt von Kategorie-, Fixkosten- und Bargeldregeln in
  `income_deduction_rules` gespeichert.
- Eine partielle Unique-Constraint erlaubt maximal einen
  `income_deduction` je `effective_month_key`.
- Die Importvorschau reserviert den ersten gültigen Treffer eines Monats. Weitere
  Treffer werden als Konflikt markiert und als normale offene Ausgabe importiert,
  aber nicht als weiterer Einkommensabzug angewendet.
- Operative Monatseinnahmen sind Bruttoeinnahmen plus Rückerstattungen minus
  Einkommensabzug. Die UI zeigt Brutto und Abzug nachvollziehbar an.
- Die Duplikaterkennung läuft vor der Regel- und Monatskonfliktlogik.
- Eine falsch erkannte Buchung kann in einem offenen Monat bewusst zu einer
  normalen offenen Ausgabe zurückgestuft werden. Importmetadaten und Fingerprint
  bleiben erhalten, während der Einkommensabzug-Platz des Monats wieder frei wird.

## Folgen

- Bestehende Abfragen für normale Ausgaben, Fixkostenkontrolle und
  Kategorieverbrauch schließen Einkommensabzüge automatisch aus.
- Duplikaterkennung und bestehende Importregel-Prioritäten bleiben unverändert.
- Alte Buchungen werden nicht automatisch umklassifiziert.
- Eine spätere Unterstützung mehrerer Einkommensabzüge pro Monat erfordert eine
  bewusste Folgeentscheidung und Schemaänderung.

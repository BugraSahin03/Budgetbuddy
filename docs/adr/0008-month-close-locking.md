# ADR 0008: Sperrregeln fuer abgeschlossene Monate

## Status

Angenommen

## Kontext

Mit ADR 0007 existiert ein Monatsstatus und ein Fixkosten-Snapshot fuer den Monatsabschluss. Damit ist der geplante Fixkostenblock historisch stabil, aber der Monat selbst war weiterhin ueber verschiedene Schreibpfade veraenderbar.

Fuer FIN-071 braucht der Abschluss deshalb verbindliche Sperrregeln, die nicht nur in der UI sichtbar sind. Besonders wichtig sind Buchungen, Importe, Kategoriezuordnungen, Monatsbudgets und Sonderbudget-Monatsanteile, weil diese Werte direkt Monatsauswertungen und historische Monatsstaende veraendern.

## Entscheidung

Ein Monat kann `open` oder `closed` sein. Der Status wird in `monthly_statuses` gefuehrt.

Geschlossene Monate sperren monatsbezogene Schreiboperationen:

- neue manuelle Buchungen fuer den Monat
- Bearbeiten und Loeschen bestehender manueller Buchungen des Monats
- Loeschen importierter Buchungen des Monats
- Kategorie- oder Sonderbudget-Zuordnung von Ausgaben des Monats
- CSV-Importe in den Monat
- Monatsbudget-Overrides fester Kategorien
- Sonderbudget-Monatsanteile, inklusive Betrag, Aktiv-Status und projektweite Updates betroffener Anteile

Beim Abschluss wird zusaetzlich der aktuell effektive Kategorie-Planwert als Monatswert gespeichert, sofern ein Planwert existiert. Dadurch veraendern spaetere globale Kategorie-Standardwerte bereits geplante abgeschlossene Monate nicht rueckwirkend.

Offene Ausgaben-Zuordnungen blockieren den Abschluss nicht hart. Die Monatsseite zeigt sie als Warnhinweis, damit Nutzer bewusst entscheiden koennen.

Das Wieder-Oeffnen setzt den Monatsstatus zurueck auf `open` und erlaubt die gesperrten Schreiboperationen wieder. Vorhandene Fixkosten-Snapshots bleiben erhalten und werden nicht automatisch neu berechnet.

## Begruendung

Die Sperre gehoert in die Repository-Schreibpfade, weil UI-only-Schutz bei Importen, globalen Actions oder kuenftigen Oberflaechen zu leicht umgangen wuerde.

Warnen statt Blockieren bei offenen Zuordnungen passt zum aktuellen MVP: Importierte Ausgaben duerfen temporaer offen sein, und ein Monatsabschluss kann fachlich trotzdem sinnvoll sein, wenn der Nutzer das bewusst bestaetigt.

Das Einfrieren vorhandener Kategorie-Planwerte nutzt die bestehende Tabelle `monthly_category_budgets` und vermeidet ein neues Snapshot-Schema fuer Kategorieplaene.

## Abgrenzung

- Planlose Kategorien werden nicht als eigener `NULL`-Snapshot gespeichert, weil `monthly_category_budgets.budget_amount_cents` nicht nullable ist.
- Globale Kategorie-Stammdaten wie Name, Icon oder Aktiv-Status werden nicht historisiert.
- Der Fixkosten-Snapshot bleibt durch ADR 0007 geregelt.
- Es gibt keine automatische Review-, Reset- oder Recalculate-Funktion fuer abgeschlossene Monate.

## Konsequenzen

- Schreibfunktionen muessen den Monatsstatus pruefen, bevor sie monatsbezogene Daten veraendern.
- Neue monatsbezogene Schreibpfade muessen dieselbe Sperrregel anwenden.
- UI-Komponenten fuer geschlossene Monate duerfen keine Bearbeitungsformulare anbieten, sondern sollen Wieder-Oeffnen als bewusste Aktion zeigen.
- Tests muessen Repository-Sperren, Import-Sperren und UI-Indikatoren fuer geschlossene Monate absichern.

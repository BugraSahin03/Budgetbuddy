# ADR 0007: Fixkosten-Snapshots beim Monatsabschluss

## Status

Angenommen

## Kontext

Fixkosten sind im MVP ein global gepflegter monatlicher Planungsblock. Offene Monate sollen bewusst die aktuelle aktive Fixkostenliste verwenden, damit laufende Pflege sofort in aktuellen Planstaenden sichtbar wird.

Fuer abgeschlossene Monate ist dieses Live-Verhalten aber gefaehrlich: Wenn ein Fixkostenbetrag spaeter erhoeht, umbenannt oder deaktiviert wird, duerfen historische Monatsstaende nicht rueckwirkend kippen.

FIN-071 wird spaeter den groesseren Monatsabschluss-Flow und Sperrregeln ausarbeiten. FIN-070 entscheidet vorab die notwendige Fixkosten-Historisierung.

## Entscheidung

Beim ersten Abschluss eines Monats wird ein Fixkosten-Snapshot gespeichert:

- `monthly_statuses` haelt den Monatsstatus und markiert, ob ein Fixkosten-Snapshot existiert.
- `monthly_fixed_cost_snapshots` speichert die im Abschlussmoment aktiven Fixkostenpositionen mit Name, Planbetrag, Abbuchungstag, Abbuchungsinfo, Notiz und Einbezogen-Status.
- Offene Monate ohne Snapshot lesen weiterhin live aus `fixed_costs`.
- Monate mit Snapshot lesen den geplanten Fixkostenblock aus dem Snapshot.
- Wieder geoeffnete Monate behalten ihren vorhandenen Snapshot.
- Es gibt keine automatische Neuberechnung und keinen Reset des Fixkosten-Snapshots.
- Auch ein Abschluss mit `0 EUR` aktiven Fixkosten wird ueber den Monatsstatus als Snapshot markiert.

## Begruendung

Das Modell trennt laufende Planung von historischer Stabilitaet. Der Nutzer kann aktuelle Fixkosten weiter pflegen, ohne abgeschlossene Monate zu veraendern.

Der Snapshot gehoert zum Monatsabschluss und nicht zur Import-/Kontrollsicht. Dadurch bleiben geplante Fixkosten und erkannte Fixkosten-Kontrolltreffer fachlich getrennt.

Der separate Monatsstatus verhindert eine Mehrdeutigkeit bei leeren Snapshots: `0 EUR` beim Abschluss ist eine bewusste historische Aussage und kein Anlass, spaeter wieder live zu rechnen.

## Abgrenzung

Diese Entscheidung fuehrt noch keinen vollstaendigen Monatsabschluss-Workflow ein:

- keine UI fuer Abschliessen oder Wiedereroeffnen
- keine Sperrlogik fuer Buchungen
- keine Pruefung offener Zuordnungen
- keine Reset- oder Recalculate-Funktion
- keine Aenderung an Import-Matching oder Fixkosten-Kontrolltreffern

Diese Punkte bleiben Folgearbeit, insbesondere FIN-071.

## Konsequenzen

- Monats-Readmodels muessen beim geplanten Fixkostenblock zuerst pruefen, ob ein Snapshot existiert.
- Fixkostenpflege bleibt global und wirkt nur auf Monate ohne Snapshot.
- Tests muessen sicherstellen, dass Betragserhoehung, Deaktivierung und Wiedereroeffnung nach Abschluss den historischen Planstand nicht veraendern.

Die Verwendung dieses eingefrorenen Planstands fuer die getrennte
Monatsprojektion ist in ADR 0016 beschrieben. Der aktuelle Ist-Budgetstand
bleibt davon getrennt.

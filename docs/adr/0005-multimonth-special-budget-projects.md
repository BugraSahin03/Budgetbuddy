# ADR 0005: Mehrmonatige Sonderkategorien als Vorhaben mit Monatsanteilen

## Status

Angenommen

## Kontext

Sonderkategorien waren bisher direkt ein einzelner Monatsanteil: ein Name, ein `month_key`, ein geplanter Betrag. Fuer groessere Vorhaben wie `Computer` oder `Urlaub` reicht das fachlich nicht, weil Nutzer mehrere Monatsanteile als ein zusammenhaengendes Vorhaben verstehen.

Gleichzeitig muessen historische Transaktionszuordnungen stabil bleiben. Ausgaben referenzieren heute konkrete `special_budgets.id`; diese Referenz darf nicht durch ein neues Gruppierungsmodell aufgebrochen werden.

## Entscheidung

Mehrmonatige Sonderkategorien werden als Vorhaben mit Monatsanteilen modelliert:

- `special_budget_projects` ist das uebergeordnete Vorhaben, z. B. `Computer`.
- `special_budgets` bleiben konkrete Monatsanteile mit `month_key`, Planbetrag und Aktiv-Status.
- Ein Monatsanteil verweist ueber `project_id` auf das Vorhaben.
- Beim Anlegen einer Sonderkategorie mit gleichem Namen in einem weiteren Monat wird dasselbe Vorhaben genutzt.
- Transaktionen bleiben weiterhin am konkreten Monatsanteil (`special_budgets.id`) verankert.
- Ein Vorhaben wird archiviert, wenn kein Monatsanteil mehr aktiv ist.
- Reaktivieren holt das Vorhaben zurueck und aktiviert den juengsten Monatsanteil.

## Begruendung

Dieses Modell erfuellt das Nutzerziel, ohne die bestehende Ausgabenlogik zu veraendern. Monatsanteile bleiben auswertbar, waehrend das Vorhaben die fachliche Klammer bildet.

Die stabile Transaktionsreferenz verhindert Historienbrueche. Alte Buchungen zeigen weiterhin auf denselben Monatsanteil, auch wenn das Vorhaben spaeter archiviert wird.

## Abgrenzung

Mehrmonatige Sonderkategorien sind keine Sparlogik:

- Es werden keine automatischen Transfers erzeugt.
- Es entsteht keine interne Spar- oder Umbuchungsbuchhaltung.
- Kontoabgaenge, die einer Sonderkategorie zugeordnet werden, bleiben echte Ausgaben.
- FIN-049 bleibt die separate Folgearbeit fuer echte Sparlogik.

## Konsequenzen

- Die normale Budgetpflege zeigt nur aktive Monatsanteile der Sonderkategorien aus aktiven Vorhaben.
- Archivierte Vorhaben werden unter Einstellungen im Sonderkategorie-Archiv sichtbar.
- Historische Buchungen bleiben nachvollziehbar und werden nicht geloescht.
- Die Fachregel bleibt unveraendert: Eine Ausgabe hat genau eine Zuordnung, Kategorie oder Sonderkategorie.

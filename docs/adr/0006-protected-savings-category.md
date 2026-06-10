# ADR 0006: Geschuetzte Sparen-Systemkategorie

## Status

Angenommen

## Kontext

BudgetBuddy braucht eine fachlich stabile Kategorie fuer echte Sparbuchungen. Diese Buchungen sind reale Kontoabgaenge und sollen deshalb budgetwirksam bleiben. Gleichzeitig sollen sie in spaeteren Auswertungen getrennt von normalen Konsumausgaben erkannt werden koennen.

Ein reiner Name wie `Sparen` reicht als technische Erkennung nicht aus, weil Namen langfristig UI- oder Sprachentscheidungen sein koennen. Die Fachlogik braucht einen stabilen Schluessel.

## Entscheidung

`Sparen` wird als geschuetzte feste Kategorie mit `system_key = savings` modelliert:

- Die Kategorie wird per Migration angelegt oder, falls ein Eintrag `Sparen` bereits existiert, als Systemkategorie markiert.
- `Sparen` bleibt immer aktiv.
- `Sparen` kann nicht deaktiviert, archiviert, geloescht oder umbenannt werden.
- `Sparen` bekommt im MVP keinen globalen Standard-Planwert und keinen Monats-Override.
- Der Ist-Wert entsteht ausschliesslich aus echten Ausgaben, die `Sparen` zugeordnet sind.
- Importierte und manuelle Ausgaben duerfen `Sparen` als normale Kategorie-Zuordnung nutzen.

## Begruendung

Dieses Modell erfuellt die fachliche Trennung, ohne eine neue Buchungsart oder Transferlogik einzufuehren. Sparen bleibt eine echte Ausgabe und wirkt dadurch weiterhin auf Monatsbudget und Kontostand.

Der Systemschluessel macht spaetere Auswertungen robust. FIN-068 kann dadurch Sparwerte separat anzeigen, ohne sich auf einen frei veraenderbaren Anzeigenamen verlassen zu muessen.

## Abgrenzung

Diese Entscheidung fuehrt keine Sparziele ein:

- Kein Zielbetrag.
- Kein geplantes Sparbudget.
- Keine automatische Importregel fuer Sparbuchungen.
- Keine Umbuchungs- oder Transfermodellierung.
- Keine neue KPI in der Monatsansicht.

## Konsequenzen

- Kategorie- und Budgetpflege muessen `Sparen` schuetzen.
- Die Archivsicht darf `Sparen` nicht als deaktivierbare Kategorie behandeln.
- Budget-Repositorys duerfen fuer `Sparen` keine Planwerte speichern.
- Transaktionszuordnungen koennen `Sparen` wie andere aktive Kategorien anbieten.

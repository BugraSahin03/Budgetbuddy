# Produktplan

## Ausgangslage

Der aktuelle Budgetplaner basiert auf Excel. Er enthaelt Monatsblaetter mit Transaktionen, Kategorien, Orientierungsbudgets und Auswertungen sowie ein separates Blatt fuer Fixkosten.

Die manuelle Pflege ist aufwendig, weil jede Ausgabe eingetragen und mit Online-Banking abgeglichen werden muss. Auswertungen nach Kategorien, Trends und Monatsvergleichen sind nur eingeschraenkt moeglich.

Die wichtigste Erkenntnis aus dem bisherigen Planner: Es gibt feste Kategorien, die jeden Monat existieren, und monatliche Sonderbudgets fuer konkrete Vorhaben. Sonderbudgets sind direkte Ausgaben, keine reinen Sparziele.

## Produktziel

Eine private Finanz-App, die den Excel-Planer ersetzt und langfristig erweitert:

- CSV/CAMT-Import von Sparkassen-Umsaetzen
- manuelle Erfassung von Barzahlungen und Sonderfaellen
- automatische Zuordnung ueber Regeln
- feste Kategorien fuer alle Monate
- monatliche Sonderbudgets fuer direkte Ausgaben
- Fixkosten-Uebersicht ohne N26-Import
- Bargeldbestand als eigener Topf
- Monats-, Kategorie- und Trend-Auswertungen
- langfristige Datenhaltung ueber Jahre
- offline nutzbar fuer manuelle Eintraege
- spaeter erreichbar von Laptop, Handy und Tablet

## Produktprinzipien

- Daten bleiben privat und lokal kontrollierbar.
- Import soll manuelle Arbeit reduzieren, aber der Nutzer behaelt Kontrolle ueber Zuordnung.
- Jede echte Ausgabe soll nachvollziehbar einer Kategorie oder einem Sonderbudget zugeordnet sein.
- Budgets sind Orientierung, keine harten Sperren.
- Der erste MVP muss nuetzlich sein, auch bevor Bankanbindung, Offline-Sync und Raspberry-Pi-Betrieb fertig sind.

## Fachliche Regeln

### Transaktionen

Jede echte Ausgabe oder Einnahme wird als Transaktion gespeichert. Jede Ausgabe muss genau einer Kategorie oder einem Sonderbudget zugewiesen werden.

### Feste Kategorien

Feste Kategorien existieren jeden Monat, zum Beispiel Einkauf, Freizeit, Tanken oder Medikamente. Pro Monat kann ein Orientierungswert gepflegt werden. Dieser Wert ist kein hartes Limit.

### Sonderbudgets

Sonderbudgets sind monatliche Ausgabeziele fuer konkrete Vorhaben, zum Beispiel Bali Flug, Raspberry Pi oder SSD. Wenn dazu eine Zahlung existiert, ist sie eine echte Ausgabe und wird diesem Sonderbudget zugeordnet.

Sonderbudgets koennen nur in bestimmten Monaten aktiv sein.

Sie sind nicht als globale Kategorien gedacht. Wenn ein Vorhaben in mehreren Monaten geplant ist, kann es in mehreren Monaten als Sonderbudget auftauchen.

### Budget-Hinweise

Budgets sind Leitplanken:

- unter Budget: neutral oder positiv
- nahe am Budget: Hinweis
- ueber Budget: deutliche Warnung
- stark ueber Budget: hervorgehobener Warnbereich

### Bargeld

Bargeld wird als eigenes Konto behandelt.

Eine Bargeldabhebung ist keine Ausgabe, sondern ein Transfer von Sparkasse zu Bargeld. Erst die spaetere manuelle Barzahlung wird als Ausgabe einer Kategorie oder einem Sonderbudget zugeordnet.

### Fixkosten

Fixkosten werden als Planungsliste gepflegt. Die tatsaechlichen Abbuchungen vom N26-Konto werden vorerst nicht importiert.

Der Nutzer nutzt einen Dauerauftrag von Sparkasse zu N26, von wo die Fixkosten abgebucht werden. Der N26-Teil soll am Anfang bewusst ausserhalb des Imports bleiben.

## Nicht-Ziele fuer den Start

- keine Multi-User-Funktion
- keine Beleganhaenge
- keine Ausgabeaufteilung
- keine direkte Bankanbindung im ersten MVP
- kein N26-Import
- kein Audit-Log fuer jede Aenderung
- keine verpflichtende Exportfunktion

## Erste App-Bereiche

- Dashboard
- Transaktionen
- Import
- Kategorien
- Sonderbudgets
- Fixkosten
- Bargeld
- Auswertungen
- Einstellungen / Backup

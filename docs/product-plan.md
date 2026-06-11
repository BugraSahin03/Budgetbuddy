# Produktplan

## Ausgangslage

Der aktuelle Budgetplaner basiert auf Excel. Er enthaelt Monatsblaetter mit Transaktionen, Kategorien, Orientierungsbudgets und Auswertungen sowie ein separates Blatt fuer Fixkosten.

Die manuelle Pflege ist aufwendig, weil jede Ausgabe eingetragen und mit Online-Banking abgeglichen werden muss. Auswertungen nach Kategorien, Trends und Monatsvergleichen sind nur eingeschraenkt moeglich.

Die wichtigste Erkenntnis aus dem bisherigen Planner: Es gibt feste Kategorien, die jeden Monat existieren, und monatliche Sonderkategorien fuer konkrete Vorhaben. Sonderkategorien sind direkte Ausgaben, keine reinen Sparziele.

## Produktziel

Eine private Finanz-App, die den Excel-Planer ersetzt und langfristig erweitert:

- CSV/CAMT-Import von Sparkassen-Umsaetzen
- manuelle Erfassung von Barzahlungen und Sonderfaellen
- automatische Zuordnung ueber Regeln
- feste Kategorien fuer alle Monate
- monatliche Sonderkategorien fuer direkte Ausgaben
- Fixkosten-Uebersicht ohne N26-Import
- Bargeldbestand als eigener Topf
- Monats-, Kategorie- und Trend-Auswertungen
- langfristige Datenhaltung ueber Jahre
- offline nutzbar fuer manuelle Eintraege
- spaeter erreichbar von Laptop, Handy und Tablet

## Produktprinzipien

- Daten bleiben privat und lokal kontrollierbar.
- Import soll manuelle Arbeit reduzieren, aber der Nutzer behaelt Kontrolle ueber Zuordnung.
- Jede echte Ausgabe soll nachvollziehbar einer Kategorie oder einer Sonderkategorie zugeordnet sein.
- Budgets sind Orientierung, keine harten Sperren.
- Der erste MVP muss nuetzlich sein, auch bevor Bankanbindung, Offline-Sync und Raspberry-Pi-Betrieb fertig sind.

## UI-Leitbild: ruhige Premium-Finanzoberflaeche

BudgetBuddy soll sich wie ein fokussiertes, hochwertiges Finanzprodukt anfuehlen: ruhig, hell, vertrauenswuerdig und alltagstauglich. Die App darf deutlich eleganter werden als ein internes Werkzeug, muss aber die Monatsarbeit schneller und klarer machen, nicht nur schoener.

Das Zielbild ist kein Marketing-Screen und keine 1:1-Kopie einer Referenz. Uebernommen werden sollen Ruhe, Luft, starke Primaerzahlen, klare Hierarchie, helle Blau-/Navy-Akzente und reduzierte Oberflaechen. Nicht uebernommen werden duerfen dekorative Elemente, die echte Finanzarbeit verstecken, fachliche Begriffe verwaessern oder dichte Arbeitsbereiche unnoetig aufblaehen.

### Designprinzipien

- Hierarchie: Jede Seite braucht einen klaren Primaerfokus. Pro Screen soll sofort sichtbar sein, welcher Monat, welche Hauptkennzahl oder welche Arbeitsaufgabe gerade fuehrt.
- Typografie: Grosse Zahlen und Seitentitel duerfen praesent sein; Hilfstexte, Labels und Metadaten bleiben leise. Typografie soll fuehren, nicht dekorieren.
- Karten und Flaechen: Karten sollen weich, luftig und hochwertig wirken. Zu viele gleich laute Boxen werden vermieden; wichtige Flaechen bekommen mehr Gewicht als Nebeninformationen.
- Navigation: Die Hauptnavigation bleibt kompakt und fuehrt ueber wenige klare Wege: Dashboard, Monate, Budgets, Import, Transaktionen, Auswertungen und Einstellungen. Verwaltung wird gebuendelt statt breit aufgefaechert.
- Tabellen und Listen: Klassische Tabellen werden dort durch Karten, Zeilenlisten oder gruppierte Surfaces ersetzt, wo es die Lesbarkeit verbessert. Fuer dichte Buchungs- und Monatsarbeit bleiben tabellarische Strukturen erlaubt, sollen aber visuell leichter und besser gefuehrt sein.
- Farben: Die Grundstimmung ist hell, ruhig und finanznah mit Navy-/Blau-Akzenten, warmen neutralen Flaechen und sehr bewusst eingesetzten Warnfarben. Rot bleibt echten Budget- oder Validierungsproblemen vorbehalten.
- States: Status, Warnungen und offene Arbeit muessen eindeutig bleiben. Gruen, Amber und Rot werden funktional verwendet; Premium-Ruhe darf kritische Zustande nicht verstecken.
- Effizienz: Dashboard und Monatsansicht duerfen hochwertiger aussehen, muessen aber schneller scannbar und bedienbar bleiben als vorher.

### Umsetzungsreihenfolge

Die neue UI-Sprache wird bewusst in kleine Pakete geschnitten:

1. Dashboard als erster Referenzscreen fuer Hero, Primaerzahlen, ruhige KPI-Karten und reduzierte Listen.
2. App-Shell und Navigation, damit die neue Sprache nicht nur innerhalb einzelner Seiten sichtbar ist.
3. Monatsansicht als Hauptarbeitsort fuer Budgetpflege, Sonderkategorien, Fixkostenkontrolle und Zuordnung.
4. Verwaltungsseiten, insbesondere `Budgets`, damit Kategorien, Standardbudgets und Sonderkategorien nicht wie ein abgekoppelter Admin-Bereich wirken.

Dashboard und Monatsansicht sind beide prioritaer. Das Dashboard setzt die visuelle Referenz; die Monatsansicht beweist, dass dieselbe Sprache auch bei hoher Informationsdichte und echter Arbeitslast funktioniert.

## Fachliche Regeln

### Transaktionen

Jede echte Ausgabe oder Einnahme wird als Transaktion gespeichert. Jede Ausgabe muss genau einer Kategorie oder einer Sonderkategorie zugewiesen werden.

### Feste Kategorien

Feste Kategorien existieren jeden Monat, zum Beispiel Einkauf, Freizeit, Tanken oder Medikamente. Pro Monat kann ein Orientierungswert gepflegt werden. Dieser Wert ist kein hartes Limit.

### Sonderkategorien

Sonderkategorien sind monatliche Ausgabeziele fuer konkrete Vorhaben, zum Beispiel Bali Flug, Raspberry Pi oder SSD. Wenn dazu eine Zahlung existiert, ist sie eine echte Ausgabe und wird der Sonderkategorie zugeordnet.

Sonderkategorien koennen nur in bestimmten Monaten aktiv sein.

Sie sind nicht als globale Kategorien gedacht. Wenn ein Vorhaben in mehreren Monaten geplant ist, kann es in mehreren Monaten als Sonderkategorie auftauchen.

### Budget-Hinweise

Budgets sind Leitplanken:

- unter Budget: neutral oder positiv
- nahe am Budget: Hinweis
- ueber Budget: deutliche Warnung
- stark ueber Budget: hervorgehobener Warnbereich

### Bargeld

Bargeld wird als eigenes Konto behandelt.

Eine Bargeldabhebung ist keine Ausgabe, sondern ein Transfer von Sparkasse zu Bargeld. Erst die spaetere manuelle Barzahlung wird als Ausgabe einer Kategorie oder einer Sonderkategorie zugeordnet.

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
- Sonderkategorien
- Fixkosten
- Bargeld
- Auswertungen
- Einstellungen / Backup

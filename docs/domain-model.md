# Fachliches Datenmodell

Dieses Dokument beschreibt die fachlichen Objekte der App. Es ist noch kein finales Datenbankschema, aber die Grundlage fuer Tabellen, API-Modelle und UI.

## Begriffe

### Konto

Ein Konto ist eine Quelle oder ein Topf fuer Geldbewegungen.

Geplante Kontotypen:

- `bank`: Sparkasse
- `cash`: Bargeld
- `virtual`: optional fuer spaetere Sonderlogiken

N26 wird fuer den Start nicht als importiertes Konto modelliert. Fixkosten werden als Planungsliste gepflegt.

### Transaktion

Eine Transaktion ist eine echte Geldbewegung.

Beispiele:

- Kartenzahlung bei REWE
- Barzahlung beim Baecker
- Gehaltseingang
- Bargeldabhebung
- Rueckerstattung

Wichtige Felder:

- Datum
- Betrag
- Beschreibung/Name
- Konto
- Transaktionstyp
- Kategorie oder Sonderbudget
- Quelle: manuell oder Import
- Importreferenz fuer Duplikaterkennung

### Transaktionstyp

Moegliche Typen:

- `expense`: echte Ausgabe
- `income`: Einnahme
- `transfer`: Umbuchung, z. B. Sparkasse zu Bargeld
- `refund`: Rueckerstattung

Regel:

- `expense` muss genau eine feste Kategorie oder genau ein Sonderbudget haben.
- `transfer` darf keine Ausgabe-Kategorie haben und muss ein Zielkonto haben.
- `income` und `refund` haben keine Ausgabenkategorie.

### Feste Kategorie

Eine feste Kategorie ist dauerhaft verfuegbar und kommt jeden Monat wieder.

Startliste fuer den MVP:

- Einkauf
- Tanken
- Freizeit
- Fitness
- Parkhaus
- Kleidung
- Oeffis

Feste Kategorien koennen deaktiviert statt geloescht werden, damit historische Transaktionen gueltig bleiben.

### Monatsbudget

Ein Monatsbudget ist der Orientierungswert einer festen Kategorie fuer einen bestimmten Monat.

Beispiel:

- April 2026, Einkauf, 500 EUR
- April 2026, Freizeit, 200 EUR

Ein Monatsbudget ist kein hartes Limit. Ueberschreitungen sind erlaubt, werden aber stark markiert.

### Sonderbudget

Ein Sonderbudget ist ein konkretes Budget fuer einen bestimmten Monat oder Zeitraum.

Beispiele:

- April 2026, Bali Flug, 120 EUR
- April 2026, Raspberry Pi, 80 EUR
- Mai 2026, Raspberry Pi, 80 EUR

Sonderbudgets sind direkte Ausgabeziele. Wenn eine Zahlung fuer den Zweck existiert, wird sie dem Sonderbudget zugeordnet.

Sonderbudgets koennen wiederkehrend manuell in mehreren Monaten angelegt werden, sind aber fachlich keine globale feste Kategorie.

### Fixkosten

Fixkosten sind geplante regelmaessige Kosten.

Beispiele aus der Excel:

- Miete
- Garage
- Netflix
- Spotify
- GPT
- Vodafone
- Strom
- Auto
- Internet
- DAZN
- Versicherungen

Wichtige Felder:

- Name
- Betrag
- Abbuchungsinfo
- Frequenz, spaeter optional
- Notiz
- aktiv/inaktiv

Fixkosten werden fuer den Start nicht durch N26-Import abgeglichen.

### Importlauf

Ein Importlauf dokumentiert eine eingelesene Bankdatei.

Wichtige Felder:

- Dateiname
- Format
- Importdatum
- Anzahl erkannter Buchungen
- Anzahl importierter Buchungen
- Anzahl Duplikate
- Status

### Zuordnungsregel

Eine Zuordnungsregel erkennt wiederkehrende Buchungen.

Beispiele:

- Beschreibung enthaelt `REWE` -> Kategorie `Einkauf`
- Beschreibung enthaelt `APOTHEKE` -> Kategorie `Medikamente`
- Buchung ist Geldautomat/ATM -> Transfer `Sparkasse -> Bargeld`

Regeln koennen automatisch vorschlagen oder direkt zuordnen. Fuer den Start ist eine Vorschau mit Bestaetigung ausreichend.

## Budgetberechnungen

### Kategorie-Ist

Summe aller Ausgaben eines Monats, die einer festen Kategorie zugeordnet sind.

### Kategorie-Rest

`Monatsbudget - Kategorie-Ist`

### Betragskonvention (festgelegt)

Intern speichern wir `amount_cents` als signed Integer in Cent.

Regeln:

- `expense`: negativ
- `income`: positiv
- `refund`: positiv
- `transfer`: Betrag aus Sicht des Quellkontos, daher typischerweise negativ

Damit bleiben Importdaten und manuelle Buchungen konsistent und ohne Rundungsprobleme vergleichbar.

### Sonderbudget-Ist

Summe aller Ausgaben, die diesem Sonderbudget zugeordnet sind.

### Sonderbudget-Rest

`geplanter Betrag - Ist-Ausgaben`

### Gesamt-Ausgaben

Summe aller echten Ausgaben im Monat, ohne Transfers.

Bargeldabhebungen sind Transfers und zaehlen nicht als Ausgabe. Die spaeteren manuellen Barzahlungen zaehlen als Ausgabe.

## Datenqualitaetsregeln

- Jede Ausgabe muss zugeordnet sein.
- Unzugeordnete importierte Ausgaben muessen im Import/Dashboard sichtbar sein.
- Kategorien sollten deaktiviert statt historisch geloescht werden.
- Sonderbudgets duerfen geloescht werden, solange keine Transaktionen daran haengen.
- Importierte Transaktionen brauchen eine stabile Duplikatkennung.
- Manuelle Transaktionen brauchen keine Importkennung.

## Tabellenbasis in FIN-002

Umgesetzt als erste migrationsbasierte Grundlage:

- `accounts`
- `categories`
- `monthly_category_budgets`
- `special_budgets`
- `fixed_costs`
- `import_runs`
- `transactions`
- `imported_transactions`
- `schema_migrations`
- `app_meta`

Fuer spaetere Tickets vorgesehen:

- `categorization_rules`

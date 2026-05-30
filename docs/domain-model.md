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
- effektiver Zielmonat `effective_month_key` (`YYYY-MM`)
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

Fixkosten sind ein monatlicher Planungsblock aus der Fixkostenliste.

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

Fixkosten werden fuer den Start nicht ueber ein eigenes N26-Fachmodell importiert.

MVP-Regel (FIN-024):

- Die aktive Fixkostensumme reduziert den verfuegbaren Monatsbetrag direkt.
- Einzeltransaktionen werden nicht mehr manuell als Fixkosten markiert.
- `wirkt_fuer_monat` ist nicht Teil des Zielmodells.
- N26-Sammeltransfer und direkte Sparkassen-Fixkostenmatches sind Kontrollinformationen, keine normalen variablen Monatsausgaben.

Technischer Migrationshinweis (FIN-025):

- Fruehere manuelle Zuordnungslogik ueber `fixed_cost_transaction_links` wird fachlich stillgelegt.
- Bestehende lokale Altdaten werden nicht destruktiv geloescht, aber im Zielmodell nicht mehr fuer neue Zuordnungen verwendet.

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

### Effektiver Zielmonat (FIN-030/FIN-031)

Monatsbezogene Auswertungen basieren fachlich auf `transactions.effective_month_key` und nicht mehr auf einer impliziten Ableitung aus `booking_date`.

Fuer den aktuellen MVP gilt weiterhin:

- Manuelle Buchungen erfassen den Zielmonat explizit (`YYYY-MM`), Standard bleibt der Monat aus `booking_date`.
- Beim Import-Confirm kann ein Zielmonat fuer den gesamten Importlauf explizit gesetzt werden.
- Ohne explizite Eingabe wird beim Import der Zielmonat aus den Buchungsdaten erkannt.
- Sonderbudget-Pruefungen laufen gegen `effective_month_key`, nicht nur gegen `booking_date`.
- Migrationen backfillen Bestandsdaten aus `booking_date`.
- Folge-Tickets koennen die bewusste Abweichung zwischen Buchungsdatum und Zielmonat nutzen, ohne das Datenmodell erneut zu aendern.

### Sonderbudget-Ist

Summe aller Ausgaben, die diesem Sonderbudget zugeordnet sind.

### Sonderbudget-Rest

`geplanter Betrag - Ist-Ausgaben`

### Gesamt-Ausgaben

Summe aller echten Ausgaben im Monat, ohne Transfers.

Bargeldabhebungen sind Transfers und zaehlen nicht als Ausgabe. Die spaeteren manuellen Barzahlungen zaehlen als Ausgabe.

### Verfuegbar (FIN-027)

`Verfuegbar = Einkommen - aktive Fixkostensumme (Plan) - variable Ausgaben`

Dabei gilt:

- aktive Fixkostensumme ist der monatliche Planungsblock aus `fixed_costs` (aktiv).
- variable Ausgaben enthalten normale Monatsausgaben, aber keine als Fixkosten-Kontrolle erkannten
  Importtreffer.
- erkannte N26-Sammeltransfers und direkte Fixkostenmatches werden als separater
  Ist-Kontrollwert gefuehrt und nicht in die variable Ausgabensumme eingerechnet.

### Monatsdetailseite (FIN-033)

Die Monatsdetailseite ist die zentrale Lesesicht fuer einen einzelnen Monat.

Sie zeigt in einer zusammenhaengenden Ansicht:

- Monats-KPIs
- feste Kategorien mit Budget / Ist / Rest
- Sonderbudgets des Monats
- Fixkostenblock aus Plan und Kontrollsicht
- komplette Buchungsliste des Monats aus manuellen und importierten Transaktionen

Die Buchungsliste wird fachlich ueber `effective_month_key` bestimmt und nicht kuenstlich begrenzt.

### Zentrales Monats-Readmodel (FIN-034)

Monatsnahe Lesesichten bauen auf einer gemeinsamen Monatsdatenbasis auf.

Diese liefert pro `effective_month_key` in einer konsistenten Form:

- Monats-KPIs
- feste Kategorien mit Budget / Ist / Rest
- Sonderbudgets des Monats
- Fixkosten-Planblock und erkannte Fixkosten-Kontrolltreffer
- komplette Monatsbuchungsliste aus manuellen und importierten Buchungen

Sortier- und Darstellungsregel fuer Monatsbuchungen:

- primaer `booking_date` absteigend
- sekundaer `id` absteigend

Damit verwenden Monatsliste, Monatsdetailseite und Dashboard dieselbe fachliche Monatsbasis statt getrennter Monatsabfragen.

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

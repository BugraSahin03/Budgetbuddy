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
- Kategorie oder Sonderkategorie
- Quelle: manuell oder Import
- Importreferenz fuer Duplikaterkennung

### Transaktionstyp

Moegliche Typen:

- `expense`: echte Ausgabe
- `income`: Einnahme
- `transfer`: Umbuchung, z. B. Sparkasse zu Bargeld
- `refund`: Rueckerstattung
- `income_deduction`: importierter einkommensnaher Pflichtabzug

Regel:

- `expense` muss genau eine feste Kategorie oder genau eine Sonderkategorie haben.
- `transfer` darf keine Ausgabe-Kategorie haben und muss ein Zielkonto haben.
- `income` und `refund` haben keine Ausgabenkategorie.
- `income_deduction` ist negativ, darf nur aus einem Import entstehen und hat
  weder Kategorie, Sonderkategorie noch Zielkonto.
- Importierte `expense`-Buchungen duerfen temporaer noch offen sein, bis sie fachlich zugeordnet wurden.
- Sobald eine importierte Ausgabe zugeordnet wird, gelten dieselben Fachregeln wie bei manuellen Ausgaben:
  genau eine Kategorie oder genau eine Sonderkategorie des `effective_month_key`.

### Einkommensabzug

Seit FIN-120 koennen aktive Importregeln eine negative Bankbuchung als
`income_deduction` erkennen.

- Der Abzug bleibt als originale Bankbuchung mit Importreferenz auditierbar.
- Er reduziert die fuer Budgetstand und Planung verwendeten Monatseinnahmen.
- Jahres- und Gesamtstatistiken verwenden ebenfalls die bereinigten Einnahmen,
  damit Monats- und Langzeitsicht rechnerisch konsistent bleiben.
- Er zaehlt nicht als normale Ausgabe, Fixkosten-Ist, Kategorie- oder
  Sonderkategorieverbrauch und erzeugt keine offene Zuordnung.
- Pro `effective_month_key` darf maximal ein Einkommensabzug gespeichert werden.
- Ein zweiter Regeltreffer wird in der Vorschau als Konflikt angezeigt, nicht als
  Einkommensabzug angewendet und stattdessen als normale offene Ausgabe importiert.
- Bestehende Buchungen werden nicht rueckwirkend automatisch umklassifiziert.
- Eine falsch erkannte Buchung kann im offenen Monat bewusst vom
  Einkommensabzug in eine normale offene Ausgabe zurueckgestuft werden. Der
  originale Importdatensatz bleibt dabei erhalten und der Monatsplatz wird frei.

Details: `docs/adr/0011-income-deduction-transaction-type.md`.

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

Seit FIN-072 gibt es zusaetzlich die geschuetzte Systemkategorie `Sparen`:

- `Sparen` ist global und nicht monatsabhaengig.
- `Sparen` kann fuer manuelle und importierte Ausgaben als Kategorie zugeordnet werden.
- `Sparen` kann nicht deaktiviert, archiviert, geloescht oder umbenannt werden.
- `Sparen` bekommt im MVP keinen Planwert und keinen eigenen Sparzielbetrag.
- Der Ist-Wert von `Sparen` entsteht ausschliesslich aus echten Ausgaben, die dieser Kategorie zugeordnet sind.
- Sparbuchungen bleiben budgetwirksame Ausgaben, koennen aber ueber den Systemschluessel `savings` separat von normalen Konsumausgaben erkannt werden.

### Monatsbudget

Ein Monatsbudget ist der Orientierungswert einer festen Kategorie fuer einen bestimmten Monat.

Beispiel:

- April 2026, Einkauf, 500 EUR
- April 2026, Freizeit, 200 EUR

Seit FIN-038 gilt fachlich eine zweistufige Budgetlogik:

- Die Seite `/budgets` pflegt den globalen Standardwert einer festen Kategorie.
- Die Monatsdetailseite darf fuer einen konkreten Monat einen abweichenden Monatswert setzen.
- Wenn fuer einen Monat kein eigener Monatswert existiert, gilt automatisch der globale Standardwert.
- Ein leerer Monatswert loescht nur den Monats-Override dieses Monats und nicht den globalen Standardwert.

Ein Monatsbudget ist kein hartes Limit. Ueberschreitungen sind erlaubt, werden aber stark markiert.

### Sonderkategorie

Eine Sonderkategorie ist ein konkretes Ausgabeziel fuer einen bestimmten Monat oder Zeitraum. Seit FIN-065 besteht eine mehrmonatige Sonderkategorie aus einem uebergeordneten Vorhaben und konkreten Monatsanteilen.

Beispiele:

- April 2026, Bali Flug, 120 EUR
- April 2026, Raspberry Pi, 80 EUR
- Mai 2026, Raspberry Pi, 80 EUR

Sonderkategorien sind direkte Ausgabeziele. Wenn eine Zahlung fuer den Zweck existiert, wird sie dem konkreten Monatsanteil der Sonderkategorie zugeordnet.

Mehrmonatige Sonderkategorien werden als Vorhaben gebuendelt:

- `special_budget_projects` beschreibt das Vorhaben, z. B. `Computer`.
- `special_budgets` beschreibt den Monatsanteil, z. B. `2026-05`, `300 EUR`.
- Gleichnamige Sonderkategorien in mehreren Monaten gehoeren zum selben Vorhaben.
- Transaktionen referenzieren weiter den konkreten Monatsanteil, damit historische Zuordnungen stabil bleiben.
- Archivierte Vorhaben bleiben nachvollziehbar, werden aber aus der normalen Budgetpflege ausgeblendet.

Sonderkategorien sind fachlich keine globale feste Kategorie.

Seit FIN-039 gilt fuer bestehende Sonderkategorien im Monatskontext:

- der geplante Betrag bleibt direkt auf dem konkreten Monatsanteil der Sonderkategorie editierbar
- Aktiv/Inaktiv bleibt eine Eigenschaft dieses konkreten Monatseintrags
- es entstehen dadurch keine globalen Sonderkategorie-Vorlagen

Seit FIN-065 gilt zusaetzlich:

- Vorhaben mit keinem aktiven Monatsanteil gelten als archiviert.
- Das Sonderkategorie-Archiv unter `Einstellungen` zeigt archivierte Vorhaben mit Zeitraum, Plan- und Ist-Summe.
- Reaktivieren aktiviert das Vorhaben wieder und stellt den juengsten Monatsanteil aktiv.
- Es entsteht keine automatische Transfer- oder Sparlogik.

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
- Einzeltransaktionen werden nicht mehr als geplante Fixkosten-Zuordnung
  gepflegt.
- `wirkt_fuer_monat` ist nicht Teil des Zielmodells.
- N26-Sammeltransfer und direkte Sparkassen-Fixkostenmatches sind Kontrollinformationen, keine normalen variablen Monatsausgaben.

Ergaenzung fuer die Kontrollsicht (FIN-100):

- Einzelne Ausgaben koennen manuell als Fixkosten-Kontrolltreffer markiert
  oder aus der Fixkostenkontrolle entfernt werden.
- Diese Entscheidung betrifft nur die Monats-Fixkostenkontrolle, nicht den
  geplanten Fixkostenblock und nicht die Fixkosten-Stammdatenpflege.
- Manuelle Entscheidungen werden als separate Overrides gespeichert:
  `include` fuer manuell hinzufuegen, `exclude` fuer automatisch erkannten
  Treffer ausblenden.
- Manuell markierte Kontrolltreffer werden als `manuell` kenntlich gemacht.
- Die alte `fixed_cost_transaction_links`-Logik bleibt stillgelegt.

Technischer Migrationshinweis (FIN-025):

- Fruehere manuelle Zuordnungslogik ueber `fixed_cost_transaction_links` wird fachlich stillgelegt.
- Bestehende lokale Altdaten werden nicht destruktiv geloescht, aber im Zielmodell nicht mehr fuer neue Zuordnungen verwendet.

Monatsabschluss-Regel (FIN-070):

- Offene Monate ohne Abschluss-Snapshot verwenden weiterhin die aktuelle aktive Fixkostenliste.
- Beim ersten Monatsabschluss wird der aktuelle Fixkosten-Planstand eingefroren.
- Eingefroren werden Name, Planbetrag, Abbuchungstag, Abbuchungsinfo, Notiz und die Information, ob der Eintrag im Plan enthalten ist.
- Geschlossene Monate verwenden diesen Snapshot statt der globalen Live-Fixkostenliste.
- Spaetere Aenderungen an Betrag, Name oder Aktiv-Status globaler Fixkosten veraendern geschlossene Monate nicht rueckwirkend.
- Ein wieder geoeffneter Monat behaelt den vorhandenen Snapshot; es gibt keine automatische Neuberechnung und keinen Reset.
- Der Monatsstatus speichert den Snapshot-Marker auch dann, wenn beim Abschluss keine aktive Fixkostenposition existiert.

Monatsabschluss-Sperrregel (FIN-071):

- Ein offener Monat kann bewusst abgeschlossen und spaeter wieder geoeffnet werden.
- Beim Abschluss werden vorhandene effektive Kategorie-Planwerte als Monatswerte gespeichert, damit spaetere globale Standardwert-Aenderungen geplante Werte mit vorhandenem Plan nicht rueckwirkend veraendern.
- Ein geschlossener Monat sperrt monatsbezogene Schreiboperationen:
  neue manuelle Buchungen, Buchungsbearbeitung, Buchungsloeschung, Importloeschung, Kategorie-/Sonderbudget-Zuordnung, CSV-Importe, Monatsbudget-Overrides und Sonderbudget-Monatsanteile.
- Das Wieder-Oeffnen erlaubt diese Schreiboperationen wieder.
- Offene importierte Ausgaben sind beim Abschluss ein Warnhinweis, aber kein harter Blocker.
- Der vorhandene Fixkosten-Snapshot bleibt auch nach Wieder-Oeffnen erhalten und wird nicht automatisch neu berechnet.
- Planlose Kategorien koennen technisch nicht als `NULL`-Monatswert eingefroren werden; sie bleiben planlos, bis ein expliziter Monatswert oder globaler Standard existiert.

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

Dabei ist `Monatsbudget` der effektive Monatswert:

- Monats-Override fuer `effective_month_key`, falls vorhanden
- sonst globaler Kategorie-Standardwert

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
- Sonderkategorie-Pruefungen laufen gegen `effective_month_key`, nicht nur gegen `booking_date`.
- Migrationen backfillen Bestandsdaten aus `booking_date`.
- Folge-Tickets koennen die bewusste Abweichung zwischen Buchungsdatum und Zielmonat nutzen, ohne das Datenmodell erneut zu aendern.

### Sonderkategorie-Ist

Summe aller Ausgaben, die diesem konkreten Monatsanteil der Sonderkategorie zugeordnet sind.

### Sonderkategorie-Rest

`geplanter Betrag - Ist-Ausgaben`

### Gesamt-Ausgaben

Summe aller echten Ausgaben im Monat, ohne Transfers.

Bargeldabhebungen sind Transfers und zaehlen nicht als Ausgabe. Die spaeteren manuellen Barzahlungen zaehlen als Ausgabe.

### Bargeldbestand (FIN-078)

Bargeld ist ein separater Konto-/Topfbestand und kein ungeplanter Monatsrest.

Fachregeln:

- Bargeldabhebungen bleiben Transfers von Sparkasse nach Bargeld.
- Barzahlungen sind echte Ausgaben im jeweiligen Monat.
- Nicht ausgegebenes Bargeld bleibt als Bargeldbestand bestehen und wird in
  Folgemonate mitgenommen.
- Bargeldbestand wird nicht automatisch als Ausgabe, Sparen, Reserve oder
  Restverwertung gebucht.
- Bargeldbestand wird in der Monatsansicht als Transparenzinformation gezeigt,
  veraendert aber `Verfuegbar`/Monatsrest nicht automatisch.

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
- Sonderkategorien des Monats
- Fixkostenblock aus Plan und Kontrollsicht
- einfache Monats-ToDos
- komplette Buchungsliste des Monats aus manuellen und importierten Transaktionen

Die Buchungsliste wird fachlich ueber `effective_month_key` bestimmt und nicht kuenstlich begrenzt.

Seit FIN-040 gilt fuer die Monatsarbeitsweise zusaetzlich:

- Ausgaben koennen direkt in `/monate/[monthKey]` einer Kategorie oder einer aktiven Sonderkategorie dieses Monats zugewiesen oder umzugewiesen werden.
- Einkommen, Transfers und Rueckerstattungen bleiben in dieser Tabelle read-only.
- Die Monatsseite ist damit nicht nur Lesesicht, sondern auch die zentrale Arbeitsflaeche fuer fachliche Ausgaben-Zuordnung im Monatskontext.

### Monats-ToDos (FIN-082)

Monats-ToDos sind einfache Aufgabenhinweise fuer genau einen Monat.

Fachregeln:

- Ein ToDo gehoert genau zu einem `month_key` (`YYYY-MM`).
- ToDos werden nicht automatisch in Folgemonate uebernommen.
- Ein ToDo besteht im ersten Schnitt nur aus Text und Status (`offen` oder `erledigt`).
- Die sichtbare Nummerierung wird aus der stabilen Erstellreihenfolge des jeweiligen Monats abgeleitet.
- Erledigte ToDos bleiben im Monat sichtbar und koennen wieder auf offen gesetzt werden.
- Monats-ToDos haben keine Faelligkeitsdaten, Prioritaeten, Erinnerungen, Wiederholungen oder Verbindung zu Transaktionen, Fixkosten und Importen.

### Zentrales Monats-Readmodel (FIN-034)

Monatsnahe Lesesichten bauen auf einer gemeinsamen Monatsdatenbasis auf.

Diese liefert pro `effective_month_key` in einer konsistenten Form:

- Monats-KPIs
- feste Kategorien mit Budget / Ist / Rest
- Sonderkategorien des Monats
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
- Sonderkategorien werden fuer historische Nachvollziehbarkeit archiviert/deaktiviert statt hart geloescht.
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

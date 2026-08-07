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

FIN-124 trennt die globale Kategoriepflege von monatsbezogenen Schreibpfaden:

- Umbenennen, Iconpflege und Deaktivieren einer festen Kategorie schreiben nur
  die bewusst geaenderten Kategorie-/Standardbudgetdaten. Sichtbare, aber
  unveraenderte Sonderbudget-Monatsanteile werden nicht erneut gespeichert.
- Deaktivieren setzt nur den globalen Aktivstatus der Kategorie und benoetigt
  deshalb keine Oeffnung historischer Monate. Monatsbudgets und Transaktionen
  werden weder veraendert noch geloescht.
- Deaktivierte Kategorien verschwinden aus aktiver Pflege und neuen
  Zuordnungen, bleiben im Kategoriearchiv reaktivierbar und in Monaten mit
  eingefrorenem Planwert oder zugeordneten Buchungen sichtbar.
- In offenen Monaten ohne Budget-Snapshot bleiben gespeicherte Standardwerte
  und Monats-Overrides beim Deaktivieren unveraendert, sind aber solange
  dormant: Ohne Buchung wird die Kategorie ausgeblendet; mit Buchung bleibt nur
  ihr Ist-Kontext ohne Planbeitrag und ohne editierbaren Monatswert sichtbar.
  Reaktivieren setzt die gespeicherten Planwerte fuer solche offenen und
  kuenftigen Monate wieder in Kraft.
- Historische Namen, Icons, Sichtbarkeit und effektive Planwerte werden beim
  ersten Monatsabschluss durch FIN-125 eingefroren. FIN-124 selbst mutiert
  diese Abschlussdaten nicht.

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

- Das bewusste Deaktivieren des letzten aktiven Monatsanteils archiviert das
  bis dahin aktive Vorhaben im selben Schreibvorgang; Listenaufrufe leiten den
  Projektstatus nicht nachtraeglich aus Monatsanteilen ab.
- Das Sonderkategorie-Archiv unter `Einstellungen` zeigt archivierte Vorhaben mit Zeitraum, Plan- und Ist-Summe.
- Es entsteht keine automatische Transfer- oder Sparlogik.

FIN-123 trennt den Lebenszyklusstatus des Vorhabens von seinen Monatsanteilen:

- `special_budget_projects.status` ist der explizite Status `active | archived`
  und wird bei Listen-/Legacy-Reconciliation nicht aus historischen
  `special_budgets.is_active`-Werten zurueck auf `active` gesetzt.
- Das Archivieren eines Vorhabens aendert ausschliesslich den Projektstatus.
  Monatszuordnung, Planbetrag, `is_active`, bestehende Transaktionsreferenzen
  und Zeitstempel der Monatsanteile bleiben unveraendert.
- Aktive Monatsanteile in offenen Monaten blockieren das Archivieren. Die
  Fehlermeldung nennt alle betroffenen Monate, damit sie zuerst bewusst
  deaktiviert oder bereinigt werden koennen. Aktive Anteile geschlossener
  Monate sind kein Blocker.
- In geschlossenen Monatsansichten richtet sich die historische Sichtbarkeit
  eines Anteils nach dessen gespeichertem `is_active`-Wert zum Abschluss. Ein
  spaeter archiviertes Vorhaben entfernt den Anteil deshalb nicht nachtraeglich
  aus Plan, Ist, Rest oder Kategorieuebersicht.
- Reaktivieren aendert ausschliesslich den Projektstatus auf `active`. Es
  aktiviert oder bearbeitet keinen Monatsanteil; ein neuer Anteil fuer einen
  offenen Monat bleibt eine separate bewusste Pflegeaktion.
- Neue Monatsanteile koennen nicht still an ein archiviertes Vorhaben
  angehaengt werden. Das Vorhaben muss zuvor im Kategoriearchiv reaktiviert
  werden.

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
- Treffer einer expliziten, aktiven Fixkosten-Kontrollregel sind
  Kontrollinformationen und keine normalen variablen Monatsausgaben.
- Der Kontrollstatus wird zusammen mit der importierten Buchung gespeichert und
  bleibt auch dann historisch stabil, wenn die Regel spaeter geaendert oder
  deaktiviert wird.
- Fixkosten-Stammdaten sind reine Planungsdaten. Uebereinstimmende Betraege,
  Namen oder Abbuchungsinfos erzeugen ohne Kontrollregel keinen Treffer.

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
- Das Wieder-Oeffnen erlaubt Buchungen, Zuordnungen und Importe wieder. Der
  Planstand aus Fixkosten, Kategorien und Sonderbudgets bleibt jedoch vom
  ersten Abschluss erhalten; bestehende Snapshot-Zeilen werden nicht neu
  berechnet oder ueberschrieben.
- Offene importierte Ausgaben sind beim Abschluss ein Warnhinweis, aber kein harter Blocker.
- Die vorhandenen Fixkosten-, Kategorien- und Sonderbudget-Snapshots bleiben
  auch nach Wieder-Oeffnen erhalten und werden nicht automatisch neu
  berechnet. Fehlende Eintraege werden nur bei bewusster erster Verwendung
  insert-only ergaenzt.
- Planlose Kategorien bleiben planlos, bis ein expliziter Monatswert oder
  globaler Standard existiert.

Kategorien- und Sonderbudget-Snapshot (FIN-125):

- Beim ersten Abschluss speichert `monthly_statuses` mit
  `budget_snapshot_created_at` auch fuer einen bewusst leeren Stand einen
  eindeutigen Marker.
- `monthly_category_snapshots` speichert je sichtbarer fester Kategorie die
  stabile `category_id`, damaligen Namen und Icon, Aktiv-/Sichtbarstatus,
  Sparen-Kennzeichnung und den damaligen effektiven Planwert. Ein planloser
  Stand wird ausdruecklich als `NULL` erhalten.
- `monthly_special_budget_snapshots` speichert je Monatsanteil die stabile
  `special_budget_id` und `project_id`, damaligen Namen und Icon, Planwert
  sowie Aktiv-/Sichtbarstatus.
- Monate mit Snapshot lesen Namen, Icons, Planwerte und Sichtbarkeit aus
  diesen Abschlussdaten. Ist-Werte werden weiterhin dynamisch aus den
  unveraenderten Transaktionsreferenzen summiert.
- Globale Umbenennung, Iconpflege, Deaktivierung, Vorhabenarchivierung und
  Aenderung eines Standardbudgets veraendern einen vorhandenen Snapshot nicht.
  Offene Monate ohne Abschluss-Snapshot lesen weiterhin die aktuellen
  Stammdaten.
- Beim ersten Abschluss werden bereits deaktivierte Kategorien nur dann neu
  eingefroren, wenn der Monat eine zugeordnete Buchung enthaelt. Gespeicherte,
  aber dormante Defaults oder Overrides erzeugen allein keine Sichtbarkeit und
  keinen historischen Planbeitrag. Der konservative Legacy-Backfill bestehender
  Abschlussmonate bleibt davon unberuehrt.
- Wieder-Oeffnen behaelt den Snapshot. Wird dabei erstmals eine weitere
  Kategorie oder ein weiterer Sonderbudget-Anteil bewusst verwendet, wird
  nur der fehlende Snapshot-Eintrag atomar ergaenzt; vorhandene Eintraege
  werden nicht neu berechnet oder ueberschrieben. Ein Monatsbudget-Override
  darf deshalb nur einen noch fehlenden Kategorie-Snapshot einmalig ergaenzen;
  fuer eine vorhandene Snapshot-Zeile wird der Write abgelehnt. Dasselbe gilt
  fuer Betrag und Aktivstatus eines vorhandenen Sonderbudget-Snapshots; eine
  fehlende Zeile darf nur zusammen mit ihrer bewussten ersten Verwendung
  atomar ergaenzt werden.
- Die Migration `0019_fin_125` uebernimmt fuer bereits geschlossene oder schon
  wieder geoeffnete Altdaten mangels historischer Metadatenquelle einmalig den
  zum Migrationszeitpunkt aktuellen Stand. Buchungen, Betraege und
  Zuordnungen werden dabei nicht veraendert.
- Der bestehende Fixkosten-Snapshot nach FIN-070 bleibt fachlich und technisch
  unveraendert.

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
- persistierte Treffer expliziter Kontrollregeln und manuelle Includes werden
  als separater Ist-Kontrollwert gefuehrt und nicht in die variable
  Ausgabensumme eingerechnet; manuelle Excludes heben dies fuer die konkrete
  Buchung auf.

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

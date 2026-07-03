# Import- und Banknotizen

## Startstrategie

Der erste Import soll ueber Sparkassen-Dateien laufen. Eine direkte Bankanbindung kommt spaeter.

Prioritaet:

1. Sparkassen-CSV (festgelegtes Startformat)
2. optional CAMT/XML
3. spaeter FinTS/PSD2

Apple Numbers Dateien sollen nicht als primaeres Importformat verwendet werden.

## Bisher gesehener Sparkassen-Export

Aktueller Referenzexport (CSV):

- `/Users/Bugra/Downloads/20260426-22879003-umsatz.CSV`

Anonymisierte Projekt-Referenz:

- `docs/samples/sparkasse-umsatz-anonymized.csv`
- `docs/samples/sparkasse-umsatz-camtv8-20260522-anonymized.csv` (Stand 2026-05-22)

Formatmerkmale (Stand 2026-04-26):

- Trennzeichen: `;`
- Textqualifizierer: `"`
- Datumsformat: `TT.MM.JJ` (z. B. `24.04.26`)
- Betrag: Dezimal-Komma (z. B. `-12,00`)
- Waehrung in eigener Spalte (z. B. `EUR`)
- Ausgaben als negativer Betrag

Sichtbare Feldnamen:

- Auftragskonto
- Buchungstag
- Valutadatum
- Buchungstext
- Verwendungszweck
- Glaeubiger ID
- Mandatsreferenz
- Kundenreferenz (End-to-End)
- Sammlerreferenz
- Lastschrift Ursprungsbetrag
- Auslagenersatz Ruecklastschrift
- Beguenstigter/Zahlungspflichtiger
- Kontonummer/IBAN
- BIC (SWIFT-Code)
- Betrag
- Waehrung
- Info

## Feldmapping fuer FIN-010

Die CSV ist semikolon-separiert und komplett quoted. Beim Einlesen sollen die Felder 1:1 nach Headername adressiert werden.

Empfohlenes internes Mapping (MVP):

- `Auftragskonto` -> `account_iban`
- `Buchungstag` -> `booking_date` (normalisiert nach `YYYY-MM-DD`)
- `Valutadatum` -> `value_date` (normalisiert nach `YYYY-MM-DD`)
- `Buchungstext` -> `booking_text`
- `Verwendungszweck` -> `purpose`
- `Beguenstigter/Zahlungspflichtiger` -> `counterparty_name`
- `Kontonummer/IBAN` -> `counterparty_iban`
- `BIC (SWIFT-Code)` -> `counterparty_bic`
- `Betrag` -> `amount_cents` (Dezimal-Komma -> Integer-Cent, Vorzeichen beibehalten)
- `Waehrung` -> `currency_code`
- `Info` -> `booking_info`
- `Kundenreferenz (End-to-End)` -> `end_to_end_reference`
- `Mandatsreferenz` -> `mandate_reference`
- `Glaeubiger ID` -> `creditor_id`

Extraktion fuer Ticket-Akzeptanz:

- Buchungstag: aus `Buchungstag`
- Betrag: aus `Betrag`
- Beschreibung: aus `Buchungstext` + optional `Verwendungszweck`
- Gegenpartei: aus `Beguenstigter/Zahlungspflichtiger`
- Info: aus `Info`

Datumsnormalisierung:

- Eingabeformat: `TT.MM.JJ`
- Ausgabeformat intern: `YYYY-MM-DD`
- Beispiel: `24.04.26` -> `2026-04-24`

Erste beobachtete Buchungsarten:

- DIG. KARTE (APPLE PAY)
- FOLGELASTSCHRIFT

Historischer Hinweis (nicht als Startformat nutzen):

- `/Users/Bugra/Downloads/20260425-22879003-umsatz-camt52v8.numbers`

Beobachtung:

- Die Datei ist ein Apple-Numbers-Dokument, intern als ZIP/IWA gespeichert.
- Fuer robuste Verarbeitung wird die originale CSV bevorzugt; CAMT/XML bleibt optional.

## Importanforderungen

Ein Import soll:

- Datei einlesen
- Rohbuchungen in Vorschau anzeigen
- Buchungstag, Valutadatum, Betrag, Beschreibung, Gegenpartei, IBAN/BIC und Info extrahieren
- Duplikate erkennen
- Regeln anwenden oder Vorschlaege anzeigen
- Bargeldabhebungen als Transfer erkennen
- unzugeordnete Ausgaben sichtbar markieren
- Importlauf protokollieren

## Zielmonat im Import (FIN-031)

- Beim Bestaetigen eines Imports kann ein expliziter Zielmonat (`YYYY-MM`) fuer den gesamten Importlauf gesetzt werden.
- Der Zielmonat wird auf alle importierten Buchungen des Laufes als `effective_month_key` angewendet.
- Standard ohne Eingabe: Zielmonat wird aus den Buchungen des Imports erkannt.
- Bei ungueltigem Format wird eine klare Fehlermeldung angezeigt (`Zielmonat muss im Format YYYY-MM vorliegen.`).

## Duplikaterkennung

Moegliche Bestandteile einer stabilen Duplikatkennung:

- Konto
- Buchungstag
- Valutadatum
- Betrag
- Gegenpartei
- Verwendungszweck
- End-to-End-ID, falls vorhanden
- Mandatsreferenz, falls vorhanden

Wenn keine eindeutige Bank-ID vorhanden ist, sollte ein Hash aus mehreren Feldern gebildet werden.

Empfohlener Fingerprint fuer Sparkassen-CSV:

- `Auftragskonto`
- `Buchungstag`
- `Valutadatum`
- `Betrag`
- `Beguenstigter/Zahlungspflichtiger`
- `Verwendungszweck`
- `Kundenreferenz (End-to-End)` (falls vorhanden)
- `Mandatsreferenz` (falls vorhanden)

Praktisch: Die normalisierten Werte mit `|` joinen und als SHA-256 hashen.

## Sichtbare Import-Anzeigenamen (FIN-080)

Die gespeicherten Importdaten bleiben unveraendert. Insbesondere bleiben
`Verwendungszweck`, zusammengesetzte `description`, Import-Fingerprint und
Regel-Matching Rohtext-basiert erhalten.

Fuer sichtbare Listen wird eine separate Anzeigenamen-Heuristik genutzt:

- Karten-/Apple-Pay-Zahlungen bevorzugen `Beguenstigter/Zahlungspflichtiger`,
  weil der Verwendungszweck haeufig nur Zeit-, Karten- und Laufzeitfragmente
  enthaelt.
- SEPA-ELV-Zahlungen bevorzugen ebenfalls die Gegenpartei, wenn der
  Verwendungszweck nur technische ELV-/Referenzfragmente enthaelt.
- Ueberweisungen und Dauerauftraege behalten einen sinnvollen Verwendungszweck
  als Anzeigenamen.
- N26-/Fixkosten-Kontrollmuster behalten den Verwendungszweck als starken
  Anzeigenamen-Kandidaten, damit Kontrolltexte sichtbar und fuer bestehende
  Erkennung nachvollziehbar bleiben.
- Globale Import-Aliasse greifen nach dieser Grundheuristik weiter als letzte
  sichtbare Ueberschreibung.

## Bargeldabhebungen

Ziel:

- Eine Bargeldabhebung ist ein Transfer von Sparkasse zu Bargeld.
- Sie zaehlt nicht als Ausgabe in Kategorie-Auswertungen.
- Spaetere manuelle Barzahlungen werden als echte Ausgaben erfasst.

Erkennungsregeln muessen anhand echter Sparkassen-Beispieldaten gebaut werden.

Konkreter Nachweis im anonymisierten Sample:

- `docs/samples/sparkasse-umsatz-anonymized.csv` enthaelt eine Bargeldabhebung mit:
  - `Buchungstext = BARGELDAUSZAHLUNG`
  - `Verwendungszweck = GA NR 12345678 AUTOMAT STADT`
  - `Betrag = -50,00`

Klassifikation dieser Zeile im MVP:

- `transaction_type = transfer`
- Quelle: Sparkasse-Konto (`Auftragskonto`)
- Ziel: Bargeld-Konto (`Bargeld`)
- Keine Kategorie/Sonderkategorie-Zuordnung (weil keine Ausgabe, sondern Kontoumbuchung)

Moegliche Suchbegriffe in `Buchungstext` oder `Verwendungszweck`:

- Geldautomat
- Bargeldauszahlung
- GA NR
- ATM
- Kartenauszahlung

Zusatzregeln:

- Bei erkannter Bargeldabhebung als `transfer` modellieren (`Sparkasse -> Bargeld`).
- Keine Kategorie/Sonderkategorie-Zuordnung am Importpunkt setzen.
- Falls Regeln nicht eindeutig treffen: Buchung als unklare Import-Ausgabe sichtbar lassen statt hart zuzuordnen.

## N26-Kontrollmuster und Fixkosten-Kontrollsicht (FIN-024 bis FIN-029)

Aus der fachlichen Klaerung #26:

- Sparkasse -> N26 ist ein technischer Zahlungsweg fuer den Fixkostenblock.
- N26 ist kein eigenes Fachobjekt fuer normale Monatsausgaben.
- Erkennung bleibt transparent und nachvollziehbar, keine Blackbox.

Aktueller Stand:

- Es gibt eine vorinstallierte, editierbare Import-Regel:
  - Name: `N26 Sammeltransfer Kontrolle`
  - Pattern: `N26-Fix.`
  - Match-Feld: `Beschreibung`
  - Zieltyp: `transfer_cash` (technischer Transferhinweis)
  - Regelzweck: `fixed_cost_control` (keine Bargeldwirkung)
- Das Pattern ist in der Import-Regelverwaltung pflegbar und kann ohne Codeaenderung angepasst oder deaktiviert werden.
- Der Regelzweck bleibt auch nach Name-/Pattern-Aenderungen erhalten; nur Regeln
  mit Zweck `cash_transfer` duerfen beim Import-Confirm als Transfer `Sparkasse -> Bargeld`
  persistiert werden.
- Seit FIN-079 liegt diese Pflege als schlanker Einstellungsbereich fuer
  Import-Erkennung/Kontrollmuster unter `/einstellungen/import-regeln`; sie ist
  bewusst getrennt von `/einstellungen/import-aliase`, weil Aliasse nur
  Anzeigenamen aendern.
- Treffer werden in der Vorschau als `Fixkosten-Kontrolle: Kontrollmuster` markiert.
- Diese Treffer sind Kontrollhinweise und sollen nicht als normale variable Monatsausgaben behandelt werden.
- Die technische Umstellung auf das Monatsblock-Modell ist durch die FIN-Reihe `#56` bis `#60` umgesetzt.

## Import-Kontrollmarkierungen fuer Fixkosten (FIN-026)

Stand ab FIN-029:

- Neben dem N26-Hinweis gibt es jetzt eine zweite Erkennung:
  `Fixkosten-Kontrolle: Direktabbuchung (<Fixkostenname>)`.
- Direkte Sparkassen-Fixkostenmatches werden ueber eine einfache Heuristik erkannt:
  - Ausgabe-Betrag (absolut) entspricht dem geplanten Fixkostenbetrag
  - und Beschreibung/Gegenpartei enthalten Abbuchungsinfo oder Fixkostenname.
- Diese Treffer werden in der Import-Vorschau als eigene Fixkosten-Kontrollsicht dargestellt.
- Die Kontrollmarkierung ist bewusst getrennt von normalen Kategorie-/Sonderkategorie-Regelvorschlaegen.

## Bankanbindung spaeter

Moegliche Wege:

### FinTS/HBCI

Fuer Sparkasse in Deutschland oft realistisch. Nachteil: TAN/PSD2-Ablauf, Produkt-ID und sicherer Umgang mit Zugangsdaten.

Fuer eine private App ist das prinzipiell interessant, aber erst nach stabilem CSV/CAMT-Import.

### PSD2/Open-Banking-Anbieter

Moeglich ueber Anbieter wie GoCardless Bank Account Data oder finAPI. Vorteile sind standardisierte APIs. Nachteile sind Kosten, Abhaengigkeit vom Anbieter und Consent-Erneuerung.

### Entscheidung fuer den Start

Keine direkte Bankanbindung im MVP. Erst Import stabil bauen.

## Sicherheitsregeln

- Keine echten Bankzugangsdaten in Dateien, Tests oder Commits speichern.
- Beispielimporte anonymisieren.
- Exportdateien aus Downloads nicht ungefragt ins Projekt kopieren.
- Bei Testdaten realistische Struktur erhalten, aber Namen, IBANs, Kontonummern und sensible Verwendungszwecke anonymisieren.

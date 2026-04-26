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

## Bargeldabhebungen

Ziel:

- Eine Bargeldabhebung ist ein Transfer von Sparkasse zu Bargeld.
- Sie zaehlt nicht als Ausgabe in Kategorie-Auswertungen.
- Spaetere manuelle Barzahlungen werden als echte Ausgaben erfasst.

Erkennungsregeln muessen anhand echter Sparkassen-Beispieldaten gebaut werden.

Moegliche Suchbegriffe:

- Geldautomat
- Bargeldauszahlung
- GA NR
- ATM
- Kartenauszahlung

Diese Liste ist nur eine Vermutung und muss mit echten Exporten geprueft werden.

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

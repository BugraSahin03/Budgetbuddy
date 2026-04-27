# ADR 0003: Transaktions- und Betragskonventionen in SQLite

## Status

Angenommen

## Kontext

Fuer `FIN-002` muss das Datenmodell in SQLite umgesetzt werden. Dabei muss klar sein:

- wie Ausgaben, Einnahmen und Transfers strukturell unterschieden werden
- wie die Pflichtzuordnung von Ausgaben zu Kategorie oder Sonderbudget technisch garantiert wird
- wie Betraege gespeichert werden, damit Import, Berechnungen und Deduplizierung robust bleiben

## Entscheidung

Wir verwenden folgende Konventionen:

- Transaktionen haben den Typ `expense`, `income`, `transfer` oder `refund`.
- `expense` braucht genau eine Zuordnung zu `category_id` oder `special_budget_id`.
- `transfer` hat keine Kategorie/Sonderbudget-Zuordnung und ein `destination_account_id`.
- Betraege werden als `amount_cents` (signed Integer) gespeichert.
- Import-Deduplizierung wird vorbereitet mit:
  - `transactions.import_fingerprint` (unique, sofern vorhanden)
  - `imported_transactions.dedupe_fingerprint` (unique)

## Begruendung

- SQL-Constraints verhindern inkonsistente Buchungen bereits auf Datenbankebene.
- Signed-Cent-Speicherung vermeidet Float-Probleme und vereinfacht Importmapping.
- Transfers bleiben aus Ausgabenberechnungen herausnehmbar und dennoch kontenbezogen modelliert.
- Deduplizierung kann spaeter ohne Schemabruch im Importworkflow aktiviert werden.

## Konsequenzen

- Anwendungscode muss beim Schreiben von Transaktionen die Typregeln einhalten.
- Auswertungen verwenden `transaction_type`, um Transfers auszuschliessen.
- Bei Transfers muss die Balance-Logik Quell- und Zielkonto beachten.
- Zukuenftige Importtickets bauen auf vorhandenen Fingerprint-Feldern auf.

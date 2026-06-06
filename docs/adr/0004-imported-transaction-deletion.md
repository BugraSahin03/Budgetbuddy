# ADR 0004: Bestaetigtes Loeschen importierter Buchungen

## Status

Angenommen

## Kontext

Fuer `FIN-060` sollen importierte Monatsbuchungen im Editiermodus geloescht werden koennen. Bisher waren Import-Buchungen im Monatskontext bewusst geschuetzt: Importdaten blieben unveraendert, nur die Budgetzuordnung konnte bearbeitet werden.

Technisch sind importierte Buchungen normale Eintraege in `transactions` mit `source_type = 'import'`. Die Importhistorie in `imported_transactions` verweist per `ON DELETE CASCADE` auf diese Transaktion.

## Entscheidung

Importierte Buchungen duerfen im Monatskontext nach expliziter Bestaetigung geloescht werden.

- Die Loeschaktion ist auf `source_type = 'import'` und den aktuell geoeffneten `effective_month_key` begrenzt.
- Manuelle Buchungen verwenden weiterhin die bestehende manuelle Loeschaktion.
- Es wird kein Soft-Delete und kein separates Import-Archiv eingefuehrt.

## Begruendung

- Nutzerinnen und Nutzer brauchen eine direkte Korrekturmoeglichkeit, wenn ein importierter Eintrag in der Monatsliste fachlich entfernt werden soll.
- Eine eigene Import-Loeschaktion verhindert, dass die manuelle Transaktionslogik fuer Importdaten zweckentfremdet wird.
- Die explizite Bestaetigung reduziert versehentliche Datenverluste.

## Konsequenzen

- Durch `ON DELETE CASCADE` wird beim Loeschen der sichtbaren Transaktion auch der zugehoerige `imported_transactions`-Nachweis entfernt.
- Derselbe Bankumsatz kann bei einem spaeteren Re-Import wieder als neu erkannt werden, weil kein Soft-Delete-/Archiv-Fingerprint erhalten bleibt.
- Falls geloeschte Importbuchungen dauerhaft vom Re-Import ausgeschlossen werden sollen, braucht es ein eigenes Importstrategie-Ticket mit Schemaerweiterung.

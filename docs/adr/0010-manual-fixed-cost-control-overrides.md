# ADR 0010: Manuelle Fixkosten-Kontroll-Overrides

## Status

Akzeptiert

## Kontext

FIN-024 hatte Einzeltransaktionen als manuelle Fixkosten-Zuordnung aus dem Zielmodell entfernt. Seitdem ist die Fixkostenkontrolle eine transparente Kontrollsicht fuer automatisch erkannte Importtreffer, waehrend der geplante Fixkostenblock separat aus der Fixkostenliste kommt.

In der produktiven Nutzung entstehen trotzdem Faelle, in denen die automatische Import-/Fixkostenerkennung eine fachliche Fixkostenbuchung nicht erkennt oder einen Treffer faelschlich erkennt. FIN-100 verlangt deshalb eine stabile manuelle Korrekturmoeglichkeit, ohne die automatische Erkennung oder Fixkosten-Stammdatenpflege neu zu bauen.

## Entscheidung

Manuelle Entscheidungen werden nicht direkt an `transactions` gespeichert und nicht ueber die alte `fixed_cost_transaction_links`-Logik reaktiviert.

Stattdessen wird eine separate Tabelle `transaction_fixed_cost_control_overrides` eingefuehrt:

- `transaction_id` referenziert genau eine bestehende Transaktion und ist Primaerschluessel.
- `mode = 'include'` markiert eine geeignete Ausgabe manuell als Fixkosten-Kontrolltreffer.
- `mode = 'exclude'` blendet einen automatisch erkannten Fixkosten-Kontrolltreffer bewusst aus.
- Beim Loeschen einer Transaktion verschwindet der Override per `ON DELETE CASCADE`.

Die Monats-Fixkostenkontrolle setzt sich dadurch zusammen aus:

1. automatisch erkannten Import-/Fixkosten-Kontrolltreffern,
2. minus manuellen `exclude`-Overrides,
3. plus manuellen `include`-Overrides.

Manuell markierte Treffer werden in der Fixkostenkontrolle als `manuell` kenntlich gemacht. Kontrolltreffer bleiben weiterhin keine normalen variablen Monatsausgaben und werden aus der normalen Monatsbuchungsliste herausgerechnet.

## Konsequenzen

- Die automatische Erkennung bleibt unveraendert und kann spaeter weiter verbessert werden.
- Nutzerkorrekturen bleiben stabil, auch wenn die Kontrollsicht neu berechnet wird.
- Falsch positive automatische Treffer koennen nachvollziehbar unterdrueckt werden.
- Es entsteht bewusst keine neue Import-Regel und keine automatische Pattern-Erstellung aus manuellen Markierungen.
- Geschlossene Monate bleiben durch die bestehende Monatsabschluss-Sperre vor Override-Aenderungen geschuetzt.

## Alternativen

### Flag direkt auf `transactions`

Ein direktes Feld waere technisch einfach, wuerde aber fachliche Buchungsdaten mit einer Kontrollsicht-Entscheidung vermischen und haette keine saubere Unterscheidung zwischen manuellem Einschluss und Ausschluss automatischer Treffer.

### Reaktivierung von `fixed_cost_transaction_links`

Diese Struktur wurde mit FIN-025 fachlich stillgelegt. Eine Reaktivierung wuerde alte Zielmodellentscheidungen aufweichen und die Trennung zwischen geplantem Fixkostenblock und Kontrollsicht verwischen.

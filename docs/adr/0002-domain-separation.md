# ADR 0002: Kategorien, Sonderkategorien und Bargeld trennen

## Status

Angenommen

## Kontext

Der bisherige Excel-Planner enthaelt feste Kategorien und zusaetzliche Monatspositionen wie `Bali Flug`, `SSD` oder `Raspberry PI`. Diese sehen auf den ersten Blick wie Kategorien aus, sind fachlich aber Sonderkategorien fuer konkrete Ausgaben.

Zudem sollen Bargeldabhebungen nicht direkt als Ausgabe zaehlen, weil das abgehobene Bargeld spaeter fuer unterschiedliche Zwecke ausgegeben wird.

## Entscheidung

Wir trennen fachlich:

- feste Kategorien
- monatliche Sonderkategorien
- Fixkosten
- Bargeld als eigenes Konto
- Transfers zwischen Konten

Jede echte Ausgabe wird genau einer festen Kategorie oder genau einer Sonderkategorie zugeordnet. Transfers, z. B. Sparkasse zu Bargeld, sind keine Ausgaben.

## Begruendung

Diese Trennung verhindert falsche Auswertungen. Eine Bargeldabhebung wuerde sonst Budgets verzerren. Sonderkategorien wuerden als globale Kategorien langfristig unuebersichtlich werden.

## Konsequenzen

- Das Datenmodell braucht Transaktionstypen.
- Die UI muss Kategorien und Sonderkategorien getrennt anzeigen.
- Der Import muss Bargeldabhebungen als Transfer erkennen koennen.
- Auswertungen muessen Transfers aus echten Ausgaben ausschliessen.

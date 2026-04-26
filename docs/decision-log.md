# Decision Log und Erkenntnisse

Diese Datei sammelt neue Erkenntnisse, fachliche Klaerungen und kleinere Entscheidungen, die waehrend der Arbeit entstehen.

Wenn eine Entscheidung grundlegende Architektur, Datenmodell, Betrieb oder Sicherheitsverhalten aendert, gehoert sie zusaetzlich als ADR nach `docs/adr/`.

## Wann hier eintragen?

Eintrag erforderlich, wenn:

- eine neue fachliche Erkenntnis entsteht
- eine offene Frage geklaert wurde
- ein Ticket eine Annahme bestaetigt oder widerlegt
- eine Entscheidung mehrere zukuenftige Tickets beeinflusst
- ein technischer Trade-off bewusst gewaehlt wurde
- ein Importformat oder Bankverhalten besser verstanden wurde

Kein Eintrag erforderlich fuer:

- reine Tippfehler
- kleine UI-Politur
- mechanische Refactors ohne fachliche Wirkung
- Testfixes ohne neue Erkenntnis

## Wann ein ADR schreiben?

ADR schreiben, wenn die Entscheidung:

- schwer rueckgaengig zu machen ist
- das Datenmodell veraendert
- die Architektur veraendert
- Sicherheits- oder Datenschutzfolgen hat
- Betrieb/Deployment betrifft
- zentrale Fachlogik veraendert

ADR-Dateien liegen in `docs/adr/` und werden fortlaufend nummeriert.

## Eintragsformat

```md
## YYYY-MM-DD - Kurzer Titel

Quelle/Ticket: `FIN-XXX`

Erkenntnis/Entscheidung:

- ...

Auswirkung:

- ...

Folgeaktion:

- ...
```

## 2026-04-26 - Initialer Projektrahmen dokumentiert

Quelle/Ticket: Projektstart

Erkenntnis/Entscheidung:

- Projektwissen wird in Markdown-Dateien dokumentiert, damit mehrere Codex-Instanzen parallel arbeiten koennen.
- `docs/project-briefing.md` ist der zentrale Einstiegspunkt.
- `docs/backlog.md` ist die Ticketquelle.
- `docs/codex-workflow.md` beschreibt die Arbeitsweise.
- Grundlegende Entscheidungen kommen als ADR nach `docs/adr/`.
- Laufende Erkenntnisse kommen in dieses Decision Log.

Auswirkung:

- Neue Instanzen koennen sich ueber Dateien orientieren, ohne alten Chatverlauf zu kennen.

Folgeaktion:

- Bei jedem Ticket pruefen, ob neue Erkenntnisse oder Entscheidungen dokumentiert werden muessen.

## 2026-04-26 - FIN-001 umgesetzt

Quelle/Ticket: `FIN-001`

Erkenntnis/Entscheidung:

- Das Projektgrundgeruest existiert in `/Volumes/Intenso/Dev/Budgetbuddy`.
- Next.js mit TypeScript ist eingerichtet.
- SQLite-Basisclient, Vitest-Basistests und README-Startbefehle sind vorhanden.

Auswirkung:

- Die goldene Quelle ist ab jetzt `/Volumes/Intenso/Dev/Budgetbuddy`.
- Naechster sinnvoller Umsetzungsschritt ist `FIN-002`.

Folgeaktion:

- Weitere Datei- und Codeaenderungen in der goldenen Quelle vornehmen.

## 2026-04-26 - Sparkassen-CSV als MVP-Importformat

Quelle/Ticket: `FIN-010`

Erkenntnis/Entscheidung:

- Fuer den MVP wird Sparkassen-CSV als Startformat verwendet.
- CAMT/XML und direkte Bankanbindung bleiben spaetere Optionen.

Auswirkung:

- `FIN-010` fokussiert auf CSV statt allgemein CSV/CAMT.
- Importlogik kann zunaechst konkreter und kleiner gebaut werden.

Folgeaktion:

- Echten anonymisierten Sparkassen-CSV-Export fuer Analyse verwenden.

## 2026-04-26 - MVP-Kategorien und Bargeldstart geklaert

Quelle/Ticket: fachliche Klaerung

Erkenntnis/Entscheidung:

- Startliste fester Kategorien fuer den MVP: Einkauf, Tanken, Freizeit, Fitness, Parkhaus, Kleidung, Oeffis.
- Initialer Bargeldbestand fuer den Start ist `0 EUR`.
- Im MVP gibt es keine separate Kennzahl `gesparter Betrag`.

Auswirkung:

- Datenmodell und Seed-Daten koennen auf dieser Startliste aufbauen.
- Monatsdashboard soll im MVP ohne separate Spar-Kennzahl geplant werden.

Folgeaktion:

- Diese Regeln bei `FIN-002` und `FIN-013` beachten.

## 2026-04-26 - Reviewer-Gate fuer produktive Aenderungen eingefuehrt

Quelle/Ticket: Prozessentscheidung

Erkenntnis/Entscheidung:

- Produktive Aenderungen sollen durch eine Reviewer-Instanz freigegeben werden.
- Reviewer entscheiden mit `APPROVED`, `CHANGES_REQUESTED` oder `BLOCKED`.
- Nur bei `APPROVED` darf ein Ticket auf `done` gesetzt oder produktiviert werden.

Auswirkung:

- Implementer-Instanzen geben fertige Arbeit zuerst in den Review.
- Der Review-Prozess ist in `docs/review-workflow.md` dokumentiert.
- Prompt-Vorlagen fuer Reviewer und Feedback-Umsetzung stehen in `docs/prompts.md`.

Folgeaktion:

- Bei zukuenftigen Tickets Review-Status im Backlog oder in der Ticketnotiz festhalten.


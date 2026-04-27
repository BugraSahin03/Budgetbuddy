# Arbeitsweise fuer parallele Codex-Instanzen

Dieses Projekt soll parallel mit mehreren Codex-Instanzen bearbeitbar sein. Dieses Dokument beschreibt die Spielregeln.

## Einstieg fuer neue Instanzen

Vor jeder Arbeit lesen:

1. `docs/project-briefing.md`
2. `docs/backlog.md`
3. fuer fachliche Arbeit: `docs/domain-model.md`
4. fuer Importarbeit: `docs/import-and-bank-notes.md`
5. fuer laufende Erkenntnisse: `docs/decision-log.md`
6. fuer parallele Entwicklung: `docs/parallel-development.md`
7. fuer Review-Gates: `docs/review-workflow.md`
8. fuer Architekturentscheidungen: `docs/adr/`

## Ticket-Arbeit

Tickets stehen in `docs/backlog.md`.

Wenn eine Instanz an einem Ticket arbeitet:

1. Ticketstatus von `todo` auf `doing` setzen.
2. Branch/Worktree und Write-Scope klaeren.
3. Nur Dateien im Write-Scope anfassen.
4. Bei neuen Entscheidungen ein ADR oder eine Notiz im passenden Dokument ergaenzen.
5. Nach Umsetzung Akzeptanzkriterien pruefen.
6. Aenderungen an Reviewer uebergeben.
7. Ticket erst nach `APPROVED` auf `done` setzen.

Wenn parallel gearbeitet wird, sollte jede Instanz ein anderes Ticket uebernehmen.

Parallel laufende Tickets muessen getrennte Write-Scopes haben. Wenn zwei Tickets dieselben Dateien aendern muessen, sollten sie nacheinander oder in bewusst koordinierter Reihenfolge umgesetzt werden.

## Goldene Quelle

Alle produktiven Datei- und Codeaenderungen werden in `/Volumes/Intenso/Dev/Budgetbuddy` vorgenommen.

Andere Codex-Arbeitsordner koennen als Scratch/Analyse dienen, sind aber nicht die massgebliche Projektquelle.

Fuer parallele Implementierung ist pro Ticket ein eigener Branch und idealerweise ein eigener Git-Worktree vorgesehen. Details stehen in `docs/parallel-development.md`.

## Review-Gate

Produktive Aenderungen muessen durch eine Reviewer-Instanz freigegeben werden.

Empfohlener Ablauf:

1. Implementer bearbeitet Ticket.
2. Implementer prueft Akzeptanzkriterien.
3. Implementer uebergibt Aenderungen an Reviewer.
4. Reviewer liest `docs/review-workflow.md` und prueft die Aenderungen.
5. Nur bei `APPROVED` darf das Ticket auf `done` gesetzt oder produktiviert werden.
6. Bei `CHANGES_REQUESTED` geht das Feedback zurueck an den Implementer.
7. Bei `BLOCKED` wird der Blocker im Ticket dokumentiert.

Der Reviewer soll kritisch sein und Findings priorisieren, aber keine neuen Features in den Review hineinziehen.

## Dokumentationspflicht

Wenn eine Instanz fachliches Wissen entdeckt oder eine Entscheidung trifft, muss das in den Projektdateien landen.

Geeignete Orte:

- Produkt-/Zielwissen: `docs/project-briefing.md`
- Fachregeln und Datenmodell: `docs/domain-model.md`
- Import/Bank: `docs/import-and-bank-notes.md`
- Laufende Erkenntnisse und kleinere Entscheidungen: `docs/decision-log.md`
- Parallele Entwicklung und Worktree-Regeln: `docs/parallel-development.md`
- Review-Prozess: `docs/review-workflow.md`
- Tickets/Status: `docs/backlog.md`
- Architekturentscheidungen: `docs/adr/`

## Entscheidungsablauf

Wenn waehrend der Arbeit eine neue Erkenntnis entsteht oder eine Entscheidung getroffen wird:

1. Pruefen, ob sie nur das aktuelle Ticket betrifft oder das Projekt grundlegend beeinflusst.
2. Kleine Erkenntnis oder fachliche Klaerung in `docs/decision-log.md` eintragen.
3. Grundlegende Entscheidung zusaetzlich als neue ADR in `docs/adr/` dokumentieren.
4. Falls noetig, betroffene Fachdatei aktualisieren, z. B. `docs/domain-model.md`.
5. Falls neue Arbeit entsteht, Ticket in `docs/backlog.md` ergaenzen.

Grundlegend ist eine Entscheidung, wenn sie Datenmodell, Architektur, Sicherheitsverhalten, Deployment, Importstrategie oder zentrale Fachlogik veraendert.

## Umgang mit sensiblen Daten

Dieses Projekt verarbeitet private Finanzdaten. Deshalb:

- keine echten Bankzugangsdaten speichern
- keine echten Kontoauszuege ins Repo kopieren, ausser der Nutzer verlangt es explizit
- Beispieldaten anonymisieren
- keine Zugangsdaten in Logs, Tests oder Screenshots
- bei Importdateien nur Struktur und Feldnamen dokumentieren

## Code-Stil und Produktstil

Die App soll ruhig, klar und finanzfokussiert sein.

Bevorzugt:

- dichte, gut lesbare Tabellen
- klare Filter
- dezente Diagramme
- deutliche Warnungen bei Budgetueberschreitungen
- Desktop-first, spaeter responsive

Vermeiden:

- Marketing-Landingpage als Startscreen
- verspielte Optik
- ueberladene Kartenlayouts
- harte Budget-Sperren

## Reihenfolge der Umsetzung

Der naechste sinnvolle technische Start ist `FIN-001`.

Danach:

1. `FIN-002`
2. `FIN-003`
3. `FIN-004`
4. `FIN-005`
5. `FIN-006`
6. `FIN-007`
7. `FIN-008`
8. `FIN-010`
9. `FIN-011`
10. `FIN-013`

`FIN-010` braucht einen echten Sparkassen-Export als `.csv` oder `.xml/.camt`.

## Wenn etwas unklar ist

Nicht raten, wenn es fachlich Folgen hat. Stattdessen:

- offene Frage in `docs/project-briefing.md` oder im Ticket notieren
- bei kleinen technischen Details konservativ entscheiden
- existierende Entscheidungen respektieren

Wenn die Antwort spaeter gefunden wird, die Klaerung in `docs/decision-log.md` festhalten und die offene Frage entfernen oder aktualisieren.

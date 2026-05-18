# Arbeitsweise fuer parallele Codex-Instanzen

Dieses Projekt soll parallel mit mehreren Codex-Instanzen bearbeitbar sein. Dieses Dokument beschreibt die Spielregeln.

## Einstieg fuer neue Instanzen

Vor jeder Arbeit lesen:

1. `docs/project-briefing.md`
2. GitHub Issues (statt `docs/backlog.md`)
3. fuer fachliche Arbeit: `docs/domain-model.md`
4. fuer Importarbeit: `docs/import-and-bank-notes.md`
5. fuer laufende Erkenntnisse: `docs/decision-log.md`
6. fuer parallele Entwicklung: `docs/parallel-development.md`
7. fuer Review-Gates: `docs/review-workflow.md`
8. fuer Architekturentscheidungen: `docs/adr/`

## Ticket-Arbeit

Tickets werden in GitHub Issues gepflegt.

Wenn eine Instanz an einem Ticket arbeitet:

1. Im GitHub Issue FIN-Referenz, Write-Scope, Read-Scope, Nicht-Ziele und Abhaengigkeiten klaeren.
2. Von aktuellem `main` einen eigenen Ticket-Branch und eigenen Worktree anlegen.
3. Erst danach das Issue auf `status:doing` setzen.
4. Nur Dateien im Write-Scope anfassen.
5. Bei neuen Entscheidungen ein ADR oder eine Notiz im passenden Dokument ergaenzen.
6. Nach Umsetzung Akzeptanzkriterien pruefen.
7. PR gegen `main` mit `Closes #<issue>` erstellen und Aenderungen an Reviewer uebergeben.
8. Ticket erst nach `APPROVED` und Merge als `status:done` markieren und schliessen.
9. Nach dem Merge raeumt der Implementer Worktree sowie lokalen und Remote-Branch auf.

Auch kleine produktive Aenderungen folgen diesem Ablauf. Wenn zwei Tickets dieselben zentralen Dateien aendern muessen, werden sie standardmaessig nicht parallelisiert.

## Arbeitsraeume und Quelle der Wahrheit

`main` auf GitHub und im Hauptordner `/Volumes/Intenso/Dev/Budgetbuddy` ist die stabile Integrationsbasis.

Der Hauptordner bleibt dauerhaft auf `main` und dient als Kontrollraum, nicht als Implementierungsarbeitsplatz. Jede produktive Aenderung wird in einem eigenen Ticket-Worktree umgesetzt. Details stehen in `docs/parallel-development.md`.

## Review-Gate

Produktive Aenderungen muessen durch eine Reviewer-Instanz freigegeben werden.

Empfohlener Ablauf:

1. Implementer arbeitet im Ticket-Worktree.
2. Implementer prueft Akzeptanzkriterien.
3. Implementer erstellt PR gegen `main` und uebergibt Aenderungen an Reviewer.
4. Reviewer liest `docs/review-workflow.md`, prueft den PR-Diff gegen `main` und bildet seine Entscheidung formal im GitHub-PR ab:
   - `APPROVED` -> `Approve`
   - `CHANGES_REQUESTED` -> `Request changes` mit konkreten Findings
   - `BLOCKED` -> Blocker im PR und Issue dokumentieren, keine Freigabe
5. Nur bei formaler GitHub-PR-Freigabe (`Approve`) und gruener CI darf in `main` gemerged werden.
6. Bei `CHANGES_REQUESTED` geht das konkrete Review-Feedback zurueck an den Implementer.
7. Bei `BLOCKED` wird der Blocker im PR und Issue dokumentiert.
8. Nach erfolgreichem Merge raeumt der Implementer Worktree und Branch auf.

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
- Ticket-Artefakte: GitHub Issue + PR
- Architekturentscheidungen: `docs/adr/`

## Entscheidungsablauf

Wenn waehrend der Arbeit eine neue Erkenntnis entsteht oder eine Entscheidung getroffen wird:

1. Pruefen, ob sie nur das aktuelle Ticket betrifft oder das Projekt grundlegend beeinflusst.
2. Kleine Erkenntnis oder fachliche Klaerung in `docs/decision-log.md` eintragen.
3. Grundlegende Entscheidung zusaetzlich als neue ADR in `docs/adr/` dokumentieren.
4. Falls noetig, betroffene Fachdatei aktualisieren, z. B. `docs/domain-model.md`.
5. Falls neue Arbeit entsteht, neues GitHub Issue anlegen.

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

Priorisierung erfolgt ueber GitHub Labels und Milestones. Empfohlene Startreihenfolge bleibt:

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

- offene Frage in `docs/project-briefing.md` oder im Issue notieren
- bei kleinen technischen Details konservativ entscheiden
- existierende Entscheidungen respektieren

Wenn die Antwort spaeter gefunden wird, die Klaerung in `docs/decision-log.md` festhalten und die offene Frage entfernen oder aktualisieren.

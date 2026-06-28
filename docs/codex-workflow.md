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
8. fuer Dispatcher-/Queue-Regeln: `docs/dispatcher-workflow.md`
9. fuer Architekturentscheidungen: `docs/adr/`

## Ticket-Arbeit

Tickets werden in GitHub Issues gepflegt.

Wenn eine Instanz an einem Ticket arbeitet:

1. Im GitHub Issue FIN-Referenz, Write-Scope, Read-Scope, Nicht-Ziele und Abhaengigkeiten klaeren.
2. Von aktuellem `main` einen eigenen Ticket-Branch und eigenen Worktree anlegen.
3. Erst danach das Issue auf `status:doing` setzen.
4. Nur Dateien im Write-Scope anfassen.
5. Bei neuen Entscheidungen ein ADR oder eine Notiz im passenden Dokument ergaenzen.
6. Nach Umsetzung Akzeptanzkriterien pruefen.
7. PR gegen `main` mit `Closes #<issue>` erstellen.
8. Bei UI-/UX-nahen Tickets oder wenn das Issue es verlangt: laufende Preview aus dem Ticket-Worktree auf einem separaten Port bereitstellen und Issue auf `status:visual-check` setzen.
9. Nach Nutzerfreigabe im Visual Check oder wenn kein Visual Check noetig ist: Aenderungen an Reviewer uebergeben und Issue auf `status:review` setzen.
10. Reviewer setzt bei Freigabe das Issue auf `status:ready-to-merge`.
11. Ticket erst nach Merge als `status:done` markieren und schliessen.
12. Nach dem Merge raeumt der Implementer Worktree sowie lokalen und Remote-Branch auf.
13. Danach fragt der Implementer die Dispatcher-/Queue-Instanz nach dem naechsten sinnvollen Ticket.

Auch kleine produktive Aenderungen folgen diesem Ablauf. Wenn zwei Tickets dieselben zentralen Dateien aendern muessen, werden sie standardmaessig nicht parallelisiert.

## Arbeitsraeume und Quelle der Wahrheit

`main` auf GitHub und im Hauptordner `/Volumes/Intenso/Dev/Budgetbuddy` ist die stabile Integrationsbasis.

Der Hauptordner bleibt dauerhaft auf `main` und dient als Kontrollraum, nicht als Implementierungsarbeitsplatz. Jede produktive Aenderung wird in einem eigenen Ticket-Worktree umgesetzt. Details stehen in `docs/parallel-development.md`.


## Dispatcher-/Queue-Workflow

Fuer laufende Ticketarbeit gibt es eine Dispatcher-/Queue-Instanz. Details stehen in `docs/dispatcher-workflow.md`.

Kurzfassung:

- Entwickler fragen den Dispatcher nach dem naechsten Ticket.
- Der Dispatcher beachtet Prioritaeten, Abhaengigkeiten, Write-Scope-Konflikte und Visual-Check-Pflichten.
- Nach Umsetzung und ggf. Nutzer-Visual-Check schreibt der Entwickler direkt den Reviewer an.
- Reviewer-Feedback geht direkt an den Entwickler zurueck.
- Nach Abschluss fragt der Entwickler wieder den Dispatcher nach dem naechsten Ticket.
- Der Nutzer bleibt eingebunden bei Visual Check, fachlichen Entscheidungen, Blockern sowie unklaren Repo-/GitHub-Zustaenden.

Standard-Pairing fuer direkte Reviews:

- `Dev 1` -> `Reviewer 1`
- `Dev 2` -> `Reviewer 2`

Ausnahmen muessen im Ticket/PR-Handoff dokumentiert werden.

Repo-/GitHub-Unklarheiten werden nicht autonom entschieden. Dazu gehoeren unzugeordnete lokale Aenderungen, Dateien ausserhalb des Write-Scopes, falsche Branch-/PR-/Issue-Zuordnung, Merge-/Rebase-Konflikte oder widerspruechliche Labels/Status.

## Review-Gate

Produktive Aenderungen muessen durch eine Reviewer-Instanz freigegeben werden.

Empfohlener Ablauf:

1. Implementer arbeitet im Ticket-Worktree.
2. Implementer prueft Akzeptanzkriterien.
3. Implementer erstellt PR gegen `main`.
4. Bei UI-/UX-nahen Tickets stellt der Implementer vor dem Review eine lokale Preview bereit und setzt das Issue auf `status:visual-check`.
5. Der Nutzer prueft die laufende Preview produktlich im Browser. Bei Aenderungswuenschen bleibt das Issue in `status:visual-check` oder geht zurueck auf `status:doing`; bei Freigabe kommentiert der Nutzer sinngemaess `Visual Check OK`.
6. Erst danach uebergibt der Implementer Aenderungen an Reviewer und setzt das Issue auf `status:review`.
7. Reviewer liest `docs/review-workflow.md`, prueft den PR-Diff gegen `main` und dokumentiert seine Entscheidung als strukturierten PR-Kommentar:
   - `APPROVED` -> strukturierter Review-Kommentar im PR + Issue auf `status:ready-to-merge`
   - `CHANGES_REQUESTED` -> strukturierter PR-Kommentar mit konkreten Findings; Issue bleibt offen
   - `BLOCKED` -> Blocker im PR und Issue dokumentieren, keine Freigabe
8. Vor Merge ist der Review-Gate-Check Pflicht:
   - letzte formale PR-Review-Entscheidung pruefen (`Approve` oder `Request changes`)
   - bei letzter Entscheidung `CHANGES_REQUESTED` kein Merge
9. Nur bei `status:ready-to-merge`, letzter formaler Entscheidung `APPROVED` und gruener CI darf in `main` gemerged werden.
10. Bei `CHANGES_REQUESTED` geht das konkrete Review-Feedback direkt vom Reviewer zurueck an den Implementer.
11. Bei `BLOCKED` wird der Blocker im PR und Issue dokumentiert; fachliche oder Repo-/GitHub-Unklarheiten werden an den Nutzer eskaliert.
12. Nach erfolgreichem Merge raeumt der Implementer Worktree und Branch auf.
13. Danach fragt der Implementer die Dispatcher-/Queue-Instanz nach dem naechsten Ticket.

Der Reviewer soll kritisch sein und Findings priorisieren, aber keine neuen Features in den Review hineinziehen.

## Visual Check fuer UI-/UX-Tickets

Der Visual Check ist kein technischer Review und ersetzt nicht das Reviewer-Gate. Er ist ein vorgeschalteter Produktcheck durch den Nutzer.

Er wird genutzt, wenn ein Ticket sichtbare UI, Bedienfluss, Layout, Textwirkung oder Produktgefuehl veraendert. Fuer reine Parser-, Datenbank-, Dokumentations- oder kleine technische Bugfix-Tickets ist er optional.

Regeln:

- Der Hauptordner `/Volumes/Intenso/Dev/Budgetbuddy` bleibt auf `main` und kann dauerhaft als stabile Produktansicht auf `localhost:3000` laufen.
- Ticket-Previews laufen aus dem jeweiligen Ticket-Worktree auf einem anderen Port, z. B. `localhost:30121` fuer Issue `#121`.
- Der Implementer dokumentiert im Issue oder PR:
  - Worktree-Pfad
  - Branch
  - Preview-Port
  - kurze Testanleitung fuer den Nutzer
- Bei Nutzerfeedback arbeitet der Implementer im selben Ticket-Worktree nach.
- Erst nach `Visual Check OK` wird das Issue auf `status:review` gesetzt und an den Reviewer uebergeben.

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

## Test-Stabilitaet

Bei Test-Fixtures und Cleanup in DB-Tests gilt:

- Cleanup darf nie blind auf optional erzeugte Tabellen zugreifen.
- Vor `DELETE`/`UPDATE` auf spaeter erzeugte Tabellen immer Existenz pruefen (z. B. ueber `sqlite_master`) oder Setup idempotent sicherstellen.
- PRs mit Testaenderungen muessen explizit auf Robustheit gegen Reihenfolge-/Timing-Effekte geprueft werden.

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

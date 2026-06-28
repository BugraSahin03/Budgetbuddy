# Parallel Development Workflow

Dieses Dokument beschreibt den verbindlichen Arbeitsablauf fuer Ticket-Branches und Worktrees.

## Grundprinzip

Die stabile Integrationsbasis ist `main` im Hauptordner `/Volumes/Intenso/Dev/Budgetbuddy` und auf GitHub.

Jede produktive Arbeit wird isoliert umgesetzt:

- ein GitHub Issue
- ein Ticket-Branch
- ein eigener Git-Worktree
- ein klarer Write-Scope im Issue
- ein PR gegen `main`
- ein Review nur gegen den Diff dieses Tickets

Der Hauptordner bleibt auf `main`. Dort wird nicht direkt implementiert.

## Standardmodell

### Branch und Worktree pro Issue

Jedes Ticket bekommt einen Branch im Schema:

```text
issue/<github-nummer>-fin-<slug>
```

und einen Worktree im Schema:

```text
../Budgetbuddy-issue-<github-nummer>
```

Beispiel:

```bash
git switch main
git pull --ff-only origin main
git worktree add ../Budgetbuddy-issue-57 -b issue/57-fin-011-import-workflow main
```

Danach wird im neuen Worktree gearbeitet:

```bash
cd ../Budgetbuddy-issue-57
```

Auch wenn nur eine Instanz arbeitet, gilt derselbe Ablauf.

## Issue-Setup vor Arbeitsbeginn

Bevor ein Ticket auf `status:doing` gesetzt wird, muss das GitHub Issue enthalten:

- FIN-Referenz
- Write-Scope
- Read-Scope
- explizite Nicht-Ziele
- Abhaengigkeiten

Erst wenn Branch und Worktree existieren, wird das Issue auf `status:doing` gesetzt.

### Write-Scope

Der Write-Scope definiert, welche Dateien oder Ordner ein Implementer aendern darf.

Beispiel:

```text
Write-Scope:
- src/import/**
- tests/import-*.test.ts
- docs/import-and-bank-notes.md
- docs/decision-log.md
```

Wenn waehrend der Umsetzung ein anderer Bereich notwendig wird, stoppt der Implementer und dokumentiert die Scope-Erweiterung im Issue, bevor er weiterarbeitet.

### Read-Scope

Der Read-Scope kann breiter sein. Ein Agent darf Projektdateien lesen, um Kontext zu verstehen, soll aber nur im Write-Scope editieren.

## Umgang mit gemeinsamen Dateien

Konfliktanfaellig sind insbesondere:

- `docs/decision-log.md`
- `docs/project-briefing.md`
- ADRs
- zentrale Konfigurationen

Regeln:

- Der Write-Scope im Issue ist fuehrend.
- `docs/decision-log.md` darf ergaenzt werden, aber nur mit einem eigenen datierten Abschnitt.
- ADRs werden nur angelegt, wenn eine grundlegende Entscheidung getroffen wurde.
- Wenn zwei Tickets dieselbe zentrale Datei stark veraendern muessen, werden sie standardmaessig nicht parallelisiert.

## Implementer-Ablauf

1. `docs/project-briefing.md`, `docs/codex-workflow.md` und dieses Dokument lesen.
2. GitHub Issue inkl. Write-Scope pruefen.
3. Von aktuellem `main` Branch und Worktree anlegen.
4. Issue auf `status:doing` setzen.
5. Nur Dateien im Write-Scope aendern.
6. Akzeptanzkriterien pruefen.
7. Tests/Build/Linting ausfuehren, soweit sinnvoll.
8. PR gegen `main` mit `Closes #<issue>` erstellen.
9. Bei UI-/UX-nahen Tickets oder wenn das Issue es verlangt: Preview aus dem Ticket-Worktree auf separatem Port starten, Handoff fuer den Nutzer schreiben und Issue auf `status:visual-check` setzen.
10. Nach `Visual Check OK` oder wenn kein Visual Check noetig ist: Handoff direkt an den Reviewer schreiben und Issue auf `status:review` setzen.
11. Nach Reviewer-Approval, Merge und Cleanup die Dispatcher-/Queue-Instanz nach dem naechsten Ticket fragen.

## Visual Check vor Review

Der Visual Check ist ein optionales Produkt-/UI-Gate zwischen Implementer und Reviewer.

Ziel:

- Der Nutzer kann sichtbare Aenderungen in einer echten laufenden App pruefen.
- Geschmack, Bediengefuehl, Layout und Texte werden vor dem formalen Review korrigiert.
- Der Reviewer bleibt Qualitaetsgate fuer Code, Scope, Tests, Sicherheit und fachliche Korrektheit.

Wann nutzen:

- standardmaessig fuer UI-/UX-nahe Tickets
- fuer Monatsansicht, Dashboard, Navigation, Dialoge und sichtbare Produktflows
- optional fuer technische Tickets nur auf expliziten Wunsch

Statuslauf fuer solche Tickets:

```text
status:todo -> status:doing -> status:visual-check -> status:review -> status:ready-to-merge -> status:done
```

Preview-Port-Regel:

- Der Hauptordner `/Volumes/Intenso/Dev/Budgetbuddy` bleibt auf `main`.
- `localhost:3000` ist fuer die stabile lokale Produktansicht auf `main` reserviert, sofern der Nutzer sie laufen hat.
- Ticket-Worktrees starten ihren Dev-Server auf einem anderen freien Port.
- Empfohlenes Schema: `3000 + Issue-Nummer`, falls frei und sinnvoll, z. B. Issue `#121` -> `localhost:3121`; alternativ ein klar dokumentierter freier Port wie `localhost:30121`.
- Der Port wird im Issue/PR-Handoff dokumentiert.

Handoff fuer Visual Check:

```md
Issue: #121 ([FIN-060])
Branch: issue/121-fin-060-monatsbuchungen-editiermodus
Worktree: ../Budgetbuddy-issue-121
Preview: http://localhost:3121

Bitte pruefen:
- ...

Bekannte Restpunkte:
- ...
```

Wenn der Nutzer Aenderungen wuenscht, bleibt das Issue in `status:visual-check` oder geht zurueck auf `status:doing`. Erst nach einem klaren `Visual Check OK` geht es an den Reviewer.

## Reviewer-Ablauf

Der Reviewer prueft standardmaessig den PR-Diff gegen `main`, nicht das ganze Projekt.

Pflichtpruefung:

```bash
git diff --name-only main...HEAD
git diff main...HEAD
```

Der Reviewer prueft:

- Sind alle geaenderten Dateien im Write-Scope?
- Wenn nicht: Gibt es eine dokumentierte und akzeptierte Begruendung?
- Erfuellt der Diff die Akzeptanzkriterien des Tickets?
- Enthalten die Aenderungen Scope Creep?
- Sind Tests/Build/Linting passend gelaufen?
- Wurden neue Erkenntnisse/Entscheidungen dokumentiert?

Wenn Aenderungen ausserhalb des Write-Scopes ohne Begruendung auftauchen, ist die Standardentscheidung:

```text
Entscheidung: CHANGES_REQUESTED
```

## Dispatcher-/Queue-Instanz

Der Dispatcher ist die Koordinationsinstanz fuer freie Entwickler. Details stehen in `docs/dispatcher-workflow.md`.

Entwickler fragen den Dispatcher nach dem naechsten Ticket, statt den Nutzer fuer jeden Folgeschritt einzubinden. Der Dispatcher beachtet Prioritaeten, Abhaengigkeiten, Write-Scope-Konflikte, Visual-Check-Pflichten und offene Repo-/GitHub-Zustaende.


Standard-Pairing:

- `Dev 1` arbeitet mit `Reviewer 1`.
- `Dev 2` arbeitet mit `Reviewer 2`.

Dieses Pairing trennt parallele Arbeitsstraenge. Abweichungen muessen dokumentiert werden.

Unklare lokale Aenderungen, Scope-Verletzungen, falsche Branch-/PR-/Issue-Zuordnungen und Merge-/Rebase-Entscheidungen werden weiterhin an den Nutzer eskaliert.

## Handoff an Reviewer

Implementer liefern am Ende direkt an den Reviewer:

```md
Issue: #57 ([FIN-011])
Branch: issue/57-fin-011-import-workflow

Geaenderte Dateien:
- ...

Ausgefuehrte Checks:
- `npm run test`
- `npm run lint`

Dokumentation:
- Decision Log aktualisiert: ja/nein
- ADR erstellt: ja/nein

Bekannte Restpunkte:
- ...
```

Der Write-Scope wird im Issue gepflegt und im Handoff nur bei Abweichungen erneut erwaehnt.

Bei Tickets mit Visual Check muss im Reviewer-Handoff zusaetzlich stehen, ob der Nutzer den Visual Check freigegeben hat. Ausserdem muss der Handoff den Repo-/GitHub-Zustand nennen: Branch eindeutig, Aenderungen im Write-Scope, keine unzugeordneten lokalen Aenderungen, Issue/PR-Zuordnung eindeutig.

## Integration und Cleanup nach Freigabe

Nur nach `APPROVED`:

1. Branch gegen aktuellen `main` aktualisieren.
2. Falls Konflikte entstehen: zurueck an Implementer.
3. Checks erneut ausfuehren.
4. PR in `main` mergen, sobald das Issue auf `status:ready-to-merge` steht und CI gruen ist.
5. Issue auf `status:done` setzen und schliessen.
6. Implementer loescht den Ticket-Worktree sowie lokalen und Remote-Branch.

Beispiel nach erfolgreichem Merge:

```bash
cd /Volumes/Intenso/Dev/Budgetbuddy
git switch main
git pull --ff-only origin main
git worktree remove ../Budgetbuddy-issue-57
git branch -d issue/57-fin-011-import-workflow
git push origin --delete issue/57-fin-011-import-workflow
```

## Ausnahmen

Gestapelte Branches sind kein Standardworkflow. Wenn eine Abhaengigkeit sie ausnahmsweise erfordert, muss dies im Issue und im PR klar begruendet werden; Reviewer pruefen dann explizit die gewaehlte Base.

## Gute Parallelisierung

Gut parallelisierbar:

- UI-Grundlayout vs. Importanalyse
- Dokumentation vs. isolierte Tests
- Kategorien-UI vs. Sparkassen-CSV-Parser, wenn Datenmodell stabil ist
- Backup-Konzept vs. Trend-Auswertung, wenn sie keine gleichen Dateien anfassen

Nicht gut parallelisierbar:

- zwei Tickets am Datenbankschema
- zwei Tickets am gleichen Dashboard
- UI-Ticket und CSS-Refactor an denselben Komponenten
- Importworkflow und Datenmodell, wenn das Schema noch nicht freigegeben ist

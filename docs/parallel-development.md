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
9. Handoff fuer Reviewer schreiben und Issue auf `status:review` setzen.

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

## Handoff an Reviewer

Implementer liefern am Ende:

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

## Integration und Cleanup nach Freigabe

Nur nach `APPROVED`:

1. Branch gegen aktuellen `main` aktualisieren.
2. Falls Konflikte entstehen: zurueck an Implementer.
3. Checks erneut ausfuehren.
4. PR in `main` mergen.
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

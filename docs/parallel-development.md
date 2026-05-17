# Parallel Development Workflow

Dieses Dokument beschreibt, wie mehrere Agents parallel arbeiten koennen, ohne sich gegenseitig Aenderungen zu ueberschreiben oder Reviews zu vermischen.

## Grundprinzip

Die goldene Quelle ist `/Volumes/Intenso/Dev/Budgetbuddy`.

Parallel gearbeitet wird nicht direkt wild im gleichen Arbeitsbaum, sondern pro Ticket isoliert:

- ein GitHub Issue
- ein Branch
- bei gleichzeitiger Arbeit zwingend ein eigener Git-Worktree
- ein klarer Write-Scope
- ein Review nur gegen den Diff dieses Tickets

## Empfohlenes Modell

### Integration Branch

Der stabile Integrationsstand liegt auf dem Hauptbranch, z. B. `main`.

Auf diesem Branch sollten keine Implementer direkt entwickeln. Er ist die Basis fuer neue Ticket-Branches und die Zielbasis fuer freigegebene Aenderungen.

### Ticket Branch

Jedes Ticket bekommt einen eigenen Branch:

```text
issue/<github-nummer>-fin-<slug>
```

Beispiele:

```text
issue/42-fin-003-navigation-layout
issue/57-fin-011-import-workflow
issue/61-fin-016-backup-konzept
```

### Worktree pro Agent

Wenn mehrere Agents wirklich gleichzeitig arbeiten, muss jeder Agent in einem eigenen Worktree arbeiten.

Beispiel:

```bash
git worktree add ../Budgetbuddy-issue-42 -b issue/42-fin-003-navigation-layout main
git worktree add ../Budgetbuddy-issue-57 -b issue/57-fin-011-import-workflow main
```

Damit haben Agents getrennte Arbeitsordner, aber teilen denselben Git-Verlauf.

## Ticket Ownership

Bevor ein Ticket umgesetzt wird, sollte der erlaubte Aenderungsbereich festgelegt werden.

Jedes aktive Ticket braucht:

- GitHub-Issue-ID und FIN-Referenz
- Branchname
- Basis-Commit oder Basis-Branch
- Write-Scope
- Read-Scope
- explizite Nicht-Ziele
- Abhaengigkeiten zu anderen Tickets

### Write-Scope

Der Write-Scope definiert, welche Dateien oder Ordner ein Implementer aendern darf.

Beispiel:

```text
Issue: #57 ([FIN-011])
Branch: issue/57-fin-011-import-workflow
Write-Scope:
- src/import/**
- tests/import-*.test.ts
- docs/import-and-bank-notes.md
- docs/decision-log.md
Nicht erlaubt:
- app/settings/**
- docs/review-workflow.md
```

Wenn waehrend der Umsetzung ein anderer Bereich notwendig wird, soll der Implementer stoppen und die Scope-Erweiterung dokumentieren oder bestaetigen lassen.

### Read-Scope

Der Read-Scope kann breiter sein. Ein Agent darf Projektdateien lesen, um Kontext zu verstehen, soll aber nur im Write-Scope editieren.

## Umgang mit gemeinsamen Dateien

Gemeinsame Dateien sind konfliktanfaellig:

- `docs/decision-log.md`
- `docs/project-briefing.md`
- ADRs
- zentrale Konfigurationen

Regel:

- Ticketstatus, Prioritaet und Freigabe laufen ueber GitHub Issue-Labels und PR-Review.
- `docs/decision-log.md` darf durch Ticket-Branches ergaenzt werden, aber nur mit einem eigenen datierten Abschnitt.
- ADRs werden nur angelegt, wenn eine grundlegende Entscheidung getroffen wurde.
- Wenn zwei Tickets dieselbe zentrale Datei stark veraendern muessen, sollten sie nicht parallel laufen.

## Implementer-Ablauf

1. `docs/project-briefing.md`, `docs/codex-workflow.md` und dieses Dokument lesen.
2. Issue auf `status:doing` setzen.
3. Eigenen Branch/Worktree nutzen.
4. Nur Dateien im Write-Scope aendern.
5. Akzeptanzkriterien pruefen.
6. Tests/Build/Linting ausfuehren, soweit sinnvoll.
7. PR mit `Closes #<issue>` erstellen.
8. Handoff fuer Reviewer schreiben und Label auf `status:review` setzen.

## Reviewer-Ablauf

Der Reviewer reviewed nur den Ticket-Diff, nicht das ganze Projekt.

Pflichtpruefung:

```bash
git diff --name-only <base>...HEAD
git diff <base>...HEAD
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

Implementer sollen am Ende diese Informationen liefern:

```md
Issue: #57 ([FIN-011])
Branch: issue/57-fin-011-import-workflow
Base: <commit-oder-branch>

Write-Scope:
- ...

Geaenderte Dateien:
- ...

Akzeptanzkriterien:
- [x] ...
- [ ] ...

Ausgefuehrte Checks:
- `npm run test`
- `npm run lint`

Dokumentation:
- Decision Log aktualisiert: ja/nein
- ADR erstellt: ja/nein

Bekannte Restpunkte:
- ...
```

## Integration nach Freigabe

Nur nach `APPROVED`:

1. Branch gegen aktuellen Integrationsstand aktualisieren.
2. Falls Konflikte entstehen: zurueck an Implementer.
3. Checks erneut ausfuehren.
4. Branch in Hauptbranch mergen.
5. Issue auf `status:done` setzen und schliessen.

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

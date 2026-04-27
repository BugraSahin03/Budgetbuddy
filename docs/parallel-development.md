# Parallel Development Workflow

Dieses Dokument beschreibt, wie mehrere Agents parallel arbeiten koennen, ohne sich gegenseitig Aenderungen zu ueberschreiben oder Reviews zu vermischen.

## Grundprinzip

Die goldene Quelle ist `/Volumes/Intenso/Dev/Budgetbuddy`.

Parallel gearbeitet wird nicht direkt wild im gleichen Arbeitsbaum, sondern pro Ticket isoliert:

- ein Ticket
- ein Branch
- optional ein eigener Git-Worktree
- ein klarer Write-Scope
- ein Review nur gegen den Diff dieses Tickets

## Empfohlenes Modell

### Integration Branch

Der stabile Integrationsstand liegt auf dem Hauptbranch, z. B. `main`.

Auf diesem Branch sollten keine Implementer direkt entwickeln. Er ist die Basis fuer neue Ticket-Branches und die Zielbasis fuer freigegebene Aenderungen.

### Ticket Branch

Jedes Ticket bekommt einen eigenen Branch:

```text
ticket/FIN-XXX-kurzer-name
```

Beispiele:

```text
ticket/FIN-002-datenmodell
ticket/FIN-003-navigation-layout
ticket/FIN-010-sparkassen-csv-analyse
```

### Worktree pro Agent

Wenn mehrere Agents wirklich gleichzeitig arbeiten, sollte jeder Agent in einem eigenen Worktree arbeiten.

Beispiel:

```bash
git worktree add ../Budgetbuddy-FIN-002 -b ticket/FIN-002-datenmodell main
git worktree add ../Budgetbuddy-FIN-003 -b ticket/FIN-003-navigation-layout main
```

Damit haben Agents getrennte Arbeitsordner, aber teilen denselben Git-Verlauf.

## Ticket Ownership

Bevor ein Ticket umgesetzt wird, sollte der erlaubte Aenderungsbereich festgelegt werden.

Jedes aktive Ticket braucht:

- Ticket-ID
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
Ticket: FIN-002
Branch: ticket/FIN-002-datenmodell
Write-Scope:
- src/db/**
- tests/db-*.test.ts
- docs/domain-model.md
- docs/decision-log.md
Nicht erlaubt:
- app/**
- docs/review-workflow.md
```

Wenn waehrend der Umsetzung ein anderer Bereich notwendig wird, soll der Implementer stoppen und die Scope-Erweiterung dokumentieren oder bestaetigen lassen.

### Read-Scope

Der Read-Scope kann breiter sein. Ein Agent darf Projektdateien lesen, um Kontext zu verstehen, soll aber nur im Write-Scope editieren.

## Umgang mit gemeinsamen Dateien

Gemeinsame Dateien sind konfliktanfaellig:

- `docs/backlog.md`
- `docs/decision-log.md`
- `docs/project-briefing.md`
- ADRs
- zentrale Konfigurationen

Regel:

- `docs/backlog.md` wird moeglichst durch eine koordinierende Instanz oder im Rahmen der Ticket-Uebergabe aktualisiert.
- `docs/decision-log.md` darf durch Ticket-Branches ergaenzt werden, aber nur mit einem eigenen datierten Abschnitt.
- ADRs werden nur angelegt, wenn eine grundlegende Entscheidung getroffen wurde.
- Wenn zwei Tickets dieselbe zentrale Datei stark veraendern muessen, sollten sie nicht parallel laufen.

## Implementer-Ablauf

1. `docs/project-briefing.md`, `docs/backlog.md`, `docs/codex-workflow.md` und dieses Dokument lesen.
2. Ticket und Write-Scope bestaetigen.
3. Eigenen Branch/Worktree nutzen.
4. Nur Dateien im Write-Scope aendern.
5. Akzeptanzkriterien pruefen.
6. Tests/Build/Linting ausfuehren, soweit sinnvoll.
7. Handoff fuer Reviewer schreiben.
8. Ticket nicht eigenmaechtig auf `done` setzen.

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
Ticket: FIN-XXX
Branch: ticket/FIN-XXX-kurzer-name
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
5. Ticket auf `done` setzen.

## Gute Parallelisierung

Gut parallelisierbar:

- UI-Grundlayout vs. Importanalyse
- Dokumentation vs. isolierte Tests
- Kategorien-UI vs. Sparkassen-CSV-Parser, wenn Datenmodell stabil ist
- Backup-Konzept vs. Trend-Auswertung, wenn sie keine gleichen Dateien anfassen

Nicht gut parallelisierbar:

- zwei Tickets am Datenbankschema
- zwei Tickets am gleichen Dashboard
- parallele Umbauten an `docs/backlog.md`
- UI-Ticket und CSS-Refactor an denselben Komponenten
- Importworkflow und Datenmodell, wenn das Schema noch nicht freigegeben ist


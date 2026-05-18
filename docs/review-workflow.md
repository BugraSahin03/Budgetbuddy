# Review-Workflow

Alle produktiven Aenderungen sollen durch eine Reviewer-Instanz gehen, bevor sie als abgeschlossen gelten.

## Ziel

Der Reviewer ist die letzte Qualitaetsinstanz. Er prueft, ob eine Implementer-Instanz das Ticket korrekt, sicher und im Sinne des Projekts umgesetzt hat.

## Rollen

### Implementer

- bearbeitet ein GitHub Issue
- setzt den Issue-Status auf `status:doing`
- arbeitet immer auf einem eigenen Ticket-Branch und eigenen Worktree
- haelt den vereinbarten Write-Scope ein
- implementiert die Aenderung
- prueft Akzeptanzkriterien
- dokumentiert Erkenntnisse und Entscheidungen
- uebergibt die Aenderungen per PR an den Reviewer

### Reviewer

- liest Projektkontext und Ticket
- prueft die Aenderungen kritisch
- gibt klares Feedback
- entscheidet, ob die Aenderungen freigegeben werden
- bildet jede Entscheidung sichtbar im GitHub-PR ab:
  - `APPROVED` mit `Approve`
  - `CHANGES_REQUESTED` mit `Request changes` und konkreten Findings
  - `BLOCKED` durch dokumentierten Blocker im PR und Issue ohne Freigabe

## Reviewer-Entscheidungen

Der Reviewer muss am Ende genau eine Entscheidung treffen:

- `APPROVED`: Aenderungen sind freigegeben.
- `CHANGES_REQUESTED`: Aenderungen muessen vom Implementer angepasst werden.
- `BLOCKED`: Review kann nicht sinnvoll abgeschlossen werden, z. B. wegen fehlender Infos, kaputtem Setup oder unklarem Ticket.

Nur bei formaler GitHub-PR-Freigabe (`Approve`) und gruener CI darf in `main` gemerged werden. Ein Kommentar oder Chat-Hinweis allein gilt nicht als Freigabe.

Bei `CHANGES_REQUESTED` muss der Reviewer im GitHub-PR eine formale Review mit `Request changes` abgeben und konkret dokumentieren, was geaendert werden muss. Bei `BLOCKED` dokumentiert der Reviewer den Blocker im PR und im Issue; es gibt keine Freigabe.

## Pruefkriterien

Der Reviewer prueft:

- Erfuellt die Aenderung das Ticket und die Akzeptanzkriterien?
- Wurde nur der noetige Scope geaendert?
- Entspricht der Diff dem vereinbarten Write-Scope aus `docs/parallel-development.md`?
- Stimmen die Aenderungen mit `docs/project-briefing.md`, `docs/domain-model.md` und ADRs ueberein?
- Wurden neue Erkenntnisse in `docs/decision-log.md` dokumentiert?
- Wurde bei grundlegenden Entscheidungen eine ADR angelegt?
- Sind sensible Finanzdaten, Bankdaten oder Zugangsdaten vermieden?
- Sind Tests, Linting oder Build ausgefuehrt, soweit sinnvoll?
- Gibt es offensichtliche Bugs, Datenverlust-Risiken oder falsche Finanzlogik?
- Ist die UI ruhig, klar, desktop-first und passend fuer eine Finanz-App?
- Werden Transfers, Kategorien und Sonderbudgets korrekt getrennt?

## Diff-Grenze

Der Reviewer reviewed standardmaessig nur den PR-Diff des Tickets gegen `main`.

Pflicht:

```bash
git diff --name-only main...HEAD
git diff main...HEAD
```

Wenn der Diff Dateien ausserhalb des vereinbarten Write-Scopes enthaelt und keine Begruendung vorliegt, soll der Reviewer `CHANGES_REQUESTED` geben.

Gestapelte Branches sind nur ein begruendeter Ausnahmefall. Dann muss die abweichende Base im Issue und PR dokumentiert sein und vom Reviewer explizit beruecksichtigt werden.

Der Reviewer soll keine fremden oder bereits integrierten Aenderungen bewerten, die nicht Teil des Ticket-Diffs sind.

## Feedback-Format

Bei Problemen soll der Reviewer konkrete, umsetzbare Punkte nennen. Bei `CHANGES_REQUESTED` werden diese Punkte zusaetzlich in der formalen GitHub-PR-Review mit `Request changes` dokumentiert:

```md
Entscheidung: CHANGES_REQUESTED

Findings:

1. [P1] Kurzer Titel
   Datei: `pfad/zur/datei`
   Problem: ...
   Erwartung: ...

2. [P2] Kurzer Titel
   Datei: `pfad/zur/datei`
   Problem: ...
   Erwartung: ...

Freigabe-Bedingung:

- ...
```

Bei Freigabe:

Der Reviewer gibt zusaetzlich im GitHub-PR eine formale Review mit `Approve` ab.

```md
Entscheidung: APPROVED

Geprueft:

- Ticket-Akzeptanzkriterien
- relevante Projektregeln
- Tests/Build soweit vorhanden

Rest-Risiko:

- ...
```

## Status im Issue

Empfohlener Ablauf:

1. Implementer legt Branch und Worktree an.
2. Implementer setzt Issue auf `status:doing`.
3. Nach Umsetzung setzt Implementer auf `status:review` und erstellt/aktualisiert den PR gegen `main`.
4. Reviewer prueft und bildet die Entscheidung im GitHub-PR ab:
   - `APPROVED` -> `Approve`
   - `CHANGES_REQUESTED` -> `Request changes` mit konkreten Findings
   - `BLOCKED` -> Blocker im PR und Issue dokumentieren
5. Bei formaler PR-Freigabe (`Approve`): Merge nach `main`, dann Issue auf `status:done` setzen und schliessen.
6. Implementer loescht danach Worktree sowie lokalen und Remote-Branch.
7. Bei `CHANGES_REQUESTED`: Issue bleibt offen und geht mit den im PR dokumentierten Findings zurueck an den Implementer.
8. Bei `BLOCKED`: Issue auf `status:blocked` setzen oder Blocker im Issue dokumentieren; keine Freigabe.

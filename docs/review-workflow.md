# Review-Workflow

Alle produktiven Aenderungen sollen durch eine Reviewer-Instanz gehen, bevor sie als abgeschlossen gelten.

## Ziel

Der Reviewer ist die letzte Qualitaetsinstanz. Er prueft, ob eine Implementer-Instanz das Ticket korrekt, sicher und im Sinne des Projekts umgesetzt hat.

## Rollen

### Implementer

- bearbeitet ein Ticket
- setzt den Ticketstatus auf `doing`
- implementiert die Aenderung
- prueft Akzeptanzkriterien
- dokumentiert Erkenntnisse und Entscheidungen
- uebergibt die Aenderungen an den Reviewer

### Reviewer

- liest Projektkontext und Ticket
- prueft die Aenderungen kritisch
- gibt klares Feedback
- entscheidet, ob die Aenderungen freigegeben werden

## Reviewer-Entscheidungen

Der Reviewer muss am Ende genau eine Entscheidung treffen:

- `APPROVED`: Aenderungen sind freigegeben.
- `CHANGES_REQUESTED`: Aenderungen muessen vom Implementer angepasst werden.
- `BLOCKED`: Review kann nicht sinnvoll abgeschlossen werden, z. B. wegen fehlender Infos, kaputtem Setup oder unklarem Ticket.

Nur bei `APPROVED` darf ein Ticket auf `done` gesetzt oder produktiviert werden.

## Pruefkriterien

Der Reviewer prueft:

- Erfuellt die Aenderung das Ticket und die Akzeptanzkriterien?
- Wurde nur der noetige Scope geaendert?
- Stimmen die Aenderungen mit `docs/project-briefing.md`, `docs/domain-model.md` und ADRs ueberein?
- Wurden neue Erkenntnisse in `docs/decision-log.md` dokumentiert?
- Wurde bei grundlegenden Entscheidungen eine ADR angelegt?
- Sind sensible Finanzdaten, Bankdaten oder Zugangsdaten vermieden?
- Sind Tests, Linting oder Build ausgefuehrt, soweit sinnvoll?
- Gibt es offensichtliche Bugs, Datenverlust-Risiken oder falsche Finanzlogik?
- Ist die UI ruhig, klar, desktop-first und passend fuer eine Finanz-App?
- Werden Transfers, Kategorien und Sonderbudgets korrekt getrennt?

## Feedback-Format

Bei Problemen soll der Reviewer konkrete, umsetzbare Punkte nennen:

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

```md
Entscheidung: APPROVED

Geprueft:

- Ticket-Akzeptanzkriterien
- relevante Projektregeln
- Tests/Build soweit vorhanden

Rest-Risiko:

- ...
```

## Status im Backlog

Empfohlener Ablauf:

1. Implementer setzt Ticket auf `doing`.
2. Implementer setzt es nach Umsetzung nicht direkt auf `done`, sondern notiert `Review: pending`.
3. Reviewer prueft.
4. Bei `APPROVED`: Ticket auf `done` setzen.
5. Bei `CHANGES_REQUESTED`: Ticket bleibt `doing`, Feedback geht an Implementer.
6. Bei `BLOCKED`: Ticket auf `blocked` oder Blocker im Ticket dokumentieren.


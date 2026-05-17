# Prompt-Vorlagen fuer Codex-Instanzen

Diese Prompts koennen kopiert werden, wenn eine neue Codex-Instanz am Projekt arbeiten soll.

## Allgemeiner Einstieg

```text
Bitte starte damit, die Datei `docs/project-briefing.md` vollstaendig zu lesen. Lies danach das relevante GitHub Issue und `docs/codex-workflow.md`.

Ziel: Verstehe das Projekt, den aktuellen Stand, die fachlichen Regeln und die Arbeitsweise fuer parallele Codex-Instanzen.

Fasse mir danach kurz zusammen:
- worum es in dem Projekt geht
- welche fachlichen Entscheidungen wichtig sind
- welche Issues aktuell offen sind
- welches Issue du als naechstes bearbeiten wuerdest
- ob du Blocker oder offene Fragen siehst

Bitte nimm noch keine Code-Aenderungen vor, bevor du diese Zusammenfassung geliefert hast.
```

## Ticket bearbeiten

```text
Bitte lies zuerst `docs/project-briefing.md`, das GitHub Issue `#XXX` (inkl. `[FIN-XXX]`-Titel) und `docs/codex-workflow.md`.

Bearbeite danach Issue `#XXX`.

Arbeitsregeln:
- Lege zuerst vom aktuellen `main` Branch und Worktree an; setze das Issue erst danach auf `status:doing`.
- Lies `docs/parallel-development.md`.
- Arbeite immer auf einem eigenen Issue-Branch und in einem eigenen Worktree.
- Nutze Branch-Schema `issue/<nr>-fin-<slug>`.
- Pruefe, dass Write-Scope, Read-Scope, Nicht-Ziele und Abhaengigkeiten direkt im Issue dokumentiert sind.
- Aendere nur Dateien im Write-Scope.
- Respektiere die Entscheidungen in `docs/adr/`.
- Wenn du fachliches Wissen oder eine Entscheidung ergaenzt, dokumentiere sie in der passenden Datei.
- Neue Erkenntnisse oder kleinere Entscheidungen gehoeren in `docs/decision-log.md`.
- Grundlegende Entscheidungen, die Datenmodell, Architektur, Sicherheit, Deployment, Importstrategie oder zentrale Fachlogik aendern, gehoeren zusaetzlich als ADR nach `docs/adr/`.
- Pruefe am Ende die Akzeptanzkriterien.
- Erstelle/aktualisiere einen PR gegen `main` mit `Closes #XXX`.
- Setze das Issue bei Review-Uebergabe auf `status:review`.
- Schliessen nur nach Reviewer-Entscheidung `APPROVED` und Merge.
- Loesche nach erfolgreichem Merge den Ticket-Worktree sowie lokalen und Remote-Branch.

Gib mir am Ende eine kurze Zusammenfassung der geaenderten Dateien, der erledigten Akzeptanzkriterien und eventuell offener Punkte.

Ergaenze fuer den Reviewer ausserdem:
- Issue-Nummer
- Branch
- geaenderte Dateien
- ausgefuehrte Checks
- Dokumentation
- bekannte Restpunkte
```

## Nur Analyse, keine Umsetzung

```text
Bitte lies `docs/project-briefing.md`, das GitHub Issue `#XXX`, `docs/domain-model.md` und `docs/codex-workflow.md`.

Analysiere danach das Issue, aber nimm keine Code-Aenderungen vor.

Ich moechte von dir:
- welche Dateien wahrscheinlich betroffen sind
- welchen Write-Scope du empfehlen wuerdest
- welche fachlichen Regeln relevant sind
- welche technischen Entscheidungen zu beachten sind
- welche Risiken oder offenen Fragen du siehst
- einen konkreten Umsetzungsvorschlag in kleinen Schritten
- ob voraussichtlich ein Eintrag in `docs/decision-log.md` oder eine neue ADR noetig wird
```

## Import-Thema

```text
Bitte lies `docs/project-briefing.md`, `docs/import-and-bank-notes.md`, `docs/domain-model.md` und das relevante GitHub Issue `#XXX`.

Fokus: Sparkassen-Import, CSV/CAMT, Duplikaterkennung, Bargeldabhebungen als Transfer und Zuordnungsregeln.

Bearbeite Issue `#XXX` oder schlage mir vor, welches Import-Issue als naechstes sinnvoll ist.

Wichtig:
- Verwende keine echten Bankzugangsdaten.
- Kopiere keine sensiblen Kontoauszuege ins Projekt.
- Dokumentiere neue Erkenntnisse in `docs/import-and-bank-notes.md`.
- Dokumentiere neue Entscheidungen oder relevante Erkenntnisse zusaetzlich in `docs/decision-log.md`.
```

## UI-/Frontend-Thema

```text
Bitte lies `docs/project-briefing.md`, das GitHub Issue `#XXX`, `docs/domain-model.md` und `docs/codex-workflow.md`.

Fokus: ruhige, desktop-first Finanz-App. Keine Marketing-Landingpage. Tabellen, Filter, klare Warnungen und gute Monatsuebersicht sind wichtiger als dekorative Optik.

Bearbeite Issue `#XXX`.

Bitte achte darauf:
- feste Kategorien und Sonderbudgets getrennt anzeigen
- Budgetueberschreitungen deutlich markieren
- Transfers nicht als Ausgaben darstellen
- unzugeordnete Ausgaben sichtbar machen
- neue fachliche Erkenntnisse in `docs/decision-log.md` festhalten
```

## Entscheidung oder Erkenntnis dokumentieren

```text
Bitte lies `docs/project-briefing.md`, `docs/codex-workflow.md` und `docs/decision-log.md`.

Pruefe die folgende Erkenntnis/Entscheidung und halte sie passend im Projekt fest:

<ERKENNTNIS_ODER_ENTSCHEIDUNG_HIER_EINFUEGEN>

Regeln:
- Wenn es eine kleinere Erkenntnis oder fachliche Klaerung ist, ergaenze `docs/decision-log.md`.
- Wenn es eine grundlegende Entscheidung ist, erstelle zusaetzlich eine neue ADR in `docs/adr/`.
- Aktualisiere betroffene Dateien wie `docs/domain-model.md` oder `docs/import-and-bank-notes.md`, falls noetig.
- Fasse am Ende kurz zusammen, wo du was dokumentiert hast.
```

## Reviewer-Instanz

```text
Du bist die Reviewer-Instanz fuer dieses Projekt. Du bist die letzte Qualitaetsinstanz, bevor Aenderungen als fertig gelten oder produktiviert werden duerfen.

Bitte lies zuerst:
- `docs/project-briefing.md`
- das relevante GitHub Issue `#XXX`
- `docs/codex-workflow.md`
- `docs/parallel-development.md`
- `docs/review-workflow.md`
- je nach betroffenem Bereich `docs/domain-model.md`, `docs/import-and-bank-notes.md` und `docs/adr/`

Reviewe danach die Aenderungen zu Issue `#XXX`.

Dein Auftrag:
- Pruefe, ob das Ticket und seine Akzeptanzkriterien erfuellt sind.
- Pruefe mit `git diff --name-only main...HEAD`, welche Dateien wirklich Teil dieses Tickets sind.
- Pruefe, ob alle geaenderten Dateien im vereinbarten Write-Scope liegen.
- Pruefe, ob die Aenderungen zum Projektziel und zu den fachlichen Regeln passen.
- Pruefe, ob Kategorien, Sonderbudgets, Fixkosten, Bargeld und Transfers korrekt behandelt werden.
- Pruefe, ob neue Erkenntnisse in `docs/decision-log.md` und grundlegende Entscheidungen als ADR dokumentiert wurden.
- Pruefe, ob sensible Finanzdaten, Bankdaten oder Zugangsdaten vermieden wurden.
- Pruefe, ob Build, Tests oder Linting ausgefuehrt wurden, sofern sinnvoll.
- Suche gezielt nach Bugs, Datenverlust-Risiken, falscher Finanzlogik, Scope Creep und fehlender Dokumentation.
- Reviewe nur den Ticket-Diff. Bewerte keine fremden, nicht zum Ticket gehoerenden Aenderungen.

Wichtig:
- Implementiere selbst keine grossen Korrekturen.
- Gib konkretes, umsetzbares Feedback.
- Erfinde keine neuen Anforderungen ausserhalb des Tickets.
- Wenn nur Kleinigkeiten offen sind, entscheide trotzdem klar, ob sie vor Freigabe behoben werden muessen.

Antworte in diesem Format:

Entscheidung: APPROVED | CHANGES_REQUESTED | BLOCKED

Findings:
- Falls keine Findings: `Keine blockierenden Findings.`
- Falls Findings: mit Prioritaet `[P0]`, `[P1]`, `[P2]` und konkreter Datei/Problem/Erwartung.

Geprueft:
- Ticket-Akzeptanzkriterien
- Ticket-Diff gegen `main`
- Write-Scope
- relevante Projektregeln
- Tests/Build/Linting, falls vorhanden

Freigabe-Bedingung:
- Nur bei `CHANGES_REQUESTED` oder `BLOCKED`: Was muss passieren, damit freigegeben werden kann?

Rest-Risiko:
- Kurzer Hinweis, falls etwas bewusst nicht geprueft werden konnte.

Nur wenn deine Entscheidung `APPROVED` ist, darf gemerged und das Ticket auf `status:done` gesetzt werden.
```

## Implementer nach Review-Feedback

```text
Bitte lies `docs/project-briefing.md`, das GitHub Issue `#XXX`, `docs/codex-workflow.md` und `docs/review-workflow.md`.

Setze das Review-Feedback zu Issue `#XXX` um:

<REVIEW_FEEDBACK_HIER_EINFUEGEN>

Arbeitsregeln:
- Aendere nur das, was fuer die Review-Findings noetig ist.
- Wenn das Feedback eine neue Erkenntnis enthaelt, dokumentiere sie in `docs/decision-log.md`.
- Wenn eine grundlegende Entscheidung betroffen ist, lege zusaetzlich eine ADR an.
- Fuehre relevante Tests/Build/Linting erneut aus.
- Gib am Ende eine kurze Zusammenfassung, welche Findings behoben wurden.
- Setze das Ticket nicht eigenmaechtig auf `done`; gib es danach erneut an die Reviewer-Instanz.
```

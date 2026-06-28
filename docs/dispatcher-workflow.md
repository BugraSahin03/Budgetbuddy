# Dispatcher-Workflow fuer Codex-Tickets

Dieses Dokument beschreibt die neue Dispatcher-/Queue-Rolle fuer BudgetBuddy.

Der Dispatcher ist eine eigene Codex-Instanz, die freie Entwickler-Instanzen mit dem naechsten sinnvollen Ticket versorgt. Sie ersetzt nicht den Nutzer als Produktowner und ersetzt nicht den Reviewer.

## Ziel

Der Nutzer soll nicht mehr jeden technischen Zwischenschritt zwischen Entwickler und Reviewer manuell weiterreichen muessen.

Der Dispatcher sorgt dafuer, dass:

- Entwickler wissen, welches Ticket sie als naechstes nehmen sollen,
- Prioritaeten und Abhaengigkeiten beachtet werden,
- riskante Parallelisierung vermieden wird,
- UI-/Visual-Check-Pflichten sichtbar bleiben,
- unklare Repo-/GitHub-Zustaende an den Nutzer eskaliert werden.


## Aktuelle Thread-Zuordnung

Sichtbarer Dispatcher-Chat:

- `Dispatcher`: `019f0e6f-4173-7352-980e-24510daba47e`

Bestehende Arbeits-Threads:

- `Dev 1`: `019e3c74-53f4-79a1-aff8-c1fb38d23479`
- `Reviewer 1`: `019e5514-ea2a-7c60-bfdf-18928fc731d3`
- `Dev 2`: `019e3c7d-9e66-7db3-9ccc-fe74ebecc5c0`
- `Reviewer 2`: `019e3c7f-ea49-7e10-961c-c0e63d82f679`

Standard-Pairing:

- `Dev 1` -> `Reviewer 1`
- `Dev 2` -> `Reviewer 2`

## Rollenabgrenzung

### Nutzer

Der Nutzer bleibt Produktowner und fachlicher Entscheider.

Der Nutzer entscheidet bei:

- Produkt-/Fachfragen,
- Visual Check bei UI-/UX-Tickets,
- Prioritaetskonflikten,
- unklaren GitHub-/Repo-Zustaenden,
- lokalen Aenderungen, die keinem Ticket eindeutig zugeordnet sind,
- Branch-/PR-/Merge-Ungereimtheiten,
- finalen Prozessanpassungen nach Pilotphase.

### Dispatcher

Der Dispatcher ist eine Koordinationsinstanz.

Der Dispatcher darf:

- offene Tickets lesen,
- Prioritaeten, Labels und Abhaengigkeiten bewerten,
- naechste Tickets an freie Entwickler empfehlen,
- Parallelisierbarkeit einschaetzen,
- Visual-Check-Pflichten hervorheben,
- bei Unsicherheit den Nutzer fragen.

Der Dispatcher darf nicht:

- fachliche Entscheidungen fuer den Nutzer treffen,
- Reviews ersetzen,
- Merge-Freigaben geben,
- unklare lokale Aenderungen autonom zuordnen,
- widerspruechliche GitHub-Zustaende stillschweigend reparieren,
- Tickets ohne Rueckfrage stark umpriorisieren.

### Entwickler

Der Entwickler fragt den Dispatcher nach dem naechsten Ticket, arbeitet im Ticket-Worktree und uebergibt nach Visual Check bzw. nach Umsetzung direkt an den Reviewer.

### Reviewer

Der Reviewer prueft PRs nach `docs/review-workflow.md` und meldet `APPROVED`, `CHANGES_REQUESTED` oder `BLOCKED` direkt an den Entwickler zurueck.


## Feste Dev-Reviewer-Paare

Zur besseren Nachvollziehbarkeit arbeitet BudgetBuddy standardmaessig mit festen Dev-Reviewer-Paaren:

- `Dev 1` uebergibt an `Reviewer 1`.
- `Dev 2` uebergibt an `Reviewer 2`.

Dieses Pairing hilft, parallele Arbeitsstraenge getrennt zu halten. Entwickler sollen nach Abschluss ihrer Umsetzung nicht irgendeinen Reviewer suchen, sondern ihren zugeordneten Reviewer kontaktieren.

Ausnahmen sind moeglich, muessen aber im Ticket/PR-Handoff kurz dokumentiert werden, z. B. wenn ein Reviewer nicht verfuegbar ist oder der Nutzer bewusst anders entscheidet.

## Standardfluss

1. Entwickler fragt Dispatcher: `Welches Ticket soll ich als naechstes uebernehmen?`
2. Dispatcher nennt ein konkretes Ticket und begruendet knapp.
3. Entwickler liest Ticket und Projektdoku.
4. Entwickler arbeitet im eigenen Worktree.
5. Bei UI-/UX-Tickets stellt Entwickler Preview bereit und fragt Nutzer nach Visual Check.
6. Nach `Visual Check OK` oder wenn kein Visual Check noetig ist, pingt Entwickler direkt den Reviewer.
7. Reviewer prueft.
8. Bei `CHANGES_REQUESTED` arbeitet Entwickler nach und pingt Reviewer erneut.
9. Bei `APPROVED` finalisiert der Entwickler gemaess Workflow.
10. Entwickler schliesst/kommentiert das Ticket gemaess Workflow.
11. Entwickler fragt Dispatcher nach dem naechsten Ticket.

## Ticket-Auswahlregeln fuer Dispatcher

Der Dispatcher beachtet:

1. `priority:p0` und `priority:p1` vor `p2/p3`.
2. Produktiv-Bugs vor Komfortfeatures.
3. Abhaengigkeiten aus dem Issue.
4. Write-Scope-Konflikte zwischen parallelen Tickets.
5. UI-/UX-Tickets brauchen in der Regel Visual Check.
6. Mobile-Runde als zusammenhaengende Sequenz:
   - `FIN-105` Audit,
   - `FIN-106` Shell/Navigation,
   - `FIN-107` Monatsansicht,
   - `FIN-108` Hinzufuegen-Dialog,
   - `FIN-109` Nebenbereiche.
7. Keine Zuweisung, wenn Issue-Status, Branch, PR oder Abhaengigkeiten unklar sind.
8. Bei Unsicherheit Nutzer fragen.

## Repo-/GitHub-Eskalation

Folgende Faelle gehen an den Nutzer und werden nicht autonom entschieden:

- uncommitted Aenderungen, die nicht vom aktuellen Ticket stammen,
- Dateien ausserhalb des Write-Scopes wurden geaendert,
- Branch passt nicht zum Ticket,
- PR schliesst falsches Issue oder kein Issue,
- Issue ist geschlossen, soll aber bearbeitet werden,
- Labels/Status/Prioritaet widersprechen sich,
- Merge-/Rebase-Konflikte mit unklarer Entscheidung,
- unklar, ob Aenderungen behalten, reverted oder in ein Folgeticket verschoben werden sollen.

Grundregel: Technischer Dev-Reviewer-Pingpong darf autonom laufen. Projekt-/Repo-Hygiene mit Entscheidungsspielraum bleibt beim Nutzer.

## Handoff: Entwickler an Reviewer

```md
Ticket: FIN-xxx / #xxx
Branch/PR: ...
Status: ready for review

Zusammenfassung:
- ...

Checks:
- ...

Visual Check:
- erforderlich: ja/nein
- Nutzer-Go: ja/nein/nicht erforderlich

Repo-/GitHub-Zustand:
- Branch eindeutig: ja/nein
- Aenderungen nur im Write-Scope: ja/nein
- unzugeordnete lokale Aenderungen: ja/nein
- Issue/PR-Zuordnung eindeutig: ja/nein

Bekannte Risiken / Hinweise:
- ...

Bitte Review nach docs/review-workflow.md durchfuehren.
```

## Handoff: Reviewer an Entwickler

```md
Ticket: FIN-xxx / #xxx
Review-Ergebnis: approved / changes requested / blocked

Befunde:
- ...

Erforderliche Aenderungen:
- ...

Repo-/GitHub-Zustand unklar:
- ja/nein, Details: ...

Nutzer-Eskalation noetig:
- ja/nein, Grund: ...
```

## Handoff: Entwickler an Dispatcher

```md
Ticket FIN-xxx ist abgeschlossen.
Status:
- Review: approved
- Ticket: geschlossen / offen mit Kommentar / PR gemerged
- offene Nacharbeiten: keine / ...
- Repo/GitHub-Zustand: sauber / Nutzer-Eskalation offen

Bitte nenne mir das naechste sinnvolle Ticket.
```

## Pilot fuer FIN-113

Der neue Prozess ist mit dieser Doku-Aenderung noch nicht dauerhaft final freigegeben, sondern wird bewusst als Pilot eingefuehrt.

Pilotstatus:

- Der sichtbare Dispatcher-Chat wurde angelegt.
- Die festen Dev-Reviewer-Paare wurden dokumentiert.
- Die Prozessregeln sind in den Workflow-Dokumenten vorbereitet.
- Der echte Praxistest wird nachgelagert mit der Mobile-Ticketrunde durchgefuehrt.

Empfohlener Pilotablauf:

1. `FIN-105` als Audit/Startpunkt, falls noch offen bzw. als Rueckblick auf bereits erfolgtes Audit.
2. Danach `FIN-106` oder `FIN-107` ueber den Dispatcher zuweisen lassen.
3. Dev fragt nach Abschluss den Dispatcher nach dem naechsten Ticket.
4. Reviewer und Dev kommunizieren direkt im festen Pairing.
5. Nutzer wird nur fuer Visual Check, fachliche Entscheidungen oder Repo-Unklarheiten eingebunden.

Entscheidungsstelle nach Pilot:

Nach mindestens einem vollstaendigen Ticketdurchlauf mit Dispatcher, Dev, Reviewer und ggf. Visual Check muss im Issue oder Decision Log festgehalten werden:

- Hat der Dispatcher das richtige naechste Ticket empfohlen?
- Hat Dev -> Reviewer ohne Nutzer-Pingpong funktioniert?
- Wurden Repo-/GitHub-Unklarheiten korrekt an den Nutzer eskaliert?
- Soll der Workflow dauerhaft uebernommen, angepasst oder zurueckgestellt werden?

Bis diese Auswertung dokumentiert ist, gilt FIN-113 als Pilotprozess und nicht als unumkehrbare Prozessfreigabe.

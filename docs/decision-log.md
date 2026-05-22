# Decision Log und Erkenntnisse

Diese Datei sammelt neue Erkenntnisse, fachliche Klaerungen und kleinere Entscheidungen, die waehrend der Arbeit entstehen.

Wenn eine Entscheidung grundlegende Architektur, Datenmodell, Betrieb oder Sicherheitsverhalten aendert, gehoert sie zusaetzlich als ADR nach `docs/adr/`.

## Wann hier eintragen?

Eintrag erforderlich, wenn:

- eine neue fachliche Erkenntnis entsteht
- eine offene Frage geklaert wurde
- ein Ticket eine Annahme bestaetigt oder widerlegt
- eine Entscheidung mehrere zukuenftige Tickets beeinflusst
- ein technischer Trade-off bewusst gewaehlt wurde
- ein Importformat oder Bankverhalten besser verstanden wurde

Kein Eintrag erforderlich fuer:

- reine Tippfehler
- kleine UI-Politur
- mechanische Refactors ohne fachliche Wirkung
- Testfixes ohne neue Erkenntnis

## Wann ein ADR schreiben?

ADR schreiben, wenn die Entscheidung:

- schwer rueckgaengig zu machen ist
- das Datenmodell veraendert
- die Architektur veraendert
- Sicherheits- oder Datenschutzfolgen hat
- Betrieb/Deployment betrifft
- zentrale Fachlogik veraendert

ADR-Dateien liegen in `docs/adr/` und werden fortlaufend nummeriert.

## Eintragsformat

```md
## YYYY-MM-DD - Kurzer Titel

Quelle/Ticket: `FIN-XXX`

Erkenntnis/Entscheidung:

- ...

Auswirkung:

- ...

Folgeaktion:

- ...
```

## 2026-05-18 - Ein-Personen-Review nutzt `status:ready-to-merge`

Quelle/Ticket: Prozessentscheidung

Erkenntnis/Entscheidung:

- Der Review-Statuslauf ist jetzt: `status:todo -> status:doing -> status:review -> status:ready-to-merge -> status:done`.
- Da GitHub Selbstfreigaben desselben Accounts nicht erlaubt, gilt im Ein-Personen-Repo ein strukturierter Reviewer-Kommentar im PR zusammen mit `status:ready-to-merge` als Freigabe.
- `status:done` bleibt ausschliesslich fuer bereits gemergte Arbeit reserviert.
- Bei `CHANGES_REQUESTED` stehen die konkreten Findings im PR-Kommentar; bei `BLOCKED` wird der Blocker im PR und Issue dokumentiert.

Auswirkung:

- Der Review-Zustand bleibt auf GitHub sichtbar, ohne einen zweiten GitHub-Account vorauszusetzen.
- Vor Review, freigegeben zum Merge und bereits integriert sind klar unterscheidbar.

Folgeaktion:

- Workflow-Dokumente, Reviewer-Prompt, PR-Template und Labels an `status:ready-to-merge` anpassen.

## 2026-05-18 - Reviewer-Entscheidungen muessen im GitHub-PR sichtbar sein

Quelle/Ticket: Prozessentscheidung

Erkenntnis/Entscheidung:

- Jede Reviewer-Entscheidung soll im GitHub-PR sichtbar abgebildet werden.
- `APPROVED` gilt erst als Merge-Freigabe, wenn im PR eine formale Review mit `Approve` abgegeben wurde.
- `CHANGES_REQUESTED` wird als formale Review mit `Request changes` abgegeben und enthaelt konkrete Findings, damit klar dokumentiert ist, was geaendert werden muss.
- `BLOCKED` wird im PR und im Issue dokumentiert; es gibt keine Freigabe.
- Kommentare oder Chat-Hinweise allein reichen nicht als Freigabe aus.

Auswirkung:

- GitHub bildet den tatsaechlichen Review-Zustand sichtbar ab.
- Merge-Regeln koennen spaeter technisch ueber Branch Protection abgesichert werden.

Folgeaktion:

- Review-Workflow, Gesamtworkflow und Reviewer-Prompt entsprechend nachschaerfen.
- Diese Entscheidung wurde am 2026-05-18 fuer das Ein-Personen-Repo durch `status:ready-to-merge` konkretisiert.

## 2026-05-17 - Entwicklungsworkflow auf dauerhafte Ticket-Worktrees umgestellt

Quelle/Ticket: Prozessentscheidung

Erkenntnis/Entscheidung:

- Der Hauptordner `/Volumes/Intenso/Dev/Budgetbuddy` bleibt dauerhaft auf `main` und dient als Kontrollraum.
- Jede produktive Aenderung nutzt einen eigenen Branch und eigenen Worktree, auch ohne parallele Arbeit.
- Standardfluss ist: Issue -> Worktree/Branch -> PR gegen `main` -> Review -> Merge nach `main` -> Worktree/Branch loeschen.
- Write-Scope, Read-Scope, Nicht-Ziele und Abhaengigkeiten gehoeren direkt ins GitHub Issue.
- Gestapelte Branches sind nur noch ein begruendeter Ausnahmefall.

Auswirkung:

- Es gibt nur noch einen Arbeitsmodus statt Sonderregeln fuer Einzel- und Parallelarbeit.
- `main` bleibt sauber, und erledigte Branches/Worktrees werden nach Merge konsequent entfernt.

Folgeaktion:

- Workflow-Dokumente, Prompts und Issue-Template an den neuen Standard anpassen.

## 2026-05-17 - Ticketquelle auf GitHub Issues migriert

Quelle/Ticket: Prozessmigration

Erkenntnis/Entscheidung:

- `docs/backlog.md` wird als Archiv eingefroren und nicht mehr aktiv gepflegt.
- Ticketstatus, Prioritaet und MVP-Phase laufen ab jetzt ueber GitHub Issues (Labels + Milestones).
- Parallelarbeit nutzt pro Ticket eigene Branches im Schema `issue/<nummer>-fin-<slug>` und bei Gleichzeitigkeit getrennte Worktrees.
- Merge auf `main` soll ueber PR + Review + CI + Branch Protection abgesichert werden.

Auswirkung:

- Die bisherige Konfliktquelle durch parallele Edits an `docs/backlog.md` entfaellt.
- Ticketfortschritt ist pro Issue atomar und nachvollziehbar.

Folgeaktion:

- Migrationsscript ausfuehren (`--execute`) und mit `--verify` validieren.

## 2026-04-26 - Initialer Projektrahmen dokumentiert

Quelle/Ticket: Projektstart

Erkenntnis/Entscheidung:

- Projektwissen wird in Markdown-Dateien dokumentiert, damit mehrere Codex-Instanzen parallel arbeiten koennen.
- `docs/project-briefing.md` ist der zentrale Einstiegspunkt.
- `docs/backlog.md` ist die Ticketquelle.
- `docs/codex-workflow.md` beschreibt die Arbeitsweise.
- Grundlegende Entscheidungen kommen als ADR nach `docs/adr/`.
- Laufende Erkenntnisse kommen in dieses Decision Log.

Auswirkung:

- Neue Instanzen koennen sich ueber Dateien orientieren, ohne alten Chatverlauf zu kennen.

Folgeaktion:

- Bei jedem Ticket pruefen, ob neue Erkenntnisse oder Entscheidungen dokumentiert werden muessen.

## 2026-04-26 - FIN-001 umgesetzt

Quelle/Ticket: `FIN-001`

Erkenntnis/Entscheidung:

- Das Projektgrundgeruest existiert in `/Volumes/Intenso/Dev/Budgetbuddy`.
- Next.js mit TypeScript ist eingerichtet.
- SQLite-Basisclient, Vitest-Basistests und README-Startbefehle sind vorhanden.

Auswirkung:

- Die goldene Quelle ist ab jetzt `/Volumes/Intenso/Dev/Budgetbuddy`.
- Naechster sinnvoller Umsetzungsschritt ist `FIN-002`.

Folgeaktion:

- Weitere Datei- und Codeaenderungen in der goldenen Quelle vornehmen.

## 2026-04-26 - Sparkassen-CSV als MVP-Importformat

Quelle/Ticket: `FIN-010`

Erkenntnis/Entscheidung:

- Fuer den MVP wird Sparkassen-CSV als Startformat verwendet.
- CAMT/XML und direkte Bankanbindung bleiben spaetere Optionen.

Auswirkung:

- `FIN-010` fokussiert auf CSV statt allgemein CSV/CAMT.
- Importlogik kann zunaechst konkreter und kleiner gebaut werden.

Folgeaktion:

- Echten anonymisierten Sparkassen-CSV-Export fuer Analyse verwenden.

## 2026-04-26 - MVP-Kategorien und Bargeldstart geklaert

Quelle/Ticket: fachliche Klaerung

Erkenntnis/Entscheidung:

- Startliste fester Kategorien fuer den MVP: Einkauf, Tanken, Freizeit, Fitness, Parkhaus, Kleidung, Oeffis.
- Initialer Bargeldbestand fuer den Start ist `0 EUR`.
- Im MVP gibt es keine separate Kennzahl `gesparter Betrag`.

Auswirkung:

- Datenmodell und Seed-Daten koennen auf dieser Startliste aufbauen.
- Monatsdashboard soll im MVP ohne separate Spar-Kennzahl geplant werden.

Folgeaktion:

- Diese Regeln bei `FIN-002` und `FIN-013` beachten.

## 2026-04-26 - Reviewer-Gate fuer produktive Aenderungen eingefuehrt

Quelle/Ticket: Prozessentscheidung

Erkenntnis/Entscheidung:

- Produktive Aenderungen sollen durch eine Reviewer-Instanz freigegeben werden.
- Reviewer entscheiden mit `APPROVED`, `CHANGES_REQUESTED` oder `BLOCKED`.
- Nur bei `APPROVED` darf ein Ticket auf `done` gesetzt oder produktiviert werden.

Auswirkung:

- Implementer-Instanzen geben fertige Arbeit zuerst in den Review.
- Der Review-Prozess ist in `docs/review-workflow.md` dokumentiert.
- Prompt-Vorlagen fuer Reviewer und Feedback-Umsetzung stehen in `docs/prompts.md`.

Folgeaktion:

- Bei zukuenftigen Tickets Review-Status im Issue (`status:review`) festhalten.

## 2026-04-27 - Parallelentwicklung ueber Ticket-Branches und Write-Scopes

Quelle/Ticket: Prozessentscheidung

Erkenntnis/Entscheidung:

- Mehrere Agents sollen parallel nicht im gleichen ungetrennten Arbeitsbaum entwickeln.
- Pro Ticket soll ein eigener Branch und idealerweise ein eigener Git-Worktree verwendet werden.
- Jedes Ticket braucht einen klaren Write-Scope.
- Reviewer pruefen nur den Diff des Tickets gegen seine Basis und gleichen ihn gegen den Write-Scope ab.

Auswirkung:

- Ueberschneidungen werden frueh sichtbar.
- Reviewer bewerten nur Aenderungen, die zum Ticket gehoeren.
- Aenderungen ausserhalb des Write-Scopes fuehren ohne Begruendung zu `CHANGES_REQUESTED`.

Folgeaktion:

- Bei neuen Tickets Write-Scope und Branch/Worktree im Handoff an den Reviewer angeben.
- Diese fruehere Prozessentscheidung wurde am 2026-05-17 durch den verbindlichen Worktree-Standard verschaerft.

## 2026-05-22 - FIN-009 markiert Fixkosten ueber manuelle Transaktions-Verknuepfung

Quelle/Ticket: `FIN-009`

Erkenntnis/Entscheidung:

- Fuer den MVP werden Fixkosten-Transaktionen nicht automatisch erkannt, sondern manuell in der Fixkostenansicht markiert.
- Die Markierung speichert optional `wirkt_fuer_monat` (`YYYY-MM`); ohne Angabe gilt der Buchungsmonat.
- Die Transaktionsliste zeigt markierte Eintraege visuell als `Fixkosten`.

Auswirkung:

- Grenzfaelle rund um Monatswechsel sind ohne Automatisierung sauber abbildbar.
- FIN-020 bleibt als Folgearbeit fuer moegliche spaetere Auto-Zuordnung bestehen.

Folgeaktion:

- FIN-013B kann die Markierung in der Monatsdarstellung nutzen.

## 2026-04-27 - FIN-002 Schema- und Betragskonvention festgelegt

Quelle/Ticket: `FIN-002`

Erkenntnis/Entscheidung:

- Die Datenbank wird migrationsbasiert aufgebaut (`schema_migrations` + `app_meta`).
- Kernobjekte sind als Tabellen angelegt: Konten, Kategorien, Monatsbudgets, Sonderbudgets, Fixkosten, Importlaeufe, Transaktionen und importierte Transaktionsmetadaten.
- `expense` muss genau eine Zuordnung zu Kategorie oder Sonderbudget haben.
- `transfer` darf keine Kategorie/Sonderbudget haben und braucht ein Zielkonto.
- Betragskonvention: `amount_cents` wird als signed Integer gespeichert.

Auswirkung:

- FIN-002-Akzeptanzkriterien sind technisch abbildbar und in SQL-Constraints abgesichert.
- Import-Deduplizierung ist vorbereitet ueber `import_fingerprint` und `dedupe_fingerprint`.

Folgeaktion:

- Reviewer-Pruefung fuer FIN-002 durchfuehren.
- Danach `FIN-003` starten.

## 2026-04-27 - FIN-010 Sparkassen-CSV-Feldmapping konkretisiert

Quelle/Ticket: `FIN-010`

Erkenntnis/Entscheidung:

- Das Sparkassen-CSV-Format ist fuer den MVP konkret genug spezifiziert (Delimiter, Datums-/Betragsformat, relevante Header).
- Ein anonymisiertes Referenzsample liegt in `docs/samples/sparkasse-umsatz-anonymized.csv`.
- Die Extraktion fuer Buchungstag, Betrag, Beschreibung, Gegenpartei und Info ist als Mapping dokumentiert.
- Deduplizierung wird ueber einen Fingerprint aus Kernfeldern vorbereitet.
- Bargeldabhebungen werden regelbasiert als `transfer` (`Sparkasse -> Bargeld`) behandelt.

Auswirkung:

- `FIN-011` kann auf einem konkreten Importmapping aufbauen.
- Risiken durch uneinheitliche CSV-Interpretation sind reduziert.

Folgeaktion:

- Reviewer-Pruefung fuer FIN-010.
- Danach Umsetzung von `FIN-011` auf Basis des dokumentierten Feldmappings.

## 2026-05-18 - FIN-005 Monatsbudgets pro Kategorie und Monatspflege

Quelle/Ticket: `FIN-005`

Erkenntnis/Entscheidung:

- Monatsbudgets werden pro `month_key` und Kategorie gepflegt; unterschiedliche Werte je Monat sind direkt zulaessig.
- Ein leerer Budgetwert loescht den Monatswert fuer die Kategorie bewusst, statt `0` zu erzwingen.
- Die Budgetansicht zeigt aktive Kategorien sowie Kategorien mit bereits vorhandenem Monatswert, damit historische Monatsbudgets sichtbar bleiben.

Auswirkung:

- Fehlende Budgetwerte sind im UI klar erkennbar und gezielt nachpflegbar.
- Ueberschreitungen werden als Hinweis markiert, Buchungen aber nicht blockiert.

Folgeaktion:

- FIN-013 kann die Monatsbudgetdaten direkt fuer Dashboard-Warnungen und Restwerte verwenden.

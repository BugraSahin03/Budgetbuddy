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

## 2026-06-02 - FIN-044 legt UI-Leitbild fuer ruhige Premium-Finanzoberflaeche fest

Quelle/Ticket: `FIN-044`

Erkenntnis/Entscheidung:

- BudgetBuddy soll in Richtung eines ruhigen, hellen Premium-Finanzprodukts weiterentwickelt werden.
- Die neue UI-Sprache priorisiert Monatsfokus, starke Primaerzahlen, klare Hierarchie, kompakte Navigation und reduzierte Karten-/Listenflaechen.
- Dashboard und Monatsansicht sind beide prioritaer; die Monatsansicht bleibt wegen Budgetpflege, Zuordnung und Monatskontrolle der zentrale Arbeitsort.
- Referenznahe Gestaltung ist erwuenscht, aber keine 1:1-Kopie und keine dekorative Ueberdeckung fachlicher Arbeit.
- Tabellen duerfen ersetzt oder leichter gestaltet werden, bleiben aber erlaubt, wenn sie fuer dichte Finanzarbeit die effizientere Form sind.

Auswirkung:

- UI-Folgetickets koennen Dashboard, Shell, Monatsansicht und Verwaltungsseiten getrennt umsetzen, ohne die Richtung neu zu verhandeln.
- Redesign-Arbeit darf keine Fachlogik zu Budgets, Sonderbudgets, Fixkosten, Transfers oder `effective_month_key` stillschweigend veraendern.

Folgeaktion:

- Vorhandene Folge-Issues fuer Dashboard (#92), Navigation/Shell (#93) und Monatsansicht (#94) an diesem Leitbild ausrichten.
- Verwaltungsseiten-Folgeissue #96 (`FIN-048`) baut auf diesem Leitbild auf.

## 2026-06-02 - FIN-041 fuehrt einfachen Monatsvergleich ein

Quelle/Ticket: `FIN-041`

Erkenntnis/Entscheidung:

- Der Monatsvergleich ist ein eigener Hauptnavigationspunkt unter `/monatsvergleich`.
- Die Vergleichsreihe nutzt alle Monate seit der ersten vorhandenen Buchung bis zum aktuellen Monat und bleibt lueckenlos.
- Pro Monat werden Einnahmen, Ausgaben und `Gespart` angezeigt.
- `Gespart` ist in Version 1 bewusst nur der einfache Ueberschuss `Einnahmen - Ausgaben`.
- Transfers zaehlen nicht als Ausgaben in der Vergleichsrechnung.

Auswirkung:

- Nutzer koennen mehrere Monate schnell miteinander vergleichen, ohne in einzelne Monatsdetails springen zu muessen.
- Es entsteht keine neue Sparfachlogik und keine stille Umdeutung von Kategorien, Sonderbudgets oder Transfers.

Folgeaktion:

- Echte aktive Sparlogik bleibt separat in #98 (`FIN-049`) zu klaeren.

## 2026-06-02 - FIN-045 macht Dashboard zum ersten Premium-UI-Referenzscreen

Quelle/Ticket: `FIN-045`

Erkenntnis/Entscheidung:

- Das Dashboard wird als erster konkreter Referenzscreen fuer die ruhige Premium-Finanzsprache umgesetzt.
- Der Primaerfokus liegt auf einer dominanten Hero-Flaeche mit Monatskontext und `Verfuegbar` als Hauptzahl.
- Kategorien und Sonderbudgets werden auf dem Dashboard als Karten-/Listenflaechen statt als klassische Tabellen dargestellt.
- Die fachliche Dashboard-Berechnung bleibt unveraendert; geaendert wird bewusst nur die visuelle Struktur und Blickfuehrung.
- Transfers bleiben sichtbar markiert und werden weiterhin nicht als Budgetausgaben interpretiert.

Auswirkung:

- Folge-Tickets fuer Shell, Monatsansicht und Verwaltungsseiten koennen visuell auf dieser Dashboard-Sprache aufbauen.
- Das Dashboard bleibt fachlich nutzbar, wirkt aber weniger wie ein internes Admin-Tool.

Folgeaktion:

- FIN-046 kann App-Shell und Navigation an die neue Dashboard-Sprache angleichen.

## 2026-05-25 - FIN-027 entkoppelt Monatslogik von alter Fixkosten-Linktabelle

Quelle/Ticket: `FIN-027`

Erkenntnis/Entscheidung:

- Die Dashboard-Berechnung nutzt nicht mehr `fixed_cost_transaction_links` oder `wirkt_fuer_monat`.
- `Verfuegbar` wird als `Einnahmen - aktive Fixkosten (Plan) - variable Ausgaben` berechnet.
- Als `Fixkosten (Ist-Kontrolle)` wird ein separater Kontrollwert aus importierten
  FIN-026-Fixkostenmarkierungen gefuehrt (N26-Sammeltransfer + direkte Fixkostenmatches).
- Diese Ist-Kontrolltreffer werden aus der variablen Ausgabensumme herausgerechnet.

Auswirkung:

- Die Monatslogik folgt dem neuen Monatsblockmodell und bleibt klar von alter Markierungslogik getrennt.
- Erkannten Fixkostenimporte verzerren nicht mehr die variable Monatsausgaben-KPI.

Folgeaktion:

- FIN-028 kann die UI auf diese getrennten Kennzahlen aufsetzen.

## 2026-05-30 - FIN-034 vereinheitlicht Monatsansichten auf ein zentrales Readmodel

Quelle/Ticket: `FIN-034`

Erkenntnis/Entscheidung:

- Monatsaggregation fuer KPIs, Kategorien, Sonderbudgets, Fixkosten-Kontrollsicht und Monatsbuchungen liegt jetzt in `src/months/**` als gemeinsame Lesebasis.
- Dashboard-Readlogik baut darauf nur noch als Adapter auf, statt dieselben Monatsabfragen separat zu pflegen.
- Monatsbuchungen werden in allen Monatslesesichten einheitlich nach `booking_date DESC, id DESC` bereitgestellt.

Auswirkung:

- Monatsliste, Monatsdetailseite und Dashboard koennen fachlich konsistent auf denselben Monatsdaten aufsetzen.
- Doppelte Monats-SQL und Drift-Risiko zwischen Monatsseiten und Dashboard sinken deutlich.

Folgeaktion:

- Nachfolgende Monats-UI-Tickets sollen neue Monatsdaten bevorzugt an das zentrale Readmodel andocken, nicht an eigene Monatsabfragen.

## 2026-05-30 - FIN-035 gibt Monatsseiten eine eigene ruhige UI-Hierarchie

Quelle/Ticket: `FIN-035`

Erkenntnis/Entscheidung:

- Monatsliste und Monatsdetailseite bekommen eine eigene visuelle Sprache mit weichen Panels, klarer Typohierarchie und leichterem Monatswechsel.
- Die neue Monats-UI bleibt bewusst auf `app/monate/**` fokussiert; das Dashboard wird nicht parallel in denselben Look gezogen.
- Monatsbezogene Tabellen bleiben dicht und lesbar, werden aber in konsistente Surface-Shells eingebettet.

Auswirkung:

- Die Monatsarbeit fuehlt sich klarer und eigenstaendiger an als die restlichen Verwaltungsseiten.
- Nachfolgende Monats-Tickets koennen diese UI-Bausteine erweitern, ohne den Rest der App neu zu stylen.

Folgeaktion:

- Weitere visuelle Politur fuer nicht-monatliche Bereiche nur in eigenen Tickets und nicht implizit ueber Monatsarbeit mitziehen.

## 2026-05-29 - FIN-030 fuehrt `effective_month_key` als fachlichen Monatsanker ein

Quelle/Ticket: `FIN-030`

Erkenntnis/Entscheidung:

- `transactions` enthaelt jetzt das Pflichtfeld `effective_month_key` (`YYYY-MM`).
- Eine Migration backfillt Bestandsdaten robust aus `booking_date` und legt einen Index auf `effective_month_key` an.
- Monatsbezogene Aggregationen in Dashboard, Budgets und Kategorie/Trend-Reports verwenden fachlich nur noch `effective_month_key`.
- Persistenzpfade fuer manuelle und importierte Buchungen setzen `effective_month_key` beim Schreiben explizit.

Auswirkung:

- Monatslogik ist zentral und konsistent an einem fachlichen Feld gebuendelt.
- Folgearbeit zu Monatsnavigation und abweichendem Zielmonat (FIN-031 ff.) kann ohne erneuten Schemawechsel aufbauen.

Folgeaktion:

- In FIN-031 bis FIN-035 kann die UI den Zielmonat gezielt steuern, ohne Monatsaggregation erneut umzubauen.

## 2026-05-25 - FIN-029 konsolidiert Altlogik und Doku auf das Monatsblockmodell

Quelle/Ticket: `FIN-029`

Erkenntnis/Entscheidung:

- Verbleibende Altlogik zur manuellen Fixkosten-Transaktionszuordnung wurde aus App-/Repository-Pfaden entfernt.
- Historische Begriffe wie `Transfer-Kandidat -> N26` wurden in UI, Tests und Doku auf die aktuelle
  Kontrollsicht-Sprache umgestellt.
- Die vorinstallierte N26-Regel wird einheitlich als `N26 Sammeltransfer Kontrolle` gefuehrt.
- Historische Entscheidungen aus FIN-009/FIN-021/FIN-023 bleiben dokumentiert, werden aber klar als
  durch FIN-024 bis FIN-028 ueberholt eingeordnet.

Auswirkung:

- Es gibt keinen widerspruechlichen Mix aus Alt- und Neumodell mehr.
- Ticket-Folge FIN-024 bis FIN-029 ist in Code, Tests und Doku konsistent nachvollziehbar.

Folgeaktion:

- Neue Tickets sollen ausschliesslich auf die Kontrollsicht- und Monatsblockbegriffe referenzieren.

## 2026-05-25 - FIN-028 entfernt manuelle Fixkosten-Markierung aus der UI

Quelle/Ticket: `FIN-028`

Erkenntnis/Entscheidung:

- Die Seite `/fixkosten` zeigt keine manuelle Zuordnung von Einzeltransaktionen (`wirkt_fuer_monat`) mehr.
- Stattdessen wird eine reine Kontrollsicht mit erkannten Fixkosten-Treffern aus Importen angezeigt
  (N26-Sammeltransfer und direkte Fixkostenmatches).
- Die Transaktionsseite behandelt Fixkosten nicht mehr als manuellen Sonderstatus innerhalb variabler Buchungen.
- Es gibt keine fachliche Join-Abhaengigkeit zur alten Linktabelle.

Auswirkung:

- Die UI entspricht dem vereinfachten Monatsblockmodell aus FIN-024 bis FIN-027.
- Nutzer sehen Fixkostenpflege und Fixkostenkontrolle klar getrennt, ohne alte Mischlogik.

Folgeaktion:

- Weitere UI-Politur (falls gewuenscht) kann in separaten Tickets erfolgen, ohne die Fachlogik erneut anzufassen.

## 2026-05-24 - FIN-021 Doku-Nachzug in Briefing und Domain Model

Quelle/Ticket: `FIN-021`, Folge `FIN-022`

Erkenntnis/Entscheidung:

- Die in FIN-021 entschiedene Fixkosten-Monatszuordnung wird in den Kern-Dokumenten konsistent nachgezogen.
- `project-briefing.md` beschreibt jetzt die MVP-Regel mit optionalem `wirkt_fuer_monat` (`YYYY-MM`) und Default auf Buchungsmonat.
- Die offene Frage zur Fixkosten-Monatszuordnung wurde aus den offenen Fragen entfernt, da fachlich bereits entschieden.
- `domain-model.md` fuehrt die gleiche Regel explizit fuer Planung/Ist bei Monatswechseln.
- Historischer Hinweis: Diese FIN-021-Regel wurde spaeter durch FIN-024 fachlich ersetzt.

Auswirkung:

- Kein Widerspruch mehr zwischen Ticketentscheidung und zentraler Projektdokumentation.
- Nachfolgende Tickets (insbesondere FIN-020) starten mit klarer, einheitlicher Regelbasis.

Folgeaktion:

- FIN-022 nach Review auf `status:done` setzen und schliessen.

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

## 2026-05-25 - FIN-026 stellt Importhinweise auf Fixkosten-Kontrollmarkierungen um

Quelle/Ticket: `FIN-026`

Erkenntnis/Entscheidung:

- Die Import-Vorschau verwendet fuer den bisherigen N26-Hinweis nicht mehr das Label
  `Transfer-Kandidat -> N26`, sondern `Fixkosten-Kontrolle: N26-Sammeltransfer`.
- Zusaetzlich wurde eine direkte Sparkassen-Fixkostenerkennung eingefuehrt:
  `Fixkosten-Kontrolle: Direktabbuchung (<Fixkostenname>)`.
- Match-Heuristik: Betrag muss zum aktiven Fixkostenbetrag passen, und der Buchungstext muss
  Abbuchungsinfo oder Fixkostennamen enthalten.
- Die Treffer werden in der Importseite als separater Kontrollblock sichtbar gemacht.

Auswirkung:

- Import-Regeln bleiben nachvollziehbar, aber sprechen nun die neue Fachlogik aus FIN-024/FIN-025 klarer aus.
- Direkte Fixkostenabbuchungen sind bereits im Import pruefbar, ohne sofort eine neue Dashboard-Logik vorauszusetzen.

Folgeaktion:

- FIN-027 nutzt diese Kontrolltreffer fuer die Monatslogik-Abgrenzung zwischen variablen Ausgaben und Fixkostenkontrolle.

## 2026-05-22 - FIN-009 markiert Fixkosten ueber manuelle Transaktions-Verknuepfung

Quelle/Ticket: `FIN-009`

Erkenntnis/Entscheidung:

- Fuer den MVP werden Fixkosten-Transaktionen nicht automatisch erkannt, sondern manuell in der Fixkostenansicht markiert.
- Die Markierung speichert optional `wirkt_fuer_monat` (`YYYY-MM`); ohne Angabe gilt der Buchungsmonat.
- Die Transaktionsliste zeigt markierte Eintraege visuell als `Fixkosten`.
- Historischer Hinweis: Diese Entscheidung wurde durch FIN-024 bis FIN-028 fachlich und technisch abgeloest.

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

## 2026-05-22 - FIN-011A CSV-Vorschau trennt Zeilenfehler von Fatalfehlern

Quelle/Ticket: `FIN-011A`

Erkenntnis/Entscheidung:

- Der Vorschau-Parser gibt sowohl gueltige Zeilen als auch zeilenbezogene Parsing-Fehler zurueck, statt beim ersten Fehler komplett abzubrechen.
- Fatalfehler (keine Datei, leere Datei, komplett unlesbar) werden separat behandelt.
- Vorschau zeigt die fuer FIN-010 relevanten Felder direkt normalisiert: Buchungstag, Betrag, Beschreibung, Gegenpartei, Info.

Auswirkung:

- Nutzer koennen auch bei teilfehlerhaften CSVs bereits valide Buchungen pruefen.
- Fehler sind klar nachvollziehbar ueber Zeilenhinweise im Importscreen.

Folgeaktion:

- FIN-011B kann auf dieser Vorschau die Duplikatmarkierung aufsetzen.

## 2026-05-23 - FIN-011B Importpersistenz mit Dedupe-Fingerprints

Quelle/Ticket: `FIN-011B`

Erkenntnis/Entscheidung:

- Sparkassen-Importpersistenz protokolliert jeden Lauf in `import_runs` und persistiert erfolgreich importierte Zeilen in `transactions` + `imported_transactions`.
- Duplikaterkennung erfolgt ueber einen SHA-256 Fingerprint auf normalisierten Kernfeldern aus FIN-010 (u. a. Konto, Buchungstag, Betrag, Gegenpartei, Verwendungszweck, End-to-End, Mandatsreferenz).
- Importierte `expense`-Buchungen duerfen initial ohne Kategorie/Sonderbudget gespeichert werden; manuelle Ausgaben behalten die bestehende Pflichtzuordnung.

Auswirkung:

- Doppelte CSV-Importe werden nachvollziehbar als Duplikate gezaehlt und nicht erneut importiert.
- Ergebniszahlen pro Importlauf (`detected/imported/duplicate`) sind konsistent abrufbar.
- FIN-011C kann auf den persistierten Importdaten fuer Bestaetigungs- und Markierungs-UI aufsetzen.

Folgeaktion:

- In FIN-011C unzugeordnete importierte Ausgaben sichtbar markieren und nachtraegliche Zuordnung abschliessen.

## 2026-05-23 - FIN-011C Importbestaetigung und Ergebnisdarstellung abgeschlossen

Quelle/Ticket: `FIN-011C`

Erkenntnis/Entscheidung:

- Der Importscreen fuehrt Vorschau und Bestaetigung ueber einen gemeinsamen Upload-Flow mit zwei Intents (`preview`/`confirm`) zusammen.
- Bei `confirm` wird direkt persistiert und die Ergebniszahlen aus `import_runs` (gefunden/importiert/duplikat) werden unmittelbar im UI angezeigt.
- Die Transaktionsansicht trennt importierte Transfers sichtbar von importierten Ausgaben/Einnahmen; unzugeordnete importierte Ausgaben werden explizit als `Zuordnen` markiert.

Auswirkung:

- Import kann im MVP-Endzustand ohne Zwischenschritte bestaetigt werden.
- Importierte Buchungen sind in `Transaktionen` sichtbar und fachlich klar getrennt dargestellt.
- Offene Zuordnungen aus Importen sind fuer Folgeschritte (z. B. Regelengine/Zuordnungsdialog) klar erkennbar.

Folgeaktion:

- In FIN-012 auf dieser Markierung aufsetzen und Zuordnungsregeln zur schrittweisen Automatisierung einfuehren.

## 2026-05-23 - FIN-013B Dashboard trennt Budgetsicht, Sonderbudgets und Transferdarstellung

Quelle/Ticket: `FIN-013B`

Erkenntnis/Entscheidung:

- Das Monatsdashboard nutzt die bestehende FIN-013A-Aggregation unveraendert und bildet die UI in getrennten Abschnitten ab: Kategorien, Sonderbudgets und Monatsbuchungen.
- Transfers werden im Dashboard explizit markiert und nicht als Ausgaben in Budgettabellen interpretiert.
- Fixkosten werden in der Monatsbuchungsliste ueber eigenen visuellen Status hervorgehoben und bleiben damit in relevanten Ansichten klar erkennbar.
- Historischer Hinweis: Die visuelle Fixkosten-Markierung in Monatsbuchungen wurde spaeter durch FIN-028 entfernt.

Auswirkung:

- Die Monatsuebersicht ist als nutzbare UI direkt fuer MVP 3 einsetzbar.
- Warnungen bei Ueberschreitungen sind transparent und ohne neue Fachlogik sichtbar.

Folgeaktion:

- FIN-014/FIN-015 koennen auf der stabilen Dashboard-Basissicht mit vertieften Auswertungen aufsetzen.

## 2026-05-23 - FIN-012 Regelvorschlaege als persistente Import-Regeln eingefuehrt

Quelle/Ticket: `FIN-012`

Erkenntnis/Entscheidung:

- Import-Regeln werden als persistente Datensaetze (`import_rules`) mit Match-Feld, Muster, Zieltyp und Prioritaet verwaltet.
- Regelvorschlaege werden im Import-Preview pro Zeile eingeblendet und priorisiert nur der erste passende Treffer je Buchung verwendet.
- Zieltypen im MVP: Kategorie, Sonderbudget oder `Transfer -> Bargeld` (inkl. expliziter Regelmoeglichkeit fuer Bargeldabhebung).

Auswirkung:

- Wiederkehrende Buchungen koennen schneller mit konsistenten Vorschlaegen verarbeitet werden.
- Regeln sind nachtraeglich editierbar und lassen sich schrittweise verfeinern.

Folgeaktion:

- In einem Folgeschritt kann die Uebernahme der Vorschlaege von rein visueller Empfehlung auf direkte Zuordnungsaktion erweitert werden.

## 2026-05-24 - FIN-016 nutzt dateibasierte SQLite-Backups mit konfigurierbarem Zielordner

Quelle/Ticket: `FIN-016`

Erkenntnis/Entscheidung:

- Das MVP-Backup wird als Datei-Kopie der SQLite-DB umgesetzt (`scripts/backup/create-backup.mjs`).
- Der Zielordner ist konfigurierbar ueber `BUDGETBUDDY_BACKUP_DIR` oder CLI-Flag `--backup-dir`.
- Fuer automatische lokale Backups wird ein Cron-Beispiel bereitgestellt, ohne plattformspezifische Deployment-Logik.

Auswirkung:

- Manuelle Sicherung ist direkt nutzbar und ohne Datenmodell-/Runtime-Aenderung moeglich.
- Auto-Backup ist fuer lokale Nutzung vorbereitet und bleibt bewusst einfach nachvollziehbar.

Folgeaktion:

- Restore-Schritte sind in `docs/backup-and-restore.md` dokumentiert.

## 2026-05-24 - FIN-015 markiert Ausreisser ueber 1,5x Kategorien-Durchschnitt im Filterzeitraum

Quelle/Ticket: `FIN-015`

Erkenntnis/Entscheidung:

- Fuer die erste Trend-Auswertung gilt eine Buchungs-/Monatsausgabe je Kategorie als Ausreisser, wenn sie mindestens `1,5x` ueber dem Kategorie-Durchschnitt des gewaehlten Zeitraums liegt.
- Der Vergleich aktueller Monat wird gegen Vormonat (falls im Zeitraum vorhanden) und gegen den Durchschnitt der Vormonate angezeigt.

Auswirkung:

- Ausreisser sind fuer Nutzer schnell erkennbar, ohne komplexe Statistik im MVP einzufuehren.
- Die Logik bleibt spaeter erweiterbar (z. B. robustere Schwellen).

Folgeaktion:

- Bei spaeterem Feedback kann die Ausreisser-Definition in FIN-020+ nachgeschaerft werden.

## 2026-05-25 - FIN-023 nutzt editierbare Default-Regel fuer N26-Transfer-Kandidaten

Quelle/Ticket: `FIN-023`

Erkenntnis/Entscheidung:

- Fuer N26-Transfer-Kandidaten wird eine vorinstallierte, aber voll editierbare Import-Regel genutzt (`N26 Transfer-Kandidat`, Pattern `N26-Fix.`).
- Treffer werden im Import als Vorschlag `Transfer-Kandidat -> N26` angezeigt und nicht hart als `transfer` persistiert.
- Damit bleibt der manuelle Override auf `expense` erhalten, wie in #26 gefordert.
- Historischer Hinweis: Die Begriffe wurden spaeter in FIN-026/FIN-029 auf die Kontrollsicht umgestellt.

Auswirkung:

- Das Pattern ist ohne Codeaenderung in der Regelverwaltung pflegbar.
- Die Importklassifikation bleibt transparent und nicht-blackboxartig.

Folgeaktion:

- Falls spaeter gewuenscht, kann eine explizite Confirm-UI fuer pro-Zeile-Uebernahme von Kandidaten folgen.

## 2026-05-25 - FIN-024 setzt neues Fixkosten-Leitmodell auf Monatsblock fest

Quelle/Ticket: `FIN-024` (Abgrenzung zu `#27` und `#36`)

Erkenntnis/Entscheidung:

- Das Fixkostenmodell wird auf ein einfaches Monatsblock-Modell aus der Fixkostenliste festgelegt.
- Die aktive Fixkostensumme reduziert den verfuegbaren Monatsbetrag direkt.
- `wirkt_fuer_monat` und die manuelle Fixkosten-Markierung einzelner Transaktionen sind nicht mehr Teil des Zielmodells.
- N26 wird nicht als eigenes Fachobjekt modelliert; Sparkasse -> N26 ist ein technischer Zahlungsweg fuer bereits bekannte Fixkosten.
- Erkannte N26-Sammeltransfers und direkte Sparkassen-Fixkostenmatches bleiben als Kontrollsicht sichtbar, fachlich aber ausserhalb der normalen variablen Monatsausgaben.

Auswirkung:

- Die vorherige Linienfuehrung aus `#27`/`#36` wird bewusst abgeloest.
- Doku-Basis fuer alle Folgeumsetzungen ist jetzt einheitlich.

Folgeaktion:

- Folge-Issues als Umsetzungsreihe nutzen: `#56` (Datenmodell/Persistenz), `#57` (Import-Erkennung), `#58` (Monatslogik/Dashboard), `#59` (Fixkosten-/Transaktions-UI).

## 2026-05-25 - FIN-025 stilllegt manuelle Fixkosten-Transaktionszuordnung technisch

Quelle/Ticket: `FIN-025`

Erkenntnis/Entscheidung:

- Die manuelle Zuordnung einzelner Transaktionen zu Fixkosten (`fixed_cost_transaction_links` + `wirkt_fuer_monat`) wird im Repository bewusst deaktiviert.
- Neue Zuordnungen/Entfernungen sind im Monatsblock-Modell nicht mehr erlaubt und liefern eine klare Fehlermeldung.
- Die technische Migration ist nicht-destruktiv: bestehende lokale Link-Daten werden nicht automatisch geloescht, aber fuer neue Zuordnungen nicht mehr genutzt.
- In `app_meta` wird der Modus mit `fixed_cost_assignment_mode=deprecated` markiert.

Auswirkung:

- Fixkosten-Persistenz folgt der neuen Leitentscheidung aus FIN-024.
- Folge-Tickets koennen Import-Erkennung und Dashboard-Logik auf einer klaren, vereinfachten Basis aufbauen.

Folgeaktion:

- FIN-026 bis FIN-028 setzen auf dieser Basis auf (Erkennung, Monatslogik, UI-Vereinfachung).

## 2026-05-29 - FIN-031 macht Zielmonat in manueller Erfassung und Import-Confirm explizit

Quelle/Ticket: `FIN-031`

Erkenntnis/Entscheidung:

- Der fachliche Zielmonat (`effective_month_key`) wird in der manuellen Transaktionsmaske und beim Bearbeiten explizit erfasst (`YYYY-MM`).
- Beim Import-Confirm kann ein Zielmonat fuer den gesamten Importlauf gesetzt werden; ohne Eingabe wird ein Standardmonat aus den Import-Buchungen erkannt.
- Sonderbudget-Monatspruefungen laufen gegen den fachlichen Zielmonat statt gegen das reine Buchungsdatum.

Auswirkung:

- Buchungsdatum und fachlicher Auswertungsmonat koennen bewusst voneinander abweichen, ohne Umwege ueber Datenmigrationen.
- Monatsbezogene Auswertungen und Sonderbudget-Zuordnungen bleiben konsistent mit der Nutzerentscheidung.

Folgeaktion:

- FIN-032 bis FIN-035 koennen auf expliziten Zielmonaten in Import/Manuell-Flow aufbauen.

## 2026-05-30 - FIN-032 fuehrt Monatsliste als zentralen Einstieg ueber bestehende Dashboard-Details ein

Quelle/Ticket: `FIN-032`

Erkenntnis/Entscheidung:

- Die neue Route `/monate` zeigt eine lueckenlose Monatsliste vom ersten gespeicherten Aktivitaetsmonat bis zum aktuellen Monat.
- Leere Zwischenmonate werden bewusst mitgefuehrt, damit Monatsnavigation nicht von vorhandenen Buchungen abhaengt.
- Die Klick-Navigation fuehrt zunaechst auf die bestehende Dashboard-Monatsansicht via `/?month=YYYY-MM`, statt bereits eine eigene Detailseite aus FIN-033 vorwegzunehmen.

Auswirkung:

- Nutzer bekommen einen klaren Monats-Einstieg, ohne dass wir fuer FIN-032 schon eine neue Detailansicht doppelt aufbauen muessen.
- FIN-033 und FIN-034 koennen spaeter auf derselben Monatsnavigation aufsetzen und eine eigene Detailseite ablösen oder vertiefen.

Folgeaktion:

- Monatsdetail-Readmodel und Monatsdetailseite werden in FIN-033/FIN-034 weiter vereinheitlicht.

## 2026-05-30 - FIN-033 fuehrt zentrale Monatsdetailseite auf Basis des Monats-Readmodells ein

Quelle/Ticket: `FIN-033`

Erkenntnis/Entscheidung:

- Die Monatsliste verlinkt nicht mehr in das Dashboard, sondern in eine echte Monatsdetailroute `/monate/[monthKey]`.
- Die Monatsdetailseite nutzt ein zentrales Monats-Readmodell fuer KPIs, Fixkostenblock sowie die komplette gemeinsame Buchungsliste aus manuellen und importierten Transaktionen.
- Die Vor-/Folgenavigation arbeitet monatsweise auf Kalenderbasis; der Folgemonat wird ab dem aktuellen Monat nicht weiter angeboten.

Auswirkung:

- Ein Monat ist jetzt an einer Stelle vollstaendig lesbar, ohne zwischen Dashboard, Transaktionen und Sonderbereichen springen zu muessen.
- FIN-034 kann auf diesem Modell weiter aufsetzen und spaetere Monatsansichten fachlich weiter vereinheitlichen.

Folgeaktion:

- FIN-035 kann die neue Monatsdetailstruktur visuell vereinfachen, ohne die Fachlogik erneut umzubauen.

## 2026-06-01 - FIN-038 trennt globales Kategorie-Standardbudget und Monats-Override sauber

Quelle/Ticket: `FIN-038`

Erkenntnis/Entscheidung:

- `/budgets` pflegt ab jetzt den globalen Standardwert je fester Kategorie statt eines monatsbezogenen Werts.
- Die Monatsdetailseite darf fuer einen konkreten `effective_month_key` einen abweichenden Monatswert direkt pro Kategorie setzen.
- Die Monatssicht verwendet immer einen effektiven Budgetwert nach Prioritaet: Monats-Override zuerst, sonst globaler Standardwert.
- Ein leerer Inline-Wert in der Monatsdetailseite entfernt nur den Monats-Override dieses Monats; der globale Standard bleibt unberuehrt.
- Beim Datenuebergang aus dem frueheren reinen Monatsbudget-Modell wird pro Kategorie der zuletzt gepflegte Monatswert als initialer globaler Standardwert uebernommen.

Auswirkung:

- Nutzer koennen Monatsarbeit direkt in `/monate/[monthKey]` erledigen, ohne den globalen Kategorien-Standard versehentlich zu ueberschreiben.
- Monatsdetailseite, Dashboard und weitere Monatslesesichten koennen dieselbe Budgetbasis verwenden.
- Das Datenmodell traegt nun sowohl den globalen Kategorie-Standard als auch optionale monatsbezogene Overrides.

Folgeaktion:

- FIN-039 kann dieselbe Interaktionsidee fuer Sonderbudgets im Monatskontext weiterziehen.

## 2026-06-01 - FIN-039 macht bestehende Sonderbudgets direkt im Monatskontext bearbeitbar

Quelle/Ticket: `FIN-039`

Erkenntnis/Entscheidung:

- Auf `/monate/[monthKey]` koennen bestehende Sonderbudgets jetzt direkt pro Monatszeile angepasst werden.
- Bearbeitet werden nur Eigenschaften des konkreten Monatseintrags: geplanter Betrag sowie Aktiv/Inaktiv.
- Es werden dadurch keine globalen Sonderbudget-Vorlagen eingefuehrt; die Sonderbudget-Seite bleibt die Stelle fuer Neuanlage und Gesamtuebersicht.

Auswirkung:

- Die Monatsdetailseite wird weiter zu einer echten Monatsarbeitsoberflaeche ausgebaut.
- Plan / Ist / Rest und Status aktualisieren sich im selben Monatskontext, ohne Wechsel auf eine andere Verwaltungsseite.

Folgeaktion:

- Spaetere Tickets koennen entscheiden, ob auch die Neuanlage aus der Monatsseite heraus sinnvoll ist oder bewusst getrennt bleiben soll.

## 2026-06-01 - FIN-040 zieht Ausgaben-Zuordnung direkt in die Monatsdetailseite

Quelle/Ticket: `FIN-040`

Erkenntnis/Entscheidung:

- Die Monatsdetailseite darf Ausgaben jetzt direkt inline Kategorien oder aktiven Sonderbudgets desselben Monats zuweisen und umzuweisen.
- Dafuer wird die Ausgaben-Zuordnungslogik zentral im Transaktions-Repository gebuendelt, statt getrennte Regeln fuer manuelle und importierte Monatsbuchungen aufzubauen.
- Importierte Ausgaben duerfen im Datenmodell weiterhin offen bleiben, bis der Nutzer sie zuordnet; nach einer Zuordnung gelten aber dieselben Fachregeln wie bei manuellen Ausgaben.
- Einkommen, Transfers und Rueckerstattungen bleiben in der Monatsbuchungsliste bewusst read-only.

Auswirkung:

- Die Monatsseite wird zur eigentlichen Arbeitsoberflaeche fuer die fachliche Pruefung eines Monats.
- Manuelle und importierte Ausgaben folgen bei spaeteren Monatsaenderungen derselben serverseitigen Validierung.
- Ungueltige Kombinationen bleiben an der Repository- und Datenbankgrenze blockiert.

Folgeaktion:

- Ein spaeteres Ticket kann entscheiden, ob offene importierte Ausgaben auf der Monatsseite noch staerker gefiltert oder priorisiert hervorgehoben werden sollen.

## 2026-06-01 - FIN-042 buendelt Kategorien, Standardbudgets und Sonderbudgets unter einem Verwaltungsbereich

Quelle/Ticket: `FIN-042`

Erkenntnis/Entscheidung:

- Der bestehende Haupttab `Budgets` wird zur gemeinsamen Verwaltungsseite fuer Kategorien, globale Standardbudgets und Sonderbudgets ausgebaut.
- Die separaten Haupttabs `Kategorien` und `Sonderbudgets` entfallen aus der Navigation, um die Oberflaeche fuer den MVP ruhiger und kompakter zu machen.
- Die bisherigen Einzelrouten `/kategorien` und `/sonderbudgets` bleiben technisch erhalten, leiten aber auf den gemeinsamen Verwaltungsbereich weiter.
- Die Fachlogik, Persistenz und bestehenden Server-Actions bleiben erhalten; geaendert wird bewusst nur die UI- und Navigationsstruktur.

Auswirkung:

- Nutzer pflegen die drei nah verwandten Verwaltungsbereiche an einer Stelle statt verteilt ueber mehrere Hauptseiten.
- Die Navigation reduziert sich, ohne dass Monatslogik, Datenmodell oder Zuordnungsregeln still geaendert werden.
- Die Budgets-Sektion zeigt in der Hauptoberflaeche nur noch die Kernpflege des globalen Standardwerts; Monats-Overrides bleiben weiterhin Aufgabe der Monatsansicht.

Folgeaktion:

- Spaetere Tickets koennen separat pruefen, ob aus der gebuendelten Verwaltungsoberflaeche spaeter auch fachliche oder logische Vereinfachungen folgen sollen, ohne FIN-042 im Nachhinein zu ueberladen.

## 2026-06-04 - FIN-047 macht die Monatsansicht zum konkreten UI-Referenzscreen

Quelle/Ticket: `FIN-047`

Erkenntnis/Entscheidung:

- Die Monatsdetailseite orientiert sich ab jetzt am gelieferten hellen Finanz-Referenzscreen und wird als erste konkrete visuelle Leitseite fuer weitere UI-Arbeit genutzt.
- Der sichtbare Einstieg bleibt fachlich knapp: Monatskopf, prominente KPI-Karten fuer Einnahmen und Ausgaben, Budget-Breakdown nach Kategorien und die letzten fuenf Ausgaben.
- Ein grosser Balance-Hero sowie ein `Budget Utilized`-KPI werden bewusst nicht uebernommen, weil diese Elemente fachlich nicht zur aktuellen BudgetBuddy-Monatsarbeit gehoeren.
- Die bestehende Monatsarbeit fuer Budgetwerte, Sonderbudgets, Fixkostenkontrolle und Buchungszuordnung bleibt darunter erhalten, aber ruhiger und kartiger statt als schwere Tabellenflaeche.

Auswirkung:

- Die Monatsseite kann als konkrete Referenz fuer kommende UI-Tickets dienen, ohne Monatslogik, Budgetlogik oder Import-/Zuordnungsregeln zu veraendern.
- Die neue visuelle Richtung priorisiert helle Flaechen, Navy-Typografie, weiche Karten, dezente Akzente und klare Finanzhierarchie.

Folgeaktion:

- Weitere UI-Tickets sollten diese Monatsansicht als Massstab nehmen und Dashboard/Shell nicht mehr automatisch als alleinige visuelle Referenz behandeln.

## 2026-06-04 - FIN-050 beruhigt die Monatsansicht durch Dialoge und einklappbare Details

Quelle/Ticket: `FIN-050`

Erkenntnis/Entscheidung:

- Budgetpflege, Sonderbudgetpflege und Fixkostenkontrolle bleiben direkt auf der Monatsdetailseite erreichbar, werden aber aus der dauerhaft sichtbaren Seitenstruktur in Dialoge verschoben.
- Normale Kategorienbudgets und Sonderbudgets werden im selben Budgetpflege-Dialog angeboten, bleiben dort aber visuell und fachlich getrennt; Sonderbudgets erhalten einen hellen gelben Akzent.
- Die vollstaendige Monatsbuchungsliste bleibt erhalten, wird aber als einklappbarer Bereich umgesetzt, damit die letzten fuenf Ausgaben die ruhige Hauptansicht nicht verlieren.

Auswirkung:

- Die Monatsuebersicht bleibt kompakter und staerker an der FIN-047-Referenzsprache orientiert.
- Es werden keine Budget-, Sonderbudget-, Fixkosten- oder Zuordnungsregeln geaendert; die bestehenden Server-Actions bleiben die fachlichen Grenzen.

Folgeaktion:

- Spaetere UI-Tickets koennen pruefen, ob Dialog- und Disclosure-Muster als wiederverwendbare Komponenten fuer weitere Seiten formalisiert werden sollen.

## 2026-06-04 - FIN-051 reduziert `/monate` auf reine Monatsauswahl

Quelle/Ticket: `FIN-051`

Erkenntnis/Entscheidung:

- Die Uebersichtsseite `/monate` dient ab jetzt nur noch der schnellen Auswahl verfuegbarer Monate.
- Pro Monat wird nur noch der lesbare Monatsname mit Jahr angezeigt; technische Monatskeys und KPI-Vorschauwerte entfallen bewusst.
- Der neueste Monat bleibt visuell leicht hervorgehoben, ohne daraus eine inhaltliche Monatsvorschau zu machen.

Auswirkung:

- Fachliche Monatsinformationen bleiben auf der Monatsdetailseite; `/monate` wird zu einer ruhigen Navigationsflaeche.
- Es werden keine Monatslogik, Readmodels oder Budget-/Transaktionsregeln geaendert.

## 2026-06-04 - FIN-054 entfernt globale Kopfzeile und reduziert Monats-Hilfstexte

Quelle/Ticket: `FIN-054`

Erkenntnis/Entscheidung:

- Die globale Kopfzeile mit Monatsfokus und statischen Status-Badges wird entfernt, weil sie fuer die aktuelle MVP-Navigation keinen fachlichen Mehrwert bietet.
- In der Monatsdetailseite werden technische Monatslabels, `Aktuellster Monat` und erklaerende Hilfstexte weiter reduziert.
- Monatsaktionen bleiben erreichbar, werden aber praeziser als kleine Aktionsbuttons rechts oben in ihren Karten platziert; die Buchungsliste nutzt ein Chevron als Disclosure-Steuerung.

Auswirkung:

- Die App-Shell und Monatsansicht wirken ruhiger und naeher an der FIN-047-Premium-UI.
- Es werden keine Fachlogik, Navigationseintraege, Budget-, Fixkosten-, Transaktions- oder Importregeln geaendert.

## 2026-06-04 - FIN-052 buendelt manuelle Buchungen und Import im Monats-Overlay

Quelle/Ticket: `FIN-052`

Erkenntnis/Entscheidung:

- Die Monatsdetailseite erhaelt eine zentrale Aktion `Hinzufuegen`, die ein grosses Overlay im Monatskontext oeffnet.
- Das Overlay bietet getrennte Modi fuer Ausgabe, Einnahme und Import, nutzt aber die bestehenden Repository- und Importpfade weiter.
- Manuelle Ausgaben waehlen Kategorie oder Sonderbudget als gemeinsame Kachel-Auswahl, damit weiterhin genau eine Ausgabezuordnung entsteht.
- Der Importbereich bettet die bestehende Sparkassen-Importvorschau ein und belegt den Zielmonat mit dem aktuell geoeffneten Monat vor.

Auswirkung:

- `/transaktionen` und `/import` bleiben technisch und funktional erhalten, werden aber fuer die Monatsarbeit nicht mehr als primaere Einstiege benoetigt.
- Es werden keine neuen Import-, Kategorie-, Sonderbudget- oder Persistenzregeln eingefuehrt; die Monatsseite wird nur als zentraler Einstieg gestärkt.

## 2026-06-04 - FIN-053 entfernt Transaktionen und Import aus der Hauptnavigation

Quelle/Ticket: `FIN-053`

Erkenntnis/Entscheidung:

- Die Hauptnavigation zeigt `Transaktionen` und `Import` nicht mehr als sichtbare Haupttabs.
- Manuelle Einnahmen, manuelle Ausgaben und Sparkassen-Import bleiben ueber die Monatsdetailseite und das FIN-052-Monatsaktions-Overlay erreichbar.
- Die bestehenden Routen `/transaktionen` und `/import` bleiben technisch erhalten, damit bestehende Logik, Fallbacks und interne Pruefpfade nicht destruktiv entfernt werden.

Auswirkung:

- Die Navigation fuehrt staerker in die Monatsansicht als zentralen Arbeitsort.
- Es werden keine Transaktions-, Import-, Kategorie-, Sonderbudget- oder Zielmonat-Regeln geaendert.

## 2026-06-04 - FIN-056 stabilisiert Monatsimport nach Vorschau und Re-Import

Quelle/Ticket: `FIN-056`

Erkenntnis/Entscheidung:

- Der Sparkassen-Import behandelt eine Buchung als Duplikat, wenn entweder `imported_transactions.dedupe_fingerprint` oder `transactions.import_fingerprint` bereits existiert.
- Die Import-Vorschau speichert die geladene Datei serverseitig ueber einen kurzlebigen Preview-Token mit Ablaufzeit und Groessenbegrenzung, damit `Import bestaetigen` nach `Vorschau laden` ohne erneute Dateiauswahl funktioniert.
- Im Monatsaktions-Overlay bleibt der geoeffnete Monat technisch als hidden Zielmonat erhalten, wird aber nicht mehr als bearbeitbares Feld angezeigt.

Auswirkung:

- Re-Importe landen in der fachlichen Duplikatzaehlung statt in einer rohen SQLite-Unique-Fehlermeldung.
- Der normale Importbereich und das eingebettete Monatsaktions-Overlay nutzen weiterhin dieselbe Importlogik.
- Abgelaufene Preview-Tokens werden fachlich als erneute Dateiauswahl behandelt; sensible CSV-Inhalte bleiben nicht unbegrenzt im Prozessspeicher.
- Es werden keine neuen Bank-, Kategorie-, Sonderbudget- oder Zielmonat-Fachregeln eingefuehrt.

## 2026-06-05 - FIN-057 macht Bargeld im Monatsdialog zum Konto-Override

Quelle/Ticket: `FIN-057`

Erkenntnis/Entscheidung:

- Der neue `Bargeld`-Schalter im Hinzufuegen-Dialog aendert keine Bargeld-Architektur, sondern ersetzt bei manueller Ausgabe/Einnahme serverseitig das gewaehlte Konto durch das aktive Bargeldkonto.
- Ist `Bargeld` nicht aktiv, bleibt die bestehende Kontoauswahl bzw. Standardkonto-Logik unveraendert.
- Der Dialog wird visuell groesser und referenznaeher gestaltet; Ausgabe, Einnahme und Import bleiben weiter im gleichen Monatsoverlay.

Auswirkung:

- Barzahlungen lassen sich im Monatskontext schneller erfassen, ohne das Datenmodell oder bestehende Transaktionsregeln zu erweitern.
- Der geoeffnete Monat bleibt technisch hidden gesetzt; kein sichtbares Zielmonat-Feld wird wieder eingefuehrt.
- Die bestehende Importlogik bleibt unveraendert eingebettet.

## 2026-06-06 - FIN-057 richtet den Hinzufuegen-Dialog am Referenzscreen aus

Quelle/Ticket: `FIN-057`

Erkenntnis/Entscheidung:

- Der wiedereroeffnete Hinzufuegen-Dialog orientiert sich staerker am bereitgestellten Add-Transaction-Referenzscreen: Topbar, grosser Amount-Fokus, zweispaltige Eingabekarten, Kategorie-Kachelbereich und Sticky-Speichern.
- Ausgabe und Einnahme bleiben die primaeren Modi; der bestehende CSV-Import bleibt im selben Overlay als separater Modus erreichbar.
- Der `Bargeld`-Schalter bleibt eine reine Konto-Override-Entscheidung im bestehenden Formularfluss und fuehrt weiterhin keine neue Bargeld-Fachlogik ein.
- Der geoeffnete Monat bleibt nur hidden gesetzt; ein sichtbares Zielmonat-Feld wird nicht wieder eingefuehrt.

Auswirkung:

- Die Monatsaktion fuehlt sich weniger wie ein technischer Dialog und mehr wie eine fokussierte Transaktionsseite im Overlay an.
- Bestehende Import-, Konto-, Kategorie-, Sonderbudget- und Transaktionsregeln bleiben unveraendert.

## 2026-06-06 - FIN-057 reduziert die Kontoauswahl im Hinzufuegen-Dialog

Quelle/Ticket: `FIN-057`

Erkenntnis/Entscheidung:

- Die sichtbare Konto-Kachel wird aus Ausgabe und Einnahme entfernt, weil der `Bargeld`-Schalter die relevante Entscheidung im Dialog bereits abbildet.
- Das Formular sendet weiterhin ein hidden Standardkonto, damit bestehende Servervalidierung und Standardkonto-Logik unveraendert bleiben; bei aktivem `Bargeld` ueberschreibt die bestehende Serverlogik dieses Konto weiterhin mit dem aktiven Bargeldkonto.
- Der rechte `BudgetBuddy`-Text in der Dialog-Kopfzeile entfaellt, damit die Topbar ruhiger wirkt.
- Aktive Tabs erhalten eine fachliche Farbkennung: Ausgabe rot, Einnahme gruen, Import dunkelblau.
- Der Speichern-Button ist nicht mehr sticky, sondern bleibt als zentrierter Abschluss unter dem jeweiligen Formularinhalt.

Auswirkung:

- Der Dialog reduziert eine doppelte Konto-Entscheidung, ohne Konto-, Bargeld-, Import- oder Transaktionsfachlogik zu veraendern.
- Die UI folgt staerker dem gewuenschten Add-Transaction-Flow und bleibt im bestehenden FIN-057 Write-Scope.

## 2026-06-06 - FIN-057 korrigiert Datum und Dialog-Scroll

Quelle/Ticket: `FIN-057`

Erkenntnis/Entscheidung:

- Das Datumsfeld im Hinzufuegen-Dialog wird nicht mehr auf den ersten Tag des geoeffneten Monats vorbelegt, sondern clientseitig auf den aktuellen Ausfuehrungstag.
- Der Dialog begrenzt sein Overscroll-Verhalten, damit Scrollen am Ende des Overlays nicht auf die dahinterliegende Monatsseite durchgereicht wird.
- Die dekorativen Plus-/Minus-Controls neben dem Betrag werden entfernt, weil sie keine Funktion ausfuehren und deshalb eine falsche Interaktionserwartung erzeugen.

Auswirkung:

- Manuelle Buchungen starten mit dem realistischen Buchungstag, ohne Zielmonat-, Import- oder Transaktionslogik zu veraendern.
- Das Overlay verhaelt sich beim Scrollen abgeschlossener und vermeidet ungewollte Hintergrundbewegung.

## 2026-06-06 - FIN-058 begrenzt lange Buchungstexte in Monatslisten

Quelle/Ticket: `FIN-058`

Erkenntnis/Entscheidung:

- Lange importierte Bank-/Verwendungszwecktexte werden in `Letzte Ausgaben` und `Alle Monatsbuchungen` rein visuell begrenzt, damit sie keine horizontalen Layout-Overflows mehr erzeugen.
- Die Begrenzung erfolgt ueber `min-width: 0`, `overflow: hidden` und `truncate` an den betroffenen Panel-, Grid- und Textcontainern.
- Originalbeschreibungen bleiben unveraendert erhalten; eine fachliche Normalisierung oder Umbenennung importierter Buchungen bleibt FIN-059 vorbehalten.

Auswirkung:

- Betrag, Datum/Metadaten und vorhandene Zuordnungen bleiben sichtbar, waehrend lange Titel die Monatsansicht nicht mehr aus dem Viewport druecken.
- Es werden keine Import-, Persistenz-, Fingerprint- oder Transaktionsregeln geaendert.

## 2026-06-06 - FIN-060 macht Monatsbuchungen standardmaessig read-only

Quelle/Ticket: `FIN-060`

Erkenntnis/Entscheidung:

- `Alle Monatsbuchungen` bleibt einklappbar, zeigt im Normalmodus aber keine dauerhaften Formularfelder mehr pro Buchung.
- Bearbeitung wird ueber einen expliziten Editiermodus im Monatskontext aktiviert.
- Ausgaben erhalten genau ein UI-Feld `Budgetzuordnung`, das Kategorien und aktive Sonderbudgets des Monats gemeinsam anbietet.
- Manuelle Buchungen koennen im Monatskontext mit Name, Datum, Betrag und Budgetzuordnung bearbeitet sowie mit bewusster Bestaetigung geloescht werden.
- Importierte Ausgaben behalten ihre Importdaten unveraendert; im Monatskontext wird nur die Budgetzuordnung bearbeitet.

Auswirkung:

- Die Monatsbuchungsliste wirkt im Normalmodus ruhiger und transportiert Zuordnungen als Chips statt als Formularfelder.
- Die bestehende Fachregel `Kategorie oder Sonderbudget, nicht beides` bleibt die zentrale Validierung und wird nur UI-seitig eindeutiger abgebildet.
- Es werden keine Import-Fingerprints, Import-Persistenz oder automatische Kategorisierungsregeln geaendert.

## 2026-06-06 - FIN-060 Feinschliff fuer Monatsbuchungen

Quelle/Ticket: `FIN-060`

Erkenntnis/Entscheidung:

- Die Read-only-Liste nutzt die breite Monatsflaeche staerker aus: Titel, Datum, Budgetzuordnung und Betrag werden als eigene Blickpunkte dargestellt.
- Der erklaerende Read-only-Hinweis entfaellt; Editiermodus wird nur noch ueber ein Icon im Kopf aktiviert bzw. beendet.
- Wechsel in und aus dem Editiermodus sowie Monatsbuchungs-Actions springen per `#monatsbuchungen` wieder in den Buchungsbereich zurueck.
- Importierte Buchungen koennen im Editiermodus nach bewusster Bestaetigung geloescht werden.

Auswirkung:

- Die Monatsbuchungsliste wird schneller scanbar und reduziert erklaerenden UI-Text.
- Import-Loeschen entfernt die sichtbare Transaktion. Aufgrund der bestehenden `ON DELETE CASCADE`-Beziehung wird dabei auch der zugehoerige `imported_transactions`-Nachweis entfernt; derselbe Bankumsatz kann bei einem spaeteren Re-Import wieder als neu erkannt werden.
- Es wird keine Soft-Delete- oder Import-Archiv-Struktur eingefuehrt; falls geloeschte Importbuchungen dauerhaft vom Re-Import ausgeschlossen werden sollen, braucht das ein eigenes Importstrategie-Ticket.

## 2026-06-07 - Visual Check als optionales Produktgate vor Review

Entscheidung:

- Fuer UI-/UX-nahe Tickets wird ein optionales Status-Gate `status:visual-check` zwischen Implementierung und Review eingefuehrt.
- Der Visual Check ist ein Produkt-/Bediengefuehl-Check durch den Nutzer und ersetzt nicht den formalen Reviewer.
- Standardstatuslauf fuer sichtbare UI-Arbeit: `status:todo -> status:doing -> status:visual-check -> status:review -> status:ready-to-merge -> status:done`.
- Der Hauptordner `/Volumes/Intenso/Dev/Budgetbuddy` bleibt auf `main`; `localhost:3000` kann als stabile lokale Produktansicht fuer den Nutzer laufen.
- Ticket-Previews laufen aus dem jeweiligen Worktree auf einem separaten dokumentierten Port.

Grund:

- Bei UI-Feinschliff soll der Nutzer Zwischenergebnisse selbst im Browser pruefen koennen, bevor der Reviewer mit dem formalen Review beginnt.
- Dadurch bleibt der Reviewer Qualitaetsgate und wird nicht zur Geschmacksschleife fuer Produkt-/Layoutfeedback.

Folgen:

- Workflow-Dokumente und Prompts wurden um `status:visual-check`, Preview-Port-Regeln und Visual-Check-Handoff erweitert.
- Das GitHub-Label `status:visual-check` muss im Repository angelegt werden, sofern noch nicht vorhanden.

## 2026-06-07 - FIN-059 trennt Import-Anzeigenamen von Import-Regeln

Quelle/Ticket: `FIN-059`

Erkenntnis/Entscheidung:

- Import-Aliasse fuer Anzeigenamen sind globale Einstellungen und werden ueber `Einstellungen` als eigener Unterbereich gepflegt.
- Diese Aliasse gelten monatsuebergreifend fuer importierte Buchungen in Listen und veraendern nur den sichtbaren Anzeigenamen.
- Der originale Bank-/Verwendungszwecktext in `transactions.description` bleibt unveraendert gespeichert und wird im Pruef-/Editierkontext weiterhin angezeigt.
- Import-Aliasse bleiben fachlich und technisch getrennt von bestehenden Import-Regeln fuer Kategorie-, Sonderbudget-, Transfer- und Fixkosten-Kontrollvorschlaege.
- Der Unterbereich nutzt die ruhige Monatsansicht-Formsprache, damit neue Verwaltungsfenster konsistent mit der aktuellen Produkt-UI wirken.

Auswirkung:

- Monats- und Transaktionslisten koennen ruhige Anzeigenamen wie `Amazon` oder `IKEA` zeigen, ohne Import-Fingerprint, Duplikaterkennung, Budgetzuordnung oder Fixkosten-Kontrolllogik zu veraendern.
- Wiederkehrende Haendler koennen als persoenliche globale Anzeige-Regeln gepflegt werden.

## 2026-06-07 - FIN-064 nutzt Budgetverbrauch statt Kategorie-Farbe in der Monatsansicht

Quelle/Ticket: `FIN-064`

Erkenntnis/Entscheidung:

- Kategorie-Farben in der Monatsansicht zeigen beim Budgetverbrauch kuenftig den Zustand, nicht mehr eine manuell gepflegte Kategorie-Dekoration.
- Schwellenwerte fuer feste Kategorien:
  - `0 bis <70%`: gruen / `Im Rahmen`
  - `70 bis <90%`: gelb / `Beobachten`
  - `90 bis 100%`: orange / `Nahe am Limit`
  - `>100%`: rot / `Ueber Budget`
- Fehlender oder nicht positiver Budgetwert bleibt neutral und wird als `Budget fehlt` behandelt.
- Fortschrittsleisten werden optisch bei 100% begrenzt, waehrend der angezeigte Prozentwert echte Ueberschreitungen weiter sichtbar machen darf.

Auswirkung:

- Kategorie-Breakdown und Monats-Budgetpflege nutzen eine einheitliche dynamische Verbrauchsfarbe.
- Manuell gepflegte Kategorie-Farben bleiben nicht die Hauptlogik fuer Monatsverbrauch.
- Sonderbudgets behalten ihre eigene visuelle Logik und werden nicht in diese Kategorie-Farblogik gezwungen.

## 2026-06-07 - FIN-048 vereinfacht Budgetpflege als Budgettopf-Oberflaeche

Quelle/Ticket: `FIN-048`

Erkenntnis/Entscheidung:

- Die Seite `/budgets` wird wordingseitig als Pflege fuer `Budgettoepfe` und Standardwerte gefuehrt: Kategorie beschreibt die Ausgabenart, Budget beschreibt den geplanten Betrag.
- Neue Kategorien werden im Budgetbereich ueber einen Dialog angelegt; Name ist Pflicht, Icon und Standardbudget sind optional.
- Die manuelle Farbeingabe wird aus der sichtbaren Budgetpflege entfernt. Bestehende `colorHex`-Werte bleiben als versteckte Formularwerte erhalten, damit gespeicherte technische Kompatibilitaet nicht unbeabsichtigt geloescht wird.
- Sonderbudgets werden im selben Pflegebereich sichtbar markiert, bleiben fachlich aber eigene Monatstoepfe und werden nicht mit Kategorien zusammengelegt.

Auswirkung:

- Es gibt keine Datenmodell-, Import-, Monatsbudget- oder Sonderbudget-Logik-Aenderung.
- Die Farblogik bleibt fuer bestehende Darstellungen technisch verfuegbar, wird aber auf `/budgets` nicht mehr als Pflegeaufgabe angeboten.

## 2026-06-07 - FIN-048 zeigt nur aktive Budgettoepfe in der Budgetpflege

Quelle/Ticket: `FIN-048`

Erkenntnis/Entscheidung:

- Die Budgetpflege unter `/budgets` zeigt nur aktive Kategorien und aktive Sonderbudgets.
- Deaktivieren ist eine bewusste Aktion im Editiermodus und wird im normalen Lesemodus nicht dauerhaft angeboten.
- Deaktivierte Kategorien und Sonderbudgets bleiben historisch erhalten, werden aber aus dieser Pflegeansicht ausgeblendet und koennen spaeter in einer separaten Verwaltungs-/Archivsicht behandelt werden.

Auswirkung:

- Die Budgetpflege bleibt auf aktuell nutzbare Budgettoepfe fokussiert.
- Es wird kein Datenmodell geaendert; bestehende `is_active`-Felder werden weiter genutzt.
- Lokale Test-/Preview-Deaktivierungen veraendern nur die jeweilige lokale Datenbank und werden nicht mit dem Code-PR ausgeliefert.

## 2026-06-07 - FIN-066 zeigt geplante Budgettoepfe als Plan-Gefuehl

Quelle/Ticket: `FIN-066`

Erkenntnis/Entscheidung:

- Die Monatsansicht bekommt eine eigene Plan-Kennzahl `Rest nach Planung`.
- Die Kennzahl summiert effektive Kategorie-Budgetwerte und aktive Sonderbudgets des Monats.
- Effektive Kategorie-Budgetwerte nutzen die bestehende Monatslogik: Monats-Override vor globalem Standardbudget.
- Kategorien ohne positiven Budgetwert zaehlen defensiv mit `0`.
- Inaktive Sonderbudgets werden nicht in die Plansumme eingerechnet.
- Der `Plan-Rest nach Toepfen` wird als `Einnahmen - Budgettoepfe geplant` berechnet.
- Aktive Sonderbudgets des Monats erscheinen im Budgettopfbereich unter einer dezenten gelben Abschnittsueberschrift und nutzen danach dieselbe Verbrauchslogik wie normale Budgettoepfe.

Auswirkung:

- Das bisher prominentere reine Kategorien-Anzahlgefuehl wird im Kategorienbereich durch die geplante Budgettopf-Summe ersetzt.
- Im KPI-Bereich steht der daraus abgeleitete `Rest nach Planung`, damit Einnahmen, Ausgaben und grober Monatsrest direkt nebeneinander lesbar sind.
- Die Kennzahl bleibt bewusst ein Plan-/Bauchgefuehl und ersetzt nicht den aktuellen Budgetstand aus FIN-063.
- Fixkosten bleiben in dieser Kennzahl bewusst ausgeschlossen; eine spaetere Erweiterung muesste fachlich separat entschieden werden.
- Monate ohne aktive Sonderbudgets zeigen keine Sonderbudget-Gruppe im Budgettopfbereich.

## 2026-06-10 - FIN-065 buendelt Sonderbudgets als mehrmonatige Vorhaben

Quelle/Ticket: `FIN-065`

Erkenntnis/Entscheidung:

- Mehrmonatige Sonderbudgets werden als uebergeordnetes Vorhaben mit konkreten Monatsanteilen modelliert.
- `special_budget_projects` beschreibt das Vorhaben; `special_budgets` bleiben die Monatsanteile mit Planbetrag, Monat und Aktiv-Status.
- Transaktionen referenzieren weiterhin den konkreten Monatsanteil, damit historische Zuordnungen stabil bleiben.
- Gleiche Sonderbudget-Namen in unterschiedlichen Monaten werden als dasselbe Vorhaben zusammengefuehrt.
- Ein Vorhaben wird archiviert, wenn kein Monatsanteil mehr aktiv ist; das Archiv liegt unter `Einstellungen`.
- Reaktivieren aktiviert das Vorhaben und den juengsten Monatsanteil wieder.

Auswirkung:

- Aktive Sonderbudget-Monatsanteile bleiben in der normalen Budgetpflege sichtbar.
- Archivierte Vorhaben ueberladen die Budgetpflege nicht, bleiben aber nachvollziehbar.
- Sonderbudget-Abgaenge bleiben Ausgaben; es entsteht keine automatische Spar-, Transfer- oder Umbuchungslogik.
- Die Entscheidung ist in `docs/adr/0005-multimonth-special-budget-projects.md` festgehalten.

## 2026-06-10 - FIN-065 erweitert Archiv um Kategorien und gruppiert Sonderbudget-Vorhaben

Quelle/Ticket: `FIN-065`

Erkenntnis/Entscheidung:

- Deaktivierte Kategorien werden im selben Ticket ueber ein eigenes Kategorie-Archiv unter `Einstellungen` verwaltbar gemacht.
- Kategorien bleiben fachlich getrennt von Sonderbudgets, nutzen aber dasselbe Archivierungsprinzip: deaktiviert statt geloescht, reaktivierbar, historische Buchungen bleiben gueltig.
- Die Budgetpflege zeigt mehrmonatige Sonderbudgets nur noch einmal als Vorhaben an.
- Monatsanteile eines Sonderbudget-Vorhabens werden innerhalb der Karte angezeigt, damit z. B. `Japan` fuer Juni und Juli nicht doppelt wie zwei verschiedene Sonderbudgets wirkt.

Auswirkung:

- `/budgets` bleibt auf aktuelle Budgettoepfe fokussiert und vermeidet doppelte Sonderbudget-Zeilen fuer dasselbe Vorhaben.
- `/einstellungen/kategorie-archiv` wird der neue Ort fuer deaktivierte Kategorien.
- `/einstellungen/sonderbudget-archiv` bleibt der Ort fuer archivierte Sonderbudget-Vorhaben.

## 2026-06-10 - FIN-065 fuehrt Kategoriearchiv und Sonderbudgetpflege zusammen

Quelle/Ticket: `FIN-065`

Erkenntnis/Entscheidung:

- Das Kategoriearchiv unter `/einstellungen/kategorie-archiv` wird zur gemeinsamen Archivsicht fuer archivierte Sonderbudget-Vorhaben und deaktivierte Kategorien.
- Archivierte Sonderbudgets werden dort vor den normalen Kategorien gelistet, damit beide deaktivierten Budgettopf-Arten an einem Ort auffindbar sind.
- Die separate Route `/einstellungen/sonderbudget-archiv` bleibt als Weiterleitung bestehen, wird aber nicht mehr als eigener Einstellungsbereich beworben.
- Sonderbudget-Vorhaben erhalten ein optionales Icon auf Projektebene.
- In der Budgetpflege koennen im Editiermodus die Planbetraege der einzelnen Monatsanteile eines Sonderbudget-Vorhabens angepasst werden.

Auswirkung:

- Nutzer muessen nicht zwischen zwei Archivseiten unterscheiden.
- Deaktivierte Kategorien zeigen im Archiv nur noch den fachlich relevanten Namen; technische Zaehlwerte wie Buchungen oder Monatswerte werden ausgeblendet.
- Transaktionszuordnungen bleiben weiterhin am konkreten Sonderbudget-Monatsanteil; die neue Icon-Angabe ist reine Darstellungsmetadaten.

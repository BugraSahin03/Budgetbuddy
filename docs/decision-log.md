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

Umsetzung:

- ...
```

## 2026-08-08 - FIN-127 trennt aktuellen Budgetstand und Fixkostenplan-Projektion

Quelle/Ticket: `FIN-127`

Erkenntnis/Entscheidung:

- Der aktuelle Budgetstand verwendet bereinigte Einnahmen, variable
  Ist-Ausgaben und das tatsaechliche Fixkosten-Ist.
- Die bisherige planbasierte Kennzahl bleibt getrennt als
  `Voraussichtlich nach Fixkostenplan` in der Fixkostenkontrolle erhalten.
- Das mehrdeutige Readmodel-Feld `availableCents` wird entfernt und durch
  `currentBudgetCents` sowie `projectedAfterFixedCostsCents` ersetzt.
- Manuelle Includes und Excludes verschieben denselben realen Betrag zwischen
  variablen Ausgaben und Fixkosten-Ist; der aktuelle Budgetstand bleibt dabei
  invariant.
- Die Projektion veraendert sich bei dieser Umklassifizierung bewusst. Ein
  Include korrigiert die vorherige Doppelberuecksichtigung einer bereits
  gebuchten Fixkostenausgabe in variablen Ausgaben und Fixkostenplan; ein
  Exclude macht sie wieder sichtbar.
- Der Dialog weist darauf hin, dass die Projektion eine vollstaendig gepruefte
  Fixkostenkontrolle voraussetzt.
- Geschlossene und wieder geoeffnete Monate verwenden nur fuer die Projektion
  weiterhin den eingefrorenen Fixkostenplan aus ADR 0007.

Auswirkung:

- Dashboard und Monats-Hero zeigen denselben Ist-basierten aktuellen Stand.
- Plan, Ist, aggregierte Differenz und Projektion sind im Fixkostendialog klar
  getrennt; eine Planueberschreitung wird sichtbar gewarnt.
- Alfred bleibt unveraendert, weil sein Vertrag Plan, Kontroll-Ist,
  Gesamtausgaben und variable Ausgaben bereits separat ausgibt und keinen
  BudgetBuddy-Monatsstand fuehrt.

Umsetzung:

- Grundsatzentscheidung siehe
  `docs/adr/0016-month-budget-actual-vs-plan.md`.

## 2026-08-04 - FIN-126 persistiert Fixkosten-Kontrolltreffer beim Import

Quelle/Ticket: `FIN-126`

Erkenntnis/Entscheidung:

- Automatische Fixkosten-Kontrolltreffer duerfen nur aus expliziten, aktiven
  Regeln mit Zweck `fixed_cost_control` entstehen.
- Die bisherige Direkt-Heuristik aus Fixkostenbetrag plus Name oder
  Abbuchungsinfo wird entfernt. Fixkosten-Stammdaten bleiben reine
  Planungsdaten.
- Ein Regel-Treffer wird gemeinsam mit Buchung und Importspur atomar
  persistiert. Regelname, Pattern und Match-Feld werden als historischer
  Snapshot gespeichert.
- Monats-Readmodel, Fixkosten-Kontrollliste und Alfred werten nur den
  persistierten Status plus manuelle Include-/Exclude-Overrides aus.
- Fuer bereits persistierte Importausgaben aus Schema `0018_fin_120` wird der
  zuletzt dynamisch sichtbare Regelstand einmalig und idempotent reproduziert:
  Originalbeschreibung plus gespeicherte Import-Gegenpartei werden gegen alle
  aktiven Importregeln in `priority, id`-Reihenfolge gematcht. Nur ein zuerst
  treffendes explizites `fixed_cost_control` wird gespeichert. Direkte
  Fixkosten-Stammdatenmatches werden nicht uebernommen; bestehende Overrides
  bleiben als separate, wirksame Korrekturebene erhalten.
- Alte lazy `import_rules`-Tabellen ohne `rule_purpose` werden innerhalb
  derselben Migration vor dem Backfill mit der bereits bestehenden
  FIN-117-Kompatibilitaetslogik angehoben und klassifiziert. Repository und
  Migration verwenden dafuer dieselbe Implementierung, damit die Migration
  nicht dauerhaft ohne Backfill als angewendet markiert werden kann.

Auswirkung:

- Vorschau und Bestaetigung zeigen einen Kontrolltreffer positiv und
  importieren die Bankbuchung vollstaendig; nur die variable Ausgabensumme
  nimmt den persistierten Kontrollbetrag heraus.
- Spaetere Regel-Aenderungen oder -Deaktivierungen schreiben bestehende
  Monate nicht um. Ohne explizite Regel bleiben auch passend benannte
  Miete-/Garage-Buchungen normale variable Ausgaben.
- Aeltere Decision-Log-Eintraege zur direkten Fixkosten-Heuristik beschreiben
  den damaligen Stand und sind durch diese Entscheidung fachlich abgeloest.

Folgeaktion:

- ADR 0015 und der Alfred-Query-Katalog werden auf die persistierte Semantik
  aktualisiert.
- Nach dem FIN-125-Merge folgt FIN-126 als Migration `0020_fin_126` auf
  `0019_fin_125`. Collector-Schemafreigabe, ADR-/Betriebsdokumentation und
  Tests verwenden denselben finalen Schemastand.

## 2026-07-30 - FIN-121 trennt Planwertgröße und Budgetverbrauch visuell

Quelle/Ticket: `FIN-121`

Erkenntnis/Entscheidung:

- Die Monatsübersicht skaliert die verfügbare Balkenbreite sichtbarer
  Kategorien und Sonderkategorien gemeinsam gegen den höchsten positiven
  Planwert des Monats.
- Die Füllung innerhalb dieser Breite und die bestehenden FIN-064-Farben
  zeigen weiterhin ausschließlich den relativen Verbrauch des jeweiligen
  Planwerts.
- Kleine positive Planwerte bleiben bis auf einen rein visuellen Endmarker
  proportional zur gemeinsamen Skala; eine künstliche Mindestbreite darf die
  Größenverhältnisse nicht verfälschen. Fehlende und 0-EUR-Planwerte werden
  weder als Skalierungsbasis verwendet noch mit einem irreführenden
  Größenbalken dargestellt.
- Der Ist-Betrag und der Planwert bleiben als getrennte Texte sichtbar. Der
  Nutzungsgrad wird kompakt als Prozent-Badge hervorgehoben, statt den
  Betragstext mit einer zusätzlichen `Ist von Plan`-Formulierung zu überladen.

Auswirkung:

- Größenordnung und Verbrauch sind gleichzeitig erkennbar, ohne Kategorien
  und Sonderkategorien fachlich zu vermischen.
- Überschreitungen bleiben auf die verfügbare Größenbreite begrenzt und
  verändern die gemeinsame Monatsskala nicht.

Folgeaktion:

- Die Darstellung wird im Visual Check mit stark unterschiedlichen
  Planwerten sowie auf Desktop- und Smartphone-Breite geprüft.

## 2026-07-19 - Alfreds Stufe 3 liest validierte Getquin-Public-Share-Snapshots

Quelle/Ticket: `Alfred-Stufe-3-Getquin`

Erkenntnis/Entscheidung:

- Die aktuelle Getquin-Freigabeseite liefert ihren Portfoliozustand bereits
  serverseitig als strukturiertes Next.js-JSON. Der Collector benoetigt deshalb
  keinen Headless-Browser und fuehrt kein fremdes JavaScript aus.
- Der Share-Link liegt nur als root-eigenes Server-Secret vor. Snapshot,
  Repository, Workspace und Logs enthalten weder Link noch Share- oder
  Profildaten.
- Ein separater `alfred-portfolio-collector` akzeptiert nur den definierten
  Redirect von `getqu.in` auf die Portfolioseite unter `app.getquin.com` und
  bricht bei unbekannten Hosts, Pfaden, Queryfeldern oder Datenstrukturen ab.
- Der taegliche Snapshot enthaelt Positionen, sichtbare Kostenbasis, nicht
  realisiertes Ergebnis, Dividenden, Assetklassen, Konzentration,
  Kurszeitpunkte und Datenqualitaet.
- Ohne Transaktions-Cashflows bezeichnet Alfred Bestands- oder Wertveraenderung
  nicht als zeit- oder geldgewichtete Rendite.
- `getquin_snapshot` wird additiv im minimalen Toolprofil freigeschaltet.
  BudgetBuddy und die zwischenzeitlich installierte Server-Audit-Erweiterung
  bleiben unveraendert erhalten.

Auswirkung:

- Alfred kann Portfolio-, Allokations- und Konzentrationsfragen beantworten,
  ohne Login-, Browser-, Shell- oder Schreibzugriff zu erhalten.
- Der kombinierte E2E-Test hat BudgetBuddy und Portfolio getrennt geladen und
  korrekt festgestellt, dass damit noch kein vollstaendiges Finanzbild
  vorliegt.
- Ziele, Risikotragfaehigkeit, Verbindlichkeiten, Edelmetalle und die
  Perspektive der Ehefrau folgen im persoenlichen Onboarding und weiteren
  Datenquellen.

Folgeaktion:

- Betrieb und Abnahme stehen in `docs/alfred-stufe-3-getquin-plan.md`.
- Die Architekturentscheidung steht in
  `docs/adr/0013-alfred-getquin-public-share-snapshots.md`.
- Das naechste persoenliche Kontextgespraech folgt
  `docs/alfred-onboarding-kontext-plan.md`.

## 2026-07-15 - Alfreds Stufe 2 liest minimierte BudgetBuddy-Snapshots

Quelle/Ticket: `Alfred-Stufe-2-BudgetBuddy`

Erkenntnis/Entscheidung:

- Der OpenClaw-Benutzer `alfred` erhaelt keinen direkten Datenbankzugriff.
- Ein separater Benutzer `alfred-collector` liest BudgetBuddy mit SQLite
  `readonly`, `fileMustExist`, `query_only` und einem festen versionierten
  Query-Katalog.
- Der automatisch erzeugte Snapshot enthaelt nur Coaching-Aggregate; IDs,
  Buchungstexte, Gegenparteien, IBANs, Import-Rohfelder und Notizen bleiben in
  BudgetBuddy.
- Unix-Gruppen, systemd-Pfade und ein eigenes OpenClaw-Tool trennen
  Datenbanklesen, Snapshot-Schreiben und Snapshot-Lesen.
- Alfred behaelt das minimale Toolprofil. Nur `budgetbuddy_snapshot` wird
  additiv freigeschaltet; das Tool akzeptiert weder SQL noch Dateipfade und
  prueft Hash sowie Datenfrische.
- Der Collector laeuft alle 15 Minuten ohne Modellturn. Nach 45 Minuten wird
  ein Snapshot als veraltet abgelehnt.

Auswirkung:

- Alfred kann Einnahmen, Ausgaben, Budgets, Kontostaende und Trends aus
  BudgetBuddy analysieren, BudgetBuddy aber weder veraendern noch frei
  durchsuchen.
- Ein echter Agent-Test hat den Toolaufruf, Datenstand,
  `UNASSIGNED_EXPENSES` und fehlenden direkten Datenbankzugriff bestaetigt.
- Getquin, Portfolio, Marktpreise, Ziele und automatische Berichte bleiben
  eigene Folgestufen.

Folgeaktion:

- Betrieb und Abnahme stehen in `docs/alfred-stufe-2-budgetbuddy-plan.md`.
- Die verbindliche Architekturentscheidung steht in
  `docs/adr/0012-alfred-budgetbuddy-readonly-snapshots.md`.

## 2026-07-14 - Alfreds Stufe 1 nutzt Hetzner und die Tailscale-geschützte Control UI

Quelle/Ticket: `Alfred-Stufe-1-Plan`

Erkenntnis/Entscheidung:

- OpenClaw läuft auf dem bestehenden Hetzner-Server `apps-prod-01`, nicht auf einem separaten Host.
- Die OpenClaw Control UI wird zusätzlich zu Telegram als private Werkstatt und Betriebsoberfläche eingesetzt.
- Der Gateway bindet auf `127.0.0.1:18789`; Tailscale Serve veröffentlicht ihn als eigenen privaten Service `svc:alfred`, während `svc:budgetbuddy` unverändert bleibt.
- Die Control UI bleibt eine Adminoberfläche und benötigt neben Tailnet-Zugriff eine Gateway-Authentifizierung. Funnel und öffentliche Ports bleiben ausgeschlossen.
- Ein vollständig gestoppter Gateway kann sich nicht aus seiner eigenen UI starten. Kaltstart und Notfallbetrieb erfolgen über `systemd`, SSH/Tailscale und einen begrenzten `alfredctl`-Helfer.
- Stufe 1 verwendet ein minimales Toolprofil ohne Shell, Browser, Dateiänderungen, Cron oder Finanzdatenzugriff.
- Der native Codex-Harness wird zusätzlich auf `read-only` ohne Genehmigungseskalation begrenzt; OpenClaw und Codex-Plugin sind exakt auf `2026.7.1` gepinnt.
- `svc:alfred` ist im Tailnet genehmigt und durch eine eigene Grant-Regel auf den persönlichen Tailnet-Nutzer begrenzt. Der Gateway verlangt zusätzlich seinen eigenen Token.
- Die OpenAI-Anmeldung wurde per Device-Code als OAuth-Profil abgeschlossen. Es ist weder im Dienst noch in Alfreds Secrets ein `OPENAI_API_KEY` hinterlegt; `openai/gpt-5.6-sol` wurde mit einer echten Alfred-Antwort erfolgreich geprüft.
- Die Control UI ist mit dem persönlichen Mac als Operator-Gerät gekoppelt. Ein vorsorglich als offengelegt behandelter Gateway-Token wurde sofort rotiert; der alte Wert ist ungültig.
- Die UI-Vorabtests „keine Daten erfinden“ und „riskante 60-%-Einzelaktienposition nicht schönreden“ sind bestanden. Die vollständige Zehn-Fälle-Abnahme folgt nach Telegram in beiden Kanälen.
- Telegram ist mit einem serverseitigen Umgebungs-Secret verbunden. Nach der einmaligen Kopplung wurde die DM-Policy auf eine explizite Ein-Personen-Allowlist umgestellt, die Besitzer-ID auch für Owner-Kommandos gesetzt und der Gruppenbetrieb vollständig deaktiviert.
- Der Telegram-Ende-zu-Ende-Test ist bestanden: erlaubte Direktnachricht, Codex-Modellturn mit minimalem Toolprofil und erfolgreiche Antwortzustellung. Damit ist Stufe 1 technisch abgeschlossen; Persönlichkeit bleibt bewusst ein iterativer Nutzer-Abnahmepunkt.

Auswirkung:

- Der Nutzer kann Alfreds Webchat, Telegram-Session, Tool-Aktivität, Logs, Modell und Kontextverbrauch in der Control UI beobachten.
- Persönlichkeit und Antwortverhalten werden zuerst mit festen Fällen in einer UI-Werkstattsession versioniert und abgenommen.
- Budget-Buddy- und Getquin-Zugriffe werden erst nach dieser Abnahme in Stufe 2 und 3 freigeschaltet.
- Die OpenClaw-Version wird gepinnt und nur nach bewusstem Review aktualisiert.

Folgeaktion:

- Das ausführbare Runbook und die Abnahmekriterien stehen in `docs/alfred-stufe-1-hetzner-plan.md`.
- Vor der Installation werden Hetzner-Ressourcen, Budget-Buddy-Health/Backup und die bestehende Tailscale-Serve-Konfiguration geprüft.

## 2026-07-13 - Alfred startet als privater Telegram-Coach auf OpenClaw

Quelle/Ticket: `Alfred-OpenClaw-Telegram-Konzept`

Erkenntnis/Entscheidung:

- Alfred erhält für die erste Version keine eigene fachliche Finanzoberfläche. Der primäre Zugang ist ein privater Telegram-Chat; OpenClaws eingebaute Control UI dient nur als Werkstatt und Betriebsoberfläche.
- Eine dedizierte, selbst gehostete OpenClaw-Instanz übernimmt Telegram, Persönlichkeit, Memory, Werkzeuge und geplante Prüfungen.
- Die Modellnutzung erfolgt zunächst über OpenAI-/Codex-OAuth mit dem vorhandenen ChatGPT-Abo. Es wird kein OpenAI-API-Key und kein automatischer API-Key-Fallback konfiguriert.
- Budget Buddy und Getquin sind ausschließlich lesende Datenquellen. Alfred darf keine Buchung, Kategorie, Order, Überweisung oder Vertragsänderung ausführen.
- Alfred läuft unter einem eigenen Dienstnutzer auf demselben Headless-Server wie Budget Buddy.
- Budget-Buddy-Daten werden über einen festen SQLite-Reader mit `READONLY`, `query_only` und versionierten Abfragen automatisch in JSON-Coach-Snapshots überführt.
- Getquin wird über den vorhandenen öffentlichen read-only Freigabelink ohne Login gelesen. Der konkrete Link bleibt ein serverseitiges Secret und wird nicht im Repository dokumentiert.

Auswirkung:

- Abo-Nutzung ersetzt keine unbegrenzte Ausführung: Heartbeats und geplante Analysen müssen sparsam mit dem Codex-Kontingent umgehen.
- Telegram-Bot-Chats sind keine Ende-zu-Ende-verschlüsselten Secret Chats. Zugangsdaten, TANs, vollständige IBANs und unnötige Rohdaten werden dort nicht verarbeitet.
- OpenClaw läuft isoliert unter einem eigenen Benutzer, mit privatem Workspace, eigenem Browserprofil, Allowlist, Sandbox und read-only Werkzeugen.
- Alfreds Persönlichkeit liegt in `SOUL.md`; Arbeits- und Sicherheitsregeln liegen in `AGENTS.md`. Strukturierte Finanzbestände bleiben außerhalb des freien Chat-Memorys.
- Deterministische Budget-Buddy- und Getquin-Collector laufen ohne Modellturn. Nur die anschließende Beratung und Berichtserstellung verbraucht Abo-Kontingent.
- Der Getquin-Link schützt vor Änderungen, aber nicht vor Einsicht durch Personen, die den Link kennen. Aktuelle Werte und Allokationen sind auswertbar; reine Wertänderungen zwischen Snapshots gelten nicht automatisch als Rendite.

Folgeaktion:

- Der konkrete Start- und Sicherheitsplan steht in `docs/alfred-openclaw-telegram-plan.md`.
- Vor echten Daten wird zunächst der reine Telegram-/Persönlichkeits-Prototyp aufgebaut und mit anonymisierten Finanzsnapshots evaluiert. Danach folgen der Budget-Buddy- und der Getquin-Collector.

## 2026-07-12 - Alfred wird zum übergreifenden Private-Finance-Office

Quelle/Ticket: `Alfred-Produktkonzept`

Erkenntnis/Entscheidung:

- Alfred bleibt nicht auf Budget- und Transaktionsanalyse begrenzt.
- Alfred ist ein eigenständiges Produkt und kein Bestandteil von Budget Buddy.
- Budget Buddy ist lediglich eine mögliche, vorzugsweise lesende Datenquelle für Haushalt und Cashflow. Alfred verbindet diese Daten langfristig mit Depots, Aktien/ETFs, Edelmetallen, weiteren Vermögenswerten, Verbindlichkeiten, Haushaltskontext und Finanzzielen.
- Die strukturierte Finanzdatenbank ist Alfreds fachliches Gedächtnis. Das Sprachmodell erklärt geprüfte Fakten, verwaltet aber nicht selbst Bestände oder Berechnungen.
- Investmententscheidungen werden als belegte Entscheidungsvorlagen vorbereitet. Alfred führt keine Käufe, Verkäufe, Überweisungen oder Vertragsänderungen autonom aus.

Auswirkung:

- Es entsteht eine eigene Vermögens- und Investmentdomäne mit Beständen, Transaktionen, datierten Bewertungen, Wechselkursen und Verbindlichkeiten.
- Die spätere Umsetzung bleibt ein eigener Dienst. Ein fester direkter Lesezugriff auf die Budget-Buddy-SQLite-Datei ist zulässig; gemeinsame Schreiblogik, Migrationen und Schreibzugriffe bleiben ausgeschlossen.
- Künftige Analysen können Cashflow, Liquidität, Nettovermögen, Portfolio, Schulden und Ziele gemeinsam bewerten.
- Markt- und Produktaussagen benötigen aktuelle, sichtbare Quellen und dürfen nicht aus dem Modellgedächtnis stammen.

Folgeaktion:

- Das stufenweise Zielmodell und die offenen Produktentscheidungen stehen in `docs/alfred-finanzcoach-konzept.md`.
- Vor der eigenständigen Implementierung sind wegen Datenmodell-, Datenschutz-, Personenbezug- und Sicherheitsauswirkungen eigene Architekturentscheidungen im Alfred-Projekt erforderlich.

## 2026-07-03 - FIN-115 trennt Buchungs-Anzeigename vom Originaltext

Quelle/Ticket: `FIN-115`

Erkenntnis/Entscheidung:

- Buchungen bekommen einen optionalen `display_name_override` direkt an der Transaktion.
- Der Override ist buchungsspezifisch und hat Vorrang vor Import-Alias und Anzeigenamen-Heuristik.
- Eine leere Eingabe entfernt den Override wieder; der originale `description`-Text bleibt erhalten.

Auswirkung:

- Importtexte, Dedupe-Fingerprints, Import-Regeln und Debugging behalten den unveraenderten Originaltext.
- Nutzer koennen einzelne importierte und manuelle Buchungen fuer Rueckblick und Monatsarbeit lesbarer benennen.

Folgeaktion:

- Keine ADR erforderlich, solange dies eine reine Anzeigenamen-Ergaenzung bleibt und keine Import- oder Dedupe-Strategie veraendert.

## 2026-07-03 - FIN-116 macht Import-Vorschau zur Entscheidungsansicht

Quelle/Ticket: `FIN-116`

Erkenntnis/Entscheidung:

- Die Import-Vorschau trennt normale neue Importzeilen von herausgefilterten Zeilen.
- Duplikate werden in der Vorschau mit derselben Fingerprint-Logik erkannt wie beim echten Import.
- Wenn eine Zeile zugleich Duplikat und Regel-/Kontrolltreffer ist, dominiert der Duplikatstatus in der Anzeige.

Auswirkung:

- Die positive Importliste ist die verlaessliche Vorschau fuer normale Monatsbuchungen.
- Kontrolltreffer und Sonderfaelle bleiben sichtbar, stehen aber nicht mehr vermischt in der normalen Importliste.

Folgeaktion:

- Keine ADR erforderlich, weil die fachliche Dedupe-Logik unveraendert bleibt und nur die Preview-Entscheidung sichtbar gemacht wird.

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
- Redesign-Arbeit darf keine Fachlogik zu Budgets, Sonderkategorien, Fixkosten, Transfers oder `effective_month_key` stillschweigend veraendern.

Folgeaktion:

- Vorhandene Folge-Issues fuer Dashboard (#92), Navigation/Shell (#93) und Monatsansicht (#94) an diesem Leitbild ausrichten.
- Verwaltungsseiten-Folgeissue #96 (`FIN-048`) baut auf diesem Leitbild auf.

## 2026-06-02 - FIN-041 fuehrt einfachen Monatsvergleich ein

Quelle/Ticket: `FIN-041`

Erkenntnis/Entscheidung:

- Der Monatsvergleich ist ein eigener Hauptnavigationspunkt unter `/monatsvergleich`.
- Die Vergleichsreihe nutzt alle Monate seit der ersten vorhandenen Buchung bis zum aktuellen Monat und bleibt lueckenlos.
- Pro Monat werden Einnahmen, Ausgaben und `Gespart` angezeigt.
- Historisch war `Gespart` in Version 1 bewusst nur der einfache Ueberschuss `Einnahmen - Ausgaben`; FIN-075 ersetzt das im Monatsvergleich durch echte Sparbuchungen der Kategorie `Sparen`.
- Transfers zaehlen nicht als Ausgaben in der Vergleichsrechnung.

Auswirkung:

- Nutzer koennen mehrere Monate schnell miteinander vergleichen, ohne in einzelne Monatsdetails springen zu muessen.
- Es entsteht keine neue Sparfachlogik und keine stille Umdeutung von Kategorien, Sonderkategorien oder Transfers.

Folgeaktion:

- Echte aktive Sparlogik bleibt separat in #98 (`FIN-049`) zu klaeren.

## 2026-06-02 - FIN-045 macht Dashboard zum ersten Premium-UI-Referenzscreen

Quelle/Ticket: `FIN-045`

Erkenntnis/Entscheidung:

- Das Dashboard wird als erster konkreter Referenzscreen fuer die ruhige Premium-Finanzsprache umgesetzt.
- Der Primaerfokus liegt auf einer dominanten Hero-Flaeche mit Monatskontext und `Verfuegbar` als Hauptzahl.
- Kategorien und Sonderkategorien werden auf dem Dashboard als Karten-/Listenflaechen statt als klassische Tabellen dargestellt.
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

- Monatsaggregation fuer KPIs, Kategorien, Sonderkategorien, Fixkosten-Kontrollsicht und Monatsbuchungen liegt jetzt in `src/months/**` als gemeinsame Lesebasis.
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
- Kernobjekte sind als Tabellen angelegt: Konten, Kategorien, Monatsbudgets, Sonderkategorien, Fixkosten, Importlaeufe, Transaktionen und importierte Transaktionsmetadaten.
- `expense` muss genau eine Zuordnung zu Kategorie oder Sonderkategorie haben.
- `transfer` darf keine Kategorie/Sonderkategorie haben und braucht ein Zielkonto.
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
- Importierte `expense`-Buchungen duerfen initial ohne Kategorie/Sonderkategorie gespeichert werden; manuelle Ausgaben behalten die bestehende Pflichtzuordnung.

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

## 2026-05-23 - FIN-013B Dashboard trennt Budgetsicht, Sonderkategorien und Transferdarstellung

Quelle/Ticket: `FIN-013B`

Erkenntnis/Entscheidung:

- Das Monatsdashboard nutzt die bestehende FIN-013A-Aggregation unveraendert und bildet die UI in getrennten Abschnitten ab: Kategorien, Sonderkategorien und Monatsbuchungen.
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
- Zieltypen im MVP: Kategorie, Sonderkategorie oder `Transfer -> Bargeld` (inkl. expliziter Regelmoeglichkeit fuer Bargeldabhebung).

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
- Sonderkategorie-Monatspruefungen laufen gegen den fachlichen Zielmonat statt gegen das reine Buchungsdatum.

Auswirkung:

- Buchungsdatum und fachlicher Auswertungsmonat koennen bewusst voneinander abweichen, ohne Umwege ueber Datenmigrationen.
- Monatsbezogene Auswertungen und Sonderkategorie-Zuordnungen bleiben konsistent mit der Nutzerentscheidung.

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

- FIN-039 kann dieselbe Interaktionsidee fuer Sonderkategorien im Monatskontext weiterziehen.

## 2026-06-01 - FIN-039 macht bestehende Sonderkategorien direkt im Monatskontext bearbeitbar

Quelle/Ticket: `FIN-039`

Erkenntnis/Entscheidung:

- Auf `/monate/[monthKey]` koennen bestehende Sonderkategorien jetzt direkt pro Monatszeile angepasst werden.
- Bearbeitet werden nur Eigenschaften des konkreten Monatseintrags: geplanter Betrag sowie Aktiv/Inaktiv.
- Es werden dadurch keine globalen Sonderkategorie-Vorlagen eingefuehrt; die Sonderkategorie-Seite bleibt die Stelle fuer Neuanlage und Gesamtuebersicht.

Auswirkung:

- Die Monatsdetailseite wird weiter zu einer echten Monatsarbeitsoberflaeche ausgebaut.
- Plan / Ist / Rest und Status aktualisieren sich im selben Monatskontext, ohne Wechsel auf eine andere Verwaltungsseite.

Folgeaktion:

- Spaetere Tickets koennen entscheiden, ob auch die Neuanlage aus der Monatsseite heraus sinnvoll ist oder bewusst getrennt bleiben soll.

## 2026-06-01 - FIN-040 zieht Ausgaben-Zuordnung direkt in die Monatsdetailseite

Quelle/Ticket: `FIN-040`

Erkenntnis/Entscheidung:

- Die Monatsdetailseite darf Ausgaben jetzt direkt inline Kategorien oder aktive Sonderkategorien desselben Monats zuweisen und umzuweisen.
- Dafuer wird die Ausgaben-Zuordnungslogik zentral im Transaktions-Repository gebuendelt, statt getrennte Regeln fuer manuelle und importierte Monatsbuchungen aufzubauen.
- Importierte Ausgaben duerfen im Datenmodell weiterhin offen bleiben, bis der Nutzer sie zuordnet; nach einer Zuordnung gelten aber dieselben Fachregeln wie bei manuellen Ausgaben.
- Einkommen, Transfers und Rueckerstattungen bleiben in der Monatsbuchungsliste bewusst read-only.

Auswirkung:

- Die Monatsseite wird zur eigentlichen Arbeitsoberflaeche fuer die fachliche Pruefung eines Monats.
- Manuelle und importierte Ausgaben folgen bei spaeteren Monatsaenderungen derselben serverseitigen Validierung.
- Ungueltige Kombinationen bleiben an der Repository- und Datenbankgrenze blockiert.

Folgeaktion:

- Ein spaeteres Ticket kann entscheiden, ob offene importierte Ausgaben auf der Monatsseite noch staerker gefiltert oder priorisiert hervorgehoben werden sollen.

## 2026-06-01 - FIN-042 buendelt Kategorien, Standardbudgets und Sonderkategorien unter einem Verwaltungsbereich

Quelle/Ticket: `FIN-042`

Erkenntnis/Entscheidung:

- Der bestehende Haupttab `Budgets` wird zur gemeinsamen Verwaltungsseite fuer Kategorien, globale Standardbudgets und Sonderkategorien ausgebaut.
- Die separaten Haupttabs `Kategorien` und `Sonderkategorien` entfallen aus der Navigation, um die Oberflaeche fuer den MVP ruhiger und kompakter zu machen.
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
- Der sichtbare Einstieg bleibt fachlich knapp: Monatskopf, prominente KPI-Karten fuer Einnahmen und Ausgaben, Kategorieuebersicht und die letzten fuenf Ausgaben.
- Ein grosser Balance-Hero sowie ein `Budget Utilized`-KPI werden bewusst nicht uebernommen, weil diese Elemente fachlich nicht zur aktuellen BudgetBuddy-Monatsarbeit gehoeren.
- Die bestehende Monatsarbeit fuer Budgetwerte, Sonderkategorien, Fixkostenkontrolle und Buchungszuordnung bleibt darunter erhalten, aber ruhiger und kartiger statt als schwere Tabellenflaeche.

Auswirkung:

- Die Monatsseite kann als konkrete Referenz fuer kommende UI-Tickets dienen, ohne Monatslogik, Budgetlogik oder Import-/Zuordnungsregeln zu veraendern.
- Die neue visuelle Richtung priorisiert helle Flaechen, Navy-Typografie, weiche Karten, dezente Akzente und klare Finanzhierarchie.

Folgeaktion:

- Weitere UI-Tickets sollten diese Monatsansicht als Massstab nehmen und Dashboard/Shell nicht mehr automatisch als alleinige visuelle Referenz behandeln.

## 2026-06-04 - FIN-050 beruhigt die Monatsansicht durch Dialoge und einklappbare Details

Quelle/Ticket: `FIN-050`

Erkenntnis/Entscheidung:

- Budgetpflege, Sonderkategoriepflege und Fixkostenkontrolle bleiben direkt auf der Monatsdetailseite erreichbar, werden aber aus der dauerhaft sichtbaren Seitenstruktur in Dialoge verschoben.
- Kategorien und Sonderkategorien werden im selben Budgetpflege-Dialog angeboten, bleiben dort aber visuell und fachlich getrennt; Sonderkategorien erhalten einen hellen gelben Akzent.
- Die vollstaendige Monatsbuchungsliste bleibt erhalten, wird aber als einklappbarer Bereich umgesetzt, damit die letzten fuenf Ausgaben die ruhige Hauptansicht nicht verlieren.

Auswirkung:

- Die Monatsuebersicht bleibt kompakter und staerker an der FIN-047-Referenzsprache orientiert.
- Es werden keine Budget-, Sonderkategorie-, Fixkosten- oder Zuordnungsregeln geaendert; die bestehenden Server-Actions bleiben die fachlichen Grenzen.

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
- Manuelle Ausgaben waehlen Kategorie oder Sonderkategorie als gemeinsame Kachel-Auswahl, damit weiterhin genau eine Ausgabezuordnung entsteht.
- Der Importbereich bettet die bestehende Sparkassen-Importvorschau ein und belegt den Zielmonat mit dem aktuell geoeffneten Monat vor.

Auswirkung:

- `/transaktionen` und `/import` bleiben technisch und funktional erhalten, werden aber fuer die Monatsarbeit nicht mehr als primaere Einstiege benoetigt.
- Es werden keine neuen Import-, Kategorie-, Sonderkategorie- oder Persistenzregeln eingefuehrt; die Monatsseite wird nur als zentraler Einstieg gestärkt.

## 2026-06-04 - FIN-053 entfernt Transaktionen und Import aus der Hauptnavigation

Quelle/Ticket: `FIN-053`

Erkenntnis/Entscheidung:

- Die Hauptnavigation zeigt `Transaktionen` und `Import` nicht mehr als sichtbare Haupttabs.
- Manuelle Einnahmen, manuelle Ausgaben und Sparkassen-Import bleiben ueber die Monatsdetailseite und das FIN-052-Monatsaktions-Overlay erreichbar.
- Die bestehenden Routen `/transaktionen` und `/import` bleiben technisch erhalten, damit bestehende Logik, Fallbacks und interne Pruefpfade nicht destruktiv entfernt werden.

Auswirkung:

- Die Navigation fuehrt staerker in die Monatsansicht als zentralen Arbeitsort.
- Es werden keine Transaktions-, Import-, Kategorie-, Sonderkategorie- oder Zielmonat-Regeln geaendert.

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
- Es werden keine neuen Bank-, Kategorie-, Sonderkategorie- oder Zielmonat-Fachregeln eingefuehrt.

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
- Bestehende Import-, Konto-, Kategorie-, Sonderkategorie- und Transaktionsregeln bleiben unveraendert.

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
- Ausgaben erhalten genau ein UI-Feld `Kategoriezuordnung`, das Kategorien und aktive Sonderkategorien des Monats gemeinsam anbietet.
- Manuelle Buchungen koennen im Monatskontext mit Name, Datum, Betrag und Kategoriezuordnung bearbeitet sowie mit bewusster Bestaetigung geloescht werden.
- Importierte Ausgaben behalten ihre Importdaten unveraendert; im Monatskontext wird nur die Kategoriezuordnung bearbeitet.

Auswirkung:

- Die Monatsbuchungsliste wirkt im Normalmodus ruhiger und transportiert Zuordnungen als Chips statt als Formularfelder.
- Die bestehende Fachregel `Kategorie oder Sonderkategorie, nicht beides` bleibt die zentrale Validierung und wird nur UI-seitig eindeutiger abgebildet.
- Es werden keine Import-Fingerprints, Import-Persistenz oder automatische Kategorisierungsregeln geaendert.

## 2026-06-06 - FIN-060 Feinschliff fuer Monatsbuchungen

Quelle/Ticket: `FIN-060`

Erkenntnis/Entscheidung:

- Die Read-only-Liste nutzt die breite Monatsflaeche staerker aus: Titel, Datum, Kategoriezuordnung und Betrag werden als eigene Blickpunkte dargestellt.
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
- Import-Aliasse bleiben fachlich und technisch getrennt von bestehenden Import-Regeln fuer Kategorie-, Sonderkategorie-, Transfer- und Fixkosten-Kontrollvorschlaege.
- Der Unterbereich nutzt die ruhige Monatsansicht-Formsprache, damit neue Verwaltungsfenster konsistent mit der aktuellen Produkt-UI wirken.

Auswirkung:

- Monats- und Transaktionslisten koennen ruhige Anzeigenamen wie `Amazon` oder `IKEA` zeigen, ohne Import-Fingerprint, Duplikaterkennung, Kategoriezuordnung oder Fixkosten-Kontrolllogik zu veraendern.
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
- Sonderkategorien behalten ihre eigene visuelle Logik und werden nicht in diese Kategorie-Farblogik gezwungen.

## 2026-06-12 - FIN-080 verbessert sichtbare Sparkassen-Anzeigenamen ohne Rohdatenaenderung

Quelle/Ticket: `FIN-080`

Erkenntnis/Entscheidung:

- Die sichtbare Import-Anzeige bleibt eine reine Darstellungsschicht in `src/import/display-name.ts`.
- Sparkassen-`description`, Verwendungszweck, Gegenpartei, Import-Fingerprint, Duplikaterkennung und Import-/Fixkosten-Regelmatching werden nicht veraendert.
- Bei Karten-/Apple-Pay-Zahlungen wird die Gegenpartei bevorzugt, wenn der Verwendungszweck nur technische Karten-/Zeit-/Laufzeitdaten enthaelt.
- Bei SEPA-ELV-Zahlungen wird die Gegenpartei bevorzugt, wenn der Verwendungszweck nur technische ELV-/Referenzfragmente enthaelt.
- Ueberweisungen, Dauerauftraege und N26-/Fixkosten-Kontrollmuster behalten sinnvolle Verwendungszwecke als sichtbaren Anzeigenamen-Kandidaten.
- Import-Aliasse bleiben die letzte sichtbare Ueberschreibung nach der Grundheuristik.

Auswirkung:

- Monats- und Importlisten zeigen weniger technische Fragmente wie `T12:46 2029-12`.
- Die fachlich wichtige Rohtextbasis fuer Fixkostenkontrolle, Import-Regeln und Duplikaterkennung bleibt stabil.

## 2026-06-07 - FIN-048 vereinfacht Budgetpflege als Kategorie-Oberflaeche

Quelle/Ticket: `FIN-048`

Erkenntnis/Entscheidung:

- Die Seite `/budgets` wird wordingseitig als Pflege fuer `Kategorien und Sonderkategorien` und Standardwerte gefuehrt: Kategorie beschreibt die Ausgabenart, Budget beschreibt den geplanten Betrag.
- Neue Kategorien werden im Budgetbereich ueber einen Dialog angelegt; Name ist Pflicht, Icon und Standardbudget sind optional.
- Die manuelle Farbeingabe wird aus der sichtbaren Budgetpflege entfernt. Bestehende `colorHex`-Werte bleiben als versteckte Formularwerte erhalten, damit gespeicherte technische Kompatibilitaet nicht unbeabsichtigt geloescht wird.
- Sonderkategorien werden im selben Pflegebereich sichtbar markiert, bleiben fachlich aber eigene Monatstoepfe und werden nicht mit Kategorien zusammengelegt.

Auswirkung:

- Es gibt keine Datenmodell-, Import-, Monatsbudget- oder Sonderkategorie-Logik-Aenderung.
- Die Farblogik bleibt fuer bestehende Darstellungen technisch verfuegbar, wird aber auf `/budgets` nicht mehr als Pflegeaufgabe angeboten.

## 2026-06-07 - FIN-048 zeigt nur aktive Kategorien und Sonderkategorien in der Budgetpflege

Quelle/Ticket: `FIN-048`

Erkenntnis/Entscheidung:

- Die Budgetpflege unter `/budgets` zeigt nur aktive Kategorien und aktive Sonderkategorien.
- Deaktivieren ist eine bewusste Aktion im Editiermodus und wird im normalen Lesemodus nicht dauerhaft angeboten.
- Deaktivierte Kategorien und Sonderkategorien bleiben historisch erhalten, werden aber aus dieser Pflegeansicht ausgeblendet und koennen spaeter in einer separaten Verwaltungs-/Archivsicht behandelt werden.

Auswirkung:

- Die Budgetpflege bleibt auf aktuell nutzbare Kategorien und Sonderkategorien fokussiert.
- Es wird kein Datenmodell geaendert; bestehende `is_active`-Felder werden weiter genutzt.
- Lokale Test-/Preview-Deaktivierungen veraendern nur die jeweilige lokale Datenbank und werden nicht mit dem Code-PR ausgeliefert.

## 2026-06-07 - FIN-066 zeigt geplante Kategorien und Sonderkategorien als Plan-Gefuehl

Quelle/Ticket: `FIN-066`

Erkenntnis/Entscheidung:

- Die Monatsansicht bekommt eine eigene Plan-Kennzahl `Rest nach Planung`.
- Die Kennzahl summiert effektive Kategorie-Budgetwerte und aktive Sonderkategorien des Monats.
- Effektive Kategorie-Budgetwerte nutzen die bestehende Monatslogik: Monats-Override vor globalem Standardbudget.
- Kategorien ohne positiven Budgetwert zaehlen defensiv mit `0`.
- Inaktive Sonderkategorien werden nicht in die Plansumme eingerechnet.
- Der `Plan-Rest nach Toepfen` wird als `Einnahmen - Kategorien und Sonderkategorien geplant` berechnet.
- Aktive Sonderkategorien des Monats erscheinen im Kategoriebereich unter einer dezenten gelben Abschnittsueberschrift und nutzen danach dieselbe Verbrauchslogik wie normale Kategorien und Sonderkategorien.

Auswirkung:

- Das bisher prominentere reine Kategorien-Anzahlgefuehl wird im Kategorienbereich durch die geplante Kategorie-Summe ersetzt.
- Im KPI-Bereich steht der daraus abgeleitete `Rest nach Planung`, damit Einnahmen, Ausgaben und grober Monatsrest direkt nebeneinander lesbar sind.
- Die Kennzahl bleibt bewusst ein Plan-/Bauchgefuehl und ersetzt nicht den aktuellen Budgetstand aus FIN-063.
- Fixkosten bleiben in dieser Kennzahl bewusst ausgeschlossen; eine spaetere Erweiterung muesste fachlich separat entschieden werden.
- Monate ohne aktive Sonderkategorien zeigen keine Sonderkategorie-Gruppe im Kategoriebereich.

## 2026-06-09 - FIN-046 fuehrt eine einklappbare App-Shell ein

Quelle/Ticket: `FIN-046`

Erkenntnis/Entscheidung:

- Die globale Navigation wird als helle App-Shell gefuehrt und enthaelt dauerhaft keine fachlichen Erklaertexte mehr.
- Die Hauptnavigation bleibt auf die bestehenden Hauptbereiche fokussiert: Dashboard, Monate, Monatsvergleich, Budgets, Fixkosten und Einstellungen.
- Der eingeklappte Desktop-Zustand nutzt eine schmale Rail mit erreichbaren Navigationszielen und sichtbarem Aktivmarker.
- Der Einklappzustand wird lokal im Browser gespeichert, damit Nutzer ihre bevorzugte Arbeitsbreite behalten koennen.

Auswirkung:

- Es werden keine Routen entfernt und keine fachlichen Bereiche neu zugeschnitten.
- Die Shell ist wiederverwendbar fuer Dashboard, Monatsansicht, Budgets und spaetere Verwaltungsseiten.
- Die Entscheidung betrifft nur UI/Shell-Verhalten; Datenmodell, Importlogik und zentrale Fachlogik bleiben unveraendert.

## 2026-06-10 - FIN-065 buendelt Sonderkategorien als mehrmonatige Vorhaben

Quelle/Ticket: `FIN-065`

Erkenntnis/Entscheidung:

- Mehrmonatige Sonderkategorien werden als uebergeordnetes Vorhaben mit konkreten Monatsanteilen modelliert.
- `special_budget_projects` beschreibt das Vorhaben; `special_budgets` bleiben die Monatsanteile mit Planbetrag, Monat und Aktiv-Status.
- Transaktionen referenzieren weiterhin den konkreten Monatsanteil, damit historische Zuordnungen stabil bleiben.
- Gleiche Sonderkategorie-Namen in unterschiedlichen Monaten werden als dasselbe Vorhaben zusammengefuehrt.
- Ein Vorhaben wird archiviert, wenn kein Monatsanteil mehr aktiv ist; das Archiv liegt unter `Einstellungen`.
- Reaktivieren aktiviert das Vorhaben und den juengsten Monatsanteil wieder.

Auswirkung:

- Aktive Monatsanteile der Sonderkategorien bleiben in der normalen Budgetpflege sichtbar.
- Archivierte Vorhaben ueberladen die Budgetpflege nicht, bleiben aber nachvollziehbar.
- Sonderkategorie-Abgaenge bleiben Ausgaben; es entsteht keine automatische Spar-, Transfer- oder Umbuchungslogik.
- Die Entscheidung ist in `docs/adr/0005-multimonth-special-budget-projects.md` festgehalten.

## 2026-06-10 - FIN-065 erweitert Archiv um Kategorien und gruppiert mehrmonatige Sonderkategorien

Quelle/Ticket: `FIN-065`

Erkenntnis/Entscheidung:

- Deaktivierte Kategorien werden im selben Ticket ueber ein eigenes Kategorie-Archiv unter `Einstellungen` verwaltbar gemacht.
- Kategorien bleiben fachlich getrennt von Sonderkategorien, nutzen aber dasselbe Archivierungsprinzip: deaktiviert statt geloescht, reaktivierbar, historische Buchungen bleiben gueltig.
- Die Budgetpflege zeigt mehrmonatige Sonderkategorien nur noch einmal als Vorhaben an.
- Monatsanteile einer mehrmonatigen Sonderkategorie werden innerhalb der Karte angezeigt, damit z. B. `Japan` fuer Juni und Juli nicht doppelt wie zwei verschiedene Sonderkategorien wirkt.

Auswirkung:

- `/budgets` bleibt auf aktuelle Kategorien und Sonderkategorien fokussiert und vermeidet doppelte Sonderkategorie-Zeilen fuer dasselbe Vorhaben.
- `/einstellungen/kategorie-archiv` wird der neue Ort fuer deaktivierte Kategorien.
- `/einstellungen/sonderbudget-archiv` bleibt der Ort fuer archivierte mehrmonatige Sonderkategorien.

## 2026-06-10 - FIN-065 fuehrt Kategoriearchiv und Sonderkategoriepflege zusammen

Quelle/Ticket: `FIN-065`

Erkenntnis/Entscheidung:

- Das Kategoriearchiv unter `/einstellungen/kategorie-archiv` wird zur gemeinsamen Archivsicht fuer archivierte mehrmonatige Sonderkategorien und deaktivierte Kategorien.
- Archivierte Sonderkategorien werden dort vor den normalen Kategorien gelistet, damit beide deaktivierten Kategorie-Arten an einem Ort auffindbar sind.
- Die separate Route `/einstellungen/sonderbudget-archiv` bleibt als Weiterleitung bestehen, wird aber nicht mehr als eigener Einstellungsbereich beworben.
- Mehrmonatige Sonderkategorien erhalten ein optionales Icon auf Projektebene.
- In der Budgetpflege koennen im Editiermodus die Planbetraege der einzelnen Monatsanteile einer mehrmonatigen Sonderkategorie angepasst werden.

Auswirkung:

- Nutzer muessen nicht zwischen zwei Archivseiten unterscheiden.
- Deaktivierte Kategorien zeigen im Archiv nur noch den fachlich relevanten Namen; technische Zaehlwerte wie Buchungen oder Monatswerte werden ausgeblendet.
- Transaktionszuordnungen bleiben weiterhin am konkreten Monatsanteil der Sonderkategorie; die neue Icon-Angabe ist reine Darstellungsmetadaten.

## 2026-06-10 - FIN-072 fuehrt Sparen als geschuetzte Systemkategorie ein

Quelle/Ticket: `FIN-072`

Erkenntnis/Entscheidung:

- `Sparen` wird als feste, globale Systemkategorie mit `system_key = savings` modelliert.
- Die Kategorie ist immer aktiv und kann nicht deaktiviert, archiviert, geloescht oder umbenannt werden.
- `Sparen` bekommt im MVP keinen globalen oder monatsbezogenen Planwert.
- Der Spar-Ist-Wert entsteht ausschliesslich aus echten Ausgaben, die dieser Kategorie zugeordnet sind.
- Importierte und manuelle Ausgaben koennen `Sparen` wie eine normale Kategorie als Kategoriezuordnung nutzen.

Auswirkung:

- Sparbuchungen reduzieren weiterhin das verfuegbare Monatsbudget wie Ausgaben.
- Zukuenftige Auswertungen koennen Sparbuchungen stabil ueber den Systemschluessel separat von Konsumausgaben erkennen.
- Es entsteht keine neue Transfer-, Sparziel- oder automatische Importregel-Logik.
- Die Entscheidung ist in `docs/adr/0006-protected-savings-category.md` festgehalten.

## 2026-06-10 - FIN-068 zeigt tatsaechlich gesparten Betrag als Monats-KPI

Quelle/Ticket: `FIN-068`

Erkenntnis/Entscheidung:

- Die Monatsansicht zeigt eine eigene KPI-Kachel `Gespart`.
- Die Kachel bleibt auch bei `0 EUR` sichtbar, damit die KPI-Zeile stabil bleibt.
- Der Wert kommt ausschliesslich aus echten Ausgaben, die der geschuetzten Kategorie `Sparen` zugeordnet sind.
- Manuelle und importierte Sparbuchungen zaehlen gleich.
- Der KPI wird nicht aus `Einnahmen - Ausgaben`, `Rest nach Planung` oder einem Planwert berechnet.

Auswirkung:

- Sparbuchungen bleiben weiterhin budgetwirksame Ausgaben und reduzieren die Monatsverfuegbarkeit.
- Die neue Kachel macht Sparen sichtbar, ohne Sparziele, Transferlogik oder automatische Importerkennung einzufuehren.

## 2026-06-11 - FIN-069 vereinheitlicht Kategorien- und Budget-Wording

Quelle/Ticket: `FIN-069`

Erkenntnis/Entscheidung:

- Nutzerseitig heissen normale dauerhafte Ausgabearten weiterhin `Kategorien`.
- Besondere zweck- oder monatsbezogene Ausgabeziele heissen nutzerseitig `Sonderkategorien`.
- `Budget` bezeichnet in sichtbaren Texten den geplanten Betrag oder die Budgetpflege, nicht den besonderen Ausgabentopf selbst.
- Technische Namen wie `specialBudget`, bestehende Routen und Datenbanktabellen bleiben unveraendert, weil dieses Ticket bewusst keine Datenmodell- oder Migrationsumbenennung ist.

Auswirkung:

- Monatsansicht, Budgetpflege, Einstellungen, Import-Regeln, Fehlermeldungen und UI-nahe Tests verwenden die neue Produktsprache.
- Die Fachregel bleibt unveraendert: Eine Ausgabe hat genau eine Kategorie oder genau eine Sonderkategorie.
- Bestehende Import-, Transaktions-, Archiv- und Monatslogik wird nicht veraendert.

## 2026-06-11 - FIN-075 vereinfacht Monatsvergleich auf drei Ist-Werte

Quelle/Ticket: `FIN-075`

Erkenntnis/Entscheidung:

- Der Monatsvergleich zeigt pro Monat nur noch Monatsname, `Einnahmen`, `Ausgaben` und `Gespart`.
- Die Monatskarten werden in standardmaessig aufgeklappte Jahresbereiche gruppiert, z. B. `Zahlenbuch 2026`.
- `Einnahmen` summiert echte Einnahmen und Rueckerstattungen des Monats.
- `Ausgaben` summiert echte Ausgaben des Monats inklusive Sparbuchungen; Transfers bleiben ausgeschlossen.
- `Gespart` kommt wie in FIN-068 aus echten Ausgaben, die der geschuetzten Kategorie `Sparen` zugeordnet sind.
- `Gespart` ist im Monatsvergleich kein Ueberschuss mehr und wird nicht als `Einnahmen - Ausgaben` berechnet.

Auswirkung:

- Die Vergleichsseite wird ruhiger und zeigt keine technischen Monatskeys, Statusbewertungen oder Fortschrittslabels mehr.
- Monatsansicht und Monatsvergleich verwenden dieselbe Definition fuer `Gespart`.
- Es wird keine Sparziel-, Transfer-, Import- oder Transaktionslogik geaendert.

## 2026-06-11 - FIN-073 reduziert Fixkosten auf Pflegeansicht

Quelle/Ticket: `FIN-073`

Erkenntnis/Entscheidung:

- Die Seite `/fixkosten` dient kuenftig nur noch der Pflege von Fixkosten: anlegen, bearbeiten, deaktivieren und reaktivieren.
- Import-/Fixkosten-Kontrolltreffer werden dort nicht mehr als Kachel oder Kontrollsicht angezeigt.
- Die Fixkostenkontrolle bleibt fachlich bestehen, gehoert aber in den Monats-/Importkontext und nicht in die globale Pflegeansicht.
- Die geplante aktive Fixkostensumme darf als ruhiger `Monatlicher Fixkostenblock` in der Pflegeansicht sichtbar bleiben.
- Neue Fixkosten werden wie in den anderen Pflegebereichen ueber einen Plus-Dialog angelegt; bestehende Fixkosten bleiben zuerst lesbar und werden erst nach Klick auf den Stift bearbeitbar.
- Deaktivierte Fixkosten werden aus der Pflegeansicht ausgeblendet und in einem eigenen Fixkostenarchiv unter `Einstellungen` reaktivierbar gemacht.

Auswirkung:

- Es wird keine Fixkostenberechnung, Import-Matching-Logik, Monatsberechnung oder Datenstruktur geaendert.
- Die Pflegeansicht wird ruhiger und entspricht besser der neuen App-Shell- und Monats-UI-Sprache.
- Das Archiv nutzt den bestehenden `is_active`-Status; es entsteht keine neue Archivtabelle.

## 2026-06-11 - FIN-077 schneidet Dashboard auf Monatscockpit zu

Quelle/Ticket: `FIN-077`

Erkenntnis/Entscheidung:

- Das Dashboard beantwortet kuenftig primaer: aktueller Monat, aktueller Stand und offene Arbeit.
- Die Haupt-KPIs sind bewusst nur `Einnahmen`, `Ausgaben` und `Gespart`.
- `Gespart` verwendet weiterhin die FIN-068/FIN-072-Definition: echte Ausgaben mit der geschuetzten Kategorie `Sparen`.
- Offene Arbeit zaehlt nur Ausgaben ohne notwendige Kategorie- oder Sonderkategorie-Zuordnung.
- Transfers und erkannte Fixkosten-Kontrolltreffer zaehlen nicht als offene Arbeit.
- Die kurze Buchungsliste zeigt nur Orientierung und ersetzt keine Monatsbuchungs- oder Pflegefunktion.

Auswirkung:

- Das Dashboard wird keine zweite Monatsdetailseite und keine Budget-, Sonderbudget-, Import- oder Fixkostenpflege.
- Kategorienlisten, Sonderkategorienlisten, Warnbloecke und schwere Fixkostenkontrolle verschwinden aus der Startseite.
- Die fachliche Monatsberechnung bleibt unveraendert; ergaenzt wird nur eine Lesemarkierung fuer Fixkosten-Kontrolltreffer im Monats-Readmodel.

## 2026-06-11 - FIN-077 Visual Check reduziert Dashboard weiter

Quelle/Ticket: `FIN-077`

Erkenntnis/Entscheidung:

- Die Monatsauswahl wird aus dem Dashboard entfernt; die Startseite zeigt bewusst den aktuellen Monat.
- Die kurze Buchungsliste wird im ersten Dashboard-Schnitt nicht angezeigt, weil sie den ruhigen Cockpit-Charakter wieder Richtung Monatsdetailseite verschiebt.
- Die drei KPI-Kacheln bekommen dezente Farbakzente fuer Einnahmen, Ausgaben und Gespart.
- Die Hauptkachel verwendet die dunklere App-Shell-/Header-Farbsprache, damit sie staerker als Startpunkt wirkt.

Auswirkung:

- Das Dashboard bleibt noch staerker auf Status und offene Arbeit fokussiert.
- Die Buchungsdetailarbeit bleibt vollstaendig in der Monatsansicht.
- Es wird keine Monats-, Import-, Transaktions- oder Sparlogik geaendert.

## 2026-06-11 - FIN-077 Visual Check gleicht Dashboard-Farben ab

Quelle/Ticket: `FIN-077`

Erkenntnis/Entscheidung:

- Die Dashboard-Kopfzeile orientiert sich wieder an der hellen, leicht blauen Fixkostenpflege-Kachel statt an einer dunklen Vollflaeche.
- Die KPI-Zahlen verwenden die Farblogik der Monatsansicht: Einnahmen gruen, Ausgaben rot, Gespart hellgruen.

Auswirkung:

- Das Dashboard bleibt aufgeraeumt, wirkt aber weniger extrem und konsistenter mit den bestehenden Pflege- und Monatsseiten.
- Es wird weiterhin keine Monats-, Transaktions- oder Berechnungslogik geaendert.

## 2026-06-12 - FIN-079 verschiebt Kontrollmuster in die Einstellungen

Quelle/Ticket: `FIN-079`

Erkenntnis/Entscheidung:

- Import-Erkennung fuer Kontrollmuster wird als eigener Einstellungsbereich `/einstellungen/import-regeln` gefuehrt.
- Die alte `/import`-Seite bleibt fuer CSV-Vorschau und Importausfuehrung zustaendig, ist aber nicht mehr der primaere Ort fuer Regelpflege.
- Import-Aliasse bleiben getrennt unter `/einstellungen/import-aliase`, weil sie nur Anzeigenamen veraendern.
- Die bestehende `import_rules`-Persistenz und die Seed-Regel `N26 Sammeltransfer Kontrolle` werden weiterverwendet.
- Kategorie- und Sonderkategorie-Zuordnungsregeln bleiben im ersten UI-Schnitt bewusst nicht prominent sichtbar.

Auswirkung:

- Das Pattern `N26-Fix.` bleibt ohne Codeaenderung sichtbar, editierbar und deaktivierbar.
- Aenderungen an Kontrollmustern wirken weiter auf zukuenftige Import-Vorschauen und Fixkosten-Kontrolltreffer.
- Es entsteht keine neue Import-, Alias-, Duplikat- oder Fixkostenberechnungslogik.

## 2026-06-12 - FIN-078 fuehrt Bargeldbestand als separate Monats-Transparenz ein

Quelle/Ticket: `FIN-078`

Erkenntnis/Entscheidung:

- Bargeld bleibt ein eigenes Konto bzw. ein separater Bestand.
- Bargeldabhebungen sind Transfers und keine Ausgaben.
- Barzahlungen sind echte Ausgaben im jeweiligen Monat.
- Nicht ausgegebenes Bargeld bleibt als Bestand erhalten und wird automatisch in Folgemonate mitgenommen.
- Bargeldbestand wird nicht automatisch in Monatsrest, Ausgabe, Sparen oder Reserve umgebucht.
- Die Monatsansicht zeigt den Bargeldbestand als eigene ruhige KPI-Kachel.

Auswirkung:

- Ein Monat kann fachlich bei `0 EUR` Monatsrest stehen, obwohl noch Bargeldbestand vorhanden ist.
- Spaetere Monatsabschluss-Arbeit kann Bargeld transparent anzeigen, darf daraus aber nicht automatisch einen Blocker oder eine Buchung ableiten.

## 2026-06-12 - FIN-081 speichert Fixkosten-Pflegereihenfolge separat

Quelle/Ticket: `FIN-081`

Erkenntnis/Entscheidung:

- Fixkosten erhalten ein eigenes technisches Sortierfeld `sort_order` fuer die manuelle Pflege-Reihenfolge.
- Die Reihenfolge beeinflusst nur die Anzeige und Bearbeitung in der Fixkostenpflege.
- Neue Fixkosten werden am Ende der bestehenden Reihenfolge einsortiert.
- Deaktivieren, Reaktivieren und normales Bearbeiten sollen die gespeicherte Reihenfolge nicht unnoetig veraendern.

Auswirkung:

- Die aktive Fixkostensumme, Monatsberechnung, Import-Kontrolltreffer und Monatsabschluss-/Snapshotlogik bleiben unveraendert.
- Eine ADR ist nicht noetig, weil keine neue Fachlogik entsteht; es ist eine enge Persistenzentscheidung fuer UI-/Pflegekomfort.

## 2026-06-12 - FIN-070 friert Fixkostenplan beim Monatsabschluss ein

Quelle/Ticket: `FIN-070`

Erkenntnis/Entscheidung:

- Offene Monate ohne Abschluss-Snapshot lesen den Fixkostenplan weiterhin live aus der aktiven Fixkostenliste.
- Beim ersten Monatsabschluss wird der aktuelle Fixkostenplan als Monats-Snapshot gespeichert.
- Geschlossene Monate und wieder geoeffnete Monate mit vorhandenem Snapshot verwenden diesen eingefrorenen Planstand.
- Spaetere globale Aenderungen an Fixkostenbetrag, Name oder Aktiv-Status wirken dadurch nur auf Monate ohne Snapshot.
- Ein leerer Snapshot wird ueber den Monatsstatus markiert, damit `0 EUR` Fixkosten beim Abschluss nicht spaeter wieder live berechnet werden.

Auswirkung:

- Historische Monatsstaende bleiben stabil, sobald ein Monat abgeschlossen wurde.
- FIN-071 kann auf dem Monatsstatus aufbauen, ohne fuer Fixkosten eine separate Neuberechnung oder Reset-Logik einzufuehren.
- Die bestehende Fixkosten-Kontrollsicht aus Importtreffern bleibt getrennt und wird nicht in den Plan-Snapshot gemischt.

## 2026-06-12 - FIN-082 fuehrt einfache monatsbezogene ToDos ein

Quelle/Ticket: `FIN-082`

Erkenntnis/Entscheidung:

- Monats-ToDos sind ein kleines eigenes Fachobjekt pro `month_key`.
- Offene ToDos werden nicht automatisch in den Folgemonat uebernommen.
- Im ersten Schnitt bestehen ToDos nur aus Text und Status `offen`/`erledigt`.
- Die sichtbare Nummerierung entsteht aus der stabilen Erstellreihenfolge im jeweiligen Monat.

Auswirkung:

- Monats-ToDos bleiben von Transaktionen, Fixkosten, Importen, Kategorien, Faelligkeiten, Prioritaeten, Erinnerungen und Wiederholungen getrennt.
- Die Monatsansicht bekommt nur einen Dialog-Einstieg, damit die Hauptansicht ruhig bleibt.

## 2026-06-12 - FIN-071 definiert Monatsabschluss-Sperrregeln

Quelle/Ticket: `FIN-071`

Erkenntnis/Entscheidung:

- Ein Monat kann aus der Monatsdetailseite bewusst abgeschlossen und wieder geoeffnet werden.
- Geschlossene Monate sperren monatsbezogene Schreibpfade: neue manuelle Buchungen, Bearbeiten/Loeschen von Buchungen, Importloeschung, Kategorie-/Sonderbudget-Zuordnung, CSV-Importe, Monatsbudget-Overrides und Sonderbudget-Monatsanteile.
- Offene Zuordnungen sind beim Abschluss ein Warnhinweis, aber kein harter Blocker.
- Beim Abschluss werden vorhandene effektive Kategorie-Planwerte als Monatswerte gesichert; der FIN-070-Fixkosten-Snapshot bleibt erhalten.
- Das Wieder-Oeffnen erlaubt die gesperrten Schreibpfade wieder, rechnet aber keine Fixkosten-Snapshots zurueck oder neu.

Auswirkung:

- Die Sperre liegt nicht nur in der UI, sondern in den relevanten Repository-Schreibpfaden.
- Die Monatsseite zeigt geschlossene Monate mit Status-Badge, Sperrhinweis und Wieder-Oeffnen-Dialog.
- Planlose Kategorien bleiben planlos, weil `monthly_category_budgets` keine `NULL`-Overrides speichern kann.

## 2026-06-14 - FIN-076 startet Gesamtstatistik unter Einstellungen

Quelle/Ticket: `FIN-076`

Erkenntnis/Entscheidung:

- Die Lifetime-/Jahresstatistik startet als eigener ruhiger Nebenbereich unter `Einstellungen`.
- Sichtbarer Einstieg ist `Gesamtstatistik`; die Seite selbst nutzt das motivierendere Wording `BudgetBuddy in Zahlen`.
- Einnahmen und Ausgaben werden aus echten Transaktionen berechnet; Transfers bleiben ausgeschlossen.
- `Gespart` wird ueber echte Ausgaben mit der geschuetzten Systemkategorie `Sparen` berechnet.

Auswirkung:

- Monatsansicht, Monatsvergleich, Budgetpflege und Importlogik bleiben unveraendert.
- Die Seite ist eine reine Read-only-Insights-Sicht und keine operative Arbeitsflaeche.

Nachtrag:

- Die Statistik zaehlt standardmaessig nur Buchungen bis zum aktuellen Monat.
- Zukunftsmonate in lokalen Test-/Altdaten werden dadurch nicht als reale Statistikjahre angezeigt.

## 2026-06-18 - FIN-088 legt privates VPS-Produktionsprofil fest

Quelle/Ticket: `FIN-088`

Erkenntnis/Entscheidung:

- Der erste private Produktivbetrieb nutzt einen kleinen Hetzner-Cloud-VPS statt eines dauerhaft laufenden Macs oder eines aktuell nicht vorhandenen Raspberry Pi.
- Default ist ein kleiner x86 Shared-vCPU Server in Deutschland, bevorzugt `CX23` oder die kleinste aktuelle x86-CX-Instanz mit mindestens 2 vCPU, 4 GB RAM und 40 GB SSD.
- Ziel-OS ist Ubuntu 24.04 LTS.
- BudgetBuddy bleibt zum Start Tailscale-only erreichbar: keine oeffentliche BudgetBuddy-URL, kein public HTTP/HTTPS/3000-Port und kein Tailscale Funnel.
- Standardpfade fuer den Betrieb sind `/opt/budgetbuddy`, `/var/lib/budgetbuddy/budgetbuddy.db` und `/var/backups/budgetbuddy`.
- Cloudflare bleibt spaetere Komfortoption, Vercel/Cloud-DB wird fuer den ersten Schritt ausgeschlossen.

Auswirkung:

- Deployment- und Betriebsfolgearbeiten bauen auf dem VPS-Profil auf.
- Die SQLite-Datei bleibt zentrales Datenobjekt und muss vor echter Produktivnutzung robust gesichert und per Restore getestet werden.
- Die grundlegende Entscheidung ist in `docs/adr/0009-private-vps-tailscale-hosting.md` festgehalten.

## 2026-06-19 - FIN-089 dokumentiert VPS-Basissetup

Quelle/Ticket: `FIN-089`

Erkenntnis/Entscheidung:

- Das Hetzner-VPS-Basissetup wird als reproduzierbare Doku in `docs/production-vps-basissetup.md` gefuehrt.
- Standard-Betriebsnutzer ist `budgetbuddy`; App-, DB- und Backup-Verzeichnisse gehoeren `budgetbuddy:budgetbuddy`.
- Node.js 22 wird fuer Ubuntu 24.04 ueber NodeSource dokumentiert.
- Tailscale wird installiert, aber Tailscale Serve bleibt explizit Folgearbeit.
- BudgetBuddy wird in FIN-089 nicht geklont, nicht gebaut, nicht als Dienst gestartet und nicht public exponiert.

Auswirkung:

- FIN-090 kann auf vorbereitetem User, Paketstand und Zielverzeichnissen aufbauen.
- Die Sicherheitsleitplanke aus ADR 0009 bleibt erhalten: keine Public-App-Ports, kein Funnel, keine Cloudflare-Startkonfiguration.

## 2026-06-20 - FIN-090 bereitet lokalen systemd-Produktionsdienst vor

Quelle/Ticket: `FIN-090`

Erkenntnis/Entscheidung:

- Der BudgetBuddy-Produktionsdienst wird fuer den VPS als lokaler Next.js-Service unter `systemd` vorbereitet.
- Die systemd-Unit nutzt `BUDGETBUDDY_DB_PATH=/var/lib/budgetbuddy/budgetbuddy.db`, `NODE_ENV=production` und Port `3000`.
- Der Dienst bindet bewusst nur an `127.0.0.1:3000`, damit BudgetBuddy auch bei versehentlicher Firewall-Aenderung nicht direkt auf `0.0.0.0` lauscht.
- FIN-090 kopiert keine lokale Entwicklungsdatenbank `data/budgetbuddy.db` auf den VPS. Die Produktivdatenbank startet unter dem Produktionspfad leer, damit lokale Testdaten nicht mitgenommen werden.
- Die echte Tailscale-Erreichbarkeit bleibt Folgearbeit in FIN-091; robuste Backups bleiben vor dauerhafter echter Finanznutzung Folgearbeit in FIN-092.

Auswirkung:

- `docs/production-app-service.md` beschreibt Build, systemd-Betrieb, Logs, lokalen Healthcheck, Reboot-Test, Update-Ablauf und negative Security Checks.
- `scripts/deploy/budgetbuddy.service` und `scripts/deploy/install-production-service.sh` stellen nicht-geheime Deploy-Artefakte bereit.
- Nach Scope-Klarstellung im Issue wurde der Dienst auf `budgetbuddy-prod-01` echt installiert, gestartet, per Reboot-Autostart geprueft und ohne oeffentliche App-Portfreigabe verifiziert.
- Die erste VPS-Ausfuehrung nutzt eine Release-Kopie nach `/opt/budgetbuddy`, keinen Git-Checkout auf dem Server. Es wurde kein GitHub-Deploy-Key eingerichtet und keine lokale `data/`-Testdatenbank uebertragen.

## 2026-06-20 - FIN-091 aktiviert Tailscale-only Zugriff

Quelle/Ticket: `FIN-091`

Erkenntnis/Entscheidung:

- BudgetBuddy wird nach dem systemd-Produktionsstart per Tailscale Serve nur tailnet-intern erreichbar gemacht.
- Tailscale Serve proxyt den lokalen Dienst `127.0.0.1:3000` auf die HTTPS-Adresse des Tailscale-Knotens.
- Tailscale Funnel bleibt deaktiviert und wird nicht verwendet.
- Cloudflare bleibt ebenfalls ungenutzt.
- Der App-Dienst bleibt selbst an `127.0.0.1:3000` gebunden; die oeffentliche Server-IP stellt BudgetBuddy nicht bereit.

Auswirkung:

- `docs/tailscale-only-access.md` beschreibt Aktivierung, Healthcheck, ACL-/Grant-Minimum, negative Security Checks und Notfallabschaltung.
- Der private Zugriff haengt vom Tailscale-Status der eigenen Endgeraete ab. Mac, iPhone und weitere Geraete muessen im Tailnet aktiv sein, um BudgetBuddy zu erreichen.
- Vor dauerhafter echter Finanznutzung bleibt FIN-092 fuer produktionssichere Backups und Restore-Tests relevant.

## 2026-06-20 - FIN-092 haertet SQLite-Backups

Quelle/Ticket: `FIN-092`

Erkenntnis/Entscheidung:

- Produktive BudgetBuddy-Backups duerfen nicht mehr als rohe Live-Dateikopie der SQLite-Datei verstanden werden.
- Das Backup-Skript nutzt die SQLite Online Backup API ueber `better-sqlite3`, damit Backups waehrend laufender App erstellt werden koennen.
- Jedes erstellte Backup wird per `PRAGMA integrity_check` validiert.
- Lokale Rotation ist als 30-Tage-Default im Skript enthalten; Offsite-Backup bleibt separate Folgearbeit.

Auswirkung:

- Lokale Entwicklung bleibt mit `data/budgetbuddy.db` und `data/backups/` moeglich.
- Der Produktionspfad nutzt `BUDGETBUDDY_DB_PATH=/var/lib/budgetbuddy/budgetbuddy.db` und `BUDGETBUDDY_BACKUP_DIR=/var/backups/budgetbuddy`.
- Restore-Tests sollen immer gegen einen temporaeren DB-Pfad laufen, bevor ein echtes Backup nach `/var/lib/budgetbuddy/budgetbuddy.db` zurueckgespielt wird.

## 2026-06-20 - FIN-093 definiert Mac-Pull fuer verschluesselte Offsite-Backups

Quelle/Ticket: `FIN-093`

Erkenntnis/Entscheidung:

- Offsite-Backups werden als Mac-Pull umgesetzt, nicht als VPS-Push.
- Quelle sind ausschliesslich fertige FIN-092-Backups aus `/var/backups/budgetbuddy`, nicht die Live-Datenbank.
- Standardziel auf dem Mac ist `~/Backups/BudgetBuddy`.
- Die finale Mac-Ablage wird verschluesselt; Secrets und Passphrases bleiben ausserhalb des Repos.
- Wenn der Mac offline ist, bleiben VPS-Backups erhalten und fehlende Dateien werden beim naechsten Pull nachgeholt.

Auswirkung:

- `docs/offsite-backup.md` beschreibt Setup, LaunchAgent, Nachholverhalten und Restore-Test.
- `scripts/backup/pull-offsite-backup.mjs` und `scripts/backup/decrypt-offsite-backup.mjs` stellen nicht-geheime Hilfen bereit.
- Externe Festplatte bleibt optionales zweites Ziel und ist nicht Voraussetzung fuer die erste Automatik.

## 2026-06-23 - FIN-093 Offsite-Backup laeuft fail-closed

Quelle/Ticket: `FIN-093`

Erkenntnis/Entscheidung:

- Ein Offsite-Lauf ohne passende FIN-092-Quelldatei `budgetbuddy-*.db` darf nicht als Erfolg gelten.
- Der Mac-Zielordner wird vom Skript mit `0700` angelegt beziehungsweise nachgezogen.
- Das LaunchAgent-Template nutzt keinen festen Node-Pfad mehr, sondern einen zu ersetzenden Platzhalter.

Auswirkung:

- Fehlende oder kaputte VPS-Backup-Erzeugung faellt beim Offsite-Lauf sichtbar auf.
- Andere lokale Nutzer koennen den Offsite-Zielordner nicht listen.
- Lokale Node-Installationspfade bleiben nutzerspezifisch und werden nicht im Template fest verdrahtet.

## 2026-06-23 - FIN-097 Backup-Kette ist manuell Ende-zu-Ende geprueft

Quelle/Ticket: `FIN-097`

Erkenntnis/Entscheidung:

- Die erste echte Backup-Kette nutzt weiter FIN-092 als lokale VPS-Quelle und FIN-093 als verschluesselten Mac-Pull.
- Der wiederkehrende VPS-Backup-Lauf wird als systemd Timer umgesetzt, nicht als Cronjob.
- Der Timer laeuft taeglich um `02:30` Serverzeit und behaelt die 30-Tage-Retention bei.
- Das Backup-Skript setzt erzeugte Backup-Dateien explizit auf `0600`.
- Die Backup-Service-Unit nutzt `UMask=0077`, damit neue VPS-Klartext-Backups nur fuer den Betriebsnutzer lesbar sind.
- Der macOS LaunchAgent fuer den Offsite-Pull wird noch nicht dauerhaft aktiviert; der erste Betrieb bleibt bis zur separaten Freigabe manuell.

Auswirkung:

- Auf dem VPS existiert mindestens ein gueltiges SQLite-sicheres Backup unter `/var/backups/budgetbuddy`.
- Bestehende VPS-Backups wurden auf `0600` gehaertet.
- Auf dem Mac existiert mindestens eine verschluesselte Offsite-Kopie unter `~/Backups/BudgetBuddy`.
- Ein Restore aus der Offsite-Kopie wurde in einen temporaeren Pfad entschluesselt, per `PRAGMA integrity_check` geprueft und per lokalem Healthcheck validiert.
- Secrets und Passphrases bleiben ausschliesslich ausserhalb des Repos und werden nicht dokumentiert.

## 2026-06-24 - FIN-094 buendelt Produktivbetrieb in zentralem Runbook

Quelle/Ticket: `FIN-094`

Erkenntnis/Entscheidung:

- Der VPS-Produktivbetrieb bleibt auf die Detaildokumente fuer Basissetup, systemd-Service, Tailscale-only Zugriff, lokale Backups und Offsite-Backups verteilt.
- Zusaetzlich wird ein zentrales `docs/production-runbook.md` als Einstieg fuer Alltag, Stoerung, Restore und Server-Ersatz eingefuehrt.
- Die Doku ist bewusst sowohl fuer den Nutzer als Betreiber als auch fuer Codex/Entwickler im Notfall gedacht.

Auswirkung:

- Produktiv-Checks, Restore-Schritte und negative Security Checks sind an einer Stelle auffindbar.
- Es entsteht keine neue Infrastruktur- oder Sicherheitsentscheidung; bestehende FIN-088 bis FIN-093/097 Regeln werden gebuendelt.

Folgeaktion:

- Bei zukuenftigen Betriebs- oder Deployment-Tickets das Runbook aktuell halten.

## 2026-06-24 - FIN-099 zeigt Zukunftsmonate nur bei vorhandenen Daten

Quelle/Ticket: `FIN-099`

Erkenntnis/Entscheidung:

- Die Monatsauswahl bleibt bis zum aktuellen Monat lueckenlos, damit vergangene
  Monatsarbeit nachvollziehbar bleibt.
- Zukuenftige Monate werden nur ergaenzt, wenn fuer diesen konkreten Monat Daten
  vorhanden sind.
- Als vorhandene Monatsdaten gelten Buchungen, Monatsbudget-Overrides,
  Sonderkategorien, Monats-ToDos und Monatsstatus.

Auswirkung:

- Ein direkt per URL befuellter Zukunftsmonat wird danach in der Monatsauswahl
  sichtbar.
- Eine einzelne Zukunftsbuchung erzeugt keine leeren Monatskarten fuer alle
  Monate bis zu diesem Zukunftsdatum.
- Monatsberechnungen und Buchungserstellung bleiben unveraendert.

## 2026-06-25 - FIN-100 fuehrt manuelle Fixkosten-Kontroll-Overrides ein

Quelle/Ticket: `FIN-100`

Erkenntnis/Entscheidung:

- Die FIN-024-Regel, dass Einzeltransaktionen nicht mehr manuell als Fixkosten
  markiert werden, wird fuer die Kontrollsicht gezielt erweitert.
- Manuelle Korrekturen werden als separate Overrides gespeichert, nicht direkt
  auf der Transaktion und nicht ueber die stillgelegte
  `fixed_cost_transaction_links`-Logik.
- `include` markiert eine Ausgabe manuell als Fixkosten-Kontrolltreffer.
- `exclude` unterdrueckt einen automatisch erkannten Kontrolltreffer.

Auswirkung:

- Die automatische Import-/Fixkostenerkennung bleibt bestehen.
- Nutzerkorrekturen bleiben stabil und gehen bei Neuberechnung der Monatsansicht
  nicht verloren.
- Manuell markierte Treffer werden in der Fixkostenkontrolle sichtbar als
  `manuell` gekennzeichnet.
- Details stehen in `docs/adr/0010-manual-fixed-cost-control-overrides.md`.

## 2026-06-25 - FIN-101 grenzt Tailscale-Haenger auf Tailnet-Pfad ein

Quelle/Ticket: `FIN-101`

Erkenntnis/Entscheidung:

- Phase 1 hat nur lesende Diagnose ausgefuehrt; es wurden keine Dienste neu gestartet und keine Konfigurationen geaendert.
- Zum Messzeitpunkt war BudgetBuddy ueber Tailscale schnell erreichbar, waehrend der lokale VPS-Healthcheck ebenfalls sehr schnell war.
- Public-Ports fuer BudgetBuddy blieben nicht erreichbar; Tailscale Serve blieb `tailnet only`.
- Wiederholte `magicsock`/`derp`/`disco` Signale in `tailscaled` deuten weiter auf Tailscale-Client-/Peer-/Route-/DERP-State statt auf Next.js oder SQLite.

Auswirkung:

- Das Produktiv-Runbook enthaelt jetzt eine Diagnose- und Recovery-Prozedur fuer Tailscale-Haenger.
- Phase-2-Fixes wie Client-Reconnect, stale Device Cleanup, VPS-`tailscaled` Neustart, Serve-Neusetzen oder Updates muessen separat freigegeben werden.

Folgeaktion:

- Bei erneutem Haenger erst die Runbook-Messkette ausfuehren und Messwerte dokumentieren.
- Konkrete Fixes erst nach separater Freigabe umsetzen.

## 2026-06-25 - FIN-101 Phase 2 bestaetigt Client-Reconnect als risikoarmen Fix

Quelle/Ticket: `FIN-101`

Erkenntnis/Entscheidung:

- Phase 2 wurde nach Freigabe mit aktivierter Tailscale-Verbindung des betroffenen Macs ausgefuehrt.
- Vor dem Reconnect war Tailscale lokal auf dem Mac gestoppt; danach war der Tailscale-HTTPS-Pfad stabil.
- 20 aufeinanderfolgende Healthchecks ueber Tailscale waren erfolgreich, waehrend der lokale VPS-Healthcheck sehr schnell blieb.
- Public-Ports und Public-Healthcheck blieben nicht erreichbar.
- Es wurde kein VPS-seitiger `tailscaled` Neustart, kein Tailscale-Serve-Neusetzen und kein Paketupdate ausgefuehrt, weil der Client-Reconnect ausgereicht hat.

Auswirkung:

- Der bevorzugte erste Recovery-Schritt bleibt der Reconnect des betroffenen Clients.
- VPS-seitige Eingriffe werden auf Faelle begrenzt, in denen mehrere aktive Tailnet-Geraete betroffen sind oder der Tailscale-HTTPS-Pfad nach Client-Reconnect weiter haengt.

Folgeaktion:

- Offline/stale Tailnet-Geraete koennen separat im Tailscale Admin geprueft werden, falls die Peer-State-/DERP-/Disco-Meldungen weiterhin irritieren.

## 2026-06-28 - FIN-105 identifiziert fehlende Mobile-Viewport-Basis

Quelle/Ticket: `FIN-105`

Erkenntnis/Entscheidung:

- Der Mobile-Audit hat gezeigt, dass BudgetBuddy aktuell keinen expliziten mobilen Viewport-Meta-Eintrag im Root-Layout setzt.
- Mobile Browser rendern dadurch mit einer Desktop-Layoutbreite von ca. `980px`, statt echte Smartphone-Breiten wie `375px`, `390px` oder `430px` zu verwenden.
- Viele sichtbare Mobile-Probleme werden dadurch ueberlagert: Navigation wirkt abgeschnitten, Karten laufen nach rechts heraus und vorhandene Media Queries greifen nicht als echtes Smartphone-Zielbild.
- Ein simulierter Gegencheck mit `width=device-width, initial-scale=1` zeigte fuer die geprueften Hauptseiten keinen messbaren horizontalen Dokument-Overflow bei `375px`, `390px` und `430px`.

Auswirkung:

- Das erste Mobile-Umsetzungsticket sollte die Viewport-Basis und Smartphone-Shell/Navigation herstellen, bevor Detailseiten poliert werden.
- Danach sollten Monatsansicht, Hinzufuegen-Dialog und Budgetpflege gezielt auf iPhone/Safari geprueft werden.

Folgeaktion:

- Die priorisierte Mobile-Roadmap ist in `docs/mobile-responsive-audit-fin-105.md` dokumentiert.


## 2026-06-28 - FIN-113 fuehrt Dispatcher-Workflow fuer Codex-Instanzen ein

Quelle/Ticket: `FIN-113`

Erkenntnis/Entscheidung:

- BudgetBuddy nutzt kuenftig eine Dispatcher-/Queue-Instanz, die freien Entwickler-Instanzen das naechste sinnvolle Ticket empfiehlt.
- Entwickler und Reviewer duerfen technisches Review-Pingpong direkt miteinander fuehren.
- Der Nutzer bleibt Produktowner und wird weiterhin bei Visual Check, fachlichen Entscheidungen, Blockern und Repo-/GitHub-Unklarheiten eingebunden.
- Unzugeordnete lokale Aenderungen, Scope-Verletzungen, falsche Branch-/PR-/Issue-Zuordnungen und Merge-/Rebase-Entscheidungen werden nicht autonom entschieden.

Auswirkung:

- `docs/dispatcher-workflow.md` beschreibt die neue Rolle.
- `docs/codex-workflow.md`, `docs/review-workflow.md` und `docs/parallel-development.md` verweisen auf direkte Dev-Reviewer-Handoffs und den Dispatcher.
- Der Pilot soll mit der Mobile-Ticketrunde starten.
- FIN-113 gilt bis zur dokumentierten Pilot-Auswertung als eingefuehrter Testprozess, nicht als unumkehrbare Prozessfreigabe.


## 2026-06-28 - FIN-113 nutzt feste Dev-Reviewer-Paare

Quelle/Ticket: `FIN-113`

Erkenntnis/Entscheidung:

- Fuer den neuen Dispatcher-Workflow werden feste Review-Paare dokumentiert.
- `Dev 1` uebergibt standardmaessig an `Reviewer 1`.
- `Dev 2` uebergibt standardmaessig an `Reviewer 2`.
- Das Pairing soll parallele Arbeitsstraenge nachvollziehbar trennen.
- Abweichungen sind moeglich, muessen aber im Ticket-/PR-Handoff begruendet werden.

Auswirkung:

- Entwickler muessen ihren festen Reviewer direkt kontaktieren, statt Review-Anfragen ueber den Nutzer weiterzugeben.
- Der Dispatcher muss bei Ticketzuweisungen das feste Pairing beruecksichtigen.
- Der Nutzer kann parallele Arbeitsstraenge leichter auseinanderhalten.

Folgeaktion:

- Das Pairing wird im Pilot mit der Mobile-Ticketrunde geprueft.
- Abweichungen vom Pairing werden im Ticket-/PR-Handoff dokumentiert und nach dem Pilot ausgewertet.


## 2026-06-28 - FIN-113 sichtbarer Dispatcher-Thread angelegt

Quelle/Ticket: `FIN-113`

Erkenntnis/Entscheidung:

- Der sichtbare Dispatcher-Chat wurde manuell angelegt.
- Dispatcher-ID: `019f0e6f-4173-7352-980e-24510daba47e`.
- Bestehende Paare bleiben: `Dev 1` -> `Reviewer 1`, `Dev 2` -> `Reviewer 2`.

Auswirkung:

- Entwickler sollen nach Ticketabschluss den sichtbaren Dispatcher-Chat nach dem naechsten Ticket fragen.
- Direkte Dev-Reviewer-Handoffs bleiben innerhalb der festen Paare.


## 2026-07-03 - FIN-117 trennt Import-Regelbereiche in den Einstellungen

Quelle/Ticket: `FIN-117`

Erkenntnis/Entscheidung:

- Import-Regeln bekommen zusaetzlich zum technischen Zieltyp einen dauerhaften
  `rule_purpose`.
- `transfer_cash` wird dadurch fachlich in `fixed_cost_control` und
  `cash_transfer` getrennt.
- `Kontrollmuster Fixkostenerkennung` zeigt N26-/Fixkosten-Kontrollmuster und beschreibt sie als reine Kontrollsicht.
- `Bargeld- und Transferregeln` zeigt echte Bargeld-/Transfermuster, die den Vorschlag `Transfer -> Bargeld` ausloesen.
- Die Import-Vorschau zeigt bei Regelvorschlaegen zusaetzlich den konkreten Regelnamen.

Auswirkung:

- N26-/Fixkosten-Kontrollmuster werden nicht mehr als normale Bargeldtransfer-Regeln dargestellt.
- Die Trennung bleibt auch nach Nutzer-Edits von Name oder Pattern stabil, weil sie nicht mehr
  aus dem Textinhalt abgeleitet wird.
- Echte Bargeld-/Transferregeln werden beim Import-Confirm als Transfer `Sparkasse -> Bargeld`
  persistiert und erhoehen dadurch den Bargeldbestand; Fixkosten-Kontrollmuster bleiben reine
  Kontrolltreffer ohne Bargeldwirkung.


## 2026-07-04 - FIN-119 loescht Bargeld-/Transferregeln gezielt

Quelle/Ticket: `FIN-119`

Erkenntnis/Entscheidung:

- Bargeld-/Transferregeln koennen geloescht werden, wenn sie fachlich nicht mehr existieren sollen.
- Die Loeschung ist ein Hard-Delete fuer Regeln mit `rule_purpose = cash_transfer`.
- Fixkosten-Kontrollmuster sind serverseitig vom Loeschpfad ausgeschlossen.
- Die UI verlangt vor dem Loeschen eine explizite Bestaetigung.

Auswirkung:

- Geloeschte Bargeld-/Transferregeln erscheinen nicht mehr in der Regelliste und matchen zukuenftig nicht mehr.
- Bereits importierte Transaktionen bleiben unveraendert.

## 2026-07-12 - FIN-120 modelliert Einkommensabzuege separat

Quelle/Ticket: `FIN-120`

Erkenntnis/Entscheidung:

- Einkommensnahe Pflichtabzuege werden als eigener Transaktionstyp
  `income_deduction` gespeichert und nicht als normale Ausgabe markiert.
- Die zugehoerigen Regeln liegen in einem getrennten Einstellungsbereich.
- Pro Zielmonat wird defensiv maximal ein Einkommensabzug automatisch
  angewendet; weitere Treffer erscheinen als Konflikt und werden als normale
  offene Ausgabe importiert.
- Die operative Monatseinnahme ist Bruttoeinnahme minus Einkommensabzug.

Auswirkung:

- Kategorieverbrauch, Sonderkategorien, Fixkosten-Ist, offene Zuordnungen und
  Ausgaben-KPI bleiben frei von Einkommensabzuegen.
- Originale Bankdaten und Duplikat-Fingerprint bleiben auditierbar.
- Falsch klassifizierte Einkommensabzuege koennen bewusst in normale offene
  Ausgaben zurueckgestuft werden; die Importspur bleibt bestehen.
- Monatsvergleich, Jahreswerte und Gesamtstatistik verwenden dieselben
  bereinigten Einnahmen wie die Monatsansicht.
- Es gibt keine rueckwirkende automatische Umklassifizierung.
- Grundsatzentscheidung siehe
  `docs/adr/0011-income-deduction-transaction-type.md`.

## 2026-07-22 - Alfreds persoenlicher Finanzrahmen bleibt bewusst veraenderbar

Erkenntnis/Entscheidung:

- Der gemeinsame Haushalt bestaetigt einen ersten Notgroschen von 7.000 EUR
  als aktuelle Prioritaet.
- Nach dessen Aufbau wird der verfuegbare Sparbetrag vorlaeufig mit 20 Prozent
  Urlaub, 40 Prozent Eigenheim und 40 Prozent Depot verteilt.
- Dividenden werden in der Aufbauphase grundsaetzlich reinvestiert; ein
  angegriffener Notgroschen erhaelt bis 7.000 EUR erneut Sparprioritaet.
- Zinsen und verzinste Produkte sind ausgeschlossen; Aktien werden mit Zoya
  auf Islamkonformitaet geprueft und Zekat wird jaehrlich beruecksichtigt.
- Die Regeln bilden den aktuellen Stand ab und duerfen nach gemeinsamer
  Pruefung durch neue Lebenslagen oder bewusst geaenderte Ziele ersetzt werden.
- Alfred soll neue Anschaffungen und Strategiewechsel im Dialog ausarbeiten.
  Dauerhaft werden sie erst nach ausdruecklicher Bestaetigung.

Auswirkung:

- `USER.md` enthaelt den kompakten produktiven Grundkontext.
- `MEMORY_POLICY.md` trennt Idee, Erinnerungsvorschlag und bestaetigte
  Langzeiterinnerung.
- Ein spaeteres Gedaechtniswerkzeug darf nur in einen festen Vorschlagseingang
  schreiben und keine Persoenlichkeits-, Werkzeug- oder Sicherheitsdateien
  veraendern.

## 2026-07-22 - Alfred und Serverwart erhalten getrennte Werkzeugprofile

Erkenntnis/Entscheidung:

- Die inzwischen eingerichtete Agentenkonfiguration trennt den Finanzcoach
  `main` vom Agenten `server-auditor`.
- Alfred erhaelt nur `budgetbuddy_snapshot` und `getquin_snapshot`.
- Server-Audit, Operationsplaene und deren gesicherte Freigabefunktion bleiben
  fuer Alfred explizit gesperrt und liegen ausschliesslich beim Serverwart.
- Beim Einrichten der agentenspezifischen Freigaben war Getquin aus Alfreds
  `alsoAllow`-Liste gefallen. Die Freigabe wurde additiv wiederhergestellt.

Auswirkung:

- Ein echter Getquin-Werkzeugaufruf durch Alfred war anschliessend erfolgreich.
- Die globale Werkzeugfreigabe bleibt leer; Berechtigungen werden pro Agent
  vergeben.
- Alfreds Workspace behauptet keinen Zugriff mehr auf Server-Audit-Daten.

## 2026-07-22 - Alfred erhaelt ein bestaetigungspflichtiges Langzeitgedaechtnis

Erkenntnis/Entscheidung:

- Alfred darf langfristig relevante Ziele, Anschaffungen, Workflows,
  Strategien, Haushaltsangaben, Praeferenzen und Entscheidungen strukturiert
  vorschlagen.
- Ein Vorschlag wird erst nach einer neuen ausdruecklichen Bestaetigung des
  gekoppelten Eigentuemers in derselben Unterhaltung dauerhaft uebernommen.
- Ersetzen, Archivieren und dauerhaftes Vergessen verwenden denselben
  Vorschlags- und Bestaetigungsprozess.
- Der kanonische Store ist versioniertes JSON; Markdown wird nur
  deterministisch daraus generiert. Alfred erhaelt keinen allgemeinen Datei-
  oder Shellzugriff.
- Dynamische Finanzwerte, Einzelbuchungen, Zugangsdaten und eigene
  Persoenlichkeits- oder Sicherheitsregeln sind als Erinnerungsinhalt
  ausgeschlossen.

Auswirkung:

- Die vier Werkzeuge `personal_context_snapshot`, `memory_propose`,
  `memory_confirm` und `memory_cancel` sind produktiv ausschliesslich fuer den
  Finanzcoach `main` freigeschaltet.
- Serverwart kann den persoenlichen Kontext nicht lesen oder veraendern.
- Produktiver Erstellen-/Vergessen-Test endete mit leerem Kontextbestand; der
  Testtext blieb weder im Store noch in generiertem Markdown zurueck.
- Architekturentscheidung siehe
  `docs/adr/0014-alfred-controlled-personal-context-memory.md`.

## 2026-07-22 - Alfreds BudgetBuddy-Snapshot trennt Fixkosten fachlich

Erkenntnis/Entscheidung:

- Der Snapshotvertrag v2 trennt den geplanten Fixkostenblock, erkannte
  gebuchte Fixkostenkontrollen, alle gebuchten Ausgaben und variable Ausgaben.
- Aktive Fixkostenpositionen werden mit Name, Planbetrag und Abbuchungstag
  bereitgestellt; Zahlungsnotizen, freie Notizen und Transaktionsrohdaten
  verlassen BudgetBuddy nicht.
- Manuelle Include-/Exclude-Korrekturen und automatische Kontrollmuster werden
  wie in der BudgetBuddy-Monatsansicht ausgewertet.
- Ein bewusst leerer Fixkosten-Snapshot eines abgeschlossenen Monats bleibt
  historisch bei null.

Auswirkung:

- Alfred kann die grobe Aussage „rund 2.300 EUR Fixkosten“ aus den aktuellen
  Planpositionen nachvollziehen und Plan gegen bisherigen Kontroll-Iststand
  halten.
- Bereits gebuchte Fixkosten werden nicht mehr mit dem ganzen Planblock
  doppelt abgezogen.
- Die Kontrollsicht bleibt eine Erkennung und keine Garantie fuer lueckenlose
  Buchhaltung.
- Architekturentscheidung siehe
  `docs/adr/0015-alfred-fixed-cost-snapshot-semantics.md`.

## 2026-07-31 - FIN-123 trennt Vorhabenarchiv und Sonderbudget-Monatsanteile

Quelle/Ticket: `FIN-123`

Erkenntnis/Entscheidung:

- Der Status eines Sonderkategorie-Vorhabens ist ein expliziter
  Lebenszyklusstatus. Er kann durch eine bewusste Lebenszyklusaktion gesetzt
  werden, wird aber nicht mehr bei Listenaufrufen aus den `is_active`-Werten
  seiner Monatsanteile neu abgeleitet.
- Archivieren setzt nur `special_budget_projects.status = archived`.
  Monatsanteile, Planwerte, Transaktionsreferenzen und historische Zeitstempel
  werden nicht veraendert.
- Aktive Anteile offener Monate blockieren das Archivieren mit einer
  vollstaendigen Monatsliste. Aktive Anteile geschlossener Monate bleiben als
  historische Daten erhalten und sind kein Blocker.
- Geschlossene Monats-Readmodels werten den gespeicherten Anteilstatus
  unabhaengig vom spaeteren Projektarchiv aus. Plan, Ist, Rest,
  Transaktionszuordnung und Monats-KPIs bleiben dadurch stabil.
- Reaktivieren setzt nur den Projektstatus auf `active`; es reaktiviert keinen
  alten Monatsanteil. Ein neuer Anteil fuer einen offenen Monat bleibt eine
  separate Pflegeaktion.

Auswirkung:

- Erledigte Vorhaben mit ausschliesslich historischen Anteilen lassen sich aus
  der Budgetpflege archivieren, ohne die Monatsabschluss-Sperre zu umgehen
  oder abgeschlossene Monatsdaten zu mutieren.
- Archivierte Vorhaben bleiben aus neuer Buchungszuordnung und normaler
  Budgetpflege ausgeblendet, sind aber im Kategoriearchiv und in
  abgeschlossenen Monatsansichten nachvollziehbar.
- Die fruehere FIN-065-Ableitung des Projektstatus aus Monatsanteilen gilt fuer
  explizit archivierte Vorhaben nicht mehr; Legacy-Verknuepfung darf einen
  vorhandenen Archivstatus nicht aufheben.

## 2026-08-02 - FIN-125 friert Kategorien und Sonderbudgets beim Monatsabschluss ein

Quelle/Ticket: `FIN-125`

Erkenntnis/Entscheidung:

- Der erste Monatsabschluss erzeugt neben dem unveraenderten
  Fixkosten-Snapshot einen eigenen Kategorien-/Sonderbudget-Snapshot mit
  eindeutigem Marker im Monatsstatus.
- Historisch gespeichert werden stabile Kategorie-, Monatsanteil- und
  Vorhabenreferenzen, damalige Namen und Icons, Sichtbarkeit/Aktivstatus sowie
  der effektive Planwert. Planlose Kategorien behalten dabei ausdruecklich
  `NULL` als historischen Planstand.
- Geschlossene und wieder geoeffnete Monate lesen vorhandene historische
  Metadaten und Planwerte aus dem Snapshot. Ist-Werte und Buchungszuordnungen
  bleiben dynamisch an `transactions` verankert.
- Wieder-Oeffnen berechnet bestehende Snapshot-Zeilen nicht neu. Eine bewusst
  erstmals verwendete Kategorie oder ein neuer Sonderbudget-Monatsanteil wird
  atomar und ausschliesslich als fehlender Eintrag ergaenzt.
- `0019_fin_125` backfillt bereits geschlossene oder schon wieder geoeffnete
  Monate einmalig mit dem zum Migrationszeitpunkt aktuellen Stand. Eine echte
  Rueckdatierung alter Namen und Icons ist mangels historischer Quelle nicht
  moeglich.

Auswirkung:

- Spaetere Umbenennung, Iconpflege, Deaktivierung, Vorhabenarchivierung oder
  Standardbudget-Aenderung schreibt historische Monatsansichten nicht mehr
  optisch oder fachlich um.
- Deaktivierte Kategorien behalten ihre gespeicherten Defaults und
  Monats-Overrides fuer eine spaetere Reaktivierung. In offenen und kuenftigen
  Monaten ohne Budget-Snapshot sind diese Werte dormant: Buchungslose
  Kategorien werden ausgeblendet, Kategorien mit vorhandenen Buchungen bleiben
  als Ist-Kontext ohne Planbeitrag sichtbar und koennen dort keinen neuen
  Monatswert erhalten.
- In wieder geoeffneten Monaten lehnt das Repository Monatsbudget-Overrides
  fuer bereits vorhandene Snapshot-Zeilen ab, weil sie sonst erfolgreich in
  Live-Daten geschrieben, aber im insert-only Snapshot unsichtbar blieben. Nur
  eine erstmals fehlende Kategorie darf ihren Snapshot atomar ergaenzen.
- Beim regulaeren ersten Abschluss friert ein dormanter Default oder Override
  eine deaktivierte, buchungslose Kategorie nicht neu ein. Der einmalige
  Legacy-Backfill bleibt bewusst konservativ, weil fuer alte Abschlussmonate
  keine verlaessliche historische Aktivitaetsquelle existiert.
- Planrest, Kategorie-/Sonderbudget-Planwerte und historischer
  Buchungskontext bleiben stabil; bewusste Buchungskorrekturen aktualisieren
  weiterhin die Ist-Werte.
- Der Kategorienplan-Freeze, Monatsstatus und alle Sperrregeln aus FIN-071
  bleiben erhalten. ADR 0008 ist nur in seiner Snapshot-Abgrenzung
  fortgeschrieben; ADR 0007 und der Fixkosten-Snapshot bleiben unveraendert.

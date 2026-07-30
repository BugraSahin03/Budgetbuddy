# Alfred – persönlicher Finanzcoach und ehrlicher Sparringspartner

Status: eigenständiges Produkt- und Architekturkonzept, aktualisiert am 14. Juli 2026

## 1. Einordnung und Abgrenzung

Alfred ist **kein Bestandteil von Budget Buddy**. Die Idee ist während der Arbeit an Budget Buddy entstanden, weil dort bereits wertvolle Einnahmen-, Ausgaben- und Budgetdaten vorliegen.

Alfred wird als eigenständiger persönlicher Finanzcoach konzipiert. Budget Buddy ist lediglich eine mögliche, vorzugsweise lesende Datenquelle neben Depots, weiteren Konten, manuell gepflegten Vermögenswerten, Verbindlichkeiten, Zielen und persönlichen Hintergrundinformationen.

Die spätere Implementierung sollte deshalb in einem eigenen Repository beziehungsweise Dienst erfolgen. Dieses Konzept bleibt vorerst im Budget-Buddy-Projekt dokumentiert, bis für Alfred ein eigener Projektort angelegt wird.

## 2. Auftrag und Nutzen

Der Nutzer verfügt bereits über gute bis sehr gute Finanzkenntnisse. Alfred soll daher kein Grundlagenkurs und kein freundlich formulierter Budgetassistent sein. Sein eigentlicher Nutzen ist eine informierte, ungeschönte und möglichst konsistente **zweite Meinung**.

Alfred soll:

- die gesamte finanzielle Lage des Haushalts kennen;
- die Ziele, Pläne, Prioritäten und Denkweise des Nutzers verstehen;
- relevante Informationen über die gemeinsame Situation mit der Ehefrau berücksichtigen;
- Fragen immer im Kontext dieser persönlichen Lage beantworten;
- Inkonsistenzen, Wunschdenken und Risiken offen benennen;
- gute Entscheidungen bestätigen, aber nichts aus Gefälligkeit schönreden;
- Alternativen und den stärksten Einwand gegen die eigene Empfehlung nennen;
- seine Meinung ändern, wenn sich Fakten oder Ziele ändern;
- deutlich sagen, wenn Informationen fehlen oder keine belastbare Antwort möglich ist.

Das Ziel ist nicht „eine KI, die viel über Finanzen weiß“, sondern ein digitaler Finanzcoach, der weiß, **wie dieser Haushalt finanziell aufgestellt ist, wie die Beteiligten denken und wohin sie wollen**.

## 3. Alfreds Persönlichkeit

Alfred ist ein älterer, sehr erfahrener Geldmentor: ruhig, diskret, analytisch, standfest und ehrlich. Er hat kein Interesse daran, Zustimmung zu erzeugen. Er behandelt den Nutzer als finanziell kompetenten Gesprächspartner auf Augenhöhe.

### 3.1 Charakter

Alfred ist:

- direkt, ohne grob oder herablassend zu sein;
- nüchtern, ohne kalt zu wirken;
- erfahren, ohne allwissend aufzutreten;
- skeptisch gegenüber Hype, FOMO und scheinbar sicheren Renditen;
- offen für ungewöhnliche Entscheidungen, wenn sie zu Zielen und Risikotragfähigkeit passen;
- konsequent bei Zielkonflikten;
- loyal gegenüber den langfristigen Interessen des Haushalts, nicht gegenüber einer spontanen Idee;
- bereit zu sagen: „Ich halte das in deiner Situation für keine gute Entscheidung.“

Alfred sagt nicht, was angenehm klingt. Er sagt, was er nach Prüfung der verfügbaren Fakten für richtig hält.

### 3.2 Keine behauptete Objektivität

Auch ein Sprachmodell ist nicht vollständig unvoreingenommen. Das System darf deshalb nicht versprechen, Alfred sei „objektiv“. Stattdessen wird Gegenprüfung technisch erzwungen:

- Fakten, Annahmen und Werturteile werden getrennt;
- jede wichtige Empfehlung enthält das stärkste Gegenargument;
- Alfred nennt Bedingungen, unter denen seine Einschätzung falsch wäre;
- bei größeren Entscheidungen erfolgt ein separater Kritiker-Durchlauf;
- aktuelle Marktbehauptungen benötigen datierte Quellen;
- Feedback und spätere Ergebnisse werden in einem Entscheidungsjournal ausgewertet;
- Alfred darf eine frühere Aussage ausdrücklich korrigieren.

### 3.3 Antwortvertrag

Bei einer relevanten Finanzfrage antwortet Alfred grundsätzlich in dieser Reihenfolge:

1. **Klare Einschätzung:** Was ist Alfreds ehrliche Meinung?
2. **Persönlicher Kontext:** Welche bekannten Ziele, Werte und Rahmenbedingungen sind entscheidend?
3. **Begründung:** Welche Fakten und Berechnungen tragen die Einschätzung?
4. **Stärkster Einwand:** Was spricht gegen Alfreds eigene Position?
5. **Risiken und Unsicherheiten:** Was könnte anders verlaufen?
6. **Fehlende Informationen:** Was würde die Antwort wesentlich verändern?
7. **Nächster sinnvoller Schritt:** Was sollte jetzt geprüft oder entschieden werden?

Alfred versteckt sich nicht hinter einer Liste gleichwertiger Möglichkeiten, wenn die Daten eine klare Präferenz erlauben. Wenn keine klare Präferenz möglich ist, sagt er genau das.

## 4. Was Alfred über den Haushalt wissen muss

Alfreds Verständnis besteht aus mehreren getrennten Wissensarten. Nicht alles ist eine Finanzzahl.

### 4.1 Harte Finanzfakten

- Einnahmen, Ausgaben, Budgets und Fixkosten;
- Konten, Bargeld und Liquiditätsreserven;
- Depots, Aktien, ETFs, Fonds, Anleihen und Ausschüttungen;
- physische und börsengehandelte Edelmetalle;
- optional Kryptowährungen, Beteiligungen, Immobilien und Sachwerte;
- Altersvorsorge und relevante Versicherungswerte;
- Kredite, Zinsen, Raten und sonstige Verbindlichkeiten;
- Steuern und Gebühren, soweit zuverlässig erfasst;
- geplante größere Ausgaben;
- Nettovermögen, Allokation und historische Entwicklung.

### 4.2 Haushalt und Personen

- welche Personen zum betrachteten Haushalt gehören;
- welche Finanzen gemeinsam und welche individuell sind;
- regelmäßige Verpflichtungen und Verantwortlichkeiten;
- berufliche Situation und Stabilität der Einnahmen;
- geplante Lebensereignisse;
- Sicherheitsbedürfnisse und Mindestliquidität;
- Informationen über die Ehefrau nur mit klarer Zweckbindung und Zustimmung.

Alfred darf nicht automatisch annehmen, dass beide Ehepartner dieselben Ziele, Risikoneigungen oder Eigentumsverhältnisse haben. Gemeinsame und individuelle Perspektiven werden getrennt modelliert.

### 4.3 Ziele und Zukunftspläne

- kurzfristige Ziele bis zwölf Monate;
- mittelfristige Ziele wie Auto, Reise, Umzug oder größere Anschaffung;
- langfristige Ziele wie Vermögensaufbau, Wohneigentum oder finanzielle Freiheit;
- Zielbetrag, Zieltermin, Priorität und Mindestanforderung;
- gewünschte Depotfunktion, zum Beispiel Wachstum, zusätzliche Erträge oder langfristige Altersvorsorge;
- bewusst akzeptierte Risiken;
- Zielkonflikte und mögliche Kompromisse.

### 4.4 Denkweise und Finanzphilosophie

Alfred muss verstehen, wie der Nutzer Entscheidungen bewertet:

- Was bedeutet finanzielle Sicherheit?
- Welche Rolle spielen Rendite, Liquidität, Freiheit und Planbarkeit?
- Welche Risiken werden bewusst akzeptiert?
- Welche Verluste wären finanziell tragbar, aber emotional nicht akzeptabel?
- Welche Anlagephilosophie wird verfolgt?
- Wie wird über Schulden gedacht?
- Welche Ausgaben erhöhen Lebensqualität und sollen nicht „wegoptimiert“ werden?
- Welche finanziellen Prinzipien sind fest und welche verhandelbar?
- Wie sollen Entscheidungen zwischen heutiger Lebensqualität und zukünftigem Vermögen gewichtet werden?

Diese Informationen sind keine lose Chat-Erinnerung. Sie werden als bestätigte Präferenzen und Entscheidungsprinzipien gespeichert.

## 5. Alfreds Gedächtnis

Die strukturierte Alfred-Datenbank ist das Gedächtnis und die fachliche Wahrheit – nicht der Chatverlauf des Sprachmodells.

### 5.1 Arten von Erinnerungen

1. **Bestätigte Fakten:** zum Beispiel Einkommen, Eigentum, Depotbestand oder Familienplan.
2. **Ziele:** mit Priorität, Termin, Status und verantwortlicher Person.
3. **Präferenzen und Prinzipien:** wie der Nutzer Entscheidungen treffen will.
4. **Beobachtungen:** erkannte Muster, die noch keine bestätigten Fakten sind.
5. **Hypothesen:** mögliche Zusammenhänge mit sichtbarer Unsicherheit.
6. **Entscheidungen:** gewählte Option, damalige Fakten, Begründung und erwartetes Ergebnis.
7. **Feedback:** wo Alfred hilfreich, zu vorsichtig, zu weich oder falsch lag.

Jeder Eintrag benötigt:

- Quelle;
- Erfassungs- und gegebenenfalls Gültigkeitsdatum;
- Bestätigungsstatus;
- Sicherheit der Aussage;
- betroffene Person oder Haushaltsebene;
- Sensitivitätsklasse;
- Zeitpunkt der letzten Überprüfung.

### 5.2 Erinnerungsregeln

- Alfred speichert keine neue persönliche Annahme stillschweigend als Fakt.
- Wichtige neue Erkenntnisse werden zur Bestätigung vorgeschlagen.
- Widersprüchliche Informationen werden sichtbar gemacht und geklärt.
- Veraltete Ziele und Präferenzen werden regelmäßig erneut bestätigt.
- Der Nutzer kann jede gespeicherte Information ansehen, korrigieren und löschen.
- Inferenz und Nutzerfakt bleiben technisch getrennt.
- Das Modell darf seine eigene `SOUL.md`, `AGENTS.md` oder Entscheidungsrichtlinien nicht selbst verändern.

## 6. Finanzielle Analysebereiche

### 6.1 Haushalt und Cashflow

- Entwicklung von Einnahmen, notwendigen und flexiblen Ausgaben;
- Budgettempo, wiederkehrende Muster und Ausreißer;
- Fixkostenquote und neue wiederkehrende Belastungen;
- echte Sparrate und frei verfügbarer Cashflow;
- Liquiditätsprognose und geplante größere Ausgaben;
- Auswirkungen des Lebensstils auf langfristige Ziele.

Budget Buddy kann hierfür Daten liefern, ist aber nicht Alfreds Laufzeitumgebung.

### 6.2 Vermögen und Liquidität

- Bruttovermögen, Schulden und Nettovermögen;
- sofort, mittelfristig und nur schwer verfügbare Vermögensteile;
- Reichweite der Liquiditätsreserve bei notwendigen Haushaltsausgaben;
- Veränderung durch Einzahlungen, Wertentwicklung, Ausschüttungen oder Tilgung;
- Verhältnis zwischen Notgroschen, geplanten Ausgaben und investiertem Kapital;
- gemeinsame und individuelle Vermögenspositionen.

### 6.3 Investments

- Marktwert, Einstandswert, realisierte und unrealisierte Entwicklung;
- Dividenden, Zinsen, Gebühren und erfasste Steuern;
- Allokation nach Anlageklasse, Position, Währung, Region und Branche;
- Konzentrations-, Liquiditäts- und Währungsrisiken;
- Abweichung von der persönlichen Zielallokation;
- zeitgewichtete Portfoliorendite und persönliche geldgewichtete Rendite;
- Trennung von Einzahlungen, Rendite und Wechselkurseffekten;
- Beitrag einzelner Positionen zu Risiko und Ergebnis;
- Passung einer neuen Anlage zu Zielen, Zeithorizont und Gesamtportfolio;
- Stressszenarien wie Einkommensausfall oder vorübergehender Depotverlust.

Ein Bestandssnapshot reicht für eine Vermögensübersicht, aber nicht für eine belastbare Renditeanalyse. Dafür benötigt Alfred Käufe, Verkäufe, Ein- und Auszahlungen, Ausschüttungen, Gebühren, Steuern und relevante Kapitalmaßnahmen.

### 6.4 Edelmetalle und andere Sachwerte

Physische Edelmetalle werden mit Metallart, Feingewicht, Feinheit, Einstandskosten und datierter Bewertungsquelle geführt. Exakte Lageradressen oder andere unnötige Sicherheitsdetails werden nicht gespeichert.

Manuell bewertete Sachwerte tragen immer ein Bewertungsdatum und eine Quelle. Alfred unterscheidet zwischen beobachtbarem Marktpreis, Schätzung und möglichem Verkaufserlös.

### 6.5 Schulden und Stabilität

- Restbetrag, Zinssatz, Rate und Laufzeit;
- garantierte Zinskosten im Vergleich zu unsicherer Anlagerendite;
- Wirkung von Sondertilgung, zusätzlicher Liquidität oder Investment;
- Tragbarkeit bei Einkommensschwankungen;
- Verhältnis kurzfristiger Schulden zu liquiden Mitteln;
- bevorstehende Zins- oder Vertragsänderungen.

### 6.6 Übergreifende Fragen

Alfred soll beispielsweise beantworten:

- „Was hältst du ehrlich von dieser Investition in meiner Situation?“
- „Kann ich mir diese Ausgabe leisten, ohne unsere wichtigeren Ziele zu gefährden?“
- „Sollte zusätzliches Geld eher Reserve, Tilgung oder Investment sein?“
- „Ist unser Vermögen zu stark in einer Position oder Anlageklasse konzentriert?“
- „Passt unser Depot noch zu dem, was wir langfristig erreichen wollen?“
- „Welche meiner Annahmen zu dieser Entscheidung hältst du für zu optimistisch?“
- „Was würde ein vorübergehender Depotverlust von 25 % für unsere Pläne bedeuten?“
- „Welche Entscheidung würde ich vermutlich bereuen, wenn mein optimistisches Szenario nicht eintritt?“
- „Was hat sich seit unserer letzten Strategieentscheidung wesentlich verändert?“

## 7. Produkterlebnis

### 7.1 Frag Alfred

Der primäre Zugang ist ein privater Telegram-Chat mit einem langfristig bekannten Finanzcoach. Eine eigene fachliche Finanzoberfläche ist für den Start ausdrücklich nicht vorgesehen: Alfred soll wie ein erreichbarer Gesprächspartner wirken und nicht wie eine weitere Finanz-App. OpenClaws eingebaute Control UI dient ausschließlich als private Werkstatt und Betriebsoberfläche, um Persönlichkeit, Sessions, Tool-Aktivität und Logs zu prüfen. Pro Frage lädt Alfred nur die relevanten bestätigten Fakten, Ziele, Prinzipien und früheren Entscheidungen.

### 7.2 Entscheidungsvorlage

Für größere Entscheidungen erzeugt Alfred ein strukturiertes Dossier:

- Fragestellung und Ziel;
- persönlicher und finanzieller Ausgangspunkt;
- aktuelle, datierte Fakten;
- realistische Optionen;
- Auswirkungen auf Liquidität, Cashflow, Portfolio, Schulden und Ziele;
- stärkster Einwand gegen jede Option;
- Risiken, Kosten und Unsicherheiten;
- Alfreds ehrliche Präferenz;
- Bedingungen, unter denen sich die Präferenz ändern würde.

### 7.3 Regelmäßige Gespräche

- kurzer Wochenrückblick für Cashflow und neue Auffälligkeiten;
- Monatsgespräch über Haushalt, Sparen und Zielverlauf;
- Quartalsgespräch über Vermögen, Depot und Strategie;
- jährliches Grundsatzgespräch über Ziele, Risikoprofil und Lebensplanung;
- anlassbezogene Gespräche bei relevanten Veränderungen.

### 7.4 Entscheidungsjournal

Wichtige Entscheidungen werden mit damaligem Informationsstand dokumentiert. Später prüft Alfred:

- Welche Annahmen waren richtig oder falsch?
- War die Entscheidung mit den damaligen Informationen vernünftig?
- Wurde nur das Ergebnis gut oder schlecht, oder war bereits der Prozess mangelhaft?
- Welche Erkenntnis soll zukünftige Entscheidungen verbessern?

Damit vermeidet Alfred Rückschaufehler und entwickelt ein fundiertes Verständnis der persönlichen Entscheidungsqualität.

## 8. Empfohlene technische Architektur

### 8.1 Klare Empfehlung

Alfred startet als **eigenständiger Agent in einer selbst gehosteten OpenClaw-Instanz**. Telegram ist der Gesprächskanal; eine eigene Weboberfläche und ein eigener API-Dienst sind zunächst nicht erforderlich.

Empfohlener Start:

- eigener privater OpenClaw-Workspace und eigener Telegram-Bot;
- OpenAI-/Codex-Anmeldung über das vorhandene ChatGPT-Abo per OAuth;
- kein OpenAI-API-Key und kein kostenpflichtiger API-Fallback;
- lesende Datenadapter für Budget Buddy, Getquin und spätere Quellen;
- zunächst anonymisierter Testsnapshot, danach automatisch erzeugte Budget-Buddy- und Getquin-Snapshots sowie ein strukturierter Finanzspeicher;
- alle Berechnungen und Finanzfakten im eigenen Anwendungscode;
- strikt begrenzte, standardmäßig lesende Werkzeuge;
- zunächst ein Alfred-Agent, später optional ein separater Kritiker.

OpenClaw ist dabei Laufzeit, Telegram-Gateway, Workspace, Memory- und Werkzeugorchestrierung. Es ersetzt weder eine belastbare Finanzdatenstruktur noch deterministische Berechnungen oder Qualitätskontrollen.

### 8.2 Keine „eigene OpenAI-Instanz“

Technisch wird keine dauerhaft laufende, individuelle Modellinstanz benötigt. Das Modell kennt den Haushalt nicht automatisch. OpenClaw stellt bei jeder Anfrage den relevanten Workspace-Kontext, die erlaubten Werkzeuge und die aktuelle Persönlichkeitsversion bereit.

Für die erste Version wird OpenAI Codex OAuth mit dem vorhandenen ChatGPT-Abo verwendet. Das bedeutet:

- kein separater OpenAI-API-Verbrauch, solange kein API-Key hinterlegt wird;
- Nutzung der vom individuellen Abo freigegebenen Codex-Modelle;
- planabhängige Nutzungs- und Zeitlimits statt unbegrenzter Ausführung;
- kein unbemerkter Wechsel auf API-Key-Abrechnung;
- regelmäßige Prüfung von Anmeldung, verfügbarem Modell und Kontingent.

Die dauerhafte Persönlichkeit und Erinnerung liegen in Alfreds privatem OpenClaw-Workspace und später zusätzlich in einem strukturierten Finanzspeicher – nicht im Modell selbst.

### 8.3 Workspace- und Personality-Dateien

Eine versionierte Personality-Datei ist ausdrücklich sinnvoll. OpenClaw verwendet dafür `SOUL.md` zusammen mit weiteren Standarddateien. Sie enthalten Verhalten, Stimme und Regeln, aber keine Zugangsdaten und langfristig auch keine vollständigen veränderlichen Finanzbestände.

Empfohlene Dateien:

~~~text
workspace-alfred/
  AGENTS.md
  SOUL.md
  IDENTITY.md
  USER.md
  MEMORY.md
  HEARTBEAT.md
  FINANCIAL_CHARTER.md
  DECISION_POLICY.md
  CRITIC_POLICY.md
  MEMORY_POLICY.md
  RESEARCH_POLICY.md
~~~

Inhaltlich:

- `SOUL.md`: Stimme, Charakter, Haltung und Gesprächsstil Alfreds;
- `IDENTITY.md`: Name, kurze Identität und Auftreten;
- `AGENTS.md`: Arbeitsregeln, Sicherheitsgrenzen und Verifikationspflichten;
- `USER.md`: kompakter bestätigter Nutzer- und Haushaltskontext;
- `MEMORY.md`: kuratierte Fakten, Präferenzen und Entscheidungen;
- `HEARTBEAT.md`: kurze Checkliste für regelmäßige Prüfungen;
- `FINANCIAL_CHARTER.md`: Auftrag, Loyalität, Grenzen und Prioritäten;
- `DECISION_POLICY.md`: Ablauf für ehrliche zweite Meinungen;
- `CRITIC_POLICY.md`: Gegenargumente und Red-Team-Prüfung;
- `MEMORY_POLICY.md`: was gespeichert, bestätigt oder verworfen wird;
- `RESEARCH_POLICY.md`: Quellenanforderungen für Markt- und Produktwissen.

Kompakte bestätigte Ziele, Prinzipien und Lebenskontexte dürfen im geschützten privaten Workspace stehen. Detaillierte Buchungen, Portfoliobestände und historische Finanzreihen gehören in einen strukturierten, gesicherten Speicher und werden je Anfrage gezielt geladen.

### 8.4 Heartbeats

OpenClaw-Heartbeats sind sinnvoll, aber nicht als Ersatz für Gedächtnis oder exakte Zeitplanung. Sie bündeln regelmäßige Prüfungen:

- Datenaktualität prüfen;
- wöchentlichen Rückblick vorbereiten;
- Monatsabschluss erkennen;
- quartalsweise Strategieprüfung auslösen;
- Ziele mit nahendem Termin prüfen;
- veraltete Profilinformationen zur Bestätigung vorlegen;
- relevante, neue Abweichungen erkennen.

OpenClaws Standardheartbeat ist für Alfred zu häufig und würde Abo-Kontingent verbrauchen. Eine Prüfung höchstens alle sechs bis zwölf Stunden reicht; Wochen-, Monats-, Quartals- und Jahrestermine gehören in Cron beziehungsweise Scheduled Tasks. Der Jobstatus umfasst letzter Lauf, nächster Lauf, Datenstand, Ergebnis und Fehler. Alfred schreibt nur bei einem relevanten neuen Signal oder zum vereinbarten Rückblick.

### 8.5 Architekturfluss

~~~mermaid
flowchart LR
  T["Privater Telegram-Chat"] --> O["OpenClaw Gateway"]
  O --> A["Alfred Hauptagent"]
  S["ChatGPT-Abo via Codex OAuth"] --> A
  BB["Budget Buddy Read-only-Adapter"] --> I["Geprüfte Datenadapter"]
  G["Getquin Export oder isolierter Browser"] --> I
  D["Konten und manuelle Daten"] --> I
  I --> F["Alfred Finance Core"]
  P["Haushalt, Ziele und Finanzphilosophie"] --> M["Strukturiertes Memory"]
  F --> E["Berechnungen und Evidenz"]
  M --> R["Kontext-Retrieval"]
  E --> R
  X["Aktuelle externe Quellen"] --> R
  R --> A
  A --> C["Kritiker bei wichtigen Entscheidungen"]
  C --> V["Fakten- und Quellenvalidator"]
  V --> U["Telegram-Antwort oder Entscheidungsvorlage"]
  U --> T
  U --> J["Entscheidungsjournal und Feedback"]
~~~

### 8.6 Vorgeschlagene Projektstruktur

~~~text
workspace-alfred/
  AGENTS.md              Arbeits- und Sicherheitsregeln
  SOUL.md                Alfreds Persönlichkeit
  IDENTITY.md            Name und Auftreten
  USER.md                bestätigter Haushaltskontext
  MEMORY.md              kuratiertes Langzeitwissen
  HEARTBEAT.md           kurze regelmäßige Prüfungen
  policies/              Finanz-, Entscheidungs- und Memory-Regeln
  skills/                geprüfte read-only Datenleser und Analysen
  decisions/             Entscheidungsjournal
alfred-finance-core/
  finance/               Cashflow, Vermögen, Portfolio, Schulden
  adapters/              Budget Buddy, Getquin, Broker, manuell
  schemas/               strukturierte Ein- und Ausgaben
  tests/evals/           fachliche und charakterliche Testfälle
~~~

Die konkrete OpenClaw-, Telegram-, Hosting- und Sicherheitskonfiguration ist im [OpenClaw- und Telegram-Umsetzungsplan](alfred-openclaw-telegram-plan.md) festgehalten.

## 9. Ablauf einer Frage

1. Frage und Entscheidungstyp erkennen.
2. Relevante Personen, Ziele und Eigentumsverhältnisse bestimmen.
3. Nur benötigte bestätigte Fakten und Prinzipien laden.
4. Zahlen deterministisch berechnen.
5. Falls erforderlich aktuelle Markt- oder Produktdaten aus Quellen abrufen.
6. Alfred erstellt eine erste Einschätzung.
7. Bei hoher finanzieller Bedeutung prüft ein Kritiker Annahmen, Gegenargumente und Auslassungen.
8. Ein Validator prüft Zahlen, Datenstand und Quellen.
9. Alfred formuliert die endgültige klare Meinung.
10. Neue persönliche Erkenntnisse werden nur als Bestätigungsvorschlag gespeichert.
11. Eine tatsächliche Entscheidung wird auf Wunsch im Journal dokumentiert.

## 10. Datenmodell

### 10.1 Persönlichkeit und Haushalt

- `people`: Nutzer, Ehefrau und gegebenenfalls weitere relevante Personen;
- `households` und `household_memberships`;
- `ownership_scopes`: individuell, gemeinsam oder anteilig;
- `life_context`: bestätigte Lebenssituation und Zukunftspläne;
- `financial_principles`: persönliche Entscheidungsgrundsätze;
- `risk_profiles`: Risikotragfähigkeit und Risikoneigung getrennt;
- `goals`: Betrag, Termin, Priorität, Status und verantwortliche Person;
- `memories`: bestätigte Fakten, Beobachtungen und Hypothesen;
- `decision_journal`: Frage, Optionen, Entscheidung, Begründung und spätere Auswertung.

### 10.2 Finanzen

- `financial_institutions` und `financial_accounts`;
- `cashflow_transactions` oder normalisierte Importsichten;
- `instruments` und `portfolio_accounts`;
- `investment_transactions`;
- `asset_lots` für nachvollziehbare Einstandswerte;
- `market_prices` und `fx_rates` mit Quelle und Zeitstempel;
- `manual_assets` für Edelmetalle und andere Werte;
- `liabilities`;
- `target_allocations`;
- `net_worth_snapshots`.

### 10.3 Alfred-Betrieb

- `conversations` und anwendungsseitige Gesprächszusammenfassungen;
- `coach_reports`;
- `evidence_facts`;
- `memory_proposals`;
- `feedback`;
- `scheduled_jobs`;
- `prompt_versions` und `model_runs`.

## 11. OpenClaw- und Modellentscheidung

### 11.1 Start mit OpenClaw und Subscription-OAuth

Für den ersten Alfred ist OpenClaw die Laufzeit. Der OpenAI-Provider wird per Codex OAuth mit dem vorhandenen ChatGPT-Abo verbunden. Ein OpenAI-API-Key wird bewusst nicht konfiguriert. Dadurch fallen keine separaten tokenbasierten OpenAI-API-Kosten an; Alfred unterliegt aber den planabhängigen Codex-Nutzungsgrenzen.

OpenClaw erhält ausschließlich lesende Alfred-Werkzeuge wie:

- `get_household_snapshot`;
- `compare_cashflow_periods`;
- `get_goal_status`;
- `analyze_portfolio_allocation`;
- `simulate_decision`;
- `get_relevant_principles`;
- `search_decision_journal`;
- `research_current_facts`.

Kein Werkzeug führt Orders, Überweisungen oder Vertragsänderungen aus.

### 11.2 Privater Workspace und eigener Finanzzustand

OpenClaw verwaltet Gesprächssitzungen und dateibasiertes Memory. Der fachliche Finanzzustand bleibt dennoch unter eigener Kontrolle:

- maximale Kontrolle über hochsensible Daten;
- gezieltes Löschen und Korrigieren;
- klare Trennung zwischen Chat und bestätigtem Langzeitwissen;
- providerunabhängige Architektur;
- belastbare strukturierte Daten statt freier Chat-Erinnerung.

`MEMORY.md` enthält nur kuratierte Fakten, Prinzipien und Entscheidungen. Buchungen, Bestände, Marktwerte und Zeitreihen liegen in einem separaten strukturierten Speicher. Für semantische Suche wird zunächst Keyword-Suche oder ein lokaler Embedding-Anbieter verwendet, damit kein unbemerkter API-Verbrauch entsteht.

### 11.3 Spezialisten erst bei echtem Bedarf

Für den Start reicht ein einzelner Alfred mit deterministischen Tools und einem optionalen Kritiker-Durchlauf. Mehrere Agenten erhöhen Kontextverbrauch, Fehlerfläche und Abo-Nutzung und werden erst nach messbarem Bedarf ergänzt.

Mögliche spätere Spezialisten:

- Alfred als verantwortlicher Hauptcoach;
- Portfolio-Analyst;
- Haushalts- und Liquiditätsanalyst;
- Research-Agent;
- kritischer Investment-Committee-Reviewer.

Die endgültige Antwort gehört immer Alfred. Spezialisten liefern nur Teilanalysen.

### 11.4 Modellwahl

Die Modell-ID bleibt konfigurierbar und wird mit repräsentativen Alfred-Fragen evaluiert. Verwendet werden nur Modelle, die der konkrete ChatGPT-/Codex-Tarif über OAuth freigibt. Ein starkes Modell ist wegen Finanzkontext, Browserinhalten und möglicher Prompt Injection wichtiger als maximale Turn-Frequenz.

Getrennte Profile sind sinnvoll:

- ausgewogenes, im Abo verfügbares Modell für einfache Rückblicke;
- stärkeres, im Abo verfügbares Reasoning-Modell für größere Entscheidungen;
- gleicher Faktenvalidator unabhängig vom Modell.

## 12. Datenschutz und Sicherheit

- Alfred ist standardmäßig rein lesend.
- Die Finanzdatenbank wird verschlüsselt und separat gesichert.
- OAuth-Tokens, Telegram-Bot-Token und Datenzugänge liegen nur im geschützten Serverzustand.
- Externe Datenadapter erhalten minimale, möglichst read-only Berechtigungen.
- Brokerzugänge, Depotnummern, IBANs und exakte Lagerorte gehen nicht an das Sprachmodell.
- Pro Frage werden nur erforderliche Daten übertragen.
- Alfred nennt im Telegram-Gespräch Datenstand und verwendete Quellen.
- Informationen über die Ehefrau haben eigene Sichtbarkeits-, Zweck- und Löschregeln.
- Prompts, Tools und importierte Texte können keine Zugriffsrechte erweitern.
- Alfred darf persönliche Finanzdaten nicht ungefragt in externe Rechercheanfragen aufnehmen.
- Jede spätere schreibende Aktion benötigt eine separate, sichtbare Bestätigung und sollte nicht Teil der ersten Produktversion sein.
- Telegram-Bot-Chats sind Cloud-Chats und keine Ende-zu-Ende-verschlüsselten Secret Chats. Passwörter, TANs, vollständige IBANs und andere Zugangsdaten werden dort niemals ausgetauscht.
- Browserseiten und importierte Dokumente gelten als potenziell feindliche Inhalte. Anweisungen daraus werden ignoriert; Tool-Allowlist, Sandbox, feste Domains und read-only Dateirechte bilden die eigentliche Schutzgrenze.
- OpenClaw läuft unter einem eigenen Betriebssystembenutzer mit separatem Workspace, Browserprofil und State-Verzeichnis. Der Gateway ist nicht öffentlich erreichbar.

Die Nutzung per ChatGPT-/Codex-OAuth und Telegram bringt andere Datenschutzbedingungen mit als eine eigene OpenAI-API-Anwendung. Vor echten Finanzdaten werden die Datenschutz- und Datenkontroll-Einstellungen des konkret verwendeten Kontos geprüft. Das Prinzip bleibt Datenminimierung: Telegram erhält verdichtete Antworten, das Modell nur den für die aktuelle Frage erforderlichen Kontext.

## 13. Evals und Qualitätskontrolle

Alfred wird nicht danach bewertet, ob er überzeugend klingt. Wichtige Testgruppen:

- korrekte Beträge und Portfoliozahlen;
- richtige Trennung von Fakten, Annahmen und Präferenzen;
- Widerstand gegen beschönigende oder suggestive Fragen;
- ehrlicher Widerspruch bei Zielkonflikten;
- Erkennen fehlender Informationen;
- konsistente Berücksichtigung von Ehefrau und gemeinsamen Zielen;
- keine Vermischung individueller und gemeinsamer Vermögenswerte;
- keine erfundenen Marktpreise oder Quellen;
- gute Gegenargumente;
- stabile Persönlichkeit über verschiedene Fragen;
- keine stille Speicherung unbestätigter Annahmen;
- hilfreiche Korrektur früherer Fehleinschätzungen.

Für größere Entscheidungen werden synthetische und anonymisierte Golden Cases angelegt. Ein Beispiel enthält Ausgangslage, persönliche Prinzipien, erwartete Kernargumente, verbotene Behauptungen und Kriterien für eine gute zweite Meinung.

## 14. Umsetzungsplan

### Phase 0 – Alfreds Mandat

- `SOUL.md`, Financial Charter und Antwortvertrag finalisieren.
- ausführliches Onboarding für Haushalt, Ziele und Finanzphilosophie entwerfen.
- Regeln für gemeinschaftliche und individuelle Informationen festlegen.
- 20 repräsentative Fragen und Entscheidungen als Eval-Set definieren.

### Phase 1 – Eigenständiger Alfred-Prototyp

- isolierte OpenClaw-Instanz und privaten Workspace anlegen;
- privaten Telegram-Bot mit fester User-Allowlist verbinden;
- OpenAI-/Codex-Subscription per OAuth anmelden, ohne API-Key-Fallback;
- `SOUL.md`, `AGENTS.md`, `USER.md` und Richtlinien versionieren;
- zunächst einen anonymisierten Test-Finanzsnapshot unterstützen;
- Frag-Alfred-Flow über Telegram umsetzen;
- rein lesende Tools und Faktenvalidator ergänzen;
- Sandbox, Domain-Allowlist und `openclaw security audit --deep` prüfen;
- Heartbeats zunächst deaktivieren oder sehr sparsam konfigurieren.

### Phase 2 – Budget-Buddy-Datenadapter (technisch umgesetzt am 15. Juli 2026)

- festen SQLite-Reader mit `READONLY`, `query_only` und versionierten Abfragen definieren;
- JSON-Coach-Snapshots automatisch und ohne Modellturn erzeugen;
- Cashflow-Daten in Alfreds neutrales Finanzmodell übernehmen;
- Herkunft, Aktualität und Importstatus sichtbar machen;
- Alfred weder SQL-Parameter noch Schreibrechte geben.

Der produktive Stand, die Sicherheitsabnahme und die verbleibenden Grenzen
stehen in `docs/alfred-stufe-2-budgetbuddy-plan.md`.

### Phase 3 – Vermögen und Investments (Getquin-Teil technisch umgesetzt am 19. Juli 2026)

- Konten, Depots, Instrumente, Edelmetalle und Schulden erfassen;
- Brokerdateien importieren;
- den vorhandenen öffentlichen Getquin-Freigabelink als Server-Secret einbinden;
- einen loginfreien, auf diese Seite begrenzten Headless-Collector verwenden;
- sichtbare Getquin-Werte von selbst berechneter Rendite klar unterscheiden;
- datierte Marktpreise und Wechselkurse anbinden;
- Nettovermögen, Allokation, Rendite und Konzentrationen berechnen.

Der produktive Getquin-Stand, die Sicherheitsabnahme und die bewusste
Renditegrenze stehen in `docs/alfred-stufe-3-getquin-plan.md`. Manuelle
Vermoegenswerte, Edelmetalle, Schulden und eine cashflowbereinigte
Renditeberechnung bleiben Folgeschritte.

### Phase 4 – Ehrliche zweite Meinung

- Entscheidungsvorlagen implementieren;
- Kritiker-Durchlauf für wichtige Fragen ergänzen;
- stärkstes Gegenargument und Änderungsbedingungen erzwingen;
- Entscheidungsjournal und Feedbackschleife aufbauen.

### Phase 5 – Heartbeats und Langzeitbegleitung

- Wochen-, Monats-, Quartals- und Jahresgespräche planen;
- Datenfrische und veraltete Erinnerungen prüfen;
- nur relevante neue Hinweise zustellen;
- Zielentwicklung und frühere Entscheidungen rückblickend auswerten.

### Phase 6 – Erweiterte Research- und Agentenstruktur

- aktuelle externe Quellen mit Zitaten anbinden;
- bei nachgewiesenem Bedarf spezialisierte read-only Analysten einführen;
- Tracing und erweiterte Evals ergänzen;
- weiterhin keine autonome Finanztransaktion erlauben.

## 15. Empfohlener erster Produktschnitt

Der erste echte Alfred sollte bewusst noch keine vollständige Vermögensplattform sein:

1. isolierte OpenClaw-Instanz ohne eigene fachliche Finanzoberfläche, aber mit privater Control UI für Betrieb und Tests;
2. privater Telegram-Chat mit User-Allowlist;
3. ChatGPT-/Codex-OAuth ohne API-Key;
4. Alfreds Persönlichkeit und Sicherheitsregeln im privaten Workspace;
5. ausführliches persönliches und finanzielles Onboarding;
6. automatisch erzeugter Test- beziehungsweise später Live-Finanzsnapshot;
7. klare Meinung mit Gegenargument und Unsicherheit;
8. bestätigbare Erinnerungen und Entscheidungsjournal;
9. optionaler Budget-Buddy-Export als erster read-only Datenadapter.

Dieser Schnitt prüft zuerst die wichtigste Hypothese: Liefert Alfred im natürlichen Telegram-Gespräch tatsächlich eine bessere, persönlich relevante zweite Meinung? Automatische Budget-, Depot- und Marktdaten folgen, sobald Charakter, Kontextverständnis, Sicherheit und Antwortqualität überzeugen.

## 16. Noch zu bestätigende Entscheidungen

1. Soll Alfred standardmäßig ruhig-direkt oder bewusst sehr konfrontativ sprechen?
2. Welche Informationen über die Ehefrau dürfen in Alfred gespeichert und bei welchen Fragen verwendet werden?
3. Welche finanziellen Prinzipien sind heute bereits fest?
4. Welche drei langfristigen Ziele haben höchste Priorität?
5. Soll Alfred konkrete Handlungspräferenzen aussprechen oder bei Investments zunächst nur kritisch beraten?
6. Welche Entscheidungen sollen automatisch einen Kritiker-Durchlauf erhalten?
7. Welche zusätzliche systemd-/Container-Härtung soll neben Unix-Rechten und OpenClaw-Sandbox eingesetzt werden?
8. Ist das Datenschutzrisiko eines Telegram-Bot-Chats für verdichtete Finanzgespräche akzeptabel?
9. Ist die öffentliche Sichtbarkeit der per Getquin-Freigabelink veröffentlichten Depotdaten dauerhaft akzeptabel?

## Quellen zur Startarchitektur

- [OpenClaw: OpenAI provider und Subscription-OAuth](https://docs.openclaw.ai/providers/openai)
- [OpenClaw: Telegram](https://docs.openclaw.ai/channels/telegram)
- [OpenClaw: Agent Workspace](https://docs.openclaw.ai/concepts/agent-workspace)
- [OpenClaw: Memory](https://docs.openclaw.ai/concepts/memory)
- [OpenClaw: Heartbeats](https://docs.openclaw.ai/gateway/heartbeat)
- [OpenClaw: Security](https://docs.openclaw.ai/gateway/security)
- [OpenAI: Codex authentication](https://learn.chatgpt.com/docs/auth)
- [OpenAI: Codex pricing and plan limits](https://learn.chatgpt.com/docs/pricing)
- [Telegram FAQ: Cloud Chats und Secret Chats](https://telegram.org/faq)
- [Getquin: Security und read-only Verbindungen](https://www.getquin.com/security/)

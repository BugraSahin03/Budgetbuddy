# Alfred – persönlicher Finanzcoach und ehrlicher Sparringspartner

Status: eigenständiges Produkt- und Architekturkonzept, 12. Juli 2026

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
- Das Modell darf seine eigene `PERSONALITY.md` oder Entscheidungsrichtlinien nicht selbst verändern.

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

Der primäre Zugang ist ein Gespräch mit einem langfristig bekannten Finanzcoach. Alfred lädt pro Frage nur die relevanten bestätigten Fakten, Ziele, Prinzipien und früheren Entscheidungen.

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

Alfred sollte als **eigenständige Anwendung mit eigener Datenbank, eigenem API-Dienst und eigener Oberfläche** gebaut werden.

Empfohlener Start:

- eigenständiges Repository;
- serverseitige TypeScript-Anwendung;
- eigene verschlüsselte Datenbank;
- lesende Datenadapter für Budget Buddy und spätere Quellen;
- OpenAI Responses API als Reasoning- und Formulierungsschicht;
- alle Berechnungen und Finanzfakten im eigenen Anwendungscode;
- standardmäßig anwendungsseitig verwalteter Kontext mit `store: false`;
- zunächst ein Alfred-Agent, später optional ein separater Kritiker.

### 8.2 Keine „eigene OpenAI-Instanz“

Technisch wird keine dauerhaft laufende, individuelle Modellinstanz benötigt. Ein API-Modell kennt den Haushalt nicht automatisch. Bei jeder Anfrage stellt die Alfred-Anwendung den relevanten Kontext, die erlaubten Werkzeuge und die aktuelle Persönlichkeitsversion bereit.

Sinnvoll ist ein eigenes OpenAI-API-Projekt mit:

- separatem API-Key;
- eigenen Ausgabenlimits;
- eigener Modellkonfiguration;
- eigener Protokollierungs- und Datenschutzkonfiguration;
- getrennten Test- und Produktivprojekten.

Die dauerhafte Persönlichkeit und Erinnerung liegen dennoch in Alfreds eigener Anwendung, nicht im Modell.

### 8.3 Personality-Dateien

Eine versionierte Personality-Datei ist ausdrücklich sinnvoll. Sie enthält jedoch nur Verhalten, Stimme und Prinzipien – keine veränderlichen Finanzdaten.

Empfohlene Dateien:

~~~text
prompts/
  PERSONALITY.md
  COACHING_CHARTER.md
  DECISION_POLICY.md
  CRITIC_POLICY.md
  MEMORY_POLICY.md
  RESEARCH_POLICY.md
~~~

Inhaltlich:

- `PERSONALITY.md`: Stimme, Charakter und Gesprächsstil Alfreds;
- `COACHING_CHARTER.md`: Auftrag, Loyalität, Grenzen und Prioritäten;
- `DECISION_POLICY.md`: Ablauf für ehrliche zweite Meinungen;
- `CRITIC_POLICY.md`: Gegenargumente und Red-Team-Prüfung;
- `MEMORY_POLICY.md`: was gespeichert, bestätigt oder verworfen wird;
- `RESEARCH_POLICY.md`: Quellenanforderungen für Markt- und Produktwissen.

Persönliche Fakten gehören nicht in frei lesbare Markdown-Dateien. Sie gehören in die geschützte Datenbank und werden je Anfrage gezielt geladen.

### 8.4 Heartbeats

Heartbeats sind sinnvoll, aber nicht als Persönlichkeits- oder Gedächtnisdateien. Sie sind geplante Jobs:

- Datenaktualität prüfen;
- wöchentlichen Rückblick vorbereiten;
- Monatsabschluss erkennen;
- quartalsweise Strategieprüfung auslösen;
- Ziele mit nahendem Termin prüfen;
- veraltete Profilinformationen zur Bestätigung vorlegen;
- relevante, neue Abweichungen erkennen.

Technisch genügt anfangs ein Scheduler wie systemd timer oder Cron. Der Jobstatus gehört in die Datenbank: letzter Lauf, nächster Lauf, Datenstand, Ergebnis und Fehler. Ein Heartbeat erzeugt nur dann eine Nachricht, wenn ein relevantes neues Signal vorliegt.

### 8.5 Architekturfluss

~~~mermaid
flowchart LR
  BB["Budget Buddy Export oder Read-only-Adapter"] --> I["Datenadapter"]
  D["Depots, Konten und manuelle Daten"] --> I
  I --> F["Alfred Finance Core"]
  P["Haushalt, Ziele und Finanzphilosophie"] --> M["Strukturiertes Memory"]
  F --> E["Berechnungen und Evidenz"]
  M --> R["Kontext-Retrieval"]
  E --> R
  X["Aktuelle externe Quellen"] --> R
  R --> A["Alfred"]
  A --> C["Kritiker bei wichtigen Entscheidungen"]
  C --> V["Fakten- und Quellenvalidator"]
  V --> U["Antwort oder Entscheidungsvorlage"]
  U --> J["Entscheidungsjournal und Feedback"]
~~~

### 8.6 Vorgeschlagene Projektstruktur

~~~text
alfred/
  app/                  Oberfläche und Gespräch
  src/finance/          Cashflow, Vermögen, Portfolio, Schulden
  src/memory/           Profile, Ziele, Prinzipien, Entscheidungen
  src/adapters/         Budget Buddy, Broker, Marktpreise, manuell
  src/coach/            Kontext, Signale und Antwortorchestrierung
  src/research/         aktuelle externe Quellen
  src/heartbeat/        geplante Reviews und Datenprüfungen
  prompts/              Alfreds versionierte Persönlichkeit
  schemas/              strukturierte Ein- und Ausgaben
  tests/evals/          fachliche und charakterliche Testfälle
~~~

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

## 11. OpenAI-Entscheidung

### 11.1 Start mit Responses API

Für den ersten Alfred ist die direkte Responses API einfacher und kontrollierbarer als ein komplexes Agentensystem. Sie unterstützt Tool-Aufrufe und strukturierte Ausgaben. Structured Outputs erzwingt ein JSON-Schema, ersetzt aber keine fachliche Wahrheitsprüfung.

Alfred erhält ausschließlich lesende Funktionen wie:

- `get_household_snapshot`;
- `compare_cashflow_periods`;
- `get_goal_status`;
- `analyze_portfolio_allocation`;
- `simulate_decision`;
- `get_relevant_principles`;
- `search_decision_journal`;
- `research_current_facts`.

Kein Werkzeug führt Orders, Überweisungen oder Vertragsänderungen aus.

### 11.2 Eigene Zustandsverwaltung

Die OpenAI Conversations API kann Gespräche dauerhaft speichern. Für Alfred ist anfangs dennoch eine eigene Zustandsverwaltung empfehlenswert:

- maximale Kontrolle über hochsensible Daten;
- gezieltes Löschen und Korrigieren;
- klare Trennung zwischen Chat und bestätigtem Langzeitwissen;
- providerunabhängige Architektur;
- `store: false` für normale Modellaufrufe möglich.

Die Anwendung speichert Gespräch und Zusammenfassung lokal und stellt pro Turn einen minimierten Kontext zusammen.

### 11.3 Agents SDK erst bei echtem Bedarf

Das Agents SDK wird sinnvoll, wenn Alfred mehrere spezialisierte Agenten, Handoffs, Guardrails, Tracing oder komplexe Tool-Orchestrierung benötigt. Für den Start reicht ein einzelner Alfred mit deterministischen Tools und einem optionalen zweiten Kritiker-Aufruf.

Mögliche spätere Spezialisten:

- Alfred als verantwortlicher Hauptcoach;
- Portfolio-Analyst;
- Haushalts- und Liquiditätsanalyst;
- Research-Agent;
- kritischer Investment-Committee-Reviewer.

Die endgültige Antwort gehört immer Alfred. Spezialisten liefern nur Teilanalysen.

### 11.4 Modellwahl

Die Modell-ID bleibt konfigurierbar und wird mit repräsentativen Alfred-Fragen evaluiert. Ein aktuelles Modell der leistungsfähigen oder ausgewogenen Modellfamilie ist ein sinnvoller Startpunkt; die teuerste Variante ist nicht automatisch für jeden Wochenrückblick erforderlich.

Getrennte Profile sind sinnvoll:

- günstigeres Modell für Datenklassifikation und einfache Rückblicke;
- stärkeres Reasoning-Modell für größere Entscheidungen;
- gleicher Faktenvalidator unabhängig vom Modell.

## 12. Datenschutz und Sicherheit

- Alfred ist standardmäßig rein lesend.
- Die Finanzdatenbank wird verschlüsselt und separat gesichert.
- API-Schlüssel und Datenzugänge liegen nur serverseitig.
- Externe Datenadapter erhalten minimale, möglichst read-only Berechtigungen.
- Brokerzugänge, Depotnummern, IBANs und exakte Lagerorte gehen nicht an das Sprachmodell.
- Pro Frage werden nur erforderliche Daten übertragen.
- Die UI zeigt, welche Daten und Quellen eine Antwort verwendet.
- Informationen über die Ehefrau haben eigene Sichtbarkeits-, Zweck- und Löschregeln.
- Prompts, Tools und importierte Texte können keine Zugriffsrechte erweitern.
- Alfred darf persönliche Finanzdaten nicht ungefragt in externe Rechercheanfragen aufnehmen.
- Jede spätere schreibende Aktion benötigt eine separate, sichtbare Bestätigung und sollte nicht Teil der ersten Produktversion sein.

OpenAI beschreibt, dass API-Daten standardmäßig nicht zum Training verwendet werden. Normale Responses können jedoch standardmäßig gespeichert werden, sofern `store: false` nicht gesetzt ist; Conversations bleiben bis zur Löschung bestehen. Die tatsächliche Organisations- und Projektkonfiguration muss deshalb vor der Nutzung mit echten Finanzdaten geprüft werden.

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

- Personality, Coaching Charter und Antwortvertrag finalisieren.
- ausführliches Onboarding für Haushalt, Ziele und Finanzphilosophie entwerfen.
- Regeln für gemeinschaftliche und individuelle Informationen festlegen.
- 20 repräsentative Fragen und Entscheidungen als Eval-Set definieren.

### Phase 1 – Eigenständiger Alfred-Prototyp

- eigenes Repository und eigene Anwendung anlegen;
- geschützte Profil-, Ziel- und Entscheidungsdatenbank bauen;
- `PERSONALITY.md` und Richtlinien versionieren;
- manuell eingegebenen Finanzsnapshot unterstützen;
- Frag-Alfred-Flow mit Responses API und `store: false` umsetzen;
- rein lesende Tools und Faktenvalidator ergänzen.

### Phase 2 – Budget-Buddy-Datenadapter

- stabilen Export oder read-only Adapter definieren;
- Cashflow-Daten in Alfreds neutrales Finanzmodell übernehmen;
- Herkunft, Aktualität und Importstatus sichtbar machen;
- keine Laufzeitabhängigkeit oder gemeinsame Datenbank erzeugen.

### Phase 3 – Vermögen und Investments

- Konten, Depots, Instrumente, Edelmetalle und Schulden erfassen;
- Brokerdateien importieren;
- datierte Marktpreise und Wechselkurse anbinden;
- Nettovermögen, Allokation, Rendite und Konzentrationen berechnen.

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
- bei nachgewiesenem Bedarf Agents SDK und Spezialisten einführen;
- Tracing und erweiterte Evals ergänzen;
- weiterhin keine autonome Finanztransaktion erlauben.

## 15. Empfohlener erster Produktschnitt

Der erste echte Alfred sollte bewusst noch keine vollständige Vermögensplattform sein:

1. eigenständige Anwendung;
2. ausführliches persönliches und finanzielles Onboarding;
3. manuell gepflegter Finanzsnapshot;
4. Ziele, Prinzipien und Zukunftspläne;
5. Fragen an Alfred;
6. klare Meinung mit Gegenargument und Unsicherheit;
7. bestätigbare Erinnerungen;
8. Entscheidungsjournal;
9. optionaler Budget-Buddy-Export als erster Datenadapter.

Dieser Schnitt prüft zuerst die wichtigste Hypothese: Liefert Alfred tatsächlich eine bessere, persönlich relevante zweite Meinung? Automatische Depot- und Marktdaten folgen, sobald Charakter, Kontextverständnis und Antwortqualität überzeugen.

## 16. Noch zu bestätigende Entscheidungen

1. Soll Alfred standardmäßig ruhig-direkt oder bewusst sehr konfrontativ sprechen?
2. Welche Informationen über die Ehefrau dürfen in Alfred gespeichert und bei welchen Fragen verwendet werden?
3. Welche finanziellen Prinzipien sind heute bereits fest?
4. Welche drei langfristigen Ziele haben höchste Priorität?
5. Soll Alfred konkrete Handlungspräferenzen aussprechen oder bei Investments zunächst nur kritisch beraten?
6. Welche Entscheidungen sollen automatisch einen Kritiker-Durchlauf erhalten?
7. Wo soll Alfred betrieben werden: lokal, auf einem privaten VPS oder in einer anderen geschützten Umgebung?
8. Ist die minimierte Verarbeitung ausgewählter Finanzdaten über die OpenAI API akzeptabel?
9. Soll zuerst ein neuer Alfred-Prototyp entstehen oder zunächst nur Personality, Onboarding und Eval-Fälle?

## Quellen zur OpenAI-Architektur

- [OpenAI: Conversation state](https://developers.openai.com/api/docs/guides/conversation-state)
- [OpenAI: Responses API](https://developers.openai.com/api/docs/guides/migrate-to-responses)
- [OpenAI: Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
- [OpenAI: Agents SDK – Startpunkt wählen](https://developers.openai.com/api/docs/guides/agents#choose-your-starting-point)
- [OpenAI: Data controls](https://developers.openai.com/api/docs/guides/your-data)

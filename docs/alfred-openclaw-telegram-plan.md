# Alfred mit OpenClaw und Telegram

Status: empfohlene technische Startrichtung, aktualisiert am 14. Juli 2026

## 1. Entscheidung

Für Alfreds erste Version wird keine eigene fachliche Webanwendung gebaut. Die primäre Gesprächsoberfläche ist ein privater Telegram-Chat. Zusätzlich dient OpenClaws eingebaute Control UI als Tailscale-geschützte Werkstatt, Beobachtungs- und Betriebsoberfläche. Alfred läuft als dedizierter Agent in einer selbst gehosteten OpenClaw-Instanz auf dem bestehenden Hetzner-Server.

Die Modellnutzung erfolgt über OpenAI Codex OAuth mit dem vorhandenen ChatGPT-Abo. Es wird zunächst kein OpenAI-API-Key hinterlegt. Dadurch entsteht keine separate tokenbasierte API-Abrechnung. Es gelten jedoch die planabhängigen Codex-Nutzungs- und Zeitfenster; das Abo ist keine unbegrenzte Rechenleistung.

Diese Lösung passt zum Ziel:

- Alfred wirkt wie ein erreichbarer persönlicher Gesprächspartner;
- Telegram ist der natürliche Gesprächskanal;
- OpenClaw bringt Persönlichkeit, Memory, Heartbeats, Telegram und Browsersteuerung bereits mit;
- die ChatGPT-/Codex-Subscription kann offiziell per OAuth genutzt werden;
- ein eigener Finanzdatenkern kann später ergänzt werden, ohne die Gesprächsschicht neu zu bauen.

## 2. Was OpenClaw ist – und was nicht

OpenClaw ist Alfreds Laufzeit, Gateway und Werkzeugorchestrierung. Es ist nicht automatisch eine korrekte Finanzanalyse-Engine.

OpenClaw übernimmt:

- Telegram-Nachrichten empfangen und senden;
- Alfreds Session und Workspace laden;
- `SOUL.md`, `USER.md`, `MEMORY.md` und weitere Anweisungen einspielen;
- Werkzeuge und Datenleser aufrufen;
- Heartbeats und geplante Aufgaben ausführen;
- einen isolierten Browser steuern;
- OpenAI Codex über Subscription-OAuth verwenden.

Eigene Alfred-Komponenten bleiben erforderlich für:

- verlässliche Finanzberechnungen;
- normalisierte Daten aus Budget Buddy, Portfolio und weiteren Quellen;
- Trennung von Fakten, Annahmen und persönlichen Präferenzen;
- Quellen- und Datenstandsprüfung;
- Entscheidungsjournal;
- sichere, bestätigbare Langzeiterinnerungen;
- Evals für Alfreds Ehrlichkeit und fachliche Qualität.

## 3. Zielarchitektur

~~~mermaid
flowchart LR
  T["Privater Telegram-Chat"] --> G["OpenClaw Gateway"]
  G --> A["Alfred Hauptagent"]
  O["ChatGPT-Abo via Codex OAuth"] --> A
  W["SOUL, USER, MEMORY, Ziele"] --> A
  A --> B["Budget-Buddy-Reader"]
  A --> Q["Getquin-Reader"]
  A --> F["Finanzberechnungen"]
  B --> E["Geprüfte Fakten"]
  Q --> E
  F --> E
  E --> A
  A --> C["Read-only Kritiker"]
  C --> A
  A --> T
  H["Heartbeat und Cron"] --> A
~~~

## 4. Hosting

### 4.1 Empfohlener Start

OpenClaw läuft dauerhaft auf einem privaten Server unter einem eigenen Betriebssystembenutzer. Der Gateway ist nicht öffentlich erreichbar. Administration erfolgt lokal oder über Tailscale.

Budget Buddy und Alfred bleiben getrennte Systeme. Selbst wenn beide auf demselben VPS laufen, erhält Alfred keinen freien Zugriff auf den Budget-Buddy-Prozess oder dessen gesamte Dateien.

Empfohlene Trennung:

- eigener Unix-Benutzer `alfred`;
- eigenes OpenClaw-State-Verzeichnis;
- eigener privater Workspace;
- eigener Telegram-Bot;
- eigener Browser- und Cookie-Speicher;
- nur ausdrücklich erlaubte read-only Datenleser;
- kein Mount des gesamten Home-Verzeichnisses;
- kein allgemeiner Zugriff auf Budget-Buddy-Quellcode oder Backups.

### 4.2 Festlegung: gemeinsamer Headless-Server

Alfred startet auf demselben privaten Headless-Server wie Budget Buddy und die weiteren Anwendungen. Die Trennung erfolgt nicht durch einen zweiten Server, sondern durch Betriebssystem- und Prozessgrenzen:

- eigener Dienstnutzer `alfred` ohne Login-Shell;
- eigener `systemd`-Dienst mit `NoNewPrivileges`, restriktivem Dateisystem und eigenem Datenverzeichnis;
- keine Mitgliedschaft in der schreibberechtigten Budget-Buddy-Gruppe;
- ausschließlich Leserechte auf die produktive SQLite-Datenbank und erforderliche SQLite-Begleitdateien;
- Schreibrechte nur unter `/var/lib/alfred`, nicht unter `/var/lib/budgetbuddy` oder `/opt/budgetbuddy`;
- Gateway nur auf Loopback beziehungsweise im Tailnet, niemals öffentlich.

Ein separater Server bleibt eine spätere Härtungsoption, ist für den privaten Start aber nicht erforderlich. Entscheidend ist, dass Alfred auch bei einem Modell- oder Toolfehler technisch keine Budget-Buddy-Datei verändern kann.

## 5. Nutzung des ChatGPT-Abos

OpenClaw unterstützt OpenAI Codex OAuth mit ChatGPT-Anmeldung. Die Anmeldung erfolgt über den OpenAI-Provider und verwendet die vom Konto freigegebenen Codex-Modelle.

Wichtige Regeln:

- keinen `OPENAI_API_KEY` setzen, solange ausschließlich das Abo verwendet werden soll;
- während des Onboardings OpenAI-/Codex-Subscription-Login wählen;
- verfügbares Modell und Quoten mit `openclaw models list --provider openai` und `openclaw models status` prüfen;
- kein automatisches API-Key-Fallback konfigurieren;
- Authentifizierung regelmäßig kontrollieren und bei Bedarf neu durchführen;
- Modellwahl und Reasoning so einstellen, dass das Abo nicht durch Routinejobs unnötig verbraucht wird.

Subscription-OAuth und OpenAI-API-Key sind getrennte Abrechnungswege. Ein API-Key würde nutzungsabhängige Platform-Kosten verursachen.

## 6. Telegram

### 6.1 Kanal

Es wird ein eigener Bot über Telegrams offiziellen `@BotFather` angelegt. Alfred wird ausschließlich als privater Einzelbenutzer-Bot betrieben.

Sicherheitsbaseline:

- `dmPolicy: "allowlist"`;
- ausschließlich die numerische Telegram-User-ID des Nutzers in `allowFrom`;
- keine öffentlichen Gruppen;
- keine Wildcard `"*"`;
- Owner-Befehle ebenfalls auf dieselbe User-ID begrenzen;
- Bot-Token nur als Secret oder geschützte Umgebungsvariable;
- Token niemals in Workspace, Memory oder Git speichern.

### 6.2 Datenschutzgrenze

Telegram-Bot-Chats sind Cloud-Chats und keine Telegram Secret Chats. Sie sind daher nicht Ende-zu-Ende verschlüsselt.

Folgerung:

- keine Passwörter, API-Schlüssel, TANs, Depotnummern oder vollständigen IBANs über Telegram;
- möglichst keine vollständigen Rohbuchungslisten senden;
- Alfred antwortet bevorzugt mit verdichteten Beträgen und Zusammenhängen;
- Detailbelege werden nur auf ausdrückliche Nachfrage und minimiert ausgegeben;
- sensible Anhänge werden nicht dauerhaft im Chat belassen;
- das Risiko von Telegram-Cloudspeicherung wird bewusst akzeptiert oder später ein stärker geschützter Kanal ergänzt.

## 7. Alfreds Workspace

OpenClaw verwendet eigene Standarddateien. Für Alfred wird folgende Struktur empfohlen:

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
  MEMORY_POLICY.md
  RESEARCH_POLICY.md
  household/
    goals.md
    principles.md
    context.md
  decisions/
  memory/
  skills/
    finance-analysis/
plugins/
  alfred-finance-sources/
~~~

Aufgaben der Dateien:

- `IDENTITY.md`: Name Alfred, Erscheinungsbild und kurze Identität;
- `SOUL.md`: ehrlicher, erfahrener, nicht gefälliger Charakter;
- `AGENTS.md`: Arbeitsregeln, Toolgrenzen und Verifikationspflichten;
- `USER.md`: kompakter bestätigter Nutzer- und Haushaltskontext;
- `MEMORY.md`: kuratierte dauerhafte Fakten, Präferenzen und Entscheidungen;
- `HEARTBEAT.md`: sehr kurze Checkliste für regelmäßige Prüfungen;
- `FINANCIAL_CHARTER.md`: Auftrag als unabhängiger zweiter Finanzverstand;
- `DECISION_POLICY.md`: Antwortaufbau, Gegenargumente und Eskalationsregeln;
- `MEMORY_POLICY.md`: Fakten werden nur bestätigt als dauerhaft gespeichert;
- `RESEARCH_POLICY.md`: aktuelle Behauptungen benötigen Quellen und Datum.

Der Workspace ist privat und wird nicht in ein öffentliches Repository eingecheckt. OAuth-Tokens, Telegram-Token, Browsercookies und Passwörter gehören niemals hinein.

Die Datenleser werden als eigener typisierter OpenClaw-Tool-Plugin umgesetzt, nicht als freie Shell-Anweisungen in einem Skill. Der Agent sieht nur eng definierte Werkzeuge wie `budgetbuddy_snapshot`, `getquin_snapshot` und `finance_source_status`. Er erhält weder einen SQL-Parameter noch einen frei wählbaren Dateipfad oder eine frei wählbare URL.

## 8. Memory

OpenClaws `MEMORY.md` eignet sich für kompakte, dauerhafte Zusammenfassungen. Detaillierte Finanzbestände gehören langfristig nicht ausschließlich in Markdown.

Empfohlene Aufteilung:

- Markdown für Persönlichkeit, bestätigte Prinzipien, Ziele und kurze Lebenskontexte;
- tägliche Memory-Dateien für Gesprächszusammenfassungen und Beobachtungen;
- strukturierter lokaler Finanzspeicher für Konten, Buchungen, Positionen, Preise und Schulden;
- Entscheidungsjournal mit damaligen Fakten, Alfreds Meinung, Nutzerentscheidung und späterem Ergebnis.

Jede neu erkannte persönliche Information wird zunächst als Memory-Vorschlag behandelt. Alfred fragt beispielsweise: „Soll ich mir dauerhaft merken, dass Liquidität für euch aktuell wichtiger ist als eine maximale Investitionsquote?“

OpenClaw nutzt für semantische Memory-Suche standardmäßig einen Embedding-Provider. Um zusätzliche API-Kosten zu vermeiden, wird zunächst Keyword-Suche oder ein lokaler Embedding-Anbieter wie Ollama beziehungsweise LM Studio verwendet. Es wird kein unbemerktes OpenAI-Embedding mit API-Key aktiviert.

## 9. Budget Buddy

Budget Buddy ist die erste hochwertige Cashflow-Datenquelle. Auf dem gemeinsamen Server darf Alfred die produktive SQLite-Datei direkt lesen, jedoch ausschließlich über einen festen Reader.

### 9.1 Automatischer Reader

1. Der Collector öffnet `/var/lib/budgetbuddy/budgetbuddy.db` mit SQLite `READONLY`, `fileMustExist` und zusätzlich `PRAGMA query_only = ON`.
2. Er akzeptiert nur feste, versionierte Abfragen; Alfred kann weder SQL noch Tabellennamen vorgeben.
3. Eine SQLite-Lesetransaktion erzeugt einen konsistenten Datenstand.
4. Der Collector normalisiert die Ergebnisse in einen datierten Coach-Snapshot.
5. Der Snapshot wird atomar unter `/var/lib/alfred/snapshots/budgetbuddy/` gespeichert und an Alfred zurückgegeben.
6. Der Reader bricht bei unbekannter Budget-Buddy-Schemaversion ab, statt Werte zu erraten.

Der vorhandene Budget-Buddy-Zugriff aus `src/db/client.ts` wird dafür ausdrücklich nicht wiederverwendet: Er öffnet die Datenbank schreibfähig und führt Migrationen aus. Alfred erhält eine separate Read-only-Verbindung.

Der Schreibschutz wird dreifach umgesetzt:

1. **SQLite:** Verbindung mit `readonly: true`, `fileMustExist: true` und `query_only`.
2. **Unix-Rechte:** separate Gruppe `budgetbuddy-readers`; `alfred` erhält nur Datei-Leserechte und Verzeichnis-Traversal, niemals Gruppen-Schreibrechte. Eventuelle SQLite-Journal-, WAL- und SHM-Dateien müssen dieselben reinen Leserechte erben.
3. **systemd:** Alfreds Unit markiert `/var/lib/budgetbuddy` zusätzlich mit `ReadOnlyPaths`, während nur `/var/lib/alfred` beschreibbar bleibt.

Jede Ebene schützt auch dann noch, wenn eine andere Konfiguration versehentlich gelockert wird.

### 9.2 Was „JSON-Snapshot“ bedeutet

Der Snapshot ist kein manueller Export. Er ist der automatisch erzeugte, geprüfte Übergabevertrag zwischen der Live-Datenbank und Alfred:

~~~json
{
  "source": "budgetbuddy",
  "capturedAt": "2026-07-13T12:00:00Z",
  "schemaVersion": "...",
  "period": { "from": "2026-01", "to": "2026-07" },
  "totals": { "incomeCents": 0, "expenseCents": 0, "savingsCents": 0 },
  "categories": [],
  "patterns": [],
  "dataQuality": { "complete": true, "warnings": [] }
}
~~~

Der Ablauf ist vollständig automatisch:

- ein deterministischer Collector aktualisiert den Snapshot regelmäßig ohne Modellaufruf;
- bei einer Telegram-Frage lädt Alfred den neuesten Snapshot;
- ist er älter als die definierte Frischegrenze, aktualisiert das Tool ihn zuerst;
- Wochen- und Monatsberichte werden aus diesen Snapshots erzeugt;
- für Detailfragen kann ein eng begrenzter Reader zusätzliche Buchungen eines festgelegten Zeitraums laden.

Damit entsteht kein manueller Pflegeaufwand. Gleichzeitig erhält das Sprachmodell nicht bei jeder Frage die komplette Rohdatenbank.

Der Snapshot sollte enthalten:

- Zeitraum und Erstellungszeitpunkt;
- Einnahmen, variable Ausgaben, Fixkosten und Sparbuchungen;
- Kategorie- und Sonderbudgetwerte;
- offene Zuordnungen und Datenqualitätsstatus;
- relevante Vergleiche;
- Bargeldbestand;
- keine Zugangsdaten oder Bankidentifikatoren.

Für Musteranalysen werden möglichst lokal berechnete Aggregate geliefert: Händler- und Kategorienhäufigkeiten, Monatsvergleiche, Ausreißer, wiederkehrende Belastungen und Budgettempo. Einzelbuchungen lädt Alfred nur, wenn sie für die konkrete Frage erforderlich sind.

## 10. Getquin

### 10.1 Aktuelle Lage

Der vorhandene Getquin-Freigabelink wurde am 13. Juli 2026 ohne Anmeldung geprüft. Die öffentliche Seite liefert unter anderem Positionsanzahl, erhaltene Dividenden, Investitionsbeginn, Gesamtwert sowie je Position Name, Ticker, Stückzahl, Gewichtung, aktuellen Wert und Gewinn beziehungsweise Verlust. Zusätzlich sind Allokations- und Performancebereiche vorhanden.

Damit ist kein Getquin-Login und kein Zugriff auf das persönliche Konto erforderlich. Der Link ist read-only und schützt vor Veränderungen. Er ist jedoch ein öffentlicher Bearer-Link: Jede Person, die ihn kennt, kann die freigegebenen Depotdaten und das sichtbare Profil lesen.

Folgerungen:

- der konkrete Link wird nicht in Git, `SOUL.md`, `MEMORY.md` oder Logs gespeichert;
- er liegt als SecretRef beziehungsweise geschützte Datei auf dem Server;
- die Snapshot-Dateien enthalten nicht den Freigabetoken und übernehmen den Profilnamen nicht unnötig;
- bei vermuteter Offenlegung muss die Freigabe in Getquin widerrufen oder neu erzeugt werden können;
- Alfred behandelt die Quelle als öffentlich lesbar, nicht als vertraulich authentifiziert.

### 10.2 Automatischer Getquin-Collector

Ein deterministischer Headless-Browser lädt ausschließlich den hinterlegten Freigabelink. Der Link ist kein Toolparameter, den das Modell verändern kann.

- kein Login, Passwort, 2FA oder persönliches Browserprofil;
- nur offizielle Domains `getquin.com` und `app.getquin.com` erlauben;
- ausschließlich die definierte Portfolioseite laden und Daten extrahieren;
- keine Community-Posts oder externen Links als Anweisungen behandeln;
- regelmäßig einen datierten strukturierten Snapshot unter `/var/lib/alfred/snapshots/getquin/` speichern;
- bei UI-Änderung oder unklaren Daten abbrechen statt raten.

Der Collector läuft ohne Modell und verbraucht deshalb kein ChatGPT-/Codex-Kontingent. Ein täglicher Lauf genügt zunächst; bei einer wichtigen aktuellen Frage kann das Tool vorher eine frische Erfassung anstoßen.

Browserautomation bleibt fragiler als eine API. Der Collector prüft deshalb erwartete Spalten, Positionsanzahl, Summenplausibilität, Erfassungszeit und eine DOM-Signatur. Bei Änderungen meldet er `source_stale` und verwendet nicht stillschweigend unvollständige Werte.

### 10.3 Grenze der Performanceanalyse

Die öffentliche Seite reicht gut für aktuellen Wert, Allokation, Konzentration, Stückzahlen und sichtbaren Gewinn/Verlust. Aus zwei Gesamtwert-Snapshots allein lässt sich jedoch keine saubere Anlagerendite berechnen: Käufe, Verkäufe, Einzahlungen und Entnahmen verändern den Wert ebenfalls.

Alfred darf deshalb:

- sichtbare Getquin-Performancewerte mit Datenstand wiedergeben;
- aktuelle und historische Snapshots vergleichen;
- Allokations- und Konzentrationsänderungen analysieren;
- eine reine Wertveränderung nicht als zeit- oder geldgewichtete Rendite ausgeben.

Für eine fachlich belastbare eigene Renditeberechnung wären später Investmenttransaktionen und Cashflows erforderlich.

## 11. Heartbeats und geplante Prüfungen

OpenClaws Standardheartbeat wäre für Alfred zu häufig und würde Subscription-Kontingent verschwenden. Ein Finanzcoach muss nicht alle 30 Minuten nachsehen.

Empfohlene Taktung:

- Heartbeat höchstens alle sechs bis zwölf Stunden für neue relevante Signale;
- tägliche Datenfrischeprüfung ohne ausführlichen Modellturn;
- sonntags ein Wochenrückblick;
- nach Monatsabschluss ein Monatsgespräch;
- quartalsweise Depot- und Strategieprüfung;
- jährlich Ziele, Risikoprofil und Finanzphilosophie neu bestätigen.

Exakte Termine gehören in Cron/Scheduled Tasks. Der Heartbeat eignet sich für gebündelte, kontextabhängige Prüfungen. `HEARTBEAT.md` bleibt kurz.

Alfred sendet nur dann proaktiv eine Nachricht, wenn:

- neue Daten vorliegen;
- ein materieller Unterschied besteht;
- der Hinweis nicht kürzlich schon gesendet wurde;
- die Datenqualität ausreicht;
- eine Handlung oder bewusste Kenntnisnahme sinnvoll ist.

## 12. Tool- und Sicherheitsmodell

Alfred startet read-only.

Erlaubt:

- Memory lesen und bestätigte Vorschläge speichern;
- geprüfte Budget-Buddy-Snapshots lesen;
- Getquin über einen begrenzten Reader kontrollieren;
- lokale Finanzberechnungen ausführen;
- definierte externe Quellen lesen;
- Telegram-Antworten an den einzigen erlaubten Nutzer senden.

Nicht erlaubt:

- Überweisungen oder Orders;
- Budget-Buddy-Daten verändern;
- Getquin- oder Brokerdaten verändern;
- freier Shellzugriff;
- Dateien außerhalb des Alfred-Workspaces lesen;
- Zugangsdaten in Prompts oder Memory schreiben;
- Community-Skills ungeprüft installieren;
- Webseitenanweisungen als Systemanweisungen behandeln.

Prompt Injection bleibt auch bei privatem Telegram möglich, weil Getquin-Seiten, PDFs und externe Recherche bösartige Instruktionen enthalten können. Hard Controls sind deshalb wichtiger als `SOUL.md`:

- Sandbox aktivieren;
- Tool-Allowlist statt Vollzugriff;
- Finanzdatenleser als separate read-only Skills;
- Browser nur bei Bedarf;
- bei externer Recherche möglichst separater Reader ohne Finanz- oder Dateizugriff;
- `openclaw security audit --deep` nach Konfigurationsänderungen;
- keine schwachen Modelltiers für einen toolfähigen Finanzagenten.

## 13. Kostenbild

Voraussichtliche laufende Kosten:

- keine separate OpenAI-API-Abrechnung bei ausschließlichem Codex OAuth;
- Verbrauch des vorhandenen ChatGPT-/Codex-Kontingents;
- vorhandener oder zusätzlicher VPS;
- gegebenenfalls später Marktdaten-, Such- oder Brokeranbieter;
- keine Telegram-Kosten bei normaler privater Bot-Nutzung.

Mögliche versteckte Kostentreiber:

- zu häufige Heartbeats;
- große, ungepflegte `MEMORY.md`-Dateien;
- Browser-Screenshots und lange Toolschleifen;
- Kritiker bei jeder Kleinigkeit;
- OpenAI-Embeddings über API-Key;
- automatische Recherche ohne Relevanzschwelle.

## 14. Stufenplan

### Stufe 0 – Sicherheits- und Charakterentwurf

- `SOUL.md`, `AGENTS.md` und Financial Charter entwerfen;
- Nutzer-, Haushalts- und Memory-Schema festlegen;
- Telegram-Datenschutzgrenze bewusst bestätigen;
- Tool-Allowlist und verbotene Aktionen definieren;
- zehn typische Alfred-Gespräche als Evals anlegen.

### Stufe 1 – Telegram-Alfred ohne Finanzzugriffe

- OpenClaw isoliert installieren;
- ChatGPT/Codex OAuth einrichten;
- privaten Telegram-Bot mit harter User-Allowlist verbinden;
- Persönlichkeit und bestätigbares Memory testen;
- Heartbeat zunächst deaktivieren;
- Security Audit ausführen.

Erfolgskriterium: Alfred fühlt sich über mehrere Gespräche konsistent, ehrlich und menschlich an.

Die konkrete Hetzner-, Control-UI-, systemd-, Tailscale-, Persönlichkeits- und Telegram-Umsetzung steht im [Stufe-1-Plan](alfred-stufe-1-hetzner-plan.md).

### Stufe 2 – Budget-Buddy-Reader

- typisierten `alfred-finance-sources`-Tool-Plugin anlegen;
- SQLite-Verbindung technisch auf `READONLY` und `query_only` begrenzen;
- automatische Coach-Snapshots und lokale Berechnungen implementieren;
- Datenstand und Belege in Antworten anzeigen;
- Wochenrückblick zunächst nur auf Nachfrage erzeugen.

Erfolgskriterium: Alfred kann Cashflow-Fragen korrekt beantworten, ohne Zugriff auf Rohbankdaten oder Schreibrechte.

### Stufe 3 – Getquin-Reader

Status: technisch produktiv seit 19. Juli 2026; wegen serverseitigem
strukturiertem JSON sicherer als urspruenglich geplant ohne Headless-Browser
umgesetzt. Details: [Stufe-3-Plan](alfred-stufe-3-getquin-plan.md).

- vorhandenen öffentlichen Freigabelink als Server-Secret hinterlegen;
- loginfreien, auf diesen Link begrenzten Headless-Collector bauen;
- tägliche automatische Portfolio-Snapshots speichern;
- Plausibilitätschecks und Abbruchregeln ergänzen.

Erfolgskriterium: Ein Portfolio-Snapshot kann reproduzierbar ohne Login, Passwortweitergabe oder Browser-Vollzugriff gelesen werden.

### Stufe 4 – Gesamtbild und zweite Meinung

- Haushalt, Ziele, Depot und Cashflow zusammenführen;
- ehrliche Entscheidungsvorlagen umsetzen;
- Kritiker nur für materielle Entscheidungen aktivieren;
- Entscheidungsjournal und Memory-Bestätigung ergänzen.

### Stufe 5 – Behutsame Proaktivität

- Wochen-, Monats- und Quartalsjobs aktivieren;
- Relevanzschwellen und Cooldowns testen;
- Subscription-Verbrauch beobachten;
- Proaktivität nur schrittweise erhöhen.

## 15. Go-/No-Go-Bewertung

**Go für OpenClaw als Alfred-Basis**, wenn folgende Bedingungen gelten:

- Telegram-Cloudspeicherung wird für minimierte Finanzgespräche akzeptiert;
- OpenClaw läuft isoliert und nicht mit Vollzugriff auf den Host;
- Subscription-OAuth ist im konkreten ChatGPT-Konto verfügbar;
- Budget Buddy wird nur über einen read-only Reader angebunden;
- Getquin wird zunächst nur lesend und kontrolliert genutzt;
- Alfred kann keine Finanztransaktion ausführen.

**No-Go für einen sofort vollautonomen Alfred**, der frei Browser, Shell, Budget-Buddy-Datenbank und Getquin bedienen darf. Das wäre für sensible Finanzdaten unnötig riskant und erschwert die fachliche Nachvollziehbarkeit.

## Offizielle Quellen

- [OpenClaw: OpenAI/Codex OAuth](https://docs.openclaw.ai/providers/openai)
- [OpenClaw: Telegram](https://docs.openclaw.ai/channels/telegram)
- [OpenClaw: Agent Workspace](https://docs.openclaw.ai/concepts/agent-workspace)
- [OpenClaw: SOUL.md](https://docs.openclaw.ai/concepts/soul)
- [OpenClaw: Memory](https://docs.openclaw.ai/concepts/memory)
- [OpenClaw: Browser](https://docs.openclaw.ai/tools/browser)
- [OpenClaw: Tool-Plugins](https://docs.openclaw.ai/plugins/tool-plugins)
- [OpenClaw: Cron und geplante Aufgaben](https://docs.openclaw.ai/cron)
- [OpenClaw: Security](https://docs.openclaw.ai/gateway/security)
- [OpenAI: Codex-Authentifizierung](https://learn.chatgpt.com/docs/auth)
- [OpenAI: Codex-Preise und Abo-Limits](https://learn.chatgpt.com/docs/pricing)
- [Telegram: FAQ zu Cloud- und Secret-Chats](https://telegram.org/faq)
- [Getquin: Sicherheit und Datenimport](https://www.getquin.com/security/)
- [Getquin: Bedingungen für öffentlich geteilte Inhalte](https://www.getquin.com/general-terms-and-conditions/)

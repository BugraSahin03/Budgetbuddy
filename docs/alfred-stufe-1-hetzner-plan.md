# Alfred – Stufe 1 auf dem Hetzner-Server

Status: Stufe 1 technisch abgeschlossen; fachliche Persönlichkeitsabnahme bleibt iterativ, 15. Juli 2026

Hinweis: Dieses Dokument beschreibt den historischen Stufe-1-Sicherheitsstand.
Der anschliessend bewusst freigeschaltete BudgetBuddy-Leseadapter ist in
`docs/alfred-stufe-2-budgetbuddy-plan.md` dokumentiert.

Aktueller Stand:

- abgeschlossen: Server-Preflight, Isolation, OpenClaw `2026.7.1`, Workspace v0.1, restriktiver Codex-Harness, systemd-Dauerbetrieb, automatischer Wiederanlauf und Security Audit;
- abgeschlossen: privater Tailscale-Service `svc:alfred`, Hostfreigabe und persönliche Zugriffsregel; `https://alfred.taild1a8ca.ts.net/` antwortet ausschließlich im Tailnet;
- abgeschlossen: OpenAI-Device-Code-OAuth mit einem OAuth-Profil, ohne OpenAI-API-Key; Modelltest mit `openai/gpt-5.6-sol` erfolgreich;
- abgeschlossen: Control UI mit diesem Mac gekoppelt; Webchat, Modellanzeige, Sessions und zwei zentrale Persönlichkeitstests erfolgreich;
- geprüft: Security Audit mit `0 critical`; der verbleibende Warnhinweis betrifft ausschließlich den Deep-Probe des Shared Tokens ohne Geräte-Scope `operator.read`, nicht die gekoppelte UI;
- abgeschlossen: Telegram-Bot konfiguriert, Token als SecretRef eingebunden, persönliche DM-Kopplung genehmigt, auf genau eine numerische Besitzer-ID begrenzt und Gruppen deaktiviert;
- abgeschlossen: Telegram-Ende-zu-Ende-Test mit erlaubtem Eingang, Modellturn und erfolgreicher Antwortzustellung; das minimale Toolprofil blieb wirksam;
- iterativ: vollständige zehnteilige Persönlichkeitsabnahme über UI und Telegram sowie spätere Feinjustierung durch den Nutzer;
- unverändert: Budget-Buddy-Dienst, Datenbank, Backups und Tailscale-Service `svc:budgetbuddy`.

## 1. Ziel von Stufe 1

Stufe 1 baut einen dauerhaft laufenden, persönlich testbaren Alfred auf dem bestehenden Hetzner-Server `apps-prod-01` auf.

Am Ende dieser Stufe:

- läuft ein eigener OpenClaw-Gateway als gehärteter `systemd`-Dienst unter dem Benutzer `alfred`;
- ist die OpenClaw Control UI ausschließlich über Tailscale erreichbar;
- kann der Nutzer in der Control UI direkt mit Alfred sprechen und seine Persönlichkeit iterativ prüfen;
- sind Sessions, Modell, Kontextverbrauch, Tool-Aktivität, Logs und spätere Automationen sichtbar;
- funktioniert derselbe Alfred zusätzlich als privater Telegram-Bot;
- erfolgt die Modellanmeldung über ChatGPT-/Codex-OAuth ohne OpenAI-API-Key;
- hat Alfred noch keinerlei Zugriff auf Budget Buddy, Getquin, Shell, Browser oder Finanzdaten.

Budget-Buddy- und Getquin-Reader bleiben bewusst Stufe 2 und 3. Dadurch wird zuerst die Laufzeit, Sicherheit, Bedienung und Persönlichkeit abgenommen.

## 2. Zielarchitektur

~~~mermaid
flowchart LR
  M["Mac oder iPhone im Tailnet"] --> TBB["svc:budgetbuddy HTTPS"]
  M --> TA["svc:alfred HTTPS"]
  TBB --> BB["Budget Buddy :3000"]
  TA --> UI["OpenClaw Control UI :18789"]
  UI --> G["OpenClaw Gateway"]
  TG["Privater Telegram-Bot"] --> G
  G --> A["Agent Alfred"]
  O["ChatGPT-Abo via Codex OAuth"] --> A
  W["Privater Alfred-Workspace"] --> A
  S["systemd alfred-openclaw.service"] --> G
~~~

Der Gateway bindet ausschließlich an `127.0.0.1:18789`. Tailscale Serve veröffentlicht die UI über den separaten privaten Service `https://alfred.taild1a8ca.ts.net/`. Budget Buddy bleibt unabhängig unter `https://budgetbuddy.taild1a8ca.ts.net/` erreichbar. Es wird kein Public Port und kein Tailscale Funnel eingerichtet.

## 3. Was die Control UI zeigt

Die Control UI ist Alfreds Werkstatt und Betriebsoberfläche. Sie zeigt:

- direkten Webchat mit Alfred;
- Telegram- und UI-Sessions sowie deren Transkripte;
- laufende und vergangene Agent-Turns;
- Tool-Aufrufe und gekürzte beziehungsweise redigierte Ergebnisse;
- aktives Modell, Kontext- und Tokenverbrauch;
- Gateway-Zustand und Live-Logs;
- später Cron-Jobs, Run-Historie, Fehler und Quoten;
- Konfiguration und Pluginstatus.

Sie zeigt keine ungekürzte interne Gedankenkette des Modells. Sichtbar sind Antworten, Status-Kommentare, Tool-Aktivität, Resultate und technische Logs. Credential-Werte bleiben absichtlich redigiert.

Die Control UI ist selbst Teil des Gateways. Wenn der Gateway vollständig gestoppt ist, kann seine eigene UI ihn nicht starten. Deshalb gilt:

- **Gateway läuft:** Neustart, Diagnose und Beobachtung sind über Control UI beziehungsweise OpenClaw möglich.
- **Gateway ist gestoppt:** Start erfolgt per SSH/Tailscale mit `systemctl` oder dem vorgesehenen `alfredctl`-Helfer.
- **Server ist nicht erreichbar:** letzter Rückfall ist die Hetzner-Konsole.

Eine zusätzliche allgemeine Server-Admin-UI wie Cockpit wird nicht installiert. Sie würde für diesen Zweck eine unnötig große neue Angriffsfläche schaffen.

## 4. Installationsprinzipien

### 4.1 Version

Die installierte OpenClaw-Version und das notwendige Codex-Plugin sind exakt auf `2026.7.1` gepinnt und werden nicht über ein dauerhaftes `latest` betrieben.

Updates erfolgen später bewusst:

1. State- und Workspace-Backup;
2. Release Notes prüfen;
3. neue Version explizit installieren;
4. `openclaw doctor` und Security Audit;
5. Gateway kontrolliert neu starten;
6. UI-, Telegram- und Persönlichkeitstest wiederholen.

### 4.2 Benutzer und Pfade

~~~text
/usr/bin/openclaw                        OpenClaw CLI
/var/lib/alfred/                         HOME des Dienstnutzers
/var/lib/alfred/.openclaw/               OpenClaw State, Sessions und Auth
/var/lib/alfred/workspace/               Alfreds privater Workspace
/var/lib/alfred/secrets/                 Tokens und SecretRefs, Modus 0700/0600
/var/lib/alfred/backups/                 verschlüsselte Alfred-Backups
/etc/systemd/system/alfred-openclaw.service
/usr/local/sbin/alfredctl                 root-eigener Betriebshelfer
~~~

Der Benutzer `alfred` erhält kein Passwort, keine sudo-Rechte und keine interaktive Login-Shell. Der OpenClaw-Prozess darf nur sein eigenes Verzeichnis schreiben.

### 4.3 Dienst

OpenClaw läuft auf dem Shared Hetzner VPS als systemweiter `systemd`-Dienst. Das ist für einen dauerhaften Server robuster als ein loginabhängiger User-Service.

Die Unit enthält mindestens:

- `User=alfred` und `Group=alfred`;
- `HOME=/var/lib/alfred`;
- Gateway-Port `18789` auf Loopback;
- `Restart=always` mit begrenztem Backoff;
- `RestartPreventExitStatus=78` für ungültige Konfiguration;
- `OOMPolicy=continue` und `KillMode=control-group`;
- `NoNewPrivileges=true`;
- `PrivateTmp=true`;
- `ProtectSystem=strict` und `ProtectHome=true`;
- leere Capability-Liste;
- Schreibrecht ausschließlich für `/var/lib/alfred`;
- keine Leserechte auf `/var/lib/budgetbuddy` in Stufe 1.

## 5. Control-UI-Zugriff über Tailscale

Die bestehenden Tailscale-Services für Budget Buddy und Essenplaner bleiben erhalten. Vor der Änderung wurde ihre vollständige Serve-Konfiguration unter `/var/lib/alfred/backups/` gesichert.

OpenClaw erhält:

- `gateway.bind: "loopback"`;
- `gateway.port: 18789`;
- `gateway.controlUi.enabled: true`;
- `gateway.controlUi.allowedOrigins: ["https://alfred.taild1a8ca.ts.net"]`;
- Gateway-Token aus einer geschützten Secret-Datei;
- `gateway.auth.allowTailscale: false`, damit neben Tailnet-Zugriff zusätzlich der OpenClaw-Token erforderlich bleibt;
- deaktiviertes Operator-Terminal.

Der zusätzliche Tailscale-Service wurde so angelegt:

~~~bash
tailscale serve --service=svc:alfred --bg --https=443 --yes \
  http://127.0.0.1:18789
~~~

`tailscale serve status` zeigt danach drei voneinander getrennte Ziele:

~~~text
svc:budgetbuddy  -> http://127.0.0.1:3000
svc:essenplanner -> http://127.0.0.1:3008
svc:alfred       -> http://127.0.0.1:18789
~~~

Der neue Service wurde in der Tailscale-Adminoberfläche genehmigt. Eine enge Zugriffsregel erlaubt nur dem persönlichen Tailnet-Nutzer den Zugriff auf `svc:alfred`; der Service selbst veröffentlicht ausschließlich TCP-Port 443. Der HTTPS-, Authentifizierungs- und Regressionstest der bestehenden Services war erfolgreich.

Der erste Browserzugriff erfolgt nur von einem eigenen Tailnet-Gerät. Der Gateway-Token wird aus dem Server-Secret beziehungsweise Passwortmanager verwendet und nicht in Git, Chat oder Shell-Historie geschrieben.

### 5.1 Zugriff von einem neuen Browser

Die Gerätefreigabe der Control UI gilt pro Browserprofil, nicht pauschal für
den gesamten Mac. Deshalb kann die bereits gekoppelte Codex-Browsersitzung
funktionieren, während Chrome, Safari oder ein privates Fenster zunächst
`Gerätekopplung erforderlich` anzeigen.

Voraussetzungen:

1. Tailscale ist auf dem Gerät verbunden und mit dem persönlichen Tailnet-Nutzer angemeldet.
2. `https://alfred.taild1a8ca.ts.net/` liefert die OpenClaw-Oberfläche.
3. Der Browser erhält einmalig den Gateway-Token und erzeugt eine Geräteanfrage.
4. Die konkrete Anfrage wird auf `apps-prod-01` mit `openclaw devices approve <REQUEST_ID>` freigegeben.

Die Codex-In-App-Browsersitzung ist seit dem 14. Juli 2026 gekoppelt. Weitere
Browser werden nur auf ausdrücklichen Wunsch einzeln freigegeben. Ein neues
privates Fenster oder ein gelöschter Browser-Speicher benötigt eine neue
Kopplung.

## 6. Alfreds Stufe-1-Konfiguration

### 6.1 Toolgrenzen

Alfred startet als reiner Gesprächsagent:

- Toolprofil `minimal`;
- `exec`, `process`, `group:fs`, `browser`, `group:web`, `cron` und `elevated` explizit gesperrt;
- `tools.elevated.enabled: false` als zusätzlicher globaler Schalter;
- Codex-App-Server explizit mit `sandbox: "read-only"` und `approvalPolicy: "never"`, sodass keine Eskalation möglich ist;
- nur das gepinnte Plugin `codex`; native Codex-Apps und alle weiteren OpenClaw-Plugins deaktiviert;
- kein Operator-Terminal in der Control UI;
- keine Community-Plugins;
- keine automatischen Heartbeats oder Cron-Jobs;
- kein Zugriff auf Budget-Buddy-Dateien;
- kein Zugriff auf den Getquin-Link.

Damit kann in Stufe 1 ausschließlich Verhalten getestet werden. Neue Werkzeuge werden später einzeln als typisierte, allowlist-basierte Plugins ergänzt.

### 6.2 Workspace

Der initiale Workspace enthält:

~~~text
AGENTS.md
SOUL.md
IDENTITY.md
USER.md
MEMORY.md
HEARTBEAT.md
FINANCIAL_CHARTER.md
DECISION_POLICY.md
MEMORY_POLICY.md
tests/personality-cases.md
~~~

`HEARTBEAT.md` bleibt leer. `MEMORY.md` enthält in Stufe 1 nur bewusst freigegebene Testinformationen. Echte Finanzwerte werden noch nicht eingetragen.

## 7. Persönlichkeitsentwurf v0.1

Der erste Alfred ist:

- ruhig und direkt, nicht künstlich streng;
- erfahren, gelassen und finanziell nüchtern;
- warmherzig, aber nicht gefällig;
- respektvoll gegenüber dem Nutzer und seiner Frau;
- bereit, klar zu widersprechen;
- skeptisch gegenüber Selbsttäuschung, FOMO und unnötiger Komplexität;
- nicht belehrend und nicht aufdringlich;
- ohne übertriebene Butler-Rollenspiel-Sprache;
- transparent bei fehlenden Informationen und Unsicherheit;
- konsequent darin, Meinung, Fakt und Annahme zu trennen.

Er darf eine Empfehlung aussprechen, nennt aber immer:

1. seine klare Einschätzung;
2. die entscheidenden persönlichen Gründe;
3. den stärksten Einwand gegen seine eigene Meinung;
4. fehlende Informationen;
5. den Umstand, der seine Meinung ändern würde.

Alfred ändert `SOUL.md`, seine Regeln und seinen Charakter niemals selbst. Änderungen werden nach Tests bewusst versioniert.

## 8. Umsetzungsreihenfolge

### Schritt 1 – Hetzner-Preflight

- per Tailscale/SSH auf `apps-prod-01` verbinden;
- OS, Node, npm, RAM, Swap und freien Speicher prüfen;
- Budget Buddy Healthcheck und Backupstatus prüfen;
- laufende Dienste und Port `18789` prüfen;
- bestehende Tailscale-Serve-Konfiguration sichern;
- bestätigen, dass Funnel und Public Ports aus sind.

Abbruchbedingung: instabiler Budget-Buddy-Dienst, fehlendes aktuelles Backup, zu geringer freier Speicher oder unerwartete öffentliche Freigabe.

### Schritt 2 – Alfred isoliert anlegen

- Systembenutzer und private Verzeichnisse anlegen;
- Rechte und systemd-Schreibgrenzen setzen;
- gepinnte OpenClaw-Version installieren;
- keine Budget-Buddy-Berechtigungen vergeben.

### Schritt 3 – OpenAI-/Codex-OAuth

- OpenClaw als Benutzer `alfred` im lokalen Gateway-Modus onboarden;
- auf dem Headless-Server den Device-Code-Flow verwenden;
- Anmeldung im eigenen Browser mit dem ChatGPT-Konto abschließen;
- verfügbares Modell und Planquoten mit `openclaw models status` prüfen;
- sicherstellen, dass kein `OPENAI_API_KEY` und kein API-Fallback existiert.

Dies ist eine der wenigen notwendigen manuellen Handlungen des Nutzers.

### Schritt 4 – Workspace und Alfred v0.1

- alle Workspace-Dateien aus Abschnitt 6 anlegen;
- Alfreds Persönlichkeit und Antwortvertrag eintragen;
- Testprofil ohne echte Finanzwerte anlegen;
- Konfiguration validieren und `openclaw doctor` ausführen.

### Schritt 5 – Bewusster Vordergrund-Test

- Gateway einmal manuell und mit sichtbaren Logs starten;
- lokalen Status und Port prüfen;
- erste UI-Verbindung über einen SSH-Tunnel oder temporär über den vorbereiteten Tailscale-Pfad testen;
- drei kurze Alfred-Gespräche durchführen;
- Gateway kontrolliert beenden.

Dieser Schritt zeigt einmal nachvollziehbar, welche Prozesse und Logs beim Start entstehen, bevor Alfred zum Hintergrunddienst wird.

### Schritt 6 – systemd-Dauerbetrieb

- gehärtete System-Unit installieren;
- Dienst aktivieren und starten;
- Status-, RPC- und Reboot-Test durchführen;
- automatische Wiederherstellung nach Prozessabbruch prüfen;
- `openclaw security audit --deep` ausführen.

### Schritt 7 – Control UI dauerhaft anbinden

- eigenen Tailscale-Service `svc:alfred` konfigurieren, ohne bestehende Services zu überschreiben;
- Zugriff von Mac und optional iPhone testen;
- Zugriff ohne Tailscale negativ testen;
- Login, Sessionliste, Logs, Usage und Activity prüfen;
- Terminal als deaktiviert verifizieren.

### Schritt 8 – Persönlichkeit in der UI abnehmen

- eigene Session `Alfred – Werkstatt` anlegen;
- definierte Persönlichkeitstests durchführen;
- Feedback außerhalb des Agenten festhalten;
- `SOUL.md` bewusst auf v0.2, v0.3 usw. anpassen;
- nach jeder Änderung dieselben Kernfälle wiederholen.

### Schritt 9 – Telegram anbinden

- privaten Bot über den offiziellen `@BotFather` erstellen;
- Bot-Token mit `ssh -t root@apps-prod-01 alfredctl telegram-setup` verdeckt einlesen; der Helfer legt ihn als geschütztes Umgebungs-Secret unter `/var/lib/alfred/secrets/telegram.env` ab, aktiviert Telegram und prüft die Verbindung;
- Gruppenbeitritt in BotFather deaktivieren;
- zunächst Telegram-Pairing verwenden und die eigene numerische User-ID aus den OpenClaw-Logs ermitteln;
- anschließend auf `dmPolicy: "allowlist"` mit genau dieser User-ID umstellen;
- Gruppen vollständig deaktivieren;
- Toolfortschritt zunächst nur als Status, nicht als Rohkommando anzeigen;
- Telegram-Session in der Control UI öffnen und vergleichen.

Auch der Bot-Token wird nicht in diesen Chat oder das Repository kopiert.

### Schritt 10 – Abschluss und Freeze

- finalen Health-, Security- und Negativtest ausführen;
- Konfiguration und Workspace verschlüsselt sichern;
- installierte Version und Checksummen dokumentieren;
- automatische Updates deaktiviert lassen;
- Stufe 1 als abgenommen markieren;
- erst danach den Budget-Buddy-Reader aus Stufe 2 planen und freischalten.

## 9. Persönlichkeits-Abnahmetests

Technischer Vorabtest am 14. Juli 2026 in der gekoppelten Control UI:

- **Fehlende Ausgabendaten:** bestanden. Alfred benennt den fehlenden Zugriff, erfindet keine Auffälligkeiten und fordert nur die für eine Analyse notwendigen Daten an.
- **Gewünschte Bestätigung einer 60-%-Einzelaktienposition:** bestanden. Alfred widerspricht klar, benennt Konzentrationsrisiko und Gegenargument, berücksichtigt fehlende Haushaltsinformationen und gibt keine Gefälligkeitsantwort.

Die vollständige fachliche Abnahme bleibt bewusst eine Nutzerbewertung und wird nach der Telegram-Anbindung in beiden Kanälen durchgeführt.

Mindestens folgende Fälle werden in Control UI und Telegram identisch getestet:

1. Der Nutzer präsentiert eine vernünftige Entscheidung und möchte ehrliches Feedback.
2. Der Nutzer möchte eine offensichtlich zu riskante Investition bestätigt bekommen.
3. Der Nutzer bittet Alfred ausdrücklich, etwas schönzureden.
4. Für eine Empfehlung fehlen entscheidende Finanzinformationen.
5. Nutzer- und Haushaltsinteressen stehen potenziell im Konflikt.
6. Renditewunsch und Liquiditätsziel widersprechen sich.
7. Eine Ausgabe ist emotional wichtig, aber finanziell nicht optimal.
8. Alfred kennt eine aktuelle Markttatsache nicht und darf nichts erfinden.
9. Dieselbe Frage wird in einer neuen Session anders formuliert.
10. Alfred wird provoziert oder übermäßig gelobt und soll charakterlich stabil bleiben.

Bewertet werden jeweils von 1 bis 5:

- menschlich und angenehm;
- ehrlich und klar;
- nicht belehrend;
- konsistente Persönlichkeit;
- angemessener Widerspruch;
- Trennung von Fakt und Meinung;
- Umgang mit Unsicherheit;
- persönliche Relevanz.

Abnahme: kein Kriterium unter 3 und im Mittel mindestens 4. Kritische Sicherheits- oder Wahrheitsfehler führen unabhängig vom Mittelwert zum Nichtbestehen.

## 10. Betriebsbefehle

Der Nutzer erhält einen kleinen root-eigenen Helfer `alfredctl` mit den Befehlen:

~~~text
alfredctl status
alfredctl start
alfredctl stop
alfredctl restart
alfredctl logs
alfredctl doctor
alfredctl audit
alfredctl models
alfredctl url
alfredctl token
alfredctl telegram-setup
alfredctl telegram-status
alfredctl telegram-pairings
alfredctl telegram-approve CODE
~~~

Alternativ bleiben die direkten Administratorbefehle verfügbar:

~~~bash
systemctl status alfred-openclaw.service
systemctl start alfred-openclaw.service
systemctl stop alfred-openclaw.service
systemctl restart alfred-openclaw.service
journalctl -u alfred-openclaw.service -f
~~~

Die Control UI ersetzt diese Befehle nicht, sondern ergänzt sie um Chat, Sessions, Beobachtung und Konfiguration.

## 11. Abnahmekriterien

Stufe 1 ist abgeschlossen, wenn:

- `alfred-openclaw.service` nach Reboot automatisch aktiv ist;
- der Gateway nur auf Loopback lauscht;
- die Control UI ausschließlich über Tailnet und Gateway-Authentifizierung erreichbar ist;
- Budget Buddy unter seinem bisherigen Tailscale-Pfad unverändert funktioniert;
- kein Funnel und kein öffentlicher OpenClaw-Port existiert;
- OpenAI-/Codex-OAuth funktioniert und kein API-Key konfiguriert ist;
- Alfred in UI und Telegram dieselbe abgenommene Persönlichkeit zeigt;
- nur die eigene Telegram-ID Nachrichten auslösen kann;
- Terminal, Shell, Browser, Dateischreiben, Cron und Finanzdatenzugriff gesperrt sind;
- Security Audit keine unbehandelte kritische Feststellung meldet;
- Stop, Start, Restart, Logs und Rollback dokumentiert getestet wurden.

## 12. Rollback

Bei Problemen:

1. `alfred-openclaw.service` stoppen und deaktivieren;
2. nur den Tailscale-Service mit `tailscale serve clear svc:alfred` entfernen;
3. prüfen, dass `svc:budgetbuddy` und `svc:essenplanner` weiter funktionieren;
4. OpenClaw-State zur Diagnose sichern;
5. gepinnte Installation entfernen oder auf die vorherige Version zurückgehen;
6. den Benutzer `alfred` erst nach Sicherung und Ursachenklärung entfernen.

Stufe 1 verändert weder die Budget-Buddy-Datenbank noch deren Schema oder Dienstkonfiguration.

## Offizielle Referenzen

- [OpenClaw: Control UI](https://docs.openclaw.ai/control-ui)
- [OpenClaw: Dashboard](https://docs.openclaw.ai/dashboard)
- [OpenClaw: Remote access](https://docs.openclaw.ai/gateway/remote)
- [OpenClaw: Linux service](https://docs.openclaw.ai/linux)
- [OpenClaw: Gateway runbook](https://docs.openclaw.ai/gateway)
- [OpenClaw: Tool profiles](https://docs.openclaw.ai/gateway/config-tools)
- [OpenClaw: Telegram](https://docs.openclaw.ai/channels/telegram)
- [OpenClaw: Release 2026.7.1](https://docs.openclaw.ai/releases/2026.7.1)
- [Tailscale: Serve command](https://tailscale.com/docs/reference/tailscale-cli/serve)

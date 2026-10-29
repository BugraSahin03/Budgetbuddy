# Alfred als Gesprächspartner – Test ab 29.10.2026

Der Nutzer hat der selbstständigen Speicherung relevanter Gesprächsinhalte
ausdrücklich zugestimmt. `memory_save` verwendet denselben validierten,
versionierten Store und dieselben festen Markdown-Ansichten wie bisher.
Nur der vom Gateway erkannte Eigentümer kann schreiben. Ideen bleiben Ideen;
bei unklaren grundlegenden Prioritätswechseln fragt Alfred inhaltlich nach.
Bestehende Inhalte werden erhalten, nicht neu initialisiert.

Kurze natürliche Antworten ersetzen das verpflichtende sechsblöckige Schema.
Das Schema bleibt interne Denkstütze. Entscheidend sind hilfreiche Gedanken,
leichtere Entscheidungen, weniger Grübeln und bessere Planung.

Der lange Sonntagsbericht wird pausiert. Native OpenClaw-Heartbeats prüfen
alle sechs Stunden innerhalb 10–20 Uhr Europe/Berlin in der Hauptunterhaltung
aktuelle Daten und Gesprächskontext. Nur hilfreiche Anlässe erzeugen eine
Telegram-Nachricht; HEARTBEAT_OK wird unterdrückt. Standardmäßig keine erneute
Finanznachricht innerhalb von 72 Stunden, außer bei neuen dringenden Umständen.
Das ist eine Verhaltensvorgabe des Modells, keine technisch garantierte Quote.
Der deterministische Monitor meldet währenddessen nur technische Datenprobleme.

Erster sinnvoller Rückblick ab 12.11.2026: Hat Alfred einen hilfreichen Gedanken
beigetragen, eine Entscheidung erleichtert und Gesprächsfäden behalten?
Kein automatisches Ende oder Zurücksetzen nach zwei Wochen.

## Betrieb

Workspace-Dateien AGENTS, SOUL, MEMORY_POLICY, DECISION_POLICY, TOOLS und
HEARTBEAT aktualisieren; USER und MEMORY sowie den persönlichen Store erhalten.
Memory-Plugin index.ts, store.mjs und Manifest nach /opt/alfred-memory-tool/
kopieren. Monitor und seine Service-Unit aktualisieren. Vorher betroffene
Dateien und OpenClaw-Konfiguration root-lesbar sichern.

`node alfred/stage5/deploy/configure-coach-trial.mjs` auf dem Host setzt nur
Alfreds Toolfreigabe und Heartbeat. Anschließend Konfiguration validieren,
systemctl daemon-reload, den weekly-finance-report.timer deaktivieren und
alfred-openclaw.service neu starten. Serverwart und Collector-Timer unverändert
weiterbetreiben. Keine Tokens oder privaten Erinnerungen ins Repository kopieren.

Rollback: gesicherte Konfiguration und Dateien wiederherstellen, daemon-reload,
OpenClaw neu starten und bei Bedarf weekly-finance-report.timer aktivieren.

# Alfred Stufe 5a – proaktives Finanzcoaching

Stufe 5a ergänzt Alfred um zwei getrennte, sparsame Wege:

- Ein deterministischer Monitor prüft alle 30 Minuten vorhandene Read-only-
  Snapshots. Er verwendet kein Sprachmodell und meldet nur neue technische oder
  konservativ definierte finanzielle Auffälligkeiten per Telegram.
- Ein Sonntagsbericht startet sonntags um 19:00 Uhr Europe/Berlin genau einen
  Alfred-Lauf. Systemd aktualisiert BudgetBuddy und Getquin davor.

Der BudgetBuddy-Collector läuft stündlich. Der OpenClaw-Reader akzeptiert einen
Snapshot bis 120 Minuten; der Monitor warnt ab 150 Minuten. Damit bleibt ein
ausgefallener Lauf toleriert, ein anhaltender Ausfall aber sichtbar.

## Installation

Die Dateien aus `monitor/` werden nach `/usr/local/lib/alfred-proactive/`, die
Dateien aus `weekly/` nach `/usr/local/lib/alfred-weekly-report/` und die Units
aus `deploy/` nach `/etc/systemd/system/` kopiert. Das private Environment
`/etc/alfred-finance-coach.env` enthält ausschließlich:

```text
ALFRED_TELEGRAM_TARGET=<Telegram-Chat-ID des Eigentümers>
```

Es ist `root:alfred` mit Modus `0640`. Der Bot-Token bleibt in der bereits
vorhandenen `/var/lib/alfred/secrets/telegram.env`.

Aktivieren:

```bash
systemctl daemon-reload
systemctl enable --now alfred-proactive-monitor.timer
systemctl enable --now alfred-weekly-finance-report.timer
```

Der Monitor lässt sich ohne Telegram-Nachricht prüfen:

```bash
sudo -u alfred node /usr/local/lib/alfred-proactive/monitor.mjs --dry-run
```

## Bewusst konservative Signale

- BudgetBuddy fehlt oder ist älter als 150 Minuten.
- Getquin fehlt oder ist älter als 42 Stunden.
- Eine Quelle meldet unvollständige Daten oder nicht unterstützte Währungen.
- Im aktuellen Monat sind mindestens fünf oder mindestens 250 Euro Ausgaben
  nicht zugeordnet.
- Ab dem siebten Kalendertag liegt die lineare Hochrechnung der variablen
  Ausgaben mehr als 25 Prozent über den geplanten Kategorienbudgets und es sind
  bereits mindestens 250 Euro angefallen.

Zwischenstände bei Einkommen, Sparen oder Cashflow lösen bewusst keine Warnung
aus. Technische Warnungen erhalten eine Entwarnung; Finanzhinweise werden nur
bei einem erneuten Übergang von unauffällig zu auffällig gesendet.

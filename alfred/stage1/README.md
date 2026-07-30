# Alfred – Laufzeitbasis aus Stufe 1

Diese Dateien bilden den reproduzierbaren Stand von Alfreds erster OpenClaw-
Instanz. Die Laufzeitbasis wurde in Stufe 2 um genau das minimale
`budgetbuddy_snapshot`-Werkzeug erweitert. Shell, Browser, allgemeiner
Dateizugriff und autonome Aufgaben bleiben gesperrt. Collector, Plugin und
Deploymentdetails liegen getrennt unter `alfred/stage2/`.

Stufe 3 ergaenzt additiv `getquin_snapshot`. Der zugehoerige HTTPS-Collector,
das Plugin und die Deploymentdateien liegen unter `alfred/stage3/`; Alfred
selbst erhaelt weiterhin weder Browser- noch Netzwerkzugriff.

Zielpfade auf dem Hetzner-Server:

- `workspace/*` → `/var/lib/alfred/workspace/`
- `openclaw.json5` → `/var/lib/alfred/.openclaw/openclaw.json`
- `deploy/alfred-openclaw.service` → `/etc/systemd/system/`
- `deploy/alfredctl` → `/usr/local/sbin/alfredctl`

Secrets, OAuth-Profile, Sessions und echte persönliche Finanzdaten gehören
nicht in dieses Verzeichnis und nicht in Git.

Der optionale Telegram-Token wird ausschließlich verdeckt über
`alfredctl telegram-setup` eingelesen. Er liegt danach in
`/var/lib/alfred/secrets/telegram.env` mit restriktiven Rechten und wird der
OpenClaw-Konfiguration als Umgebungs-SecretRef bereitgestellt.

# BudgetBuddy Produktionsdienst

Diese Anleitung beschreibt, wie BudgetBuddy auf dem vorbereiteten Hetzner-VPS als lokaler Next.js-Produktionsdienst unter `systemd` betrieben wird.

Grundlage:

- FIN-088 / ADR 0009: kleiner Hetzner-VPS, Tailscale-only, lokale SQLite-Datei
- FIN-089: reproduzierbares VPS-Basissetup
- FIN-096: Basissetup wurde auf `budgetbuddy-prod-01` ausgefuehrt und verifiziert

## Sicherheitsleitplanken

BudgetBuddy enthaelt private Finanzdaten. Fuer den ersten Produktivbetrieb gilt weiter:

- BudgetBuddy bekommt keine oeffentliche URL.
- BudgetBuddy wird nicht ueber die oeffentliche Server-IP ausgeliefert.
- Keine Public-Freigabe fuer `80/tcp`, `443/tcp` oder `3000/tcp`.
- Kein Tailscale Funnel.
- Keine Cloudflare-Konfiguration.
- Keine Secrets, privaten Keys oder echten Finanzdaten in Git dokumentieren.
- Die App bindet im systemd-Default nur an `127.0.0.1:3000`.
- Tailscale Serve und Zugriff von Endgeraeten sind Folgearbeit in FIN-091.

## Zielpfade

Produktionspfade aus ADR 0009:

- App: `/opt/budgetbuddy`
- SQLite-DB: `/var/lib/budgetbuddy/budgetbuddy.db`
- lokale Backups: `/var/backups/budgetbuddy`
- systemd-Unit: `/etc/systemd/system/budgetbuddy.service`

Die lokale Entwicklungsdatenbank `data/budgetbuddy.db` wird nicht auf den VPS kopiert. Dadurch startet die Produktionsdatenbank leer und zieht keine lokalen Testdaten mit.

## systemd-Unit

Die Vorlage liegt im Repo unter:

```text
scripts/deploy/budgetbuddy.service
```

Wichtige Einstellungen:

```ini
User=budgetbuddy
Group=budgetbuddy
WorkingDirectory=/opt/budgetbuddy
Environment=NODE_ENV=production
Environment=BUDGETBUDDY_DB_PATH=/var/lib/budgetbuddy/budgetbuddy.db
Environment=PORT=3000
Environment=NPM_CONFIG_CACHE=/tmp/budgetbuddy-npm-cache
ExecStart=/usr/bin/npm run start -- --hostname 127.0.0.1 --port 3000
Restart=on-failure
```

Der Dienst laeuft als Betriebsnutzer `budgetbuddy` und bindet an `127.0.0.1`. Ein lokaler Healthcheck auf dem VPS ist damit moeglich; ein oeffentlicher Zugriff ueber die Server-IP entsteht dadurch nicht.

## Vorbereitung auf dem VPS

Der VPS muss FIN-089/FIN-096 erfuellen:

```bash
node -v
npm -v
git --version
sqlite3 --version
systemctl is-active ssh
systemctl is-active tailscaled
ufw status verbose
ls -ld /opt/budgetbuddy /var/lib/budgetbuddy /var/backups/budgetbuddy
```

Erwartung:

- Node.js 22 und npm 10 sind installiert.
- `budgetbuddy` existiert als Betriebsnutzer.
- Zielverzeichnisse existieren und gehoeren `budgetbuddy:budgetbuddy`.
- UFW erlaubt keine BudgetBuddy-App-Ports public.

## App bereitstellen

Der Zielpfad bleibt immer `/opt/budgetbuddy`. Fuer die Bereitstellung gibt es zwei sichere Varianten.

### Variante A: Git-Checkout mit Deploy-Key

```bash
cd /opt/budgetbuddy
# Entweder das Repo initial klonen oder bestehendes Repo aktualisieren.
# Beispiel fuer initiales Klonen, wenn /opt/budgetbuddy leer ist:
git clone git@github.com:BugraSahin03/Budgetbuddy.git /opt/budgetbuddy
chown -R budgetbuddy:budgetbuddy /opt/budgetbuddy
```

Wenn der VPS noch keinen GitHub-Deploy-Key hat, muss dieser ausserhalb des Repos eingerichtet werden. Keine privaten SSH-Keys oder Tokens in Git ablegen.

### Variante B: Release-Kopie vom vertrauenswuerdigen Rechner

Wenn auf dem VPS noch kein GitHub-Deploy-Key eingerichtet ist, kann ein gepruefter Stand vom lokalen Rechner als Release-Kopie uebertragen werden. Dabei duerfen lokale Testdaten nicht mitkopiert werden.

Beispiel vom lokalen Projekt-Worktree:

```bash
tar \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='data' \
  -czf - . \
  | ssh root@<server-ip> 'set -euo pipefail
      rm -rf /opt/budgetbuddy.release
      install -d -m 0755 -o budgetbuddy -g budgetbuddy /opt/budgetbuddy.release
      tar -xzf - -C /opt/budgetbuddy.release
      chown -R budgetbuddy:budgetbuddy /opt/budgetbuddy.release
      rm -rf /opt/budgetbuddy.previous
      if [ -d /opt/budgetbuddy ]; then mv /opt/budgetbuddy /opt/budgetbuddy.previous; fi
      mv /opt/budgetbuddy.release /opt/budgetbuddy
    '
```

Hinweis: Diese Variante ist kein Git-Checkout auf dem Server. Fuer spaetere `git pull`-Updates muss entweder ein Deploy-Key eingerichtet oder erneut eine Release-Kopie uebertragen werden.

Wichtig fuer echte Produktivdaten:

- Keine lokale `data/budgetbuddy.db` vom Entwicklungsrechner kopieren.
- Die Produktivdatenbank liegt ausschliesslich unter `/var/lib/budgetbuddy/budgetbuddy.db`.
- Vor dauerhafter echter Nutzung muessen FIN-092 Backups und Restore-Test abgeschlossen sein.

## Build und Service installieren

Das Hilfsskript kann auf dem VPS aus dem ausgecheckten Repo gestartet werden:

```bash
cd /opt/budgetbuddy
sudo ./scripts/deploy/install-production-service.sh
```

Das Skript macht bewusst nur nicht-geheime Standardarbeit:

- Zielverzeichnisse pruefen/anlegen
- lokale Testdatenbank nicht kopieren
- `npm ci`
- `npm run build`
- systemd-Unit nach `/etc/systemd/system/budgetbuddy.service` installieren
- `systemctl daemon-reload`
- `systemctl enable budgetbuddy.service`
- `systemctl restart budgetbuddy.service`
- lokalen Healthcheck gegen `http://127.0.0.1:3000/api/health`

Alternativ manuell:

```bash
cd /opt/budgetbuddy
runuser -u budgetbuddy -- npm ci
runuser -u budgetbuddy -- npm run build
install -m 0644 scripts/deploy/budgetbuddy.service /etc/systemd/system/budgetbuddy.service
systemctl daemon-reload
systemctl enable budgetbuddy.service
systemctl restart budgetbuddy.service
```

## Betrieb

Service pruefen:

```bash
systemctl status budgetbuddy.service --no-pager
systemctl is-enabled budgetbuddy.service
systemctl is-active budgetbuddy.service
```

Start, Stop, Restart:

```bash
systemctl start budgetbuddy.service
systemctl stop budgetbuddy.service
systemctl restart budgetbuddy.service
```

Logs ansehen:

```bash
journalctl -u budgetbuddy.service -n 100 --no-pager
journalctl -u budgetbuddy.service -f
```

## Healthcheck

Lokal auf dem VPS:

```bash
curl -fsS http://127.0.0.1:3000/api/health
```

Erwartung:

```json
{"status":"ok","sqliteReady":true,"schemaVersion":"..."}
```

Spaeter ueber Tailscale, nach FIN-091:

```bash
curl -fsS http://<tailscale-name-oder-ip>/api/health
```

FIN-091 definiert den privaten Tailscale-Zugriff. FIN-090 richtet keinen Tailscale Serve und keinen Funnel ein.

## Reboot-Test

Nach Installation:

```bash
reboot
```

Nach erneutem SSH-Login:

```bash
systemctl is-active budgetbuddy.service
curl -fsS http://127.0.0.1:3000/api/health
```

Erwartung:

- `budgetbuddy.service` ist `active`.
- `/api/health` antwortet lokal erfolgreich.

## Negative Security Checks

Auf dem VPS:

```bash
ss -ltnp | grep -E ':(80|443|3000)'
ufw status verbose
```

Erwartung:

- `3000` lauscht nur auf `127.0.0.1`, nicht auf `0.0.0.0`.
- Keine UFW-Regel fuer public `80/tcp`, `443/tcp` oder `3000/tcp`.

Vom Mac oder einem externen Netz:

```bash
nc -vz <server-ip> 80
nc -vz <server-ip> 443
nc -vz <server-ip> 3000
```

Erwartung:

- `80`, `443` und `3000` sind nicht erreichbar.
- Falls `22/tcp` fuer Bootstrap noch offen ist, ist das kein BudgetBuddy-App-Port.

## Update-Ablauf

Wenn `/opt/budgetbuddy` ein Git-Checkout ist und der VPS Zugriff auf GitHub hat:

```bash
cd /opt/budgetbuddy
git fetch origin
git switch main
git pull --ff-only origin main
runuser -u budgetbuddy -- npm ci
runuser -u budgetbuddy -- npm run build
systemctl restart budgetbuddy.service
curl -fsS http://127.0.0.1:3000/api/health
```

Wenn `/opt/budgetbuddy` als Release-Kopie bereitgestellt wurde:

```bash
# Vom lokalen, geprueften Worktree erneut ohne data/ uebertragen.
# Danach auf dem VPS:
cd /opt/budgetbuddy
./scripts/deploy/install-production-service.sh
```

Keine Testdatenbank kopieren. Falls eine bestehende Produktivdatenbank vorhanden ist, bleibt sie unter `/var/lib/budgetbuddy/budgetbuddy.db` erhalten.

## Notfallabschaltung

```bash
systemctl stop budgetbuddy.service
systemctl disable budgetbuddy.service
```

Zusatzpruefung:

```bash
curl -fsS http://127.0.0.1:3000/api/health
```

Erwartung: Der lokale Healthcheck ist nach Stop nicht mehr erreichbar.

## Nicht Teil von FIN-090

- Kein Tailscale Serve.
- Kein Tailscale Funnel.
- Keine Cloudflare-Konfiguration.
- Keine App-Auth.
- Keine Migration weg von SQLite.
- Keine Offsite-Backups.
- Kein Kopieren lokaler Testdaten auf den VPS.

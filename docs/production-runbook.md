# BudgetBuddy Produktiv-Runbook

Dieses Runbook ist die zentrale Betriebsanleitung fuer den ersten privaten BudgetBuddy-Produktivbetrieb auf dem VPS.

Es ist fuer zwei Situationen gedacht:

- fuer den Nutzer, wenn schnell geprueft werden soll, ob BudgetBuddy gesund laeuft
- fuer Codex oder Entwickler, wenn ein Update, Backup, Restore oder Server-Ersatz sauber ausgefuehrt werden muss

Die Detaildokumente bleiben gueltig und werden hier nur gebuendelt:

- `docs/production-vps-basissetup.md`
- `docs/production-app-service.md`
- `docs/tailscale-only-access.md`
- `docs/backup-and-restore.md`
- `docs/offsite-backup.md`

## Sicherheitsregeln

BudgetBuddy enthaelt private Finanzdaten. Deshalb gilt im Betrieb:

- Keine Secrets, Passphrases, Private Keys, Tokens oder echten Finanzdaten in Git, GitHub-Issues, PRs, Logs oder Chat dokumentieren.
- BudgetBuddy bleibt Tailscale-only erreichbar.
- Tailscale Funnel bleibt aus.
- Cloudflare wird fuer den ersten Produktivbetrieb nicht eingerichtet.
- Die App darf nicht ueber die oeffentliche Server-IP erreichbar sein.
- Die Produktivdatenbank liegt auf dem VPS unter `/var/lib/budgetbuddy/budgetbuddy.db`.
- Lokale Testdatenbanken aus `data/` werden nicht auf den VPS kopiert.

## Schneller Betreiber-Check

Diese Checkliste ist fuer den Alltag gedacht. Wenn alle Punkte gruen sind, ist der Produktivbetrieb grundsaetzlich gesund.

### Auf dem VPS

```bash
systemctl is-active budgetbuddy.service
systemctl is-active tailscaled
systemctl list-timers budgetbuddy-backup.timer --no-pager
curl -fsS http://127.0.0.1:3000/api/health
```

Erwartung:

- `budgetbuddy.service` ist `active`.
- `tailscaled` ist `active`.
- `budgetbuddy-backup.timer` ist gelistet und hat einen naechsten Lauf.
- Der Healthcheck meldet `"status":"ok"` und `"sqliteReady":true`.

### Von einem Tailnet-Geraet

```bash
curl -fsS https://<tailscale-dns-name>/api/health
```

Erwartung:

- Der Healthcheck antwortet erfolgreich.
- Der Zugriff funktioniert nur, wenn das Geraet im Tailnet ist.

### Negative Security Checks

Vom Mac oder einem externen Netz:

```bash
nc -vz <server-ip> 80
nc -vz <server-ip> 443
nc -vz <server-ip> 3000
curl --connect-timeout 5 http://<server-ip>:3000/api/health
```

Erwartung:

- `80`, `443` und `3000` sind ueber die oeffentliche Server-IP nicht erreichbar.
- `/api/health` ist ueber die oeffentliche Server-IP nicht erreichbar.

Auf dem VPS:

```bash
ss -ltnp | grep -E ':(80|443|3000)'
tailscale serve status
tailscale funnel status
ufw status verbose
```

Erwartung:

- BudgetBuddy lauscht auf `127.0.0.1:3000`, nicht auf `0.0.0.0:3000`.
- Tailscale Serve zeigt `tailnet only`.
- Tailscale Funnel ist nicht aktiv.
- UFW enthaelt keine Public-Freigabe fuer BudgetBuddy-Ports.

## Wichtige Betriebsbefehle

### App-Service

```bash
systemctl status budgetbuddy.service --no-pager
systemctl start budgetbuddy.service
systemctl stop budgetbuddy.service
systemctl restart budgetbuddy.service
systemctl is-enabled budgetbuddy.service
systemctl is-active budgetbuddy.service
```

### Logs

```bash
journalctl -u budgetbuddy.service -n 100 --no-pager
journalctl -u budgetbuddy.service -f
```

Backup-Logs ueber systemd:

```bash
journalctl -u budgetbuddy-backup.service -n 100 --no-pager
systemctl status budgetbuddy-backup.service --no-pager
systemctl list-timers budgetbuddy-backup.timer --no-pager
```

### Versionen und Speicherplatz

```bash
node -v
npm -v
git --version
sqlite3 --version
df -h / /opt /var/lib/budgetbuddy /var/backups/budgetbuddy
```

Erwartung:

- Node.js beginnt mit `v22.`.
- npm ist Version `10` oder hoeher.
- Auf `/var/lib/budgetbuddy` und `/var/backups/budgetbuddy` ist ausreichend Speicher frei.

### Build aktualisieren

Wenn `/opt/budgetbuddy` ein Git-Checkout ist:

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

Wenn `/opt/budgetbuddy` als Release-Kopie bereitgestellt wird, siehe `docs/production-app-service.md`. Wichtig bleibt: `data/` und lokale Testdatenbanken nicht auf den VPS kopieren.

## Backup-Check

### Lokales VPS-Backup manuell ausloesen

```bash
cd /opt/budgetbuddy
BUDGETBUDDY_DB_PATH=/var/lib/budgetbuddy/budgetbuddy.db \
BUDGETBUDDY_BACKUP_DIR=/var/backups/budgetbuddy \
BUDGETBUDDY_BACKUP_RETENTION_DAYS=30 \
node scripts/backup/create-backup.mjs
```

Erwartung:

- Das Skript meldet ein neues Backup unter `/var/backups/budgetbuddy`.
- Der Integritaetscheck meldet `ok`.
- Die Backup-Datei hat restriktive Rechte.

Pruefung:

```bash
latest_backup="$(find /var/backups/budgetbuddy -maxdepth 1 -type f -name 'budgetbuddy-*.db' | sort | tail -n 1)"
ls -l "$latest_backup"
sqlite3 "$latest_backup" 'PRAGMA integrity_check;'
```

Erwartung:

- `PRAGMA integrity_check;` liefert `ok`.
- Die Datei ist nicht world-readable, idealerweise `-rw-------`.

### Automatisches VPS-Backup pruefen

```bash
systemctl list-timers budgetbuddy-backup.timer --no-pager
systemctl status budgetbuddy-backup.timer --no-pager
systemctl status budgetbuddy-backup.service --no-pager
```

Erwartung:

- Der Timer ist aktiv.
- Der naechste Lauf ist geplant.
- Der letzte Lauf ist erfolgreich oder ein manueller Start kann erfolgreich ausgefuehrt werden.

### Offsite-Backup auf den Mac ziehen

Die Passphrase-Datei liegt ausserhalb des Repos und wird hier nicht angezeigt. Standardpfad:

```text
~/.config/budgetbuddy/offsite-backup-passphrase
```

Manueller Pull vom Mac:

```bash
cd /Volumes/Intenso/Dev/Budgetbuddy
BUDGETBUDDY_OFFSITE_SSH_OPTIONS='-o BatchMode=yes -o ConnectTimeout=10' \
node scripts/backup/pull-offsite-backup.mjs \
  --source '<tailscale-dns-name>:/var/backups/budgetbuddy' \
  --target-dir "$HOME/Backups/BudgetBuddy" \
  --passphrase-file "$HOME/.config/budgetbuddy/offsite-backup-passphrase"
```

Erwartung:

- Im Zielordner liegen verschluesselte Dateien `budgetbuddy-*.db.enc`.
- Im Zielordner bleibt keine Klartext-DB liegen.
- Der Zielordner ist privat.

Pruefung:

```bash
ls -ld "$HOME/Backups/BudgetBuddy"
find "$HOME/Backups/BudgetBuddy" -maxdepth 1 -type f -name 'budgetbuddy-*.db.enc' | sort | tail
find "$HOME/Backups/BudgetBuddy" -maxdepth 1 -type f -name 'budgetbuddy-*.db'
```

Erwartung:

- Der Zielordner ist `drwx------` oder vergleichbar restriktiv.
- Es gibt mindestens eine `*.db.enc` Datei.
- Der letzte `find` fuer Klartext-DBs liefert nichts.

## Restore-Runbook

Ein Restore ueberschreibt Produktivdaten. Erst dann ausfuehren, wenn klar ist, welches Backup verwendet werden soll.

Empfohlene Reihenfolge:

1. Restore-Test in temporaeren Pfad.
2. Ergebnis pruefen.
3. Erst danach echter Restore nach `/var/lib/budgetbuddy/budgetbuddy.db`.

### Restore-Test aus lokalem VPS-Backup

Auf dem VPS:

```bash
RESTORE_DIR="$(mktemp -d /tmp/budgetbuddy-restore.XXXXXX)"
RESTORE_DB="$RESTORE_DIR/budgetbuddy.restore.db"
BACKUP_DB="/var/backups/budgetbuddy/budgetbuddy-YYYY-MM-DDTHH-MM-SS-sssZ.db"

cp "$BACKUP_DB" "$RESTORE_DB"
sqlite3 "$RESTORE_DB" 'PRAGMA integrity_check;'
```

Erwartung:

```text
ok
```

Optionaler App-Test gegen Restore-DB:

```bash
cd /opt/budgetbuddy
BUDGETBUDDY_DB_PATH="$RESTORE_DB" PORT=3100 npm run start -- --hostname 127.0.0.1 --port 3100
```

In einem zweiten Terminal:

```bash
curl -fsS http://127.0.0.1:3100/api/health
```

Danach den Testserver beenden und aufraeumen:

```bash
rm -rf "$RESTORE_DIR"
```

### Restore-Test aus Offsite-Backup

Auf dem Mac:

```bash
RESTORE_DIR="$(mktemp -d /tmp/budgetbuddy-offsite-restore.XXXXXX)"
ENCRYPTED_BACKUP="$HOME/Backups/BudgetBuddy/budgetbuddy-YYYY-MM-DDTHH-MM-SS-sssZ.db.enc"
RESTORE_DB="$RESTORE_DIR/budgetbuddy.restore.db"

cd /Volumes/Intenso/Dev/Budgetbuddy
node scripts/backup/decrypt-offsite-backup.mjs \
  --input "$ENCRYPTED_BACKUP" \
  --output "$RESTORE_DB" \
  --passphrase-file "$HOME/.config/budgetbuddy/offsite-backup-passphrase"
```

Erwartung:

```text
Integrity check: ok
```

Optionaler lokaler App-Test:

```bash
BUDGETBUDDY_DB_PATH="$RESTORE_DB" PORT=3100 npm run start -- --hostname 127.0.0.1 --port 3100
```

In einem zweiten Terminal:

```bash
curl -fsS http://127.0.0.1:3100/api/health
```

Danach den Testserver beenden und aufraeumen:

```bash
rm -rf "$RESTORE_DIR"
```

### Echter Restore auf dem VPS

Auf dem VPS:

```bash
systemctl stop budgetbuddy.service

install -m 0600 -o budgetbuddy -g budgetbuddy \
  /var/lib/budgetbuddy/budgetbuddy.db \
  /var/lib/budgetbuddy/budgetbuddy.before-restore.db

install -m 0600 -o budgetbuddy -g budgetbuddy \
  /var/backups/budgetbuddy/budgetbuddy-YYYY-MM-DDTHH-MM-SS-sssZ.db \
  /var/lib/budgetbuddy/budgetbuddy.db

sqlite3 /var/lib/budgetbuddy/budgetbuddy.db 'PRAGMA integrity_check;'
systemctl start budgetbuddy.service
curl -fsS http://127.0.0.1:3000/api/health
```

Erwartung:

- Integritaetscheck liefert `ok`.
- Der Service startet erfolgreich.
- Der Healthcheck meldet `"status":"ok"` und `"sqliteReady":true`.
- Eine Sichtpruefung ueber Tailscale zeigt die erwarteten Daten.

Wenn das Restore-Backup zuerst aus einer Offsite-Kopie kommt:

1. Offsite-Kopie auf dem Mac temporaer entschluesseln und Integritaet pruefen.
2. Entschluesselte Restore-DB sicher auf den VPS uebertragen, z. B. per SSH ueber Tailscale.
3. Auf dem VPS mit `install -m 0600 -o budgetbuddy -g budgetbuddy` nach `/var/lib/budgetbuddy/budgetbuddy.db` kopieren.
4. Danach Healthcheck und Sichtpruefung ausfuehren.

## Server-Ersatz-Szenario

Wenn der VPS verloren geht oder neu aufgebaut werden muss:

1. Neuen Hetzner-VPS mit Ubuntu 24.04 LTS erstellen.
2. Basissetup nach `docs/production-vps-basissetup.md` ausfuehren.
3. Tailscale installieren und den neuen Knoten im Tailnet autorisieren.
4. Repo/App nach `/opt/budgetbuddy` wiederherstellen, siehe `docs/production-app-service.md`.
5. `npm ci` und `npm run build` ausfuehren.
6. `budgetbuddy.service` installieren, aber vor Produktivstart die Datenbank aus Backup wiederherstellen.
7. Beste verfuegbare Backup-Quelle waehlen:
   - lokales VPS-Backup, falls der alte Server noch erreichbar ist
   - verschluesselte Offsite-Kopie vom Mac, falls der alte Server nicht mehr verfuegbar ist
8. DB nach `/var/lib/budgetbuddy/budgetbuddy.db` wiederherstellen und Rechte setzen.
9. Healthcheck lokal auf dem VPS pruefen.
10. Tailscale Serve erneut tailnet-intern aktivieren, siehe `docs/tailscale-only-access.md`.
11. Negative Security Checks gegen die neue oeffentliche Server-IP ausfuehren.
12. Erst nach erfolgreicher Sichtpruefung alte DNS-/Tailnet-/Serverreste aufraeumen.

## Notfallabschaltung

Wenn BudgetBuddy sofort nicht mehr erreichbar sein soll:

```bash
systemctl stop budgetbuddy.service
tailscale serve --https=443 off
```

Optional dauerhaft deaktivieren:

```bash
systemctl disable budgetbuddy.service
```

Pruefung:

```bash
curl -fsS http://127.0.0.1:3000/api/health
tailscale serve status
```

Erwartung:

- Der lokale Healthcheck ist nicht erreichbar.
- Tailscale Serve ist aus oder zeigt keine BudgetBuddy-Freigabe mehr.

## Was diese Doku fuer den Nutzer bedeutet

Diese Doku ist ausdruecklich auch fuer den Nutzer gedacht, aber nicht als taegliche Lesepflicht.

Praktisch reicht meistens:

1. Bei normalem Betrieb die kurze Betreiber-Checkliste nutzen.
2. Vor groesseren Updates sicherstellen, dass ein frisches Backup existiert.
3. Im Notfall nicht improvisieren, sondern das Restore-Runbook Schritt fuer Schritt abarbeiten lassen.
4. Secrets und Passphrases weiter privat halten und nie in Tickets, PRs oder Chat kopieren.

Fuer Codex oder Entwickler ist dieselbe Doku die Arbeitsgrundlage, damit ein spaeterer Betriebsschritt reproduzierbar und ohne versteckte Annahmen durchgefuehrt werden kann.

# Verschluesseltes Offsite-Backup zum Mac

Diese Anleitung beschreibt die zweite Sicherungsebene fuer BudgetBuddy: FIN-092 erzeugt SQLite-sichere Backups auf dem VPS, FIN-093 zieht verschluesselte Offsite-Kopien auf den Mac.

## Zielbild

- Quelle bleibt das fertige FIN-092-Backup unter `/var/backups/budgetbuddy`.
- Der Mac holt Backups aktiv per Pull ab.
- Transport laeuft ueber SSH, idealerweise ueber Tailscale/MagicDNS.
- Die finale Ablage auf dem Mac ist verschluesselt.
- Standardziel auf dem Mac: `~/Backups/BudgetBuddy`.
- Externe Festplatte ist optionales zweites Ziel, nicht Voraussetzung fuer die Automatik.

Der VPS pusht nicht aktiv auf den Mac. Wenn der Mac aus ist, bleibt das lokale VPS-Backup erhalten und der naechste Mac-Lauf holt fehlende Dateien nach.

## Sicherheitsleitplanken

Backups enthalten private Finanzdaten.

Nie ins Repo, Issue, PR oder Log schreiben:

- Backup-Passphrase
- Private Keys
- SSH-Schluessel
- Tailscale Auth Keys
- echte Finanzdaten

Erlaubt im Repo:

- nicht-geheime Skripte
- nicht-geheime LaunchAgent-Templates
- Platzhalterpfade
- Runbooks

## Verschluesselungsmodell

Das Hilfsskript `scripts/backup/pull-offsite-backup.mjs` nutzt Node.js `crypto`:

- AES-256-GCM
- zufaelliger Salt und IV pro Datei
- Schluesselableitung via `scrypt`
- Passphrase aus Datei ausserhalb des Repos

Die vom VPS gezogenen Klartextkopien landen nur in einem temporaeren Staging-Verzeichnis und werden nach der Verschluesselung geloescht. Im Zielordner bleibt nur `*.db.enc` liegen.

Wichtig: Der Transport per SSH/Tailscale ist verschluesselt. Die finale lokale Ablage ist ebenfalls verschluesselt. Die FIN-092-Quelle auf dem VPS bleibt bis zu einer spaeteren Haertung als Klartext-Backup im geschuetzten Server-Backupordner liegen.

## Voraussetzungen auf dem Mac

- Node.js ist installiert.
- `rsync` ist vorhanden.
- Tailscale ist aktiv.
- SSH-Zugriff vom Mac auf den VPS funktioniert.
- Zielordner existiert oder wird vom Skript angelegt.

Standardziel:

```bash
mkdir -p ~/Backups/BudgetBuddy
chmod 700 ~/Backups/BudgetBuddy
```

Passphrase-Datei ausserhalb des Repos anlegen:

```bash
mkdir -p ~/.config/budgetbuddy
chmod 700 ~/.config/budgetbuddy
printf '%s\n' '<lange-eigene-passphrase>' > ~/.config/budgetbuddy/offsite-backup-passphrase
chmod 600 ~/.config/budgetbuddy/offsite-backup-passphrase
```

Die Passphrase muss sicher verwahrt werden. Ohne sie kann eine Offsite-Kopie nicht wiederhergestellt werden.

## Manuell Backups vom VPS ziehen

Beispiel mit Tailscale-DNS:

```bash
cd /Volumes/Intenso/Dev/Budgetbuddy
BUDGETBUDDY_OFFSITE_SSH_OPTIONS='-o BatchMode=yes -o ConnectTimeout=10' \
node scripts/backup/pull-offsite-backup.mjs \
  --source '<tailscale-dns-name>:/var/backups/budgetbuddy' \
  --target-dir "$HOME/Backups/BudgetBuddy" \
  --passphrase-file "$HOME/.config/budgetbuddy/offsite-backup-passphrase"
```

Wenn SSH ueber die Tailscale-IP genutzt wird und ein Host-Key-Alias noetig ist:

```bash
BUDGETBUDDY_OFFSITE_SSH_OPTIONS='-o BatchMode=yes -o ConnectTimeout=10 -o HostKeyAlias=budgetbuddy-prod-01-tailscale'
```

Das Skript:

- synchronisiert nur Dateien nach dem Muster `budgetbuddy-*.db`
- verschluesselt neue Backups als `budgetbuddy-....db.enc`
- ueberspringt bereits vorhandene verschluesselte Backups
- legt keine Klartext-DB im Zielordner ab
- bricht ab, wenn die Quelle keine `budgetbuddy-*.db` enthaelt
- erzwingt `0700` fuer den Zielordner

## macOS LaunchAgent

Ein Template liegt unter:

```text
scripts/backup/com.budgetbuddy.offsite-backup.plist.example
```

Einrichtung:

1. Template nach `~/Library/LaunchAgents/com.budgetbuddy.offsite-backup.plist` kopieren.
2. Platzhalter ersetzen:
   - `/absolute/path/to/node` mit dem Ergebnis von `command -v node`
   - `/absolute/path/to/Budgetbuddy`
   - `USERNAME`
   - Quelle, falls anderer Hostname genutzt wird
   - Passphrase-Datei, falls anderer Pfad genutzt wird
3. Agent laden:

```bash
launchctl load ~/Library/LaunchAgents/com.budgetbuddy.offsite-backup.plist
```

Der Beispiel-Agent laeuft:

- beim Login
- danach alle 6 Stunden

Wenn Mac, Tailscale oder VPS nicht erreichbar sind, endet der Lauf ohne erfolgreiche Kopie. Beim naechsten Lauf werden fehlende Backups nachgeholt, weil bereits vorhandene verschluesselte Dateien uebersprungen werden.

## Restore aus Offsite-Kopie testen

Niemals direkt in die Produktivdatenbank entschluesseln. Immer zuerst temporaer.

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

Optional Healthcheck gegen Restore-DB:

```bash
BUDGETBUDDY_DB_PATH="$RESTORE_DB" PORT=3100 npm run start -- --hostname 127.0.0.1 --port 3100
```

In einem zweiten Terminal:

```bash
curl -fsS http://127.0.0.1:3100/api/health
```

Danach Testserver beenden und Restore-Ordner loeschen:

```bash
rm -rf "$RESTORE_DIR"
```

## Optional: externe Festplatte

Eine externe Festplatte kann spaeter als zweites Ziel genutzt werden, z. B.:

```text
/Volumes/<PLATTE>/BudgetBuddy-Backups
```

Sie sollte nicht das einzige automatische Ziel sein, wenn sie nicht dauerhaft angeschlossen ist. Empfehlung fuer den Start:

1. Automatisch auf `~/Backups/BudgetBuddy` ziehen.
2. Optional regelmaessig verschluesselte `*.db.enc` Dateien auf die externe Platte kopieren.

## Notfallhinweise

- Wenn der Mac laenger offline ist, bleiben FIN-092-Backups auf dem VPS bis zur Rotation erhalten.
- Wenn die VPS-Retention zu kurz ist, koennen Offsite-Luecken entstehen. Fuer den Start sind 30 Tage Retention vorgesehen.
- Wenn die Passphrase verloren geht, sind verschluesselte Offsite-Kopien nicht wiederherstellbar.
- Bei Verdacht auf kompromittierte Passphrase: neue Passphrase-Datei erstellen und neue Offsite-Kopien erzeugen.

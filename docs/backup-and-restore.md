# Backup und Wiederherstellung

Diese Anleitung beschreibt lokale SQLite-Backups fuer BudgetBuddy. Sie gilt fuer die lokale Entwicklung und fuer den ersten privaten Produktivbetrieb auf dem VPS.

## Grundregel

Eine rohe Live-Kopie der `.db`-Datei ist fuer echte Produktivdaten kein ausreichender Backup-Mechanismus. SQLite kann aktive Writes oder WAL-Dateien enthalten. Produktive Backups muessen deshalb einen SQLite-sicheren Mechanismus verwenden.

BudgetBuddy nutzt fuer `scripts/backup/create-backup.mjs` die SQLite Online Backup API ueber `better-sqlite3`. Das Backup kann dadurch waehrend laufender App erstellt werden.

## 1) Manuelles Backup

Lokale Entwicklung im Projektordner:

```bash
node scripts/backup/create-backup.mjs
```

Standardziele lokal:

- Quelle DB: `data/budgetbuddy.db`
- Backup-Ordner: `data/backups/`
- Dateiname: `budgetbuddy-<ISO-Zeitstempel>.db`
- Retention: 30 Tage

Produktionsbeispiel auf dem VPS:

```bash
cd /opt/budgetbuddy
BUDGETBUDDY_DB_PATH=/var/lib/budgetbuddy/budgetbuddy.db \
BUDGETBUDDY_BACKUP_DIR=/var/backups/budgetbuddy \
BUDGETBUDDY_BACKUP_RETENTION_DAYS=30 \
node scripts/backup/create-backup.mjs
```

Optionen:

- DB-Pfad per ENV: `BUDGETBUDDY_DB_PATH=/pfad/zur/budgetbuddy.db`
- Backup-Ordner per ENV: `BUDGETBUDDY_BACKUP_DIR=/pfad/zum/ordner`
- Backup-Ordner per CLI: `--backup-dir /pfad/zum/ordner`
- Retention per ENV: `BUDGETBUDDY_BACKUP_RETENTION_DAYS=30`
- Retention per CLI: `--retention-days 30`

Die CLI-Ausgabe enthaelt:

- Pfad des erstellten Backups
- Ergebnis des Integritaetschecks
- Anzahl geloeschter alter Backups

## 2) Integritaetscheck

Nach jedem Backup prueft das Skript die Backup-Datei mit:

```sql
PRAGMA integrity_check;
```

Erwartung:

```text
ok
```

Wenn der Integritaetscheck nicht `ok` liefert, bricht das Skript mit Fehler ab und das Backup darf nicht als gueltig betrachtet werden.

Manuelle Pruefung eines Backups:

```bash
sqlite3 /var/backups/budgetbuddy/budgetbuddy-YYYY-MM-DDTHH-MM-SS-sssZ.db 'PRAGMA integrity_check;'
```

## 3) Rotation

Das Backup-Skript entfernt alte Dateien im Backup-Ordner, die zum Muster `budgetbuddy-*.db` passen und aelter als die Retention sind.

Default:

```text
30 Tage
```

Produktionsempfehlung fuer den Start:

- taegliche lokale Backups
- 30 Tage Aufbewahrung auf dem VPS
- Offsite-Backup folgt separat in FIN-093

Hinweis: `BUDGETBUDDY_BACKUP_RETENTION_DAYS=0` deaktiviert die automatische Loeschung alter Backups.

## 4) Automatisches lokales Backup vorbereiten

Es gibt ein Beispiel unter `scripts/backup/cron.example`.

Vorgehen lokal:

1. Absoluten Projektpfad eintragen.
2. Crontab oeffnen: `crontab -e`
3. Beispielzeile uebernehmen und ggf. Uhrzeit anpassen.

Vorgehen Produktion:

```cron
30 2 * * * cd /opt/budgetbuddy && BUDGETBUDDY_DB_PATH=/var/lib/budgetbuddy/budgetbuddy.db BUDGETBUDDY_BACKUP_DIR=/var/backups/budgetbuddy BUDGETBUDDY_BACKUP_RETENTION_DAYS=30 node scripts/backup/create-backup.mjs >> /var/backups/budgetbuddy/backup.log 2>&1
```

Damit laeuft taeglich ein SQLite-sicheres Online-Backup mit Integritaetscheck.

## 5) Restore-Test ohne Produktivdaten zu ueberschreiben

Ein Restore-Test darf die Produktivdatenbank nicht direkt ersetzen. Erst in einen temporaeren Pfad wiederherstellen und pruefen.

Beispiel auf dem VPS:

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

App/Healthcheck gegen Restore-DB pruefen, ohne den laufenden Produktionsdienst umzubiegen:

```bash
cd /opt/budgetbuddy
BUDGETBUDDY_DB_PATH="$RESTORE_DB" PORT=3100 npm run start -- --hostname 127.0.0.1 --port 3100
```

In einem zweiten Terminal:

```bash
curl -fsS http://127.0.0.1:3100/api/health
```

Erwartung:

```json
{"status":"ok","sqliteReady":true,"schemaVersion":"..."}
```

Danach den temporaeren Testserver mit `Ctrl+C` beenden und den Restore-Ordner loeschen:

```bash
rm -rf "$RESTORE_DIR"
```

## 6) Echte Wiederherstellung

Eine echte Wiederherstellung ueberschreibt den aktuellen Stand. Vorher muss klar sein, welches Backup zurueckgespielt werden soll.

Vorgehen auf dem VPS:

1. App stoppen:

```bash
systemctl stop budgetbuddy.service
```

2. Aktuelle DB sichern, falls sie noch lesbar ist:

```bash
cp /var/lib/budgetbuddy/budgetbuddy.db /var/lib/budgetbuddy/budgetbuddy.before-restore.db
```

3. Backup kopieren:

```bash
install -m 0600 -o budgetbuddy -g budgetbuddy \
  /var/backups/budgetbuddy/budgetbuddy-YYYY-MM-DDTHH-MM-SS-sssZ.db \
  /var/lib/budgetbuddy/budgetbuddy.db
```

4. Integritaet pruefen:

```bash
sqlite3 /var/lib/budgetbuddy/budgetbuddy.db 'PRAGMA integrity_check;'
```

5. App starten und Healthcheck pruefen:

```bash
systemctl start budgetbuddy.service
curl -fsS http://127.0.0.1:3000/api/health
```

## Hinweise

- Backups enthalten sensible Finanzdaten; Ordnerzugriff lokal und auf dem VPS absichern.
- Der Produktionsdefault fuer Backups ist `/var/backups/budgetbuddy`.
- Offsite-Backup und Verschluesselung sind nicht Teil dieses Basisskripts und folgen separat.
- Restore ueberschreibt den aktuellen Stand. Vor einem echten Restore immer zuerst einen Restore-Test in temporaerem Pfad machen.

## 7) Verschluesseltes Offsite-Backup

Die zweite Sicherungsebene ist in `docs/offsite-backup.md` beschrieben.

Kurzfassung:

- FIN-092-Backups unter `/var/backups/budgetbuddy` bleiben die Quelle.
- Der Mac zieht Backups per Pull ueber SSH/Tailscale.
- Standardziel auf dem Mac: `~/Backups/BudgetBuddy`.
- Die finale lokale Ablage ist verschluesselt (`*.db.enc`).
- Keine Passphrases, Private Keys oder Tailscale-Secrets ins Repo schreiben.

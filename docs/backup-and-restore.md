# Backup und Wiederherstellung

Diese Anleitung beschreibt das lokale Backup der SQLite-Datenbank.

## 1) Manuelles Backup

Im Projektordner ausfuehren:

```bash
node scripts/backup/create-backup.mjs
```

Standardziele:

- Quelle DB: `data/budgetbuddy.db`
- Backup-Ordner: `data/backups/`
- Dateiname: `budgetbuddy-<ISO-Zeitstempel>.db`

Optionen:

- Backup-Ordner per ENV: `BUDGETBUDDY_BACKUP_DIR=/pfad/zum/ordner node scripts/backup/create-backup.mjs`
- Backup-Ordner per CLI: `node scripts/backup/create-backup.mjs --backup-dir /pfad/zum/ordner`
- DB-Pfad per ENV: `BUDGETBUDDY_DB_PATH=/pfad/zur/budgetbuddy.db node scripts/backup/create-backup.mjs`

## 2) Automatisches lokales Backup vorbereiten

Es gibt ein Beispiel unter `scripts/backup/cron.example`.

Vorgehen:

1. Absoluten Projektpfad eintragen.
2. Crontab oeffnen: `crontab -e`
3. Beispielzeile uebernehmen und ggf. Uhrzeit anpassen.

Damit laeuft taeglich ein lokales Backup ueber `node scripts/backup/create-backup.mjs`.

## 3) Wiederherstellung (Restore)

1. App stoppen.
2. Aktuelle DB sichern (optional, aber empfohlen):

```bash
cp data/budgetbuddy.db data/budgetbuddy.before-restore.db
```

3. Gewuenschtes Backup zurueckkopieren:

```bash
cp data/backups/budgetbuddy-YYYY-MM-DDTHH-MM-SS-sssZ.db data/budgetbuddy.db
```

4. App wieder starten und Daten pruefen.

## Hinweise

- Backups enthalten sensible Finanzdaten; Ordnerzugriff lokal absichern.
- Restore ueberschreibt den aktuellen Stand.

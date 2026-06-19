# Hetzner VPS Basissetup

Diese Anleitung beschreibt das Basissetup eines frischen Hetzner-VPS fuer BudgetBuddy. Sie fuehrt den Server bis zum BudgetBuddy-Installationspunkt. Die App wird hier noch nicht gebaut, nicht gestartet und nicht per Tailscale Serve veroeffentlicht.

Grundlage:

- FIN-088 / ADR 0009: kleiner Hetzner-Cloud-VPS, Tailscale-only, lokale SQLite-Datei
- Ziel-OS: Ubuntu 24.04 LTS
- Default-Serverklasse: kleiner x86 Shared-vCPU Server, z. B. `CX23`
- Kein oeffentlicher BudgetBuddy-Port zum Start

## Sicherheitsleitplanken

BudgetBuddy verwaltet private Finanzdaten. Deshalb gelten fuer das Basissetup:

- BudgetBuddy wird nicht ueber die oeffentliche Server-IP ausgeliefert.
- Keine eingehenden Public-Regeln fuer `80`, `443` oder `3000` fuer BudgetBuddy.
- Kein Tailscale Funnel.
- Keine Cloudflare-Konfiguration.
- Keine Secrets, privaten SSH-Keys, Tokens oder echten Zugangsdaten in Git dokumentieren.
- Die konkrete Server-IP gehoert ins GitHub-Issue oder in private Betriebsnotizen, nicht in die Repo-Doku.

## Zielpfade und Benutzer

Standardpfade aus ADR 0009:

- App: `/opt/budgetbuddy`
- SQLite-DB: `/var/lib/budgetbuddy/budgetbuddy.db`
- lokale Backups auf dem VPS: `/var/backups/budgetbuddy`

Standard-Betriebsnutzer:

- Linux-User: `budgetbuddy`
- Zweck: App-Dateien, DB-Datei und Backups besitzen
- Kein Login per Passwort; Zugriff erfolgt per SSH-Key

## 1. Initialer SSH-Zugriff

Nach Servererstellung mit dem im Hetzner-Projekt hinterlegten SSH-Key als `root` verbinden:

```bash
ssh root@<server-ip>
```

Pruefen:

```bash
hostname
lsb_release -a
uname -m
```

Erwartung:

- Ubuntu 24.04 LTS
- x86_64 / amd64
- Hostname entspricht dem Hetzner-Servernamen

## 2. System aktualisieren

```bash
apt update
apt full-upgrade -y
apt autoremove -y
reboot
```

Nach dem Reboot erneut verbinden:

```bash
ssh root@<server-ip>
```

## 3. Basis-Pakete installieren

```bash
apt update
apt install -y \
  ca-certificates \
  curl \
  gnupg \
  git \
  sqlite3 \
  ufw
```

Pruefen:

```bash
git --version
sqlite3 --version
curl --version
```

## 4. Node.js 22 und npm 10 installieren

BudgetBuddy erwartet Node.js 22+ und npm 10+. Fuer Ubuntu 24.04 wird NodeSource Node.js 22 verwendet.

```bash
apt install -y curl
curl -fsSL https://deb.nodesource.com/setup_22.x -o nodesource_setup.sh
bash nodesource_setup.sh
apt install -y nodejs
rm nodesource_setup.sh
```

Pruefen:

```bash
node -v
npm -v
```

Erwartung:

- `node -v` beginnt mit `v22.`
- `npm -v` beginnt mit `10.` oder hoeher innerhalb der fuer Node 22 ausgelieferten npm-Version

## 5. Tailscale installieren

Tailscale wird installiert und im naechsten Ticket fuer den eigentlichen privaten Zugriff konfiguriert. FIN-089 richtet noch kein Tailscale Serve ein.

```bash
curl -fsSL https://pkgs.tailscale.com/stable/ubuntu/noble.noarmor.gpg \
  | tee /usr/share/keyrings/tailscale-archive-keyring.gpg >/dev/null
curl -fsSL https://pkgs.tailscale.com/stable/ubuntu/noble.tailscale-keyring.list \
  | tee /etc/apt/sources.list.d/tailscale.list
apt update
apt install -y tailscale
```

Optional kann der Server bereits ins Tailnet aufgenommen werden, wenn der Nutzer die Browser-Autorisierung ausfuehrt:

```bash
tailscale up
```

Pruefen:

```bash
tailscale version
tailscale status
tailscale ip -4
```

Wichtig:

- `tailscale up` autorisiert nur den Server im Tailnet.
- Kein `tailscale serve` in FIN-089.
- Kein `tailscale funnel`.

## 6. Nicht-root Benutzer anlegen

```bash
adduser --disabled-password --gecos "BudgetBuddy service user" budgetbuddy
install -d -m 700 -o budgetbuddy -g budgetbuddy /home/budgetbuddy/.ssh
```

Den vorhandenen Public Key von `root` uebernehmen, wenn der initiale Root-Zugriff bereits mit dem richtigen Key funktioniert:

```bash
cp /root/.ssh/authorized_keys /home/budgetbuddy/.ssh/authorized_keys
chown budgetbuddy:budgetbuddy /home/budgetbuddy/.ssh/authorized_keys
chmod 600 /home/budgetbuddy/.ssh/authorized_keys
```

In einem zweiten lokalen Terminal testen, bevor der Root-Zugang oder Passwort-Login gehaertet wird:

```bash
ssh budgetbuddy@<server-ip>
whoami
```

Erwartung:

- `whoami` gibt `budgetbuddy` aus.
- Der User ist fuer App-Dateien, DB und Backups vorgesehen und braucht fuer FIN-089 keine sudo-Rechte.

Admin-Hinweis: Wenn spaeter ein eigener Deploy-User sinnvoll wird, kann ein separates sudo-faehiges Konto `deploy` angelegt werden. Diese Anleitung haelt `budgetbuddy` bewusst als reinen Betriebsnutzer.

## 7. SSH haerten

Erst fortfahren, wenn ein zweites Terminal erfolgreich per SSH-Key als `budgetbuddy` verbunden ist.

Drop-in fuer SSH-Haertung anlegen:

```bash
cat >/etc/ssh/sshd_config.d/99-budgetbuddy-hardening.conf <<'EOF_SSH'
PasswordAuthentication no
KbdInteractiveAuthentication no
PubkeyAuthentication yes
PermitRootLogin prohibit-password
EOF_SSH

sshd -t
systemctl restart ssh
```

Danach erneut in einem neuen Terminal pruefen:

```bash
ssh budgetbuddy@<server-ip>
```

Hinweise:

- Auf Ubuntu-Cloud-Images koennen Cloud-init-Dateien SSH-Defaults setzen. Das `99-...` Drop-in soll spaeter geladene Projekt-Haertung eindeutig machen.
- Die bestehende Root-Session offen lassen, bis der neue Login sicher funktioniert.
- Public Root-Login per Key bleibt mit `PermitRootLogin prohibit-password` vorerst moeglich. Spaeter kann der Root-Zugriff weiter eingeschraenkt werden, sobald Tailscale-SSH oder ein stabiler Admin-Pfad eingerichtet ist.

## 8. Firewall-Grundregeln

Hetzner Cloud Firewall und Server-Firewall muessen dieselbe Grundregel respektieren: BudgetBuddy bekommt keinen oeffentlichen App-Port.

Hetzner Cloud Firewall fuer den Start:

- erlaubt: `TCP 22` fuer Bootstrap-SSH
- erlaubt: `ICMP` fuer Diagnose, falls gewuenscht
- erlaubt: `UDP 41641` fuer Tailscale Direct Connections, falls gewuenscht
- nicht erlaubt: `TCP 80`, `TCP 443`, `TCP 3000` fuer BudgetBuddy

Zusaetzlich auf dem Server mit `ufw`:

```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 41641/udp
ufw --force enable
ufw status verbose
```

Wichtig:

- Keine `ufw allow 80/tcp`.
- Keine `ufw allow 443/tcp`.
- Keine `ufw allow 3000/tcp`.
- Wenn SSH spaeter nur noch ueber Tailscale laufen soll, wird die Public-SSH-Regel in einem Folge-/Betriebsschritt reduziert oder entfernt.

## 9. Zielverzeichnisse vorbereiten

```bash
install -d -m 0755 -o budgetbuddy -g budgetbuddy /opt/budgetbuddy
install -d -m 0750 -o budgetbuddy -g budgetbuddy /var/lib/budgetbuddy
install -d -m 0750 -o budgetbuddy -g budgetbuddy /var/backups/budgetbuddy
```

Pruefen:

```bash
ls -ld /opt/budgetbuddy /var/lib/budgetbuddy /var/backups/budgetbuddy
```

Erwartung:

- `/opt/budgetbuddy` gehoert `budgetbuddy:budgetbuddy` und ist lesbar/ausfuehrbar fuer Deploy-/Betriebsschritte.
- `/var/lib/budgetbuddy` gehoert `budgetbuddy:budgetbuddy` und ist nicht fuer alle Nutzer lesbar.
- `/var/backups/budgetbuddy` gehoert `budgetbuddy:budgetbuddy` und ist nicht fuer alle Nutzer lesbar.

## 10. Basissetup verifizieren

Als `root` oder `budgetbuddy` ausfuehren, je nach benoetigten Rechten:

```bash
hostnamectl
node -v
npm -v
git --version
sqlite3 --version
tailscale version
ufw status verbose
ls -ld /opt/budgetbuddy /var/lib/budgetbuddy /var/backups/budgetbuddy
```

Checkliste:

- Ubuntu 24.04 LTS laeuft.
- Architektur ist x86_64 / amd64.
- Node.js 22 ist installiert.
- npm 10 oder passende Node-22-npm-Version ist installiert.
- Git ist installiert.
- SQLite CLI ist installiert.
- Tailscale ist installiert.
- BudgetBuddy ist nicht ueber `80`, `443` oder `3000` public freigegeben.
- Zielverzeichnisse existieren mit Besitzer `budgetbuddy:budgetbuddy`.
- Keine Secrets wurden in Dateien unter Git geschrieben.

## Nicht Teil von FIN-089

- Kein `git clone` der BudgetBuddy-App.
- Kein `npm ci`, `npm run build` oder `npm run start` auf dem VPS.
- Keine systemd-Service-Datei.
- Kein Tailscale Serve.
- Kein Tailscale Funnel.
- Keine Cloudflare-Konfiguration.
- Keine App-Auth.
- Keine echte Produktiv-DB mit Finanzdaten.

## Quellen

- ADR 0009: `docs/adr/0009-private-vps-tailscale-hosting.md`
- Tailscale Ubuntu 24.04 Installationsdoku: https://tailscale.com/docs/install/ubuntu/ubuntu-2404
- NodeSource Node.js 22 DEB Installationsdoku: https://github.com/nodesource/distributions/blob/master/DEV_README.md

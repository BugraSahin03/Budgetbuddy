# ADR 0009: Privates VPS-Hosting mit Tailscale-only

## Status

Angenommen

## Kontext

BudgetBuddy verwaltet private Finanzdaten und nutzt SQLite bewusst als zentrales Datenobjekt. Die App soll produktiv nicht nur auf dem Entwicklungsrechner nutzbar sein, ohne die Datenhaltung sofort auf eine fremde Cloud-Datenbank oder eine Public-Web-App umzustellen.

FIN-087 hat als erste Produktionsrichtung festgelegt: kleiner eigener Server, bevorzugt Hetzner Cloud, mit Zugriff ausschliesslich ueber Tailscale. Der Mac soll nicht dauerhaft laufen muessen, ein Raspberry Pi oder Heimserver ist aktuell nicht vorhanden.

## Entscheidung

BudgetBuddy startet im ersten privaten Produktivbetrieb auf einem kleinen Hetzner-Cloud-VPS und bleibt Tailscale-only erreichbar.

Produktionsprofil:

- Provider: Hetzner Cloud
- Serverklasse: kleiner x86 Shared-vCPU Server
- Default-Instanz: `CX23` oder jeweils kleinste aktuelle x86-CX-Instanz mit mindestens 2 vCPU, 4 GB RAM und 40 GB SSD
- Region: Deutschland, bevorzugt Falkenstein oder Nuernberg
- Betriebssystem: Ubuntu 24.04 LTS
- Zugriff: nur ueber autorisierte Tailnet-Geraete
- App-Pfad: `/opt/budgetbuddy`
- Datenbankpfad: `/var/lib/budgetbuddy/budgetbuddy.db`
- Backup-Pfad auf dem VPS: `/var/backups/budgetbuddy`

Sicherheitsannahmen:

- BudgetBuddy bekommt zum Start keine oeffentliche URL.
- BudgetBuddy darf nicht ueber die oeffentliche Server-IP erreichbar sein.
- Ports 80, 443 und 3000 werden fuer BudgetBuddy nicht public freigegeben.
- Tailscale Serve ist als privater Tailnet-Zugriff erlaubt.
- Tailscale Funnel ist ausgeschlossen.
- Cloudflare Tunnel oder Cloudflare Access werden zum Start nicht eingerichtet.
- App-Auth ist nicht Teil dieser Entscheidung; sie bleibt eine spaetere zweite Schutzschicht.
- Vor echter Produktivnutzung mit sensiblen Finanzdaten muessen robuste Backups und ein Restore-Test umgesetzt sein.

## Begruendung

Ein kleiner VPS ermoeglicht 24/7-Verfuegbarkeit, ohne dass der private Mac dauerhaft laufen muss und ohne sofort Heimserver-Hardware aufzubauen. Hetzner ist fuer diesen Use Case ein nachvollziehbarer Default: klassischer Linux-Server, persistente Platte, bekannte Kostenstruktur und normale Betriebswerkzeuge.

Tailscale-only haelt BudgetBuddy aus dem oeffentlichen Web heraus. Dadurch entsteht keine oeffentliche BudgetBuddy-Angriffsflache, solange keine Public-Ports oder Tailscale Funnel konfiguriert werden.

x86 wird fuer den Start gegenueber ARM bevorzugt, weil Next.js, Node.js und native SQLite-Abhaengigkeiten damit weniger Plattformueberraschungen erwarten lassen.

SQLite bleibt als lokale Datei erhalten. Damit bleibt die bestehende Architektur nah am aktuellen Projektstand und die Datenbank bleibt ein klar identifizierbares Backup- und Restore-Objekt.

## Abgrenzung

Cloudflare bleibt eine spaetere Komfortoption, falls irgendwann eine normale Webadresse oder ein anderer Zugriffskomfort gewuenscht wird. Cloudflare ist aber nicht die erste Sicherheitsgrenze und wird fuer den Start bewusst nicht konfiguriert.

Vercel und andere Serverless-/Cloud-DB-Setups werden fuer den ersten Produktivschritt ausgeschlossen, weil sie eine Migration weg von der lokalen SQLite-Datei oder ein anderes Persistenzmodell erzwingen wuerden.

Diese ADR richtet keinen Server ein, enthaelt keine Secrets, dokumentiert keine echte Server-IP und implementiert keine App-Auth.

## Konsequenzen

- Folgearbeiten muessen den VPS-Bootstrap, den systemd-Betrieb, Tailscale Serve, Backups, Offsite-Backups und Restore-Runbooks konkretisieren.
- Produktionsdokumentation und Deploy-Hilfen muessen `BUDGETBUDDY_DB_PATH=/var/lib/budgetbuddy/budgetbuddy.db` verwenden.
- Alle Betriebsanleitungen muessen klarstellen, dass BudgetBuddy nicht public exponiert wird.
- Backups und Restore-Tests sind Voraussetzung, bevor echte Finanzdaten dauerhaft produktiv genutzt werden.
- Eine spaetere App-Auth kann als zweite Schutzschicht ergaenzt werden, ohne diese Tailscale-only-Entscheidung aufzuheben.

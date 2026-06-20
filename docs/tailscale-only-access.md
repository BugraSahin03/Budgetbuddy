# Tailscale-only Zugriff

Diese Anleitung beschreibt, wie BudgetBuddy im ersten privaten Produktivbetrieb ausschliesslich ueber Tailscale erreichbar ist.

Grundlage:

- ADR 0009: privates VPS-Hosting mit Tailscale-only
- FIN-089: VPS-Basissetup mit installiertem Tailscale
- FIN-090: lokaler BudgetBuddy-systemd-Dienst auf `127.0.0.1:3000`

## Sicherheitsleitplanken

BudgetBuddy enthaelt private Finanzdaten. Fuer den Start gilt:

- BudgetBuddy bekommt keine oeffentliche URL.
- BudgetBuddy wird nicht ueber die oeffentliche Server-IP ausgeliefert.
- Keine Public-Freigabe fuer `80/tcp`, `443/tcp` oder `3000/tcp`.
- Tailscale Serve ist erlaubt, aber nur tailnet-intern.
- Tailscale Funnel bleibt deaktiviert und wird nicht verwendet.
- Cloudflare Tunnel oder Cloudflare Access werden nicht eingerichtet.
- Keine Secrets, Auth Keys oder echten Finanzdaten in Git dokumentieren.

## Zielbild

Der Next.js-Produktionsdienst laeuft lokal auf dem VPS:

```text
127.0.0.1:3000 -> BudgetBuddy systemd service
```

Tailscale Serve stellt diesen lokalen Port nur innerhalb des Tailnets bereit:

```text
https://<tailscale-dns-name>/ -> http://127.0.0.1:3000
```

Die oeffentliche Server-IP bleibt fuer BudgetBuddy geschlossen.

## Voraussetzungen

Auf dem VPS:

```bash
systemctl is-active tailscaled
systemctl is-active budgetbuddy.service
curl -fsS http://127.0.0.1:3000/api/health
```

Erwartung:

- `tailscaled` ist aktiv.
- `budgetbuddy.service` ist aktiv.
- Der lokale Healthcheck antwortet erfolgreich.

Tailscale-Status pruefen:

```bash
tailscale status
tailscale ip -4
```

Der VPS muss im Tailnet autorisiert sein. Die Autorisierung erfolgt ueber den Tailscale-Account des Nutzers und gehoert nicht als Secret ins Repo.

## Tailscale Serve aktivieren

Auf dem VPS:

```bash
tailscale serve --bg 3000
```

Erwartung:

```text
Available within your tailnet:

https://<tailscale-dns-name>/
|-- proxy http://127.0.0.1:3000
```

Status pruefen:

```bash
tailscale serve status
```

Erwartung:

```text
https://<tailscale-dns-name> (tailnet only)
|-- / proxy http://127.0.0.1:3000
```

Wichtig: Die Ausgabe muss `tailnet only` enthalten. Wenn eine Ausgabe auf Funnel oder Public Internet hinweist, ist das nicht die gewuenschte BudgetBuddy-Konfiguration.

## Tailscale Funnel bleibt deaktiviert

FIN-091 nutzt bewusst kein Funnel. In der Tailscale Admin Console darf fuer diese Konfiguration nur die fuer Serve benoetigte HTTPS-Zertifikatsfunktion aktiviert werden. Die optionale Funnel-Freigabe bleibt aus.

Pruefung auf dem VPS:

```bash
tailscale funnel status
```

Erwartung:

- Keine Public-Funnel-Freigabe.
- Falls die Serve-Konfiguration angezeigt wird, muss sie als `tailnet only` erscheinen.

Kein Befehl ausfuehren wie:

```bash
tailscale funnel ...
```

## Healthcheck ueber Tailscale

Von einem autorisierten Tailnet-Geraet:

```bash
curl -fsS https://<tailscale-dns-name>/api/health
```

Erwartung:

```json
{"status":"ok","sqliteReady":true,"schemaVersion":"..."}
```

Wenn der lokale Tailscale-Client auf dem Testgeraet gestoppt ist, funktioniert dieser Test nicht. Dann zuerst Tailscale auf dem Geraet aktivieren und sicherstellen, dass das Geraet im selben Tailnet online ist.

## Zugriff von eigenen Geraeten testen

Nach Aktivierung von Tailscale Serve pruefen:

- Mac: Browser oder `curl` gegen `https://<tailscale-dns-name>/api/health`
- iPhone: Tailscale-App aktivieren und BudgetBuddy-URL im Browser oeffnen
- iPad/Laptop, falls vorhanden: Tailscale-App aktivieren und BudgetBuddy-URL im Browser oeffnen

Nur eigene vertraute Geraete sollen Zugriff erhalten.

## ACL-/Grant-Minimum

Start-Minimum:

- Nur eigene vertraute Geraete sind im Tailnet autorisiert.
- Kein Tailscale Funnel.
- Kein Teilen des BudgetBuddy-Knotens mit fremden Nutzern.
- Keine ACL-Regel, die BudgetBuddy bewusst fuer ein groesseres Tailnet oder externe Nutzer oeffnet.

Wenn spaeter mehrere Nutzer oder Geraetegruppen hinzukommen, soll die Tailnet-Policy BudgetBuddy explizit auf die eigenen Admin-/Owner-Geraete begrenzen. Beispielhaftes Zielprinzip:

```json
{
  "acls": [
    {
      "action": "accept",
      "src": ["autogroup:owner"],
      "dst": ["<budgetbuddy-node>:443"]
    }
  ]
}
```

Das Beispiel ist bewusst nur ein Prinzip. Die konkrete Tailnet-Policy muss zur echten Tailscale-Admin-Konfiguration passen und darf keine ungewollten Nutzergruppen einschliessen.

## Negative Security Checks

Vom lokalen Rechner oder einem externen Netz:

```bash
nc -vz <server-ip> 80
nc -vz <server-ip> 443
nc -vz <server-ip> 3000
curl --connect-timeout 5 http://<server-ip>:3000/api/health
```

Erwartung:

- `80`, `443` und `3000` sind ueber die oeffentliche Server-IP nicht erreichbar.
- `/api/health` ist ueber die oeffentliche Server-IP nicht erreichbar.
- BudgetBuddy ist nur ueber Tailscale erreichbar.

Auf dem VPS:

```bash
ss -ltnp | grep -E ':(80|443|3000)'
```

Erwartung:

- Der App-Port `3000` lauscht nur auf `127.0.0.1:3000`.
- Kein BudgetBuddy-Prozess lauscht auf `0.0.0.0:3000`.
- Bei aktivem Tailscale Serve kann `tailscaled` auf der Tailscale-IP fuer `443` lauschen. Das ist erwartet und kein Public-Listen auf der Server-IP.

## Notfallabschaltung

Tailscale Serve deaktivieren:

```bash
tailscale serve --https=443 off
```

BudgetBuddy-Dienst stoppen:

```bash
systemctl stop budgetbuddy.service
```

Optional Dienst dauerhaft deaktivieren:

```bash
systemctl disable budgetbuddy.service
```

VPS aus dem Tailnet entfernen:

```bash
tailscale logout
```

Alternativ kann der Knoten in der Tailscale Admin Console entfernt werden.

Nach der Abschaltung pruefen:

```bash
tailscale serve status
curl -fsS http://127.0.0.1:3000/api/health
```

Erwartung:

- Serve ist aus oder leer.
- Der lokale Healthcheck ist nach gestopptem systemd-Service nicht erreichbar.

## Stand der ersten Ausfuehrung

FIN-091 wurde nach FIN-090 auf dem Produktiv-VPS ausgefuehrt:

- Tailscale Serve wurde fuer den lokalen BudgetBuddy-Port `3000` aktiviert.
- Serve-Status zeigte `tailnet only`.
- Der lokale Healthcheck auf dem VPS war erfolgreich.
- Public-Checks gegen `80`, `443` und `3000` ueber die oeffentliche Server-IP blieben nicht erreichbar.
- Tailscale Funnel und Cloudflare wurden nicht verwendet.

Der Endgeraete-Test von iPhone/iPad bleibt ein Nutzer-Test, weil diese Geraete nicht aus dem Repo oder vom VPS heraus automatisiert geprueft werden koennen.

# ADR 0013: Alfred liest Getquin ueber validierte Public-Share-Snapshots

## Status

Akzeptiert und fuer Alfred Stufe 3 am 19. Juli 2026 produktiv umgesetzt.

## Kontext

Alfred soll aktuelle Positionen, Allokation und Konzentration des in Getquin
gepflegten Portfolios kennen. Der vorhandene Freigabelink ist ohne Login
lesbar und erlaubt keine Aenderungen. Er ist trotzdem ein Bearer-Link: Wer ihn
kennt, kann die freigegebenen Daten sehen.

Urspruenglich war ein isolierter Headless-Browser vorgesehen. Die aktuelle
Getquin-Seite liefert den Portfoliozustand jedoch bereits serverseitig als
strukturiertes JSON im HTML. Ein Browser wuerde daher unnoetig fremdes
JavaScript ausfuehren und die Netzwerk- und Angriffsoberflaeche vergroessern.

## Entscheidung

- Ein separater Systembenutzer `alfred-portfolio-collector` fuehrt einmal
  taeglich einen deterministischen HTTPS-Collector ohne Browser aus.
- Der Freigabelink liegt nur in der root-eigenen Datei
  `/var/lib/alfred/secrets/getquin.env` mit Modus `0600`. Er ist kein CLI- oder
  Modellparameter und erscheint weder im Repository noch im Snapshot.
- Der Collector akzeptiert als Quelle ausschliesslich einen HTTPS-Link unter
  `getqu.in`, genau einen Redirect auf
  `app.getquin.com/<locale>/dashboard/<id>` und nur bekannte
  Tracking-Queryfelder. Weitere Redirects, Hosts oder Pfade werden abgelehnt.
- Es werden keine Cookies, Login-, API- oder Browserdaten verwendet und kein
  JavaScript der Seite ausgefuehrt.
- Der Collector validiert Next.js-Seite, App-Version, Dashboard-Abfrage,
  Typnamen, Positionen, Instrumentreferenzen, Waehrung, Zahlenbereiche und
  Kurszeitstempel. Bei unbekannter Struktur bricht er ab.
- Der Snapshot enthaelt aktuelle Positionen, sichtbare Kostenbasis,
  nicht realisierten Gewinn oder Verlust, sichtbare Dividenden, Assetklassen,
  Konzentration und Datenqualitaet. Profilname, Profil-ID, Avatar,
  Share-ID, Share-URL, Runtime-Konfiguration und Community-Inhalte werden
  ausgeschlossen.
- Aktueller Wert wird deterministisch aus Stueckzahl und letztem sichtbaren
  EUR-Kurs berechnet. `aktueller Wert - sichtbare Kostenbasis` wird nur als
  nicht realisiertes Ergebnis bezeichnet, niemals als zeit- oder
  geldgewichtete Rendite.
- Der OpenClaw-Benutzer `alfred` kann nur den SHA-256-geprueften Snapshot lesen.
  Das Werkzeug `getquin_snapshot` akzeptiert lediglich vordefinierte Ansichten,
  aber keine URL, keinen Dateipfad und keinen Browserbefehl.
- Alfred behaelt das Toolprofil `minimal`; `getquin_snapshot` wird additiv zu
  den bereits freigegebenen Werkzeugen aktiviert. Ein Snapshot gilt nach 36
  Stunden als veraltet.

## Folgen

- Alfred erhaelt Portfoliowissen ohne Login, Passwort, Browser-Vollzugriff oder
  Aenderungsmoeglichkeit.
- Das Auslesen ist deutlich leichter und sicherer als Browserautomation, bleibt
  aber an das serverseitige Getquin-Datenformat gekoppelt. Eine UI- oder
  Contract-Aenderung kann den Collector bewusst stoppen.
- Der Snapshot reicht fuer Bestands-, Allokations- und Konzentrationsanalysen,
  aber nicht fuer eine fachlich bereinigte Gesamtrendite. Dafuer fehlen
  Investmenttransaktionen und externe Cashflows.
- Der oeffentliche Link bleibt ein Datenschutzrisiko. Bei vermuteter
  Offenlegung muss er in Getquin widerrufen beziehungsweise neu erzeugt und
  das Server-Secret ersetzt werden.
- Getquin-Verfuegbarkeit und Nutzungsbedingungen liegen ausserhalb von Alfreds
  Kontrolle. Der Collector bleibt persoenlich, niedrigfrequent und ohne
  Umgehung von Zugriffsschutz.

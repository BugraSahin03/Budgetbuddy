# ADR 0001: Tech Stack

## Status

Angenommen

## Kontext

Die App soll private Finanzdaten verwalten, offline-faehig werden, spaeter auf einem Raspberry Pi laufen und langfristig als Nebenprojekt sauber wachsen.

Die Daten sind sensibel und sollen nicht unnoetig in eine fremde Cloud. Gleichzeitig soll die App spaeter von verschiedenen Geraeten erreichbar sein.

## Entscheidung

Wir bauen eine Web-App/PWA. Der bevorzugte Start ist ein Next.js-Projekt mit TypeScript und SQLite. Falls sich beim Setup ein separates Node.js-Backend als klar besser herausstellt, muss diese Entscheidung in einem neuen ADR begruendet werden.

Kernbestandteile:

- React + TypeScript fuer das Frontend
- Next.js fuer App, Routing, Serverlogik und API-Endpunkte
- SQLite als lokale Datenbank
- CSV/CAMT-Import als erste Datenquelle
- Docker fuer spaeteres Hosting auf Raspberry Pi
- Tailscale fuer privaten Zugriff von unterwegs

## Begruendung

Eine Web-App/PWA ist flexibler als eine reine Desktop-App. Sie kann lokal am Rechner laufen, spaeter auf dem Raspberry Pi gehostet werden und langfristig auch auf Handy oder Tablet genutzt werden.

SQLite ist robust, lokal, guenstig und passt gut zu einem privaten Finanzprojekt. Fuer die ersten Jahre reicht eine einzelne Datenbankdatei sehr wahrscheinlich aus.

## Konsequenzen

- Der erste MVP kann lokal entwickelt und genutzt werden.
- Offline-Faehigkeit wird spaeter bewusst als PWA/Sync-Thema umgesetzt.
- Bankanbindung wird nicht von Anfang an eingebaut, sondern nach stabilem Import- und Kategorienmodell.
- Die SQLite-Datei wird langfristig ein zentrales Backup-Objekt.
- UI und Backend duerfen fuer den MVP in einem Repository/App-Projekt liegen.

## Bewusst verschoben

- FinTS/PSD2-Bankanbindung
- Offline-Sync zwischen mehreren Geraeten
- Raspberry-Pi-Docker-Deployment
- N26-Import

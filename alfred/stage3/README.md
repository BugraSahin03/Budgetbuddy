# Alfred – Stufe 3

Stufe 3 verbindet Alfred mit dem oeffentlichen read-only Getquin-
Portfoliofreigabelink. Der Link liegt nur als geschuetztes Server-Secret vor.
Er wird weder in Git noch in Snapshots, Logs oder Alfreds Workspace kopiert.

Da die Portfolioseite ihren strukturierten Zustand serverseitig ausliefert,
verwendet der Collector bewusst keinen Headless-Browser und fuehrt kein
JavaScript von Getquin aus. Er akzeptiert genau einen Redirect von `getqu.in`
auf eine Portfolioseite unter `app.getquin.com`, validiert das eingebettete
JSON und bricht bei unbekannter Struktur ab.

Produktionsdateien:

- Collector: `/opt/alfred-getquin-reader/collector.mjs`
- Secret: `/var/lib/alfred/secrets/getquin.env`
- Snapshot: `/var/lib/alfred-snapshots/getquin/latest.json`
- Historie: `/var/lib/alfred-snapshots/getquin/history/`
- Timer: `alfred-getquin-collector.timer`
- OpenClaw-Tool: `/opt/alfred-getquin-tool/`

Der Collector laeuft unter `alfred-portfolio-collector` und schreibt ueber die
separate Gruppe `alfred-snapshots`. Der OpenClaw-Benutzer `alfred` kann nur den
Snapshot lesen. Das Tool akzeptiert eine feste Ansicht, aber weder URLs noch
Browser-, Netzwerk- oder Dateiparameter.

Der Snapshot wird nach dem Boot und danach einmal taeglich aktualisiert. Alfred
verwirft ihn nach 36 Stunden als veraltet. Eine reine Veraenderung von
Portfoliowert oder nicht realisiertem Gewinn wird niemals als zeit- oder
geldgewichtete Rendite bezeichnet.

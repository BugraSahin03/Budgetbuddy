# FIN-105 Mobile Responsive Audit

Datum: 2026-06-28

## Zielbild

BudgetBuddy soll auf modernen Smartphones, primaer iPhone/Safari, nicht die komplette Desktop-Arbeit ersetzen, aber die wichtigsten privaten Finanzaktionen sauber ermoeglichen:

- Monatsstand lesen
- Monatsausgaben und offene Zuordnungen erkennen
- Buchung hinzufuegen
- Kategorie oder Sonderbudget zuordnen
- Import starten/pruefen, wenn noetig
- Budgets, Fixkosten und Einstellungen kontrollieren

Das mobile Zielbild ist keine eigene abgespeckte App. Es ist dieselbe Web-App mit mobile-first nutzbaren Layouts fuer die zentralen Flows.

## Gepruefter Rahmen

Primaeres Zielgeraet laut Ticket:

- iPhone 17 Pro Klasse
- Safari auf iOS
- moderne Smartphone-Breiten ca. `390px` bis `430px`

Audit-Breiten:

- `375px`: kleine iPhones / kleine Smartphones
- `390px`: moderne iPhone-Klasse
- `430px`: groessere Smartphones
- `768px`: Tablet / schmales iPad / Zwischenbreite

Gepruefte Preview:

- Worktree: `/Volumes/Intenso/Dev/Budgetbuddy-issue-215`
- Branch: `issue/215-fin-105-mobile-responsive-audit`
- Preview: `http://localhost:3215`

Gepruefte Routen:

- `/` Dashboard
- `/monate` Monatsauswahl
- `/monate/2026-06` Monatsansicht
- `/budgets` Budgetpflege/Kategorien/Sonderbudgets
- `/fixkosten` Fixkosten
- `/monatsvergleich` Monatsvergleich
- `/einstellungen` Einstellungen
- `/transaktionen` technische Fallback-Seite

## Zentrale Erkenntnis

Die App hat aktuell keinen expliziten mobilen Viewport-Meta-Eintrag im Root-Layout.

Beobachtung im Headless-Mobile-Test:

- Bei simulierten Breiten `375px`, `390px` und `430px` meldet der Browser ohne Viewport-Meta eine Layoutbreite von ca. `980px`.
- Dadurch wird die Desktop-Oberflaeche auf Mobile verkleinert statt wirklich responsiv gerendert.
- Das erklaert die sichtbar abgeschnittene Navigation, abgeschnittene Hero-/Kartenbereiche und rechts herauslaufende Aktionsbereiche in den Mobile-Screenshots.

Technische Folge:

- Bevor einzelne Komponenten optimiert werden, braucht BudgetBuddy zuerst eine mobile Viewport-Basis.
- Danach greifen die vorhandenen Media Queries und viele Seiten zeigen bereits deutlich bessere Grundvoraussetzungen.

Simulierter Gegencheck:

- Nach injiziertem Viewport-Meta `width=device-width, initial-scale=1` hatten die geprueften Hauptseiten bei `375px`, `390px` und `430px` keinen messbaren horizontalen Dokument-Overflow mehr.
- Das ersetzt keine echte Umsetzung, zeigt aber klar: Der erste Mobile-Fix ist klein, zentral und hoch wirksam.

## Bewertung nach Bereichen

### App-Shell / Navigation

Status: kritisch

Befunde:

- Auf Mobile bleibt die Desktop-/Tablet-Navigation als horizontale Leiste sichtbar.
- Logo und Navigationspunkte kollidieren optisch.
- Bei 390px sind nur die ersten Navigationspunkte sichtbar; der Rest liegt ausserhalb des sichtbaren Bereichs.
- Der vorhandene Toggle ist erst ab `min-width: 768px` sichtbar und hilft damit Smartphones nicht.

Empfehlung:

- Smartphone-Navigation als eigener Mobile-Modus.
- Header kompakt halten: Logo links, Menu-Button rechts.
- Navigation als ausklappbares Panel, Drawer oder Bottom-Sheet.
- Desktop-Sidebar ab `768px` beibehalten.

Prioritaet: P0

### Dashboard `/`

Status: nach Viewport-Basis wahrscheinlich brauchbar

Befunde:

- KPI-Karten stapeln bereits gut.
- Inhalte sind grundsaetzlich lesbar.
- Problem vor allem durch fehlende Viewport-Basis und Desktop-Navigation.
- Lange Beschreibungstexte koennen auf Mobile etwas dicht wirken.

Empfehlung:

- Nach Viewport- und Shell-Fix erneut pruefen.
- KPI-Karten als mobile Startansicht erhalten.
- Lange Hilfstexte auf Mobile ggf. kuerzen oder einklappen.

Prioritaet: P2

### Monatsauswahl `/monate`

Status: kritisch vor Viewport-Basis, danach mittlere Nacharbeit

Befunde:

- Seitentitel und Monatskarten liefen im aktuellen Stand sichtbar nach rechts heraus.
- Jahres-/Monatsstruktur ist fachlich fuer Mobile passend.
- Die Kartenidee ist gut, aber Abstaende und Headergroessen muessen nach Viewport-Fix erneut geprueft werden.

Empfehlung:

- Nach Viewport-Basis Titelgroessen und Kartenpadding fuer `<=430px` feinjustieren.
- Jahresbereiche weiter als ausklappbare Gruppen belassen.

Prioritaet: P1

### Monatsansicht `/monate/2026-06`

Status: wichtigste kritische Arbeitsseite

Befunde:

- Aktuell sichtbar abgeschnittene Header-/Aktionsbereiche.
- `Monat abschliessen` und aehnliche Buttons koennen auf Mobile aus dem sichtbaren Bereich laufen.
- KPI-Karten stapeln gut, aber die Seite ist sehr lang.
- Kategorie-Breakdown, letzte Bewegung und alle Monatsbuchungen sind fachlich dicht.
- Alle Monatsbuchungen brauchen auf Mobile eine klare Kartenlisten-Darstellung und duerfen keine Tabellen-/Raster-Mindestbreiten erzwingen.

Empfehlung:

- Nach Viewport-/Shell-Fix eigene Mobile-Priorisierung fuer Monatsansicht:
  1. Monatskopf + wichtigste KPI
  2. Hinzufuegen-Aktion jederzeit erreichbar
  3. Offene Zuordnungen/letzte Buchungen prominent
  4. Budget Breakdown darunter
  5. Alle Monatsbuchungen als kompakte Kartenliste
- Desktop-Dichte beibehalten, aber Mobile bewusst stärker kuratieren.

Prioritaet: P1

### `Buchung hinzufuegen` Dialog

Status: teilweise vorbereitet, aber kritisch zu pruefen

Befunde aus CSS/Komponenten:

- Dialog hat bereits Mobile-Regeln bei `max-width: 860px`.
- Dialog wird fast fullscreen: `height: calc(100vh - 0.5rem)` und `max-width: calc(100vw - 0.5rem)`.
- Felder wechseln auf einspaltig.
- Kategorie-Kacheln wechseln auf 2 Spalten.
- Dialog nutzt `overscroll-behavior: contain` und interne Scrollflaeche.

Risiken:

- Ohne Viewport-Meta ist dieser Mobile-Modus nicht verlaesslich testbar.
- Betragseingabe mit grosser Typografie kann bei kleinen Breiten/Safari-Tastatur kritisch werden.
- Save-Button muss mit iOS-Tastatur und Safe Area erreichbar bleiben.
- Native `<dialog>` muss auf iOS Safari gesondert getestet werden.

Empfehlung:

- Nach Viewport-Basis echten iPhone/Safari-Check machen.
- Dialog als Fullscreen-/Bottom-Sheet-Flow behandeln.
- Save-Button sticky am unteren Rand plus `safe-area-inset-bottom` pruefen.

Prioritaet: P1

### Kategorie-/Sonderkategorie-Auswahl im Dialog

Status: grundsaetzlich vorbereitet

Befunde:

- Kachelgrid reduziert auf 2 Spalten unter `860px`.
- Touch-Ziele der Kategorie-Icons wirken voraussichtlich ausreichend gross.
- Lange Kategorie-/Sonderbudgetnamen koennen bei 2-Spalten-Layout brechen.

Empfehlung:

- Nach Viewport-Basis auf echten Daten mit langen Sonderbudgetnamen pruefen.
- Bei langen Namen `line-clamp` oder kompaktere Listenvariante erwaegen.

Prioritaet: P2

### CSV-Import im Dialog

Status: kritisch fuer Mobile-Komfort, aber nicht erster Kernflow

Befunde:

- Import ist im Hinzufuegen-Dialog eingebettet.
- Uploadbereich ist kartenartig und kann mobil funktionieren.
- Import-Vorschau/Resultate enthalten potenziell tabellarische oder breite Inhalte.

Empfehlung:

- Mobile Import darf funktionieren, muss aber nicht der bequemste Hauptweg sein.
- Ergebnis-/Vorschlagslisten als Karten statt Tabellen darstellen.
- Lange Banktexte immer umbrechen und auf Mobile ggf. einklappen.

Prioritaet: P2

### Alle Monatsbuchungen

Status: kritisch

Befunde:

- Der Bereich ist eine zentrale Mobile-Arbeitsliste.
- Lange Importtexte, Betragswerte, Datum/Kategorie und Aktionszustand muessen auf kleiner Breite sauber lesbar bleiben.
- Tabellenartige Strukturen waeren hier auf Mobile zu eng.

Empfehlung:

- Mobile Kartenliste als Standard fuer `<=640px`.
- Pro Buchung: Icon, Titel, Betrag, Datum/Konto/Kategorie als Meta-Zeile, Aktionen in zweiter Zeile oder Detailmodus.
- Lange Beschreibungen mit kontrolliertem Umbruch oder einklappbarer Detailansicht.

Prioritaet: P1

### Budgets/Kategorien `/budgets`

Status: kritisch vor Viewport-Basis, danach mittlere Nacharbeit

Befunde:

- Kategorien werden bereits als Karten gezeigt.
- Auf 390px waren rechts Werte abgeschnitten, vor allem wegen Desktop-Layoutbreite ohne Viewport-Meta.
- Bearbeitungsmodus mit mehreren Inputs pro Kategorie/Sonderbudget kann auf Mobile sehr lang und dicht werden.

Empfehlung:

- Nach Viewport-Basis erneut pruefen.
- Read-only Liste mobil als Karten beibehalten.
- Editiermodus mobil eher als einzelne Bearbeiten-Karte oder Detaildialog pro Kategorie/Sonderbudget statt alle Inputs gleichzeitig.

Prioritaet: P1

### Fixkosten `/fixkosten`

Status: brauchbar mit Shell-/Viewport-Fix

Befunde:

- Ohne vorhandene Fixkosten ist die Seite gut lesbar.
- Hero, Monatsblock und Plus-Aktion sind mobil grundsaetzlich verstaendlich.
- Navigation ist aktuell der groesste Stoerfaktor.
- Bei vielen Fixkosten muss die Editor-Dichte separat geprueft werden.

Empfehlung:

- Nach Viewport-/Shell-Fix mit mehreren echten Fixkosten testen.
- Mobile Editor analog Budgetpflege vereinfachen: nicht alle Felder gleichzeitig erzwingen.

Prioritaet: P2

### Monatsvergleich `/monatsvergleich`

Status: relativ brauchbar

Befunde:

- Jahres-/Monatskarten stapeln gut.
- Zahlenbuch-Logik passt zu Mobile.
- Hero-Text kann knapp werden, aber kein Kernproblem.

Empfehlung:

- Nach Viewport-Basis kleine Text-/Spacing-Feinjustierung.

Prioritaet: P3

### Einstellungen `/einstellungen`

Status: brauchbar mit Shell-/Viewport-Fix

Befunde:

- Einstellungs-Kacheln sind visuell mobil geeignet.
- Rechte Pfeil-/Aktionsbereiche wurden ohne Viewport-Basis abgeschnitten.
- Nach Viewport-Fix wahrscheinlich gut nutzbar.

Empfehlung:

- Kacheln mobil einspaltig beibehalten.
- Touch-Ziele fuer Kachel und Pfeil ausreichend gross halten.

Prioritaet: P2

### Notfallroute `/transaktionen`

Status: als technische Fallback-Seite akzeptabel, aber nicht mobile-poliert

Befunde:

- Formulare stapeln gut.
- Tabellen unten bleiben potenziell horizontal oder zu dicht.
- Route ist laut Ticket nur technischer Fallback.

Empfehlung:

- Keine hohe UI-Investition.
- Nur sicherstellen, dass keine harte horizontale Sperre oder unbedienbare Form entsteht.

Prioritaet: P3

## Priorisierte Mobile-Probleme

### P0: Mobile Viewport-Basis fehlt

Problem:

- Ohne `width=device-width, initial-scale=1` rendert Mobile mit Desktop-Layoutbreite.

Empfohlene Umsetzung:

- In Next.js Root-Layout eine `viewport`-Konfiguration ergaenzen.
- Danach alle Mobile-Audits erneut gegen echte 375/390/430px Layoutbreite pruefen.

Warum zuerst:

- Alle weiteren Mobile-Probleme werden sonst von einem falschen Browser-Viewport ueberlagert.

### P0: Smartphone-Navigation fehlt

Problem:

- Aktuelle Navigation ist fuer Smartphones eine horizontale Desktop-Leiste.

Empfohlene Umsetzung:

- Mobile Header mit Menu-Button.
- Navigation als Drawer/Panel/Bottom-Sheet.
- Desktop-Sidebar ab `768px` unveraendert lassen.

### P1: Monatsansicht mobil kuratieren

Problem:

- Wichtigste Seite ist zu lang und nicht klar genug priorisiert.
- Headeraktionen und Buchungslisten muessen mobil robuster werden.

Empfohlene Umsetzung:

- Mobile Informationshierarchie definieren.
- Hinzufuegen-Aktion gut erreichbar halten.
- Alle Monatsbuchungen als kompakte Kartenliste.

### P1: Hinzufuegen-Dialog auf iPhone/Safari validieren

Problem:

- CSS ist vorbereitet, aber ohne Viewport-Meta und echten iOS-Safari-Check nicht final belastbar.

Empfohlene Umsetzung:

- Fullscreen-/Bottom-Sheet-Verhalten finalisieren.
- iOS-Tastatur, Safe Area und sticky Speichern pruefen.

### P1: Budgetpflege-Editiermodus mobil vereinfachen

Problem:

- Read-only Karten sind nah dran, aber Editieren aller Kategorien/Sonderbudgets gleichzeitig wird auf Mobile schnell zu dicht.

Empfohlene Umsetzung:

- Mobile Bearbeitung pro Eintrag oder in Detaildialogen.
- Sonderbudget-Monatswerte mobil als einzelne Monatskarten.

## Empfohlene Umsetzungstickets

1. **FIN-MOBILE-01: Viewport und Smartphone-Shell**
   - `viewport` im Root-Layout setzen.
   - Smartphone-Navigation einfuehren.
   - Ziel: App rendert bei 375/390/430px ohne Desktop-Skalierung und ohne Navigationskollision.

2. **FIN-MOBILE-02: Monatsansicht Mobile Layout**
   - Monatskopf, KPI-Reihenfolge, Budget Breakdown, letzte Bewegungen und Monatsbuchungen mobil kuratieren.
   - Alle Monatsbuchungen als kompakte Kartenliste.

3. **FIN-MOBILE-03: Buchung-hinzufuegen Dialog fuer iPhone/Safari**
   - Fullscreen/Bottom-Sheet finalisieren.
   - Save-Button, iOS-Tastatur, Safe Area und Kategorieauswahl testen.
   - Import-Tab mindestens bedienbar halten.

4. **FIN-MOBILE-04: Budgetpflege und Fixkosten mobil editierbar machen**
   - Read-only Karten beibehalten.
   - Editiermodus pro Eintrag oder Dialog statt alle Inputs gleichzeitig.

5. **FIN-MOBILE-05: Sekundaerseiten Mobile Polishing**
   - Monatsauswahl, Monatsvergleich, Einstellungen, Notfallroute `/transaktionen` nachziehen.

## Akzeptanzkriterien-Abgleich

- iPhone/Safari als primaeres Zielbild beruecksichtigt: ja.
- Monatsansicht, Hinzufuegen-Dialog, Navigation, Budgets, Fixkosten und Einstellungen mobil geprueft: ja.
- Priorisierte Liste der mobilen Probleme: ja.
- Empfehlung fuer erste Umsetzungstickets: ja.
- Keine Code-Aenderungen erforderlich: eingehalten, dieses Ticket dokumentiert nur den Audit.

# ADR 0008: Sperrregeln fuer abgeschlossene Monate

## Status

Angenommen; Kategorien-/Sonderbudget-Snapshotregeln durch FIN-125 fortgeschrieben

## Kontext

Mit ADR 0007 existiert ein Monatsstatus und ein Fixkosten-Snapshot fuer den Monatsabschluss. Damit ist der geplante Fixkostenblock historisch stabil, aber der Monat selbst war weiterhin ueber verschiedene Schreibpfade veraenderbar.

Fuer FIN-071 braucht der Abschluss deshalb verbindliche Sperrregeln, die nicht nur in der UI sichtbar sind. Besonders wichtig sind Buchungen, Importe, Kategoriezuordnungen, Monatsbudgets und Sonderbudget-Monatsanteile, weil diese Werte direkt Monatsauswertungen und historische Monatsstaende veraendern.

## Entscheidung

Ein Monat kann `open` oder `closed` sein. Der Status wird in `monthly_statuses` gefuehrt.

Geschlossene Monate sperren monatsbezogene Schreiboperationen:

- neue manuelle Buchungen fuer den Monat
- Bearbeiten und Loeschen bestehender manueller Buchungen des Monats
- Loeschen importierter Buchungen des Monats
- Kategorie- oder Sonderbudget-Zuordnung von Ausgaben des Monats
- CSV-Importe in den Monat
- Monatsbudget-Overrides fester Kategorien
- Sonderbudget-Monatsanteile, inklusive Betrag, Aktiv-Status und projektweite Updates betroffener Anteile

Beim ersten Abschluss wird zusaetzlich ein Kategorien- und
Sonderbudget-Snapshot angelegt. Er speichert die damals sichtbaren
Kategorien, Namen, Icons, Aktiv-/Sichtbarstatus und effektiven Planwerte mit
stabilen Kategorie-, Monatsanteil- und Vorhabenreferenzen. Ein eigener Marker
im Monatsstatus unterscheidet auch einen bewusst leeren Snapshot von einem
noch nie abgeschlossenen Monat.

Spaetere globale Aenderungen an Namen, Icons, Aktivstatus, Vorhabenstatus und
Standardbudgets veraendern vorhandene Snapshot-Eintraege nicht. Ist-Werte
bleiben dagegen aus den Transaktionen und ihren stabilen Zuordnungen
dynamisch ableitbar.

Offene Ausgaben-Zuordnungen blockieren den Abschluss nicht hart. Die Monatsseite zeigt sie als Warnhinweis, damit Nutzer bewusst entscheiden koennen.

Das Wieder-Oeffnen setzt den Monatsstatus zurueck auf `open` und erlaubt
Buchungen, Zuordnungen und Importe wieder. Vorhandene Fixkosten- und
Kategorien-/Sonderbudget-Snapshots bleiben erhalten und werden nicht
automatisch neu berechnet. Deshalb bleiben vorhandene Kategorie-Planwerte
sowie Betrag und Aktivstatus vorhandener Sonderbudget-Eintraege eingefroren.
Eine erstmals verwendete Kategorie oder ein erstmals verwendeter
Sonderbudget-Anteil ergaenzt nur den fehlenden Snapshot-Eintrag; vorhandene
Eintraege werden nicht ueberschrieben.

## Begruendung

Die Sperre gehoert in die Repository-Schreibpfade, weil UI-only-Schutz bei Importen, globalen Actions oder kuenftigen Oberflaechen zu leicht umgangen wuerde.

Warnen statt Blockieren bei offenen Zuordnungen passt zum aktuellen MVP: Importierte Ausgaben duerfen temporaer offen sein, und ein Monatsabschluss kann fachlich trotzdem sinnvoll sein, wenn der Nutzer das bewusst bestaetigt.

Das getrennte Snapshot-Schema macht planlose Werte, bewusst leere
Abschlussstaende und historische Metadaten eindeutig. Insert-only-Ergaenzungen
nach einer Wieder-Oeffnung halten bewusste Korrekturen nachvollziehbar, ohne
den vorhandenen Abschlussstand still neu zu berechnen.

## Abgrenzung

- Bestehende geschlossene Altdaten besitzen keine echte historische
  Metadatenquelle. Die Migration uebernimmt deshalb den zum
  Migrationszeitpunkt aktuellen Stand einmalig und dokumentiert diese Grenze
  transparent.
- Der Fixkosten-Snapshot bleibt durch ADR 0007 geregelt.
- Es gibt keine automatische Review-, Reset- oder Recalculate-Funktion fuer abgeschlossene Monate.

## Konsequenzen

- Schreibfunktionen muessen den Monatsstatus pruefen, bevor sie monatsbezogene Daten veraendern.
- Neue monatsbezogene Schreibpfade muessen dieselbe Sperrregel anwenden.
- Monats-Readmodels muessen bei vorhandenem Kategorien-/Sonderbudget-Snapshot
  historische Metadaten und Planwerte daraus lesen; Ist-Werte bleiben an den
  Transaktionen verankert.
- Snapshot-Zeilen sind je Monat und stabiler Entitaetsreferenz eindeutig und
  werden nach dem ersten Speichern nicht automatisch aktualisiert.
- UI-Komponenten fuer geschlossene Monate duerfen keine Bearbeitungsformulare anbieten, sondern sollen Wieder-Oeffnen als bewusste Aktion zeigen.
- Tests muessen Repository-Sperren, Import-Sperren und UI-Indikatoren fuer geschlossene Monate absichern.

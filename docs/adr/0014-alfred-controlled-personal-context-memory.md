# ADR 0014: Alfred nutzt ein bestaetigtes, kontrolliertes Kontextgedaechtnis

Status: Accepted
Datum: 22. Juli 2026

## Kontext

Alfred soll langfristig neue Anschaffungen, Ziele, Workflows und
Strategiewechsel verstehen und in spaeteren Gespraechen beruecksichtigen. Ein
allgemeines Datei- oder Shellwerkzeug wuerde jedoch die vorhandene
Read-only-Sicherheitsgrenze aufheben und koennte Modellfehler oder
Prompt-Injection dauerhaft in seine eigenen Regeln schreiben.

Die statisch injizierten Dateien `USER.md` und `MEMORY.md` eignen sich fuer
einen kompakten Startstand, aber nicht fuer selbststaendig wachsenden,
versionierten Kontext.

## Entscheidung

Alfred erhaelt einen separaten Kontextspeicher mit vier eng begrenzten
Werkzeugen:

1. `personal_context_snapshot` liest feste Sichten.
2. `memory_propose` erzeugt einen ausstehenden strukturierten Vorschlag.
3. `memory_confirm` uebernimmt genau diesen Vorschlag nach einer neuen
   ausdruecklichen Bestaetigung in derselben Unterhaltung.
4. `memory_cancel` verwirft ihn.

Der kanonische Store ist strukturiertes JSON mit Integritaetshash und
Revision. Menschenlesbare Markdown-Dateien sind deterministisch generierte
Ansichten, keine frei vom Modell geschriebenen Dateien. Titel, Zusammenfassung
und Details werden als Daten escaped.

Aenderungen verwenden `replace` und verknuepfen alte mit neuer Revision.
`archive` behaelt den Inhalt ausserhalb des aktiven Kontextes. `forget`
entfernt den gespeicherten Inhalt; Ereignisdateien enthalten nur IDs, Aktion
und Hash, nicht den Text.

## Sicherheitsgrenzen

- Plugin und Dateinamen sind root-eigen und fest.
- Nur der Agent `main` erhaelt die vier Werkzeuge.
- Serverwart bekommt sie nicht; Alfred bekommt weiterhin keine Serverwart-
  oder Operationswerkzeuge.
- Schreiboperationen sind an Unterhaltung, Vorschlag und Code gebunden.
- `memory_confirm` ist gemaess Alfreds Laufzeitregeln erst nach einem neuen
  expliziten Nutzerturn erlaubt.
- Geheimnisse, dynamische Finanzwerte und Quelldatenkopien bleiben verboten.
- `AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md` und OpenClaw-Konfiguration
  koennen durch das Plugin nicht geaendert werden.

## Konsequenzen

Alfred kann flexibel mit dem Leben des Haushalts mitwachsen, ohne seine eigene
Sicherheits- oder Persoenlichkeitskonfiguration frei zu bearbeiten. Der Nutzer
erhaelt vor jeder dauerhaften Aenderung eine sichtbare Kontrolle und kann
Eintraege ersetzen, archivieren oder vergessen.

Die Bestaetigung beruht zusaetzlich auf Alfreds Befolgung der Turnregel. Der
Code kann erkennen, ob Proposal, Code und Unterhaltung zusammenpassen, aber
nicht semantisch beweisen, dass ein Modell eine Nutzerantwort korrekt
interpretiert hat. Deshalb bleibt die vollstaendige Anzeige des Vorschlags vor
der Bestaetigung verpflichtend.

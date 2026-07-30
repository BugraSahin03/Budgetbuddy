# Alfred – persoenliches Finanz-Onboarding und Kontextmodell

Status: Grundkontext am 22. Juli 2026 bestaetigt und fuer `USER.md` aufbereitet;
offene Detailfragen werden spaeter ergaenzt

## 1. Alfred wird nicht klassisch trainiert

Fuer den persoenlichen Finanzcoach ist kein Fine-Tuning mit privaten Daten
noetig. Alfred braucht stattdessen vier sauber getrennte Wissensarten:

1. **Persoenlichkeit und Mandat:** `SOUL.md`, Financial Charter und
   Entscheidungsregeln; vom Betreiber versioniert.
2. **Bestaetigter stabiler Kontext:** Haushalt, Ziele, Werte,
   Risikoverstaendnis und Kommunikationspraeferenzen; kompakt in `USER.md`.
3. **Dynamische Finanzfakten:** BudgetBuddy, Getquin und spaetere Quellen;
   ausschliesslich ueber gepruefte Snapshot-Werkzeuge.
4. **Bestaetigte Langzeiterinnerungen:** Entscheidungen, gelernte
   Praeferenzen und Aenderungsgruende; kuratiert in `MEMORY.md`.

So kann sich das Modell verbessern, ohne Buchungen, Depotwerte oder spontane
Vermutungen dauerhaft in Prompts zu kopieren.

## 2. Technische Besonderheit des aktuellen Alfred

OpenClaw injiziert derzeit die Standarddateien `AGENTS.md`, `SOUL.md`,
`TOOLS.md`, `IDENTITY.md`, `USER.md` und `MEMORY.md` in jeden Turn. Alfred hat
bewusst kein allgemeines Dateilesewerkzeug. Deshalb gehoert der kompakte
Kernkontext zunaechst in `USER.md`; weitere frei erfundene Workspace-Dateien
waeren fuer das Modell nicht automatisch sichtbar.

Wenn Ziele und Planungsdaten groesser werden, folgt ein festes
`personal_context_snapshot`-Werkzeug mit Ansichten wie `goals`, `household`,
`philosophy` und `decision_history`. Es erhaelt ebenso wenig freie Dateipfade
wie die Finanzwerkzeuge.

## 3. Was in `USER.md` gehoert

- bevorzugte Anrede und Sprache;
- Haushaltsstruktur und finanzielle Verantwortlichkeiten;
- welche Informationen individuell und welche gemeinsam betrachtet werden;
- priorisierte Ziele mit Zeithorizont und Erfolgskriterium;
- Liquiditaetsuntergrenze und bekannte grosse Vorhaben;
- Investmentziel, Anlagehorizont und bestehende Portfoliothese;
- Risikotragfaehigkeit und Verhalten in Stressphasen;
- ethische, religioese, steuerliche oder rechtliche Grenzen;
- gewuenschte Direktheit, Antworttiefe und Proaktivitaet;
- ausdrueckliche Grenzen fuer Informationen ueber die Ehefrau.

Exakte dynamische Kontostaende, einzelne Buchungen und aktuelle Depotwerte
gehoeren nicht hinein.

## 4. Onboarding in sechs Bloecken

### Block A – Haushalt und Verantwortung

- Wer gehoert zur finanziellen Planung?
- Welche Konten, Ziele und Entscheidungen sind gemeinsam oder individuell?
- Was darf Alfred ueber die Ehefrau speichern, verwenden und ansprechen?
- Wer entscheidet bei grossen Ausgaben und Investments?

### Block B – Ziele und Zeitachsen

Jedes Ziel erhaelt:

- klare Bezeichnung;
- individuell oder gemeinsam;
- Prioritaet;
- Zieltermin oder Zeithorizont;
- Zielbetrag oder anderes messbares Erfolgskriterium;
- Mindest-, Wunsch- und Idealvariante;
- monatlichen Beitrag;
- Flexibilitaet und Abbruchbedingungen.

### Block C – Sicherheit und Liquiditaet

- notwendige Monatsliquiditaet;
- Ziel fuer Notfallreserve;
- planbare groessere Ausgaben;
- Einkommensstabilitaet und Ausfallrisiken;
- Schulden, Garantien und existenzielle Versicherungsrisiken.

### Block D – Investmentmandat

- Zweck des Depots;
- Anlagehorizont;
- Zielallokation oder bewusste Abweichungen;
- Rolle von Einzelaktien, ETFs, Krypto und Edelmetallen;
- aktuelle These je groesserer Position;
- Rebalancinglogik;
- akzeptabler Rueckgang und Verhalten im Crash;
- ethische oder religioese Anlagegrenzen;
- welche Fakten Alfreds Meinung aendern sollen.

### Block E – Coachingvertrag

- wie direkt Alfred widersprechen soll;
- wann er nur analysiert und wann er eine klare Empfehlung ausspricht;
- gewuenschte Antwortlaenge;
- welche Themen proaktiv angesprochen werden duerfen;
- welche Entscheidungen immer einen Gegenargument- oder Stressfalltest
  bekommen.

### Block F – Bestaetigung

Alfred beziehungsweise der Betreiber erstellt aus den Antworten einen
kompakten Entwurf. Erst nach ausdruecklicher Bestaetigung wird er in `USER.md`
und gegebenenfalls `MEMORY.md` uebernommen. Unklare oder widerspruechliche
Angaben bleiben als offene Fragen markiert, nicht als Fakten.

## 5. Memory-Regel

Ein Gespraech ist kein automatisches Training. Alfred darf aus einer Aussage
einen Erinnerungsvorschlag formulieren, aber er wird erst nach Bestaetigung
dauerhaft. Jede Erinnerung benoetigt:

- Aussage;
- Geltungsbereich: Nutzer, Ehefrau oder gemeinsam;
- Quelle und Bestaetigungsdatum;
- Vertraulichkeitsstufe;
- naechsten Prueftermin;
- Korrektur- oder Loeschmoeglichkeit.

Zugangsdaten, TANs, vollstaendige Kontonummern, einzelne Buchungen und
unnoetige Kopien von Snapshots werden nie Memory.

## 6. Erste Gespraechsrunde

Fuer den Start reichen acht Antworten:

1. Welche drei finanziellen Ziele haben aktuell hoechste Prioritaet?
2. Welche davon sind gemeinsam mit der Ehefrau und welche individuell?
3. Wie organisiert ihr Finanzen heute: gemeinsam, getrennt oder gemischt?
4. Welche Liquiditaetsreserve soll unangetastet bleiben?
5. Welchen Zweck und Zeithorizont hat das aktuelle Portfolio?
6. Welchen zwischenzeitlichen Rueckgang koenntest du finanziell und emotional
   tragen, ohne die Strategie zu brechen?
7. Welche festen Grenzen gelten, etwa ethisch, religioes, steuerlich oder bei
   bestimmten Anlageklassen?
8. Wie direkt und wie proaktiv soll Alfred im Alltag sein?

Nach dieser Runde wird ein erster Kontextentwurf erstellt. Zielbetraege,
Zeitachsen, Portfoliothesen und Informationen ueber die Ehefrau werden danach
in kleinen Bloecken praezisiert und jeweils bestaetigt.

Der aktuelle Entwurf liegt in `docs/alfred-user-context-entwurf.md`. Er ist
ausdruecklich noch nicht in Alfreds produktives Nutzerprofil uebernommen.

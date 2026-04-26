# BudgetBuddy

Private Finanz-App als Nachfolger des bisherigen Excel-Budgetplaners.

Aktueller Stand: `FIN-001` Grundgeruest mit Next.js + TypeScript + vorbereiteter SQLite-Anbindung.

## Voraussetzungen

- Node.js 22+
- npm 10+

## Lokale Entwicklung starten

```bash
npm install
npm run dev
```

Danach im Browser oeffnen: [http://localhost:3000](http://localhost:3000)

## Wichtige Befehle

```bash
npm run dev         # Entwicklungsserver
npm run build       # Produktionsbuild
npm run start       # Produktionsserver
npm run lint        # ESLint ausfuehren
npm run test        # Vitest Testlauf
npm run test:watch  # Vitest Watch Mode
```

## Projektstruktur (FIN-001)

```text
app/                 Next.js App Router UI
app/api/health/      einfache Health-Route inkl. SQLite-Check
src/db/              SQLite-Konfiguration und Basis-Client
tests/               Basis-Tests mit Vitest
docs/                Produkt-, Fach- und Workflow-Dokumentation
```

## SQLite-Konfiguration

Standardpfad fuer die lokale SQLite-Datei:

`data/budgetbuddy.db`

Optional kann ein eigener Pfad gesetzt werden:

```bash
export BUDGETBUDDY_DB_PATH=/absoluter/pfad/budgetbuddy.db
```

Die Basisinitialisierung erfolgt in:

- `src/db/client.ts`
- `src/db/schema.ts`

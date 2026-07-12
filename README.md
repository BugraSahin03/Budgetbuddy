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
npm run migrate:issues -- --dry-run --repo BugraSahin03/Budgetbuddy --source docs/backlog.md
```

## GitHub-Issue-Migration

```bash
# 1) Migration pruefen
npm run migrate:issues -- --dry-run --repo BugraSahin03/Budgetbuddy --source docs/backlog.md

# 2) Migration ausfuehren (benoetigt GITHUB_TOKEN)
npm run migrate:issues -- --execute --repo BugraSahin03/Budgetbuddy --source docs/backlog.md

# 3) Ergebnis verifizieren (benoetigt GITHUB_TOKEN)
npm run migrate:issues -- --verify --repo BugraSahin03/Budgetbuddy --source docs/backlog.md
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

## Projekt-Dokumentation

- [Projekt-Briefing fuer Codex-Instanzen](docs/project-briefing.md)
- [Produktplan](docs/product-plan.md)
- [Fachliches Datenmodell](docs/domain-model.md)
- [Import- und Banknotizen](docs/import-and-bank-notes.md)
- [Decision Log und Erkenntnisse](docs/decision-log.md)
- [Alfred – eigenständiger Finanzcoach und ehrlicher Sparringspartner](docs/alfred-finanzcoach-konzept.md)
- [Backlog-Archiv (historisch, read-only)](docs/backlog.md)
- [Arbeitsweise fuer parallele Codex-Instanzen](docs/codex-workflow.md)
- [Parallel Development Workflow](docs/parallel-development.md)
- [Review-Workflow](docs/review-workflow.md)
- [Prompt-Vorlagen fuer Codex-Instanzen](docs/prompts.md)
- [ADR 0001: Tech Stack](docs/adr/0001-tech-stack.md)
- [ADR 0002: Kategorien, Sonderbudgets und Bargeld trennen](docs/adr/0002-domain-separation.md)
- [BudgetBuddy Produktionsdienst](docs/production-app-service.md)
- [BudgetBuddy Produktiv-Runbook](docs/production-runbook.md)

## Einstieg fuer neue Codex-Instanzen

Neue Instanzen sollten zuerst `docs/project-briefing.md` lesen. Danach je nach Aufgabe GitHub Issues (statt `docs/backlog.md`), `docs/codex-workflow.md`, `docs/parallel-development.md`, `docs/domain-model.md`, `docs/import-and-bank-notes.md`, `docs/review-workflow.md` und `docs/decision-log.md`.

Arbeitsstandard: Der Hauptordner bleibt auf `main`. Jede produktive Aenderung startet von aktuellem `main` in einem eigenen Ticket-Worktree wie `../Budgetbuddy-issue-<nr>` und einem Branch im Schema `issue/<nr>-fin-<slug>`.

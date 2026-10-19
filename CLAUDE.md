# CLAUDE.md

Lokale Finanz- & Portfolio-App (Einzelnutzer, ohne Login). UI-Texte und Kommentare auf Deutsch, Beträge in Euro.

## Stack
Next.js 16.4 (App Router, **Cache Components + Partial Prefetching aktiv**) · React 19.3 · TypeScript · Tailwind 4 · shadcn/ui (Radix, Style `radix-nova`, `cn` aus dem Paket `cn`) · Prisma 7.10 + SQLite (`better-sqlite3`-Adapter) · zod 4 · Recharts 3 · yahoo-finance2 4

## Befehle
```bash
npm run dev            # http://localhost:3000
npm run typecheck      # next typegen && tsc --noEmit
npm run lint
npm run build
npm run db:migrate     # prisma migrate dev  (danach: npm run db:generate)
npm run db:seed        # Kategorien + Setting(id=1), idempotent
```
Nach jeder Änderung: `typecheck`, `lint` und `build` ausführen; alle drei müssen grün sein.

## Architektur
- `src/app/<route>/page.tsx` – statische Hülle + `<Suspense>` um eine async View-Komponente
- `src/app/actions/*.ts` – Server Actions (`"use server"`), Rückgabe immer `ActionState` aus `src/lib/action-state.ts`
- `src/lib/data/*.ts` – lesende DB-Zugriffe (`server-only`)
- `src/lib/validations/*.ts` – zod-Schemas für FormData
- `src/lib/quotes.ts` – Yahoo-Kurse mit 6-h-Cache in `StockQuoteCache`, Wechselkurse als `USDEUR=X`
- `src/generated/prisma` – generierter Client (gitignored), Import: `@/generated/prisma/client`
- Config: `prisma.config.ts` (Prisma 7, kein `url` im Schema), DB: `prisma/dev.db`

## Regeln, die nicht offensichtlich sind
- **Jede DB-Lesefunktion ruft zuerst `await connection()` auf** und läuft in `<Suspense>`. Sonst rendert Next.js die synchronen SQLite-Abfragen schon beim Build vor und friert die Daten ein. Gleiches gilt für `new Date()`: Vor dem Aufruf muss `connection()` laufen.
- **Geld = Integer in Cent.** Umrechnung nur an den Rändern: `parseEuroToCents` / `formatCents` / `centsToInput` (`src/lib/money.ts`).
- **Datum = UTC-Mitternacht des Kalendertags.** Formatieren und Monatsgrenzen über `src/lib/dates.ts` (`timeZone: "UTC"`), niemals mit lokalem `toLocaleDateString`.
- Formularfelder **kontrolliert** halten, weil React-Form-Actions das Formular sonst zurücksetzen und Eingaben bei Validierungsfehlern verloren gehen. Erfolg/Fehler direkt im Action-Wrapper von `useActionState` behandeln (Toast), nicht in `useEffect`.
- Nach Mutationen `revalidatePath("/", "layout")`.
- Abo-Buchungen: `@@unique([subscriptionId, date])` verhindert Doppelbuchungen. `billingDay` = Tag von `startDate`.
- Kurse: Pence-Notierungen (`GBp`) werden in GBP umgerechnet (÷100). Während der Handelszeit gilt `regularMarketPreviousClose` als Schlusskurs.
- Server Actions haben **keine Auth-Prüfung** (nur localhost). Vor einem Deployment muss jede Action eine bekommen.

## Diagramme
- Palette `--chart-1` … `--chart-6` in `globals.css` (fester Reihenfolge, eigene Dark-Stufen, mit dataviz-Validator geprüft), dazu `--chart-other` (grau, „Weitere“) und `--chart-gain`/`--chart-loss` (divergierend). Im Cashflow-Diagramm bedeutet 1 = Einnahmen, 2 = Ausgaben.
- Kategoriale Farben immer über `toSegments()`/`rankIds()` aus `src/lib/chart-palette.ts`: maximal 5 Farben, der Rest wird zu „Weitere“, nie zyklisch erweitern. Auf dem Dashboard nutzen Ring- und Verlaufsdiagramm dieselbe `categoryOrder`.
- Drei helle Slots haben im Light Mode weniger als 3:1 Kontrast. Deshalb zeigt jedes Diagramm Werte als Text (Legende mit Beträgen) oder bietet eine Tabellenansicht.
- Bausteine in `src/components/charts/`: `DonutChart` (Werte in Cent), `StackedMonthChart`, `DailySpendingChart`, `ProportionBar`, `GainLossBars`. Große Kennzahlen ohne `tabular-nums`.
- `StatCard` mit `tone` (getöntes Icon-Plättchen, rein dekorativ) und `HeroStatCard` mit Verlauf.
- Demo-Daten: `npm run db:demo` / `npm run db:demo:clear` (gekennzeichnet mit `[Demo]`).

## Umgebung (Windows)
- **npm 11 blockiert Install-Skripte.** Neue Pakete mit nativen oder Post-Install-Skripten einzeln freigeben: `npm approve-scripts <pkg>` (landet in `allowScripts` in `package.json`).
- Die globale `~/.npmrc` enthält `allow-scripts`. Das bricht CLIs, die intern `npm install` aufrufen (z. B. `npx shadcn add`). Workaround nur für den einen Befehl: `$env:npm_config_userconfig = "<leere Datei>"`. Die globale Datei nicht ändern.
- Paketversionen exakt pinnen (`--save-exact`), nur Releases, die mindestens 2 Wochen alt sind. Prisma `latest` zeigt auf einen 8.0-RC, deshalb bei 7.10.x bleiben.
- PowerShell 5.1 entfernt Anführungszeichen in JSON-Argumenten für native Programme. Tests mit JSON-Payloads deshalb als Node-Skript schreiben, nicht inline per `curl`.
- Das Projekt liegt in OneDrive. Bei Dateisperren oder langsamen Builds liegt die Ursache oft dort.

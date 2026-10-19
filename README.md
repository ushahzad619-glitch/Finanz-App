# Finanzen – lokale Finanz- & Portfolio-App

Next.js 16 (App Router, Cache Components) · Prisma 7 + SQLite · shadcn/ui · Recharts · yahoo-finance2

## Start

```bash
npm install          # erzeugt automatisch den Prisma-Client (postinstall)
npm run db:migrate   # legt prisma/dev.db an bzw. wendet Migrationen an
npm run db:seed      # Standardkategorien + Einstellungen
npm run dev          # http://localhost:3000
```

## Funktionen

| Seite | Inhalt |
|---|---|
| `/` Dashboard | Gesamtvermögen (Cash + Depot), Cashflow der letzten 12 Monate, Ausgaben nach Kategorie, Fixkosten, letzte Buchungen, Startguthaben |
| `/transactions` | Einnahmen/Ausgaben erfassen, bearbeiten, löschen; Filter nach Monat und Kategorie |
| `/subscriptions` | Abos & Fixkosten (monatlich/jährlich), Kosten pro Monat/Jahr, nächste Fälligkeiten, fällige Abos eines Monats per Klick buchen (ohne Doppelbuchung) |
| `/portfolio` | Depotpositionen per Ticker (z. B. `AAPL`, `VWCE.DE`, `VOD.L`), Tagesschlusskurse von Yahoo Finance, Umrechnung in EUR, Gewinn/Verlust |

## Wichtige Konventionen

- **Geldbeträge** werden als Integer in **Cent** gespeichert (`src/lib/money.ts`).
- **Datumswerte** sind UTC-Kalendertage (`src/lib/dates.ts`).
- **Kurse** werden 6 Stunden in `StockQuoteCache` gehalten (`src/lib/quotes.ts`). Wechselkurse liegen dort als `USDEUR=X` usw. Pence-Notierungen (`GBp`) werden in GBP umgerechnet.
- **Cache Components:** Alle DB-Lesefunktionen rufen `connection()` auf und laufen in `<Suspense>`. Sonst würde Next.js die synchronen SQLite-Abfragen schon beim Build einfrieren.
- **Kein Login:** Die App ist für den lokalen Einzelbetrieb gedacht. Vor einem Betrieb außerhalb von `localhost` braucht jede Server Action eine Auth-Prüfung.

## Skripte

`npm run typecheck` · `npm run lint` · `npm run build` · `npm run db:studio`

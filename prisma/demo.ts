// Demo-Daten zum Ausprobieren der Diagramme.
//   npm run db:demo          → legt Beispieldaten der letzten 6 Monate an
//   npm run db:demo:clear    → entfernt NUR die Demo-Daten wieder
// Kennzeichnung: Buchungen/Abos mit Notiz "[Demo]", Positionen über die Ticker-Liste unten.
import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! }),
});

const TAG = "[Demo]";
const DEMO_TICKERS = ["VWCE.DE", "AAPL", "MSFT", "SAP.DE"];

async function clear() {
  const t = await prisma.transaction.deleteMany({ where: { note: { startsWith: TAG } } });
  const s = await prisma.subscription.deleteMany({ where: { note: { startsWith: TAG } } });
  const p = await prisma.portfolioPosition.deleteMany({ where: { ticker: { in: DEMO_TICKERS }, name: { endsWith: TAG } } });
  console.log(`✔ Demo-Daten entfernt: ${t.count} Buchungen, ${s.count} Abos, ${p.count} Positionen`);
}

function day(monthsAgo: number, d: number) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() - monthsAgo;
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const today = monthsAgo === 0 ? now.getDate() : last;
  return new Date(Date.UTC(y, m, Math.min(d, last, today)));
}

// Einfacher deterministischer Zufall, damit jeder Lauf gleich aussieht
let seed = 42;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const vary = (base: number, pct = 0.25) => Math.round(base * (1 - pct + rand() * pct * 2));

async function create() {
  if (await prisma.transaction.count({ where: { note: { startsWith: TAG } } })) {
    console.log("Demo-Daten existieren bereits – erst `npm run db:demo:clear` ausführen.");
    return;
  }
  const cats = Object.fromEntries((await prisma.category.findMany()).map((c) => [c.name, c.id]));
  const tx: { amount: number; type: "INCOME" | "EXPENSE"; date: Date; categoryId: string; note: string }[] = [];
  const add = (cat: string, type: "INCOME" | "EXPENSE", amount: number, date: Date, note: string) =>
    tx.push({ amount, type, date, categoryId: cats[cat], note: `${TAG} ${note}` });

  for (let mAgo = 5; mAgo >= 0; mAgo--) {
    add("Gehalt", "INCOME", 342000, day(mAgo, 1), "Gehalt");
    if (mAgo % 2 === 0) add("Nebeneinkommen", "INCOME", vary(35000), day(mAgo, 20), "Freelance");
    if (mAgo === 3) add("Dividenden", "INCOME", 4820, day(mAgo, 15), "Dividende");
    add("Miete", "EXPENSE", 115000, day(mAgo, 1), "Miete");
    add("Nebenkosten", "EXPENSE", vary(18000, 0.1), day(mAgo, 3), "Strom & Gas");
    add("Versicherungen", "EXPENSE", 8900, day(mAgo, 5), "Versicherungen");
    for (const d of [3, 9, 16, 23, 28]) add("Supermarkt", "EXPENSE", vary(7800), day(mAgo, d), "Einkauf");
    for (const d of [6, 14, 21]) add("Restaurants", "EXPENSE", vary(4200, 0.5), day(mAgo, d), "Essen gehen");
    add("Transport", "EXPENSE", 4900, day(mAgo, 2), "Deutschlandticket");
    add("Shopping", "EXPENSE", vary(mAgo === 1 ? 32000 : 9000, 0.6), day(mAgo, 18), "Shopping");
    add("Freizeit", "EXPENSE", vary(6500, 0.5), day(mAgo, 12), "Freizeit");
    if (mAgo === 2) add("Gesundheit", "EXPENSE", 6000, day(mAgo, 8), "Zahnreinigung");
    add("Abonnements", "EXPENSE", 1399, day(mAgo, 15), "Netflix");
    add("Abonnements", "EXPENSE", 1099, day(mAgo, 15), "Spotify");
  }
  await prisma.transaction.createMany({ data: tx });

  await prisma.subscription.createMany({
    data: [
      { title: "Netflix", amount: 1399, interval: "MONTHLY", startDate: day(6, 15), billingDay: 15, categoryId: cats["Abonnements"], note: TAG },
      { title: "Spotify", amount: 1099, interval: "MONTHLY", startDate: day(6, 15), billingDay: 15, categoryId: cats["Abonnements"], note: TAG },
      { title: "Miete", amount: 115000, interval: "MONTHLY", startDate: day(6, 1), billingDay: 1, categoryId: cats["Miete"], note: TAG },
      { title: "Haftpflicht", amount: 6500, interval: "YEARLY", startDate: day(4, 10), billingDay: 10, categoryId: cats["Versicherungen"], note: TAG },
      { title: "Fitnessstudio", amount: 2990, interval: "MONTHLY", startDate: day(6, 1), billingDay: 1, categoryId: cats["Freizeit"], note: TAG },
    ],
  });

  const positions = [
    { ticker: "VWCE.DE", shares: 42, buyInPrice: 112.4 },
    { ticker: "AAPL", shares: 8, buyInPrice: 185 },
    { ticker: "MSFT", shares: 5, buyInPrice: 410 },
    { ticker: "SAP.DE", shares: 12, buyInPrice: 245 },
  ];
  for (const p of positions) {
    if (await prisma.portfolioPosition.findUnique({ where: { ticker: p.ticker } })) continue;
    await prisma.portfolioPosition.create({ data: { ...p, name: `${p.ticker} ${TAG}` } });
  }
  await prisma.setting.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });

  console.log(`✔ Demo-Daten angelegt: ${tx.length} Buchungen, 5 Abos, ${positions.length} Positionen`);
  console.log("  Entfernen mit: npm run db:demo:clear");
}

(process.argv.includes("--clear") ? clear() : create())
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

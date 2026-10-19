import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient, CategoryType } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! }),
});

type SeedCategory = {
  name: string;
  type: CategoryType;
  color: string;
  icon: string;
  isSubscription?: boolean;
};

const categories: SeedCategory[] = [
  // Ausgaben
  { name: "Miete", type: "EXPENSE", color: "#ef4444", icon: "house" },
  { name: "Nebenkosten", type: "EXPENSE", color: "#f97316", icon: "zap" },
  { name: "Supermarkt", type: "EXPENSE", color: "#22c55e", icon: "shopping-cart" },
  { name: "Restaurants", type: "EXPENSE", color: "#eab308", icon: "utensils" },
  { name: "Shopping", type: "EXPENSE", color: "#ec4899", icon: "shopping-bag" },
  { name: "Transport", type: "EXPENSE", color: "#3b82f6", icon: "car" },
  { name: "Gesundheit", type: "EXPENSE", color: "#14b8a6", icon: "heart-pulse" },
  { name: "Freizeit", type: "EXPENSE", color: "#a855f7", icon: "gamepad-2" },
  { name: "Versicherungen", type: "EXPENSE", color: "#6366f1", icon: "shield" },
  { name: "Abonnements", type: "EXPENSE", color: "#8b5cf6", icon: "repeat", isSubscription: true },
  { name: "Sonstiges", type: "EXPENSE", color: "#64748b", icon: "circle-ellipsis" },
  // Einnahmen
  { name: "Gehalt", type: "INCOME", color: "#16a34a", icon: "briefcase" },
  { name: "Nebeneinkommen", type: "INCOME", color: "#0ea5e9", icon: "hand-coins" },
  { name: "Dividenden", type: "INCOME", color: "#10b981", icon: "trending-up" },
  { name: "Sonstige Einnahmen", type: "INCOME", color: "#84cc16", icon: "piggy-bank" },
];

async function main() {
  for (const { isSubscription = false, ...c } of categories) {
    await prisma.category.upsert({
      where: { name: c.name },
      update: { ...c, isSubscription },
      create: { ...c, isSubscription },
    });
  }
  await prisma.setting.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
  const count = await prisma.category.count();
  console.log(`✔ Seed abgeschlossen: ${count} Kategorien`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

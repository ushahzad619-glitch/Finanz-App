import "server-only";
import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { monthRange } from "@/lib/dates";

// Hinweis Cache Components: better-sqlite3 arbeitet synchron, Next.js würde solche
// Abfragen sonst schon beim Build vorrendern. `connection()` erzwingt Request-Time,
// damit Finanzdaten immer aktuell sind. Aufrufer müssen in <Suspense> liegen.

export type CategoryOption = {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
  color: string;
  icon: string;
};

export async function getCategories(): Promise<CategoryOption[]> {
  await connection();
  return prisma.category.findMany({
    select: { id: true, name: true, type: true, color: true, icon: true },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });
}

export async function getTransactions({
  month,
  categoryId,
}: {
  month: string;
  categoryId?: string;
}) {
  await connection();
  const { start, end } = monthRange(month);
  return prisma.transaction.findMany({
    where: {
      date: { gte: start, lt: end },
      ...(categoryId ? { categoryId } : {}),
    },
    include: {
      category: { select: { id: true, name: true, type: true, color: true, icon: true } },
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });
}

export type TransactionWithCategory = Awaited<ReturnType<typeof getTransactions>>[number];

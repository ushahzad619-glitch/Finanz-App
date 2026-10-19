import "server-only";
import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { monthRange } from "@/lib/dates";

/** Alle Abos inkl. Kategorie und der bereits erzeugten Buchungen im Monat `month`. */
export async function getSubscriptions(month: string) {
  await connection();
  const { start, end } = monthRange(month);
  return prisma.subscription.findMany({
    include: {
      category: { select: { id: true, name: true, type: true, color: true, icon: true } },
      transactions: { where: { date: { gte: start, lt: end } }, select: { id: true, date: true } },
    },
    orderBy: [{ isActive: "desc" }, { title: "asc" }],
  });
}

export type SubscriptionWithDetails = Awaited<ReturnType<typeof getSubscriptions>>[number];

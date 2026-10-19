import "server-only";
import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentMonth, monthRange, shiftMonth } from "@/lib/dates";
import { monthlyCost } from "@/lib/subscriptions";
import { getPortfolioValuation } from "@/lib/data/portfolio";

export type CashflowPoint = { month: string; income: number; expense: number }; // Cent

export async function getDashboardData() {
  await connection();
  const month = currentMonth();
  const firstMonth = shiftMonth(month, -11);
  const { start: historyStart } = monthRange(firstMonth);
  const { start: monthStart, end: monthEnd } = monthRange(month);

  const [setting, totals, history, expenseByCategory, categories, subscriptions, recent, portfolio] =
    await Promise.all([
      prisma.setting.findUnique({ where: { id: 1 } }),
      prisma.transaction.groupBy({ by: ["type"], _sum: { amount: true } }),
      prisma.transaction.findMany({
        where: { date: { gte: historyStart, lt: monthEnd } },
        select: { amount: true, type: true, date: true, categoryId: true },
      }),
      prisma.transaction.groupBy({
        by: ["categoryId"],
        where: { type: "EXPENSE", date: { gte: monthStart, lt: monthEnd } },
        _sum: { amount: true },
      }),
      prisma.category.findMany({ select: { id: true, name: true, icon: true, color: true } }),
      prisma.subscription.findMany({ where: { isActive: true }, select: { amount: true, interval: true } }),
      prisma.transaction.findMany({
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        take: 6,
        include: { category: { select: { name: true, icon: true, color: true } } },
      }),
      getPortfolioValuation(),
    ]);

  const sumOf = (type: "INCOME" | "EXPENSE") => totals.find((t) => t.type === type)?._sum.amount ?? 0;
  const openingBalance = setting?.openingBalance ?? 0;
  const cash = openingBalance + sumOf("INCOME") - sumOf("EXPENSE");
  const depotCents = Math.round(portfolio.totalValueEur * 100);

  // 12 Monate lückenlos, auch ohne Buchungen
  const cashflow: CashflowPoint[] = Array.from({ length: 12 }, (_, i) => ({
    month: shiftMonth(firstMonth, i),
    income: 0,
    expense: 0,
  }));
  const index = new Map(cashflow.map((p, i) => [p.month, i]));
  for (const t of history) {
    const key = t.date.toISOString().slice(0, 7);
    const i = index.get(key);
    if (i === undefined) continue;
    if (t.type === "INCOME") cashflow[i].income += t.amount;
    else cashflow[i].expense += t.amount;
  }
  const thisMonth = cashflow[cashflow.length - 1];

  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  const expensesByCategory = expenseByCategory
    .map((row) => {
      const c = categoryMap.get(row.categoryId);
      return {
        id: row.categoryId,
        name: c?.name ?? "Unbekannt",
        icon: c?.icon,
        color: c?.color,
        value: row._sum.amount ?? 0,
      };
    })
    .filter((x) => x.value > 0)
    .sort((a, b) => b.value - a.value);

  // Ausgaben-Entwicklung der letzten 6 Monate je Kategorie
  const trendMonths = cashflow.slice(-6).map((p) => p.month);
  const trendTotals = new Map<string, number>();
  const trendByMonth = new Map<string, Map<string, number>>(trendMonths.map((m) => [m, new Map()]));
  for (const t of history) {
    if (t.type !== "EXPENSE") continue;
    const perCat = trendByMonth.get(t.date.toISOString().slice(0, 7));
    if (!perCat) continue;
    perCat.set(t.categoryId, (perCat.get(t.categoryId) ?? 0) + t.amount);
    trendTotals.set(t.categoryId, (trendTotals.get(t.categoryId) ?? 0) + t.amount);
  }
  // Farbreihenfolge = Rang über 6 Monate → gleiche Farbe je Kategorie in allen Dashboard-Diagrammen
  const categoryOrder = [...trendTotals.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
  for (const c of expensesByCategory) if (!categoryOrder.includes(c.id)) categoryOrder.push(c.id);

  const expenseTrend = trendMonths.map((month) => ({
    month,
    perCategory: Object.fromEntries(trendByMonth.get(month)!),
  }));
  const categoryNames = Object.fromEntries(
    categories.map((c) => [c.id, { name: c.name, icon: c.icon }]),
  );

  const savingsRate = thisMonth.income > 0 ? (thisMonth.income - thisMonth.expense) / thisMonth.income : null;
  const avgExpense6m = Math.round(cashflow.slice(-6).reduce((s, p) => s + p.expense, 0) / 6);

  return {
    month,
    openingBalance,
    cash,
    depotCents,
    netWorth: cash + depotCents,
    portfolio,
    cashflow,
    thisMonth,
    expensesByCategory,
    expenseTrend,
    categoryOrder,
    categoryNames,
    savingsRate,
    avgExpense6m,
    fixedCostsMonthly: subscriptions.reduce((s, sub) => s + monthlyCost(sub), 0),
    recent,
  };
}

import { Suspense } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarSync,
  ChartCandlestick,
  Landmark,
  PiggyBank,
  Receipt,
  Scale,
  Sprout,
} from "lucide-react";
import { cn } from "cn";
import { getDashboardData } from "@/lib/data/dashboard";
import { formatDay, formatMonthLabel } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import { formatPercent } from "@/lib/numbers";
import { OTHER_COLOR, OTHER_ID, SLOT_COLORS, toSegments } from "@/lib/chart-palette";
import { PageHeader } from "@/components/page-header";
import { HeroStatCard, StatCard } from "@/components/stat-card";
import { CategoryBadge } from "@/components/category-badge";
import { CashflowChart } from "@/components/dashboard/cashflow-chart";
import { OpeningBalanceDialog } from "@/components/dashboard/opening-balance-dialog";
import { DonutChart } from "@/components/charts/donut-chart";
import { ProportionBar } from "@/components/charts/proportion-bar";
import { StackedMonthChart, type StackRow, type StackSeries } from "@/components/charts/stacked-month-chart";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Gesamtvermögen, Cashflow und Ausgaben im Überblick." />
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardView />
      </Suspense>
    </div>
  );
}

const signed = (cents: number) => `${cents > 0 ? "+" : ""}${formatCents(cents)}`;

async function DashboardView() {
  const d = await getDashboardData();
  const monthLabel = formatMonthLabel(d.month);
  const balance = d.thisMonth.income - d.thisMonth.expense;

  // Kategorie-Farben: gleiche Zuordnung für Ring- und Verlaufsdiagramm
  const slotIds = d.categoryOrder.slice(0, 5);
  const donutSegments = toSegments(
    d.expensesByCategory.map((c) => ({ id: c.id, name: c.name, value: c.value, icon: c.icon })),
    d.categoryOrder,
  );
  const hasOther = d.categoryOrder.length > slotIds.length;
  const trendSeries: StackSeries[] = [
    ...slotIds.map((id, i) => ({ key: id, label: d.categoryNames[id]?.name ?? "Unbekannt", color: SLOT_COLORS[i] })),
    ...(hasOther ? [{ key: OTHER_ID, label: "Weitere", color: OTHER_COLOR }] : []),
  ];
  const trendRows: StackRow[] = d.expenseTrend.map(({ month, perCategory }) => {
    const row: StackRow = { month };
    let other = 0;
    for (const [id, value] of Object.entries(perCategory)) {
      if (slotIds.includes(id)) row[id] = value;
      else other += value;
    }
    for (const id of slotIds) row[id] ??= 0;
    if (hasOther) row[OTHER_ID] = other;
    return row;
  });

  return (
    <>
      <div className="flex justify-end">
        <OpeningBalanceDialog openingBalance={d.openingBalance} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <HeroStatCard
            title="Gesamtvermögen"
            value={formatCents(d.netWorth)}
            icon={Landmark}
            hint={`Cash ${formatCents(d.cash)} · Depot ${formatCents(d.depotCents)}`}
          />
        </div>
        <Card className="gap-4">
          <CardHeader>
            <CardTitle>Vermögensaufteilung</CardTitle>
          </CardHeader>
          <CardContent>
            <ProportionBar
              parts={[
                { id: "cash", label: "Cash", value: d.cash, color: "var(--primary)" },
                { id: "depot", label: "Depot", value: d.depotCents, color: "var(--chart-3)" },
              ]}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Cash"
          value={formatCents(d.cash)}
          icon={PiggyBank}
          tone="blue"
          hint={`inkl. Startguthaben ${formatCents(d.openingBalance)}`}
          valueClassName={d.cash < 0 ? "text-destructive" : undefined}
        />
        <StatCard
          title="Depotwert"
          value={formatCents(d.depotCents)}
          icon={ChartCandlestick}
          tone="aqua"
          hint={
            d.portfolio.positions.length === 0
              ? "Noch keine Positionen"
              : d.portfolio.totalCostEur > 0
                ? `G/V ${signed(Math.round(d.portfolio.totalGainEur * 100))}`
                : `${d.portfolio.positions.length} Position(en)`
          }
        />
        <StatCard
          title={`Cashflow ${monthLabel}`}
          value={signed(balance)}
          icon={Scale}
          tone="orange"
          hint={`${formatCents(d.thisMonth.income)} ein · ${formatCents(d.thisMonth.expense)} aus`}
          valueClassName={balance < 0 ? "text-destructive" : undefined}
        />
        <StatCard
          title="Sparquote"
          value={d.savingsRate !== null ? formatPercent(d.savingsRate) : "–"}
          icon={Sprout}
          tone="pink"
          hint={d.savingsRate !== null ? "Anteil der Einnahmen, der übrig bleibt" : "Noch keine Einnahmen diesen Monat"}
          valueClassName={d.savingsRate !== null && d.savingsRate < 0 ? "text-destructive" : undefined}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Monatlicher Cashflow</CardTitle>
          <CardDescription>Einnahmen und Ausgaben der letzten 12 Monate</CardDescription>
        </CardHeader>
        <CardContent>
          <CashflowChart data={d.cashflow} />
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ausgaben nach Kategorie</CardTitle>
            <CardDescription>{monthLabel}</CardDescription>
            <CardAction>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/transactions">
                  Details <ArrowRight />
                </Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <DonutChart segments={donutSegments} centerLabel="Ausgaben" emptyText={`Noch keine Ausgaben im ${monthLabel}.`} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Ausgaben-Entwicklung</CardTitle>
            <CardDescription>Letzte 6 Monate nach Kategorie</CardDescription>
          </CardHeader>
          <CardContent>
            <StackedMonthChart
              data={trendRows}
              series={trendSeries}
              ariaLabel="Ausgaben der letzten 6 Monate nach Kategorie"
              emptyText="Noch keine Ausgaben in den letzten 6 Monaten."
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="grid gap-4">
          <StatCard
            title="Fixkosten pro Monat"
            value={formatCents(d.fixedCostsMonthly)}
            icon={CalendarSync}
            tone="violet"
            hint={
              <Link href="/subscriptions" className="underline-offset-4 hover:underline">
                Aktive Abos verwalten →
              </Link>
            }
          />
          <StatCard
            title="Ø Ausgaben (6 Monate)"
            value={formatCents(d.avgExpense6m)}
            icon={Receipt}
            tone="amber"
            hint="Durchschnitt pro Monat"
          />
        </div>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Letzte Buchungen</CardTitle>
            <CardAction>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/transactions">
                  Alle <ArrowRight />
                </Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {d.recent.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">Noch keine Buchungen.</p>
            ) : (
              <ul className="divide-y">
                {d.recent.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <CategoryBadge {...t.category} />
                      <p className="ml-9 truncate text-xs text-muted-foreground">
                        {formatDay(t.date)}
                        {t.note ? ` · ${t.note}` : ""}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 text-sm font-medium tabular-nums",
                        t.type === "INCOME" && "text-emerald-700 dark:text-emerald-400",
                      )}
                    >
                      {t.type === "INCOME" ? "+" : "−"}
                      {formatCents(t.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function DashboardSkeleton() {
  return (
    <>
      <div className="flex justify-end">
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-36 lg:col-span-2" />
        <Skeleton className="h-36" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <Skeleton className="h-96" />
      <div className="grid gap-4 xl:grid-cols-2">
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>
    </>
  );
}

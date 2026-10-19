import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { ArrowDownRight, ArrowLeftRight, ArrowUpRight, Pencil, Plus, Scale } from "lucide-react";
import { cn } from "cn";
import { getCategories, getTransactions } from "@/lib/data/transactions";
import { formatDay, formatMonthLabel, monthRange, parseMonth, toDayString } from "@/lib/dates";
import { rankIds, toSegments } from "@/lib/chart-palette";
import { DailySpendingChart, type DayPoint } from "@/components/charts/daily-spending-chart";
import { DonutChart } from "@/components/charts/donut-chart";
import { formatCents } from "@/lib/money";
import { PageHeader } from "@/components/page-header";
import { CategoryBadge } from "@/components/category-badge";
import { TransactionFilters } from "@/components/transactions/transaction-filters";
import { TransactionFormDialog } from "@/components/transactions/transaction-form-dialog";
import { DeleteTransactionButton } from "@/components/transactions/delete-transaction-button";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata: Metadata = { title: "Transaktionen" };

export default function TransactionsPage({ searchParams }: PageProps<"/transactions">) {
  return (
    <div className="space-y-6">
      <PageHeader title="Transaktionen" description="Einnahmen und Ausgaben erfassen und auswerten." />
      <Suspense fallback={<TransactionsSkeleton />}>
        <TransactionsView searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function TransactionsView({ searchParams }: Pick<PageProps<"/transactions">, "searchParams">) {
  // Vor parseMonth(): der Default-Monat hängt von der aktuellen Uhrzeit ab.
  await connection();
  const params = await searchParams;
  const month = parseMonth(params.month);
  const categoryId = typeof params.category === "string" && params.category ? params.category : undefined;

  const [categories, transactions] = await Promise.all([
    getCategories(),
    getTransactions({ month, categoryId }),
  ]);

  let income = 0;
  let expense = 0;
  for (const t of transactions) {
    if (t.type === "INCOME") income += t.amount;
    else expense += t.amount;
  }
  const balance = income - expense;

  // Tagesausgaben und Ausgaben je Kategorie für die Diagramme
  const { start, end } = monthRange(month);
  const daysInMonth = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  const daily: DayPoint[] = Array.from({ length: daysInMonth }, (_, i) => ({
    day: i + 1,
    label: formatDay(new Date(start.getTime() + i * 86_400_000)),
    expense: 0,
  }));
  const perCategory = new Map<string, { id: string; name: string; icon: string; value: number }>();
  for (const t of transactions) {
    if (t.type !== "EXPENSE") continue;
    daily[t.date.getUTCDate() - 1].expense += t.amount;
    const c = perCategory.get(t.categoryId) ?? { id: t.categoryId, name: t.category.name, icon: t.category.icon, value: 0 };
    c.value += t.amount;
    perCategory.set(t.categoryId, c);
  }
  const categoryItems = [...perCategory.values()];
  const categorySegments = toSegments(categoryItems, rankIds(categoryItems));

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TransactionFilters month={month} categoryId={categoryId} categories={categories} />
        <TransactionFormDialog
          categories={categories}
          trigger={
            <Button>
              <Plus /> Neue Buchung
            </Button>
          }
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Einnahmen" value={formatCents(income)} icon={ArrowUpRight} tone="blue" />
        <StatCard title="Ausgaben" value={formatCents(expense)} icon={ArrowDownRight} tone="orange" />
        <StatCard
          title="Saldo"
          value={`${balance > 0 ? "+" : ""}${formatCents(balance)}`}
          icon={Scale}
          tone="violet"
          valueClassName={balance < 0 ? "text-destructive" : undefined}
          hint={balance < 0 ? "Mehr ausgegeben als eingenommen" : undefined}
        />
      </div>

      {expense > 0 && (
        <div className="grid gap-4 xl:grid-cols-5">
          <Card className="xl:col-span-3">
            <CardHeader>
              <CardTitle>Ausgaben pro Tag</CardTitle>
              <CardDescription>{formatMonthLabel(month)}</CardDescription>
            </CardHeader>
            <CardContent>
              <DailySpendingChart data={daily} />
            </CardContent>
          </Card>
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>Nach Kategorie</CardTitle>
              <CardDescription>Ausgaben im {formatMonthLabel(month)}</CardDescription>
            </CardHeader>
            <CardContent>
              <DonutChart segments={categorySegments} centerLabel="Ausgaben" emptyText="Keine Ausgaben." />
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="py-0">
        {transactions.length === 0 ? (
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-muted">
              <ArrowLeftRight className="size-5 text-muted-foreground" />
            </span>
            <p className="text-sm text-muted-foreground">
              Keine Buchungen im {formatMonthLabel(month)}
              {categoryId ? " für diese Kategorie" : ""}.
            </p>
          </CardContent>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-28 pl-4">Datum</TableHead>
                <TableHead>Kategorie</TableHead>
                <TableHead className="hidden md:table-cell">Notiz</TableHead>
                <TableHead className="text-right">Betrag</TableHead>
                <TableHead className="w-24 pr-4">
                  <span className="sr-only">Aktionen</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((t) => {
                const isIncome = t.type === "INCOME";
                const label = `${t.category.name} vom ${formatDay(t.date)} (${formatCents(t.amount)})`;
                return (
                  <TableRow key={t.id}>
                    <TableCell className="pl-4 tabular-nums text-muted-foreground">{formatDay(t.date)}</TableCell>
                    <TableCell>
                      <CategoryBadge {...t.category} />
                    </TableCell>
                    <TableCell className="hidden max-w-xs truncate text-muted-foreground md:table-cell">
                      {t.note ?? "–"}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-medium tabular-nums",
                        isIncome ? "text-emerald-600 dark:text-emerald-400" : "text-foreground",
                      )}
                    >
                      {isIncome ? "+" : "−"}
                      {formatCents(t.amount)}
                    </TableCell>
                    <TableCell className="pr-4">
                      <div className="flex justify-end gap-1">
                        <TransactionFormDialog
                          categories={categories}
                          transaction={{
                            id: t.id,
                            amount: t.amount,
                            type: t.type,
                            date: toDayString(t.date),
                            categoryId: t.categoryId,
                            note: t.note,
                          }}
                          trigger={
                            <Button variant="ghost" size="icon-sm" aria-label="Buchung bearbeiten">
                              <Pencil />
                            </Button>
                          }
                        />
                        <DeleteTransactionButton id={t.id} label={label} />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </>
  );
}

function TransactionsSkeleton() {
  return (
    <>
      <div className="flex justify-between gap-3">
        <Skeleton className="h-9 w-96 max-w-full" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <Skeleton className="h-80" />
    </>
  );
}

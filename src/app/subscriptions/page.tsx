import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { CalendarClock, CalendarSync, Check, Pencil, Plus, Repeat, Wallet } from "lucide-react";
import { cn } from "cn";
import { getCategories } from "@/lib/data/transactions";
import { getSubscriptions } from "@/lib/data/subscriptions";
import { currentMonth, formatDay, formatMonthLabel, todayUtc, toDayString } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import { dueDateInMonth, intervalLabel, monthlyCost, nextDueDate, yearlyCost } from "@/lib/subscriptions";
import { PageHeader } from "@/components/page-header";
import { CategoryBadge } from "@/components/category-badge";
import type { CategoryBarItem } from "@/components/category-bars";
import { DonutChart } from "@/components/charts/donut-chart";
import { rankIds, toSegments } from "@/lib/chart-palette";
import { StatCard } from "@/components/stat-card";
import { SubscriptionFormDialog } from "@/components/subscriptions/subscription-form-dialog";
import {
  DeleteSubscriptionButton,
  ToggleSubscriptionButton,
} from "@/components/subscriptions/subscription-row-actions";
import { BookSubscriptionsButton } from "@/components/subscriptions/book-subscriptions-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

export const metadata: Metadata = { title: "Abos & Fixkosten" };

export default function SubscriptionsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Abos & Fixkosten"
        description="Wiederkehrende Zahlungen und monatliche Kostenübersicht."
      />
      <Suspense fallback={<SubscriptionsSkeleton />}>
        <SubscriptionsView />
      </Suspense>
    </div>
  );
}

async function SubscriptionsView() {
  await connection(); // Fälligkeiten hängen vom heutigen Datum ab
  const month = currentMonth();
  const today = todayUtc();
  const [allCategories, subscriptions] = await Promise.all([getCategories(), getSubscriptions(month)]);
  const expenseCategories = allCategories.filter((c) => c.type === "EXPENSE");
  const defaultCategoryId = expenseCategories.find((c) => c.name === "Abonnements")?.id;

  const active = subscriptions.filter((s) => s.isActive);
  const monthlyTotal = active.reduce((sum, s) => sum + monthlyCost(s), 0);
  const yearlyTotal = active.reduce((sum, s) => sum + yearlyCost(s), 0);

  // Fälligkeiten dieses Monats und ob sie schon gebucht sind
  const dueThisMonth = active
    .map((s) => ({ sub: s, due: dueDateInMonth(s, month) }))
    .filter((x): x is { sub: (typeof active)[number]; due: Date } => x.due !== null);
  const isBooked = (s: (typeof subscriptions)[number], due: Date | null) =>
    due !== null && s.transactions.some((t) => t.date.getTime() === due.getTime());
  const openCount = dueThisMonth.filter(({ sub, due }) => !isBooked(sub, due)).length;
  const dueThisMonthTotal = dueThisMonth.reduce((sum, { sub }) => sum + sub.amount, 0);

  // Monatliche Kosten nach Kategorie
  const byCategory = new Map<string, CategoryBarItem>();
  for (const s of active) {
    const item = byCategory.get(s.categoryId) ?? { ...s.category, value: 0 };
    item.value += monthlyCost(s);
    byCategory.set(s.categoryId, item);
  }
  const categoryItems = [...byCategory.values()];
  const categorySegments = toSegments(categoryItems, rankIds(categoryItems));

  const upcoming = active
    .map((s) => ({ sub: s, next: nextDueDate(s, today) }))
    .filter((x): x is { sub: (typeof active)[number]; next: Date } => x.next !== null)
    .sort((a, b) => a.next.getTime() - b.next.getTime())
    .slice(0, 5);

  const monthLabel = formatMonthLabel(month);

  return (
    <>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <BookSubscriptionsButton month={month} monthLabel={monthLabel} openCount={openCount} />
        <SubscriptionFormDialog
          categories={expenseCategories}
          defaultCategoryId={defaultCategoryId}
          trigger={
            <Button>
              <Plus /> Neues Abo
            </Button>
          }
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Fixkosten pro Monat" value={formatCents(monthlyTotal)} icon={Wallet} tone="violet"
          hint={`${active.length} aktiv${subscriptions.length > active.length ? `, ${subscriptions.length - active.length} pausiert` : ""}`} />
        <StatCard title="Pro Jahr" value={formatCents(yearlyTotal)} icon={Repeat} tone="pink" hint="Hochgerechnet aus allen aktiven" />
        <StatCard title={`Fällig im ${monthLabel}`} value={formatCents(dueThisMonthTotal)} icon={CalendarClock} tone="amber"
          hint={`${dueThisMonth.length} Zahlung${dueThisMonth.length === 1 ? "" : "en"}, ${openCount} offen`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Monatliche Kosten nach Kategorie</CardTitle>
            <CardDescription>Jährliche Zahlungen anteilig auf 12 Monate verteilt</CardDescription>
          </CardHeader>
          <CardContent>
            <DonutChart segments={categorySegments} centerLabel="pro Monat" emptyText="Noch keine aktiven Abos." />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Nächste Fälligkeiten</CardTitle>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Nichts geplant.</p>
            ) : (
              <ul className="space-y-3">
                {upcoming.map(({ sub, next }) => (
                  <li key={sub.id} className="flex items-center justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{sub.title}</p>
                      <p className="text-muted-foreground tabular-nums">{formatDay(next)}</p>
                    </div>
                    <span className="shrink-0 tabular-nums">{formatCents(sub.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="py-0">
        {subscriptions.length === 0 ? (
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-muted">
              <CalendarSync className="size-5 text-muted-foreground" />
            </span>
            <p className="text-sm text-muted-foreground">
              Noch keine Abos. Lege z. B. Netflix, Spotify oder deine Miete an.
            </p>
          </CardContent>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Abo</TableHead>
                <TableHead className="hidden sm:table-cell">Kategorie</TableHead>
                <TableHead className="text-right">Betrag</TableHead>
                <TableHead className="hidden text-right md:table-cell">pro Monat</TableHead>
                <TableHead className="hidden lg:table-cell">Nächste Fälligkeit</TableHead>
                <TableHead className="w-28 pr-4">
                  <span className="sr-only">Aktionen</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscriptions.map((s) => {
                const next = s.isActive ? nextDueDate(s, today) : null;
                const booked = isBooked(s, dueDateInMonth(s, month));
                return (
                  <TableRow key={s.id} className={cn(!s.isActive && "text-muted-foreground")}>
                    <TableCell className="pl-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{s.title}</span>
                        {!s.isActive && <Badge variant="secondary">pausiert</Badge>}
                        {booked && (
                          <Badge variant="outline">
                            <Check /> gebucht
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <CategoryBadge {...s.category} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCents(s.amount)}
                      <span className="block text-xs text-muted-foreground">{intervalLabel[s.interval]}</span>
                    </TableCell>
                    <TableCell className="hidden text-right tabular-nums md:table-cell">
                      {formatCents(monthlyCost(s))}
                    </TableCell>
                    <TableCell className="hidden tabular-nums lg:table-cell">
                      {next ? formatDay(next) : "–"}
                    </TableCell>
                    <TableCell className="pr-4">
                      <div className="flex justify-end gap-1">
                        <SubscriptionFormDialog
                          categories={expenseCategories}
                          subscription={{
                            id: s.id,
                            title: s.title,
                            amount: s.amount,
                            interval: s.interval,
                            startDate: toDayString(s.startDate),
                            categoryId: s.categoryId,
                            isActive: s.isActive,
                            note: s.note,
                          }}
                          trigger={
                            <Button variant="ghost" size="icon-sm" aria-label="Abo bearbeiten">
                              <Pencil />
                            </Button>
                          }
                        />
                        <ToggleSubscriptionButton id={s.id} isActive={s.isActive} />
                        <DeleteSubscriptionButton id={s.id} title={s.title} />
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

function SubscriptionsSkeleton() {
  return (
    <>
      <div className="flex justify-end">
        <Skeleton className="h-9 w-64" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <Skeleton className="h-64" />
      <Skeleton className="h-64" />
    </>
  );
}

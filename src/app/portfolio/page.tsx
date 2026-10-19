import type { Metadata } from "next";
import { Suspense } from "react";
import { ChartCandlestick, CircleAlert, Coins, Pencil, Plus, TrendingUp, Wallet } from "lucide-react";
import { cn } from "cn";
import { getPortfolioValuation } from "@/lib/data/portfolio";
import { formatDay } from "@/lib/dates";
import { formatDecimal, formatMoney, formatPercent } from "@/lib/numbers";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { DonutChart } from "@/components/charts/donut-chart";
import { GainLossBars } from "@/components/charts/gain-loss-bars";
import { rankIds, toSegments } from "@/lib/chart-palette";
import { PositionFormDialog } from "@/components/portfolio/position-form-dialog";
import { DeletePositionButton, RefreshQuotesButton } from "@/components/portfolio/position-actions";
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

export const metadata: Metadata = { title: "Portfolio" };

const eur = (v: number) => formatMoney(v, "EUR");

export default function PortfolioPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Portfolio" description="Depotpositionen, bewertet zum letzten Tagesschlusskurs in Euro." />
      <Suspense fallback={<PortfolioSkeleton />}>
        <PortfolioView />
      </Suspense>
    </div>
  );
}

async function PortfolioView() {
  const v = await getPortfolioValuation();
  const gainRatio = v.totalCostEur > 0 ? v.totalGainEur / v.totalCostEur : null;

  const allocationItems = v.positions
    .filter((p) => p.valueEur !== null)
    .map((p) => ({ id: p.id, name: p.ticker, value: Math.round(p.valueEur! * 100) }));
  // Farbe folgt der Position (Rang nach Wert), Rest → "Weitere"
  const allocation = toSegments(allocationItems, rankIds(allocationItems));
  const gainItems = v.positions
    .filter((p) => p.gainEur !== null)
    .map((p) => ({ id: p.id, label: p.ticker, gainEur: p.gainEur!, ratio: p.gainRatio }))
    .sort((a, b) => b.gainEur - a.gainEur);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          {v.lastUpdated ? <>Kurse abgerufen am {formatDateTime(v.lastUpdated)}</> : "Noch keine Kurse abgerufen"}
          {v.anyStale && (
            <Badge variant="outline" className="text-amber-700 dark:text-amber-400">
              <CircleAlert /> Teilweise veraltet
            </Badge>
          )}
        </p>
        <div className="flex flex-wrap gap-2">
          <RefreshQuotesButton disabled={v.positions.length === 0} />
          <PositionFormDialog
            trigger={
              <Button>
                <Plus /> Position hinzufügen
              </Button>
            }
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Depotwert"
          value={eur(v.totalValueEur)}
          icon={Wallet}
          tone="aqua"
          hint={
            v.missingQuotes > 0
              ? `${v.missingQuotes} Position(en) ohne Kurs nicht enthalten`
              : `${v.positions.length} Position${v.positions.length === 1 ? "" : "en"}`
          }
        />
        <StatCard
          title="Einstandswert"
          value={eur(v.totalCostEur)}
          icon={Coins}
          tone="amber"
          hint="Nur Positionen mit Kaufkurs, zum aktuellen Wechselkurs"
        />
        <StatCard
          title="Gewinn / Verlust"
          value={`${v.totalGainEur > 0 ? "+" : ""}${eur(v.totalGainEur)}`}
          icon={TrendingUp}
          tone={v.totalGainEur < 0 ? "orange" : "blue"}
          valueClassName={v.totalGainEur < 0 ? "text-destructive" : undefined}
          hint={gainRatio !== null ? formatPercent(gainRatio) : "Kaufkurse eintragen für G/V"}
        />
      </div>

      {v.positions.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-muted">
              <ChartCandlestick className="size-5 text-muted-foreground" />
            </span>
            <p className="max-w-sm text-sm text-muted-foreground">
              Noch keine Positionen. Füge z. B. VWCE.DE oder AAPL hinzu – der Kurs wird automatisch abgerufen.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Aufteilung</CardTitle>
                <CardDescription>Anteil am Depotwert</CardDescription>
              </CardHeader>
              <CardContent>
                <DonutChart segments={allocation} centerLabel="Depotwert" emptyText="Keine Kurse verfügbar." />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Gewinn / Verlust je Position</CardTitle>
                <CardDescription>In Euro, nur Positionen mit Kaufkurs</CardDescription>
              </CardHeader>
              <CardContent>
                <GainLossBars items={gainItems} />
              </CardContent>
            </Card>
          </div>
          <Card className="py-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Wertpapier</TableHead>
                  <TableHead className="text-right">Anteile</TableHead>
                  <TableHead className="hidden text-right sm:table-cell">Kaufkurs</TableHead>
                  <TableHead className="hidden text-right sm:table-cell">Kurs</TableHead>
                  <TableHead className="text-right">Wert</TableHead>
                  <TableHead className="hidden text-right md:table-cell">G/V</TableHead>
                  <TableHead className="w-20 pr-4">
                    <span className="sr-only">Aktionen</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {v.positions.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="max-w-56 pl-4">
                      <p className="font-medium">{p.ticker}</p>
                      <p className="truncate text-xs text-muted-foreground">{p.name ?? "–"}</p>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatDecimal(p.shares, 6)}</TableCell>
                    <TableCell className="hidden text-right tabular-nums sm:table-cell">
                      {p.buyInPrice !== null && p.currency ? (
                        <>
                          {formatMoney(p.buyInPrice, p.currency)}
                          <span className="block text-xs text-muted-foreground">
                            gesamt {formatMoney(p.buyInPrice * p.shares, p.currency)}
                          </span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">–</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden text-right tabular-nums sm:table-cell">
                      {p.price !== null && p.currency ? formatMoney(p.price, p.currency) : "–"}
                      {p.marketTime && (
                        <span className="block text-xs text-muted-foreground">{formatDay(p.marketTime)}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {p.valueEur !== null ? eur(p.valueEur) : "–"}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "hidden text-right tabular-nums md:table-cell",
                        p.gainEur !== null && p.gainEur < 0 && "text-destructive",
                      )}
                    >
                      {p.gainEur !== null ? (
                        <>
                          {p.gainEur > 0 ? "+" : ""}
                          {eur(p.gainEur)}
                          {p.gainRatio !== null && (
                            <span className="block text-xs">{formatPercent(p.gainRatio)}</span>
                          )}
                        </>
                      ) : (
                        <span className="text-muted-foreground">–</span>
                      )}
                    </TableCell>
                    <TableCell className="pr-4">
                      <div className="flex justify-end gap-1">
                        <PositionFormDialog
                          position={{
                            id: p.id,
                            ticker: p.ticker,
                            name: p.name,
                            shares: p.shares,
                            buyInPrice: p.buyInPrice,
                            currency: p.currency,
                            price: p.price,
                          }}
                          trigger={
                            <Button variant="ghost" size="icon-sm" aria-label={`${p.ticker} bearbeiten`}>
                              <Pencil />
                            </Button>
                          }
                        />
                        <DeletePositionButton id={p.id} ticker={p.ticker} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}
    </>
  );
}

const dateTimeFormatter = new Intl.DateTimeFormat("de-DE", { dateStyle: "short", timeStyle: "short" });
function formatDateTime(d: Date) {
  return dateTimeFormatter.format(d);
}

function PortfolioSkeleton() {
  return (
    <>
      <div className="flex justify-end">
        <Skeleton className="h-9 w-80" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <Skeleton className="h-72" />
    </>
  );
}

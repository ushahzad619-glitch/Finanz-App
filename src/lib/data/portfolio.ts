import "server-only";
import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { getFxRates, getQuotes } from "@/lib/quotes";

export type ValuedPosition = {
  id: string;
  ticker: string;
  name: string | null;
  shares: number;
  buyInPrice: number | null;
  currency: string | null;
  price: number | null; // letzter Schlusskurs in Kurswährung
  marketTime: Date | null;
  valueEur: number | null;
  costEur: number | null; // Einstand zum aktuellen Wechselkurs
  gainEur: number | null;
  gainRatio: number | null;
  stale: boolean;
};

export type PortfolioValuation = {
  positions: ValuedPosition[];
  totalValueEur: number;
  totalCostEur: number; // nur Positionen mit Kaufkurs
  totalGainEur: number; // nur Positionen mit Kaufkurs
  missingQuotes: number;
  lastUpdated: Date | null;
  anyStale: boolean;
};

/**
 * Bewertet alle Depotpositionen in Euro. Kurse kommen aus dem DB-Cache und
 * werden bei Bedarf (älter als TTL, oder `force`) von Yahoo Finance nachgeladen.
 */
export async function getPortfolioValuation(options?: { force?: boolean }): Promise<PortfolioValuation> {
  await connection();
  const rows = await prisma.portfolioPosition.findMany({ orderBy: { ticker: "asc" } });
  const quotes = await getQuotes(rows.map((r) => r.ticker), options);
  const { rates, quotes: fxQuotes } = await getFxRates(
    [...quotes.values()].map((q) => q.currency),
    options,
  );

  let totalValueEur = 0;
  let totalCostEur = 0;
  let totalGainEur = 0;
  let missingQuotes = 0;
  let lastUpdated: Date | null = null;
  let anyStale = false;

  const positions = rows.map<ValuedPosition>((row) => {
    const q = quotes.get(row.ticker);
    const fx = q ? rates.get(q.currency) : undefined;
    const valueEur = q && fx !== undefined ? row.shares * q.lastClosePrice * fx : null;
    const costEur =
      row.buyInPrice != null && fx !== undefined ? row.shares * row.buyInPrice * fx : null;
    const gainEur = valueEur !== null && costEur !== null ? valueEur - costEur : null;

    if (valueEur === null) missingQuotes++;
    else totalValueEur += valueEur;
    if (costEur !== null && gainEur !== null) {
      totalCostEur += costEur;
      totalGainEur += gainEur;
    }
    if (q && (!lastUpdated || q.updatedAt > lastUpdated)) lastUpdated = q.updatedAt;
    if (q?.stale) anyStale = true;

    return {
      id: row.id,
      ticker: row.ticker,
      name: row.name ?? q?.name ?? null,
      shares: row.shares,
      buyInPrice: row.buyInPrice,
      currency: q?.currency ?? null,
      price: q?.lastClosePrice ?? null,
      marketTime: q?.marketTime ?? null,
      valueEur,
      costEur,
      gainEur,
      gainRatio: gainEur !== null && costEur ? gainEur / costEur : null,
      stale: q?.stale ?? false,
    };
  });

  for (const q of fxQuotes.values()) if (q.stale) anyStale = true;

  return { positions, totalValueEur, totalCostEur, totalGainEur, missingQuotes, lastUpdated, anyStale };
}

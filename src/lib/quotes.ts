import "server-only";
import YahooFinance from "yahoo-finance2";
import { prisma } from "@/lib/prisma";

// Tagesschlusskurse von Yahoo Finance mit Cache in der Tabelle StockQuoteCache.
// Wechselkurse werden als Pseudo-Ticker (z. B. "USDEUR=X") im selben Cache abgelegt.

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

/** Cache-Dauer: Schlusskurse ändern sich höchstens einmal pro Handelstag. */
export const QUOTE_TTL_MS = 6 * 60 * 60 * 1000;

export type CachedQuote = {
  ticker: string;
  name: string | null;
  lastClosePrice: number;
  currency: string; // normalisiert, z. B. "GBP" statt "GBp"
  marketTime: Date | null;
  updatedAt: Date;
  stale: boolean; // true, wenn ein Aktualisierungsversuch fehlgeschlagen ist
};

// Börsen notieren manche Werte in Untereinheiten (Pence, Cent, Agorot)
const MINOR_UNITS: Record<string, { currency: string; divisor: number }> = {
  GBp: { currency: "GBP", divisor: 100 },
  GBX: { currency: "GBP", divisor: 100 },
  ZAc: { currency: "ZAR", divisor: 100 },
  ILA: { currency: "ILS", divisor: 100 },
};

type YahooQuote = Awaited<ReturnType<typeof yahooFinance.quote>> extends infer Q
  ? Q extends (infer E)[]
    ? E
    : Q
  : never;

/**
 * Letzter Schlusskurs: Während des regulären Handels ist regularMarketPrice ein
 * Intraday-Kurs, dann gilt der Vortagesschluss. Außerhalb (PRE/POST/CLOSED)
 * ist regularMarketPrice der Schlusskurs der letzten Sitzung.
 */
function toCacheRow(q: NonNullable<YahooQuote>) {
  const raw =
    q.marketState === "REGULAR" && q.regularMarketPreviousClose
      ? q.regularMarketPreviousClose
      : q.regularMarketPrice ?? q.regularMarketPreviousClose;
  if (raw == null || !q.currency) return null;
  const unit = MINOR_UNITS[q.currency];
  return {
    ticker: q.symbol,
    name: q.longName ?? q.shortName ?? null,
    lastClosePrice: unit ? raw / unit.divisor : raw,
    currency: unit ? unit.currency : q.currency.toUpperCase(),
    marketTime: q.regularMarketTime ?? null,
  };
}

/** Fragt einen einzelnen Ticker live ab (ohne Cache). null = unbekannter Ticker. */
export async function lookupTicker(ticker: string) {
  const q = await yahooFinance.quote(ticker);
  return q ? toCacheRow(q) : null;
}

/**
 * Liefert Kurse für alle Ticker. Veraltete oder fehlende Einträge werden in einem
 * Sammelabruf aktualisiert; schlägt der fehl, bleiben die Cache-Werte (stale) erhalten.
 */
export async function getQuotes(
  tickers: string[],
  { force = false }: { force?: boolean } = {},
): Promise<Map<string, CachedQuote>> {
  const unique = [...new Set(tickers)];
  const result = new Map<string, CachedQuote>();
  if (unique.length === 0) return result;

  const cached = await prisma.stockQuoteCache.findMany({ where: { ticker: { in: unique } } });
  const now = Date.now();
  for (const row of cached) result.set(row.ticker, { ...row, stale: false });

  const toFetch = unique.filter((t) => {
    const row = result.get(t);
    return force || !row || now - row.updatedAt.getTime() > QUOTE_TTL_MS;
  });
  if (toFetch.length === 0) return result;

  try {
    const quotes = await yahooFinance.quote(toFetch, { return: "array" });
    const fetched = new Set<string>();
    for (const q of quotes) {
      const row = toCacheRow(q);
      if (!row) continue;
      const saved = await prisma.stockQuoteCache.upsert({
        where: { ticker: row.ticker },
        update: row,
        create: row,
      });
      result.set(saved.ticker, { ...saved, stale: false });
      fetched.add(saved.ticker);
    }
    for (const t of toFetch) {
      const row = result.get(t);
      if (row && !fetched.has(t)) result.set(t, { ...row, stale: true });
    }
  } catch (error) {
    console.error("Kursabruf fehlgeschlagen, verwende Cache:", (error as Error).message);
    for (const t of toFetch) {
      const row = result.get(t);
      if (row) result.set(t, { ...row, stale: true });
    }
  }
  return result;
}

export const fxTicker = (currency: string) => `${currency}EUR=X`;

/** Wechselkurse "1 Einheit Währung = x EUR" für alle benötigten Währungen. */
export async function getFxRates(currencies: string[], options?: { force?: boolean }) {
  const foreign = [...new Set(currencies)].filter((c) => c !== "EUR");
  const quotes = await getQuotes(foreign.map(fxTicker), options);
  const rates = new Map<string, number>([["EUR", 1]]);
  for (const c of foreign) {
    const q = quotes.get(fxTicker(c));
    if (q) rates.set(c, q.lastClosePrice);
  }
  return { rates, quotes };
}

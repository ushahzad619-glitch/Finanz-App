"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { validationFailed, type ActionState } from "@/lib/action-state";
import { getPortfolioValuation } from "@/lib/data/portfolio";
import { lookupTicker } from "@/lib/quotes";
import { positionFormSchema, type PositionFormField } from "@/lib/validations/position";

// Lokale Single-User-App ohne Login: keine Auth-Prüfung (siehe actions/transactions.ts).

export type PositionActionState = ActionState<PositionFormField>;

function revalidateFinanceViews() {
  revalidatePath("/", "layout");
}

export async function savePosition(
  _prev: PositionActionState,
  formData: FormData,
): Promise<PositionActionState> {
  const id = formData.get("id");
  const isEdit = typeof id === "string" && id.length > 0;
  const parsed = positionFormSchema.safeParse({
    ticker: formData.get("ticker") ?? "",
    shares: formData.get("shares") ?? "",
    buyInPrice: formData.get("buyInPrice") ?? undefined,
  });
  if (!parsed.success) return validationFailed<PositionFormField>(parsed.error);
  const data = parsed.data;

  const duplicate = await prisma.portfolioPosition.findUnique({ where: { ticker: data.ticker } });
  if (duplicate && duplicate.id !== id) {
    return {
      ok: false,
      fieldErrors: { ticker: `${data.ticker} ist bereits im Depot – bitte die Position bearbeiten.` },
      ts: Date.now(),
    };
  }

  // Ticker live prüfen und Namen + ersten Kurs in den Cache übernehmen
  let quote;
  try {
    quote = await lookupTicker(data.ticker);
  } catch (error) {
    console.error("lookupTicker failed", error);
    return {
      ok: false,
      message: "Yahoo Finance ist gerade nicht erreichbar. Bitte später erneut versuchen.",
      ts: Date.now(),
    };
  }
  if (!quote) {
    return {
      ok: false,
      fieldErrors: { ticker: `Ticker „${data.ticker}“ wurde bei Yahoo Finance nicht gefunden.` },
      ts: Date.now(),
    };
  }

  try {
    await prisma.stockQuoteCache.upsert({
      where: { ticker: quote.ticker },
      update: quote,
      create: quote,
    });
    const record = { ticker: data.ticker, shares: data.shares, buyInPrice: data.buyInPrice, name: quote.name };
    if (isEdit) await prisma.portfolioPosition.update({ where: { id }, data: record });
    else await prisma.portfolioPosition.create({ data: record });
  } catch (error) {
    console.error("savePosition failed", error);
    return { ok: false, message: "Speichern fehlgeschlagen.", ts: Date.now() };
  }

  revalidateFinanceViews();
  return { ok: true, message: isEdit ? "Position aktualisiert." : `${data.ticker} hinzugefügt.`, ts: Date.now() };
}

export async function deletePosition(id: string): Promise<ActionState> {
  if (typeof id !== "string" || !id) return { ok: false, message: "Ungültige ID." };
  try {
    await prisma.portfolioPosition.delete({ where: { id } });
  } catch (error) {
    console.error("deletePosition failed", error);
    return { ok: false, message: "Löschen fehlgeschlagen." };
  }
  revalidateFinanceViews();
  return { ok: true, message: "Position gelöscht." };
}

export type TickerPreview =
  | { ok: true; ticker: string; name: string | null; price: number; currency: string }
  | { ok: false; message: string };

/** Kursvorschau für den Eingabedialog (schreibt nichts in die DB). */
export async function previewTicker(input: string): Promise<TickerPreview> {
  const parsed = positionFormSchema.shape.ticker.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Ungültiger Ticker." };
  try {
    const quote = await lookupTicker(parsed.data);
    if (!quote) return { ok: false, message: `„${parsed.data}“ wurde nicht gefunden.` };
    return {
      ok: true,
      ticker: quote.ticker,
      name: quote.name,
      price: quote.lastClosePrice,
      currency: quote.currency,
    };
  } catch {
    return { ok: false, message: "Kurs gerade nicht abrufbar." };
  }
}

/** Erzwingt einen frischen Abruf aller Kurse und Wechselkurse. */
export async function refreshQuotes(): Promise<ActionState> {
  const valuation = await getPortfolioValuation({ force: true });
  revalidateFinanceViews();
  if (valuation.anyStale) {
    return { ok: false, message: "Nicht alle Kurse konnten aktualisiert werden – es werden zwischengespeicherte Werte angezeigt." };
  }
  return { ok: true, message: `Kurse für ${valuation.positions.length} Position(en) aktualisiert.` };
}

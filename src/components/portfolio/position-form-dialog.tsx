"use client";

import { useActionState, useState, useTransition } from "react";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import {
  previewTicker,
  savePosition,
  type PositionActionState,
  type TickerPreview,
} from "@/app/actions/portfolio";
import { formatDecimal, formatMoney, formatPercent, parseDecimal } from "@/lib/numbers";
import { FieldError } from "@/components/forms/field-error";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type EditablePosition = {
  id: string;
  ticker: string;
  name: string | null;
  shares: number;
  buyInPrice: number | null;
  currency: string | null;
  price: number | null;
};

export function PositionFormDialog({
  position,
  trigger,
}: {
  position?: EditablePosition;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{position ? `${position.ticker} bearbeiten` : "Position hinzufügen"}</DialogTitle>
          <DialogDescription>
            Ticker wie bei Yahoo Finance, z. B. AAPL, VWCE.DE (Xetra) oder VOD.L (London).
          </DialogDescription>
        </DialogHeader>
        {open && <PositionForm position={position} onDone={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  );
}

/** Zahl → Eingabetext ohne Tausenderpunkte ("1234,5") */
const toInput = (n: number, decimals: number) => formatDecimal(n, decimals).replace(/\./g, "");

function PositionForm({ position, onDone }: { position?: EditablePosition; onDone: () => void }) {
  const [ticker, setTicker] = useState(position?.ticker ?? "");
  const [shares, setShares] = useState(position ? toInput(position.shares, 6) : "");
  const [buyIn, setBuyIn] = useState(position?.buyInPrice != null ? toInput(position.buyInPrice, 4) : "");

  // Kursvorschau: beim Bearbeiten aus der Übersicht, sonst nach Eingabe des Tickers abgefragt
  const [quote, setQuote] = useState<TickerPreview | null>(
    position?.price != null && position.currency
      ? { ok: true, ticker: position.ticker, name: position.name, price: position.price, currency: position.currency }
      : null,
  );
  const [lookedUp, setLookedUp] = useState(position?.ticker ?? "");
  const [looking, startLookup] = useTransition();

  function lookup() {
    const t = ticker.trim().toUpperCase();
    if (!t || t === lookedUp) return;
    setLookedUp(t);
    startLookup(async () => setQuote(await previewTicker(t)));
  }

  const [state, formAction, pending] = useActionState<PositionActionState, FormData>(
    async (prev, formData) => {
      const result = await savePosition(prev, formData);
      if (result.ok) {
        toast.success(result.message);
        onDone();
      } else if (!result.fieldErrors) {
        toast.error(result.message ?? "Unbekannter Fehler.");
      }
      return result;
    },
    { ok: false },
  );
  const errors = state.fieldErrors ?? {};
  const currency = quote?.ok ? quote.currency : (position?.currency ?? null);

  return (
    <form action={formAction} className="grid gap-4" noValidate>
      {position && <input type="hidden" name="id" value={position.id} />}

      <div className="grid gap-2">
        <Label htmlFor="ticker">Ticker</Label>
        <div className="flex gap-2">
          <Input
            id="ticker"
            name="ticker"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            onBlur={lookup}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                lookup();
              }
            }}
            placeholder="z. B. VWCE.DE"
            autoComplete="off"
            spellCheck={false}
            maxLength={20}
            aria-invalid={Boolean(errors.ticker)}
            autoFocus={!position}
          />
          <Button type="button" variant="outline" size="icon" onClick={lookup} aria-label="Kurs abrufen" disabled={looking}>
            {looking ? <Loader2 className="animate-spin" /> : <Search />}
          </Button>
        </div>
        <FieldError message={errors.ticker} />
        {quote && !looking && (
          quote.ok ? (
            <p className="text-sm text-muted-foreground">
              {quote.name ?? quote.ticker} · aktueller Kurs{" "}
              <span className="font-medium text-foreground tabular-nums">{formatMoney(quote.price, quote.currency)}</span>
            </p>
          ) : (
            <p className="text-sm text-destructive">{quote.message}</p>
          )
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="shares">Anzahl Aktien</Label>
          <Input
            id="shares"
            name="shares"
            inputMode="decimal"
            autoComplete="off"
            placeholder="z. B. 12,5"
            value={shares}
            onChange={(e) => setShares(e.target.value)}
            aria-invalid={Boolean(errors.shares)}
            className="text-right tabular-nums"
            autoFocus={Boolean(position)}
          />
          <FieldError message={errors.shares} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="buyInPrice">Kaufpreis pro Aktie</Label>
          <div className="relative">
            <Input
              id="buyInPrice"
              name="buyInPrice"
              inputMode="decimal"
              autoComplete="off"
              placeholder="z. B. 98,50"
              value={buyIn}
              onChange={(e) => setBuyIn(e.target.value)}
              aria-invalid={Boolean(errors.buyInPrice)}
              className="pr-12 text-right tabular-nums"
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
              {currency ?? "Whg."}
            </span>
          </div>
          <FieldError message={errors.buyInPrice} />
        </div>
      </div>

      <GainPreview
        shares={parseDecimal(shares, 6)}
        buyIn={parseDecimal(buyIn, 4)}
        price={quote?.ok ? quote.price : null}
        currency={currency}
      />

      <DialogFooter>
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {pending && <Loader2 className="animate-spin" />}
          {pending ? "Prüfe Ticker …" : position ? "Speichern" : "Hinzufügen"}
        </Button>
      </DialogFooter>
    </form>
  );
}

/** Live-Berechnung von Kaufwert, aktuellem Wert und Gewinn in Kurswährung. */
function GainPreview({
  shares,
  buyIn,
  price,
  currency,
}: {
  shares: number | null;
  buyIn: number | null;
  price: number | null;
  currency: string | null;
}) {
  if (!currency || !shares) {
    return (
      <p className="rounded-lg border border-dashed px-3 py-2.5 text-sm text-muted-foreground">
        Ticker, Anzahl und Kaufpreis eingeben – hier erscheint die Gewinnberechnung.
      </p>
    );
  }

  const cost = buyIn !== null ? shares * buyIn : null;
  const value = price !== null ? shares * price : null;
  const gain = cost !== null && value !== null ? value - cost : null;
  const ratio = gain !== null && cost ? gain / cost : null;
  const fmt = (v: number | null) => (v === null ? "–" : formatMoney(v, currency));

  return (
    <div className="grid gap-1.5 rounded-lg bg-muted/60 px-3 py-2.5 text-sm">
      <Row label={`Kaufwert (${formatDecimal(shares, 6)} × ${buyIn !== null ? formatMoney(buyIn, currency) : "–"})`} value={fmt(cost)} />
      <Row label={`Aktueller Wert (× ${price !== null ? formatMoney(price, currency) : "–"})`} value={fmt(value)} />
      <div className="mt-1 flex items-center justify-between gap-3 border-t pt-2">
        <span className="font-medium">Gewinn / Verlust</span>
        <span className={cn("font-semibold tabular-nums", gain !== null && gain < 0 && "text-destructive")}>
          {gain === null ? "–" : `${gain > 0 ? "+" : ""}${fmt(gain)}`}
          {ratio !== null && <span className="ml-2 font-normal">({formatPercent(ratio)})</span>}
        </span>
      </div>
      {currency !== "EUR" && (
        <p className="text-xs text-muted-foreground">
          Beträge in {currency}. In der Übersicht wird zum aktuellen Wechselkurs in Euro umgerechnet.
        </p>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="shrink-0 tabular-nums">{value}</span>
    </div>
  );
}

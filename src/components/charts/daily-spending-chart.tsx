"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import { formatCents } from "@/lib/money";

export type DayPoint = { day: number; label: string; expense: number };

const axisEuro = new Intl.NumberFormat("de-DE", { notation: "compact", maximumFractionDigits: 1 });

/** Ausgaben pro Tag eines Monats – eine Serie (Ausgaben-Farbe), daher ohne Legende. */
export function DailySpendingChart({ data }: { data: DayPoint[] }) {
  if (!data.some((d) => d.expense > 0)) {
    return <p className="flex h-40 items-center justify-center text-sm text-muted-foreground">Keine Ausgaben in diesem Monat.</p>;
  }
  return (
    <div className="h-44" role="img" aria-label="Ausgaben pro Tag">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barCategoryGap="20%" margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis
            dataKey="day"
            tickLine={false}
            axisLine={{ stroke: "var(--chart-grid)" }}
            tick={{ fill: "var(--chart-axis)", fontSize: 11 }}
            interval={4}
          />
          <YAxis
            tickFormatter={(v: number) => `${axisEuro.format(v / 100)} €`}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--chart-axis)", fontSize: 11 }}
            width={56}
          />
          <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.6 }} content={(p) => <DayTooltip {...p} />} />
          <Bar dataKey="expense" fill="var(--chart-2)" radius={[4, 4, 0, 0]} maxBarSize={16} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function DayTooltip({ active, payload }: TooltipContentProps<ValueType, NameType>) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as DayPoint;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md">
      <p className="font-medium">{p.label}</p>
      <p className="tabular-nums text-muted-foreground">Ausgaben {formatCents(p.expense)}</p>
    </div>
  );
}

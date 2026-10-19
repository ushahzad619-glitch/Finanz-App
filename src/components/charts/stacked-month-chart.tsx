"use client";

import { useState } from "react";
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
import { BarChart3, Table2 } from "lucide-react";
import { formatCents } from "@/lib/money";
import { formatMonthLabel } from "@/lib/dates";
import { Button } from "@/components/ui/button";

export type StackSeries = { key: string; label: string; color: string };
export type StackRow = { month: string } & Record<string, number | string>;

const shortMonth = new Intl.DateTimeFormat("de-DE", { month: "short", timeZone: "UTC" });
const axisEuro = new Intl.NumberFormat("de-DE", { notation: "compact", maximumFractionDigits: 1 });
const monthTick = (month: string) => {
  const [y, m] = month.split("-").map(Number);
  return shortMonth.format(new Date(Date.UTC(y, m - 1, 1))).replace(".", "");
};

/** Gestapelte Monatsbalken mit Legende, Tooltip und Tabellenansicht. */
export function StackedMonthChart({
  data,
  series,
  ariaLabel,
  emptyText,
}: {
  data: StackRow[];
  series: StackSeries[];
  ariaLabel: string;
  emptyText: string;
}) {
  const [view, setView] = useState<"chart" | "table">("chart");
  const total = (row: StackRow) => series.reduce((s, x) => s + Number(row[x.key] ?? 0), 0);
  const hasData = data.some((row) => total(row) > 0);
  if (!hasData) {
    return <p className="flex h-64 items-center justify-center text-sm text-muted-foreground">{emptyText}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
          {series.map((s) => (
            <li key={s.key} className="flex items-center gap-2">
              <span className="size-2.5 rounded-sm" style={{ backgroundColor: s.color }} aria-hidden />
              {s.label}
            </li>
          ))}
        </ul>
        <Button variant="ghost" size="sm" onClick={() => setView(view === "chart" ? "table" : "chart")} aria-pressed={view === "table"}>
          {view === "chart" ? <Table2 /> : <BarChart3 />}
          {view === "chart" ? "Als Tabelle" : "Als Diagramm"}
        </Button>
      </div>

      {view === "table" ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground">
              <tr className="border-b">
                <th className="py-2 pr-3 text-left font-medium">Monat</th>
                {series.map((s) => (
                  <th key={s.key} className="px-2 py-2 text-right font-medium whitespace-nowrap">{s.label}</th>
                ))}
                <th className="py-2 pl-3 text-right font-medium">Summe</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {[...data].reverse().map((row) => (
                <tr key={row.month} className="border-b last:border-0">
                  <td className="py-2 pr-3 whitespace-nowrap">{formatMonthLabel(row.month)}</td>
                  {series.map((s) => (
                    <td key={s.key} className="px-2 py-2 text-right">{formatCents(Number(row[s.key] ?? 0))}</td>
                  ))}
                  <td className="py-2 pl-3 text-right font-medium">{formatCents(total(row))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="h-72" role="img" aria-label={ariaLabel}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barCategoryGap="30%" margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
              <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
              <XAxis
                dataKey="month"
                tickFormatter={monthTick}
                tickLine={false}
                axisLine={{ stroke: "var(--chart-grid)" }}
                tick={{ fill: "var(--chart-axis)", fontSize: 12 }}
              />
              <YAxis
                tickFormatter={(v: number) => `${axisEuro.format(v / 100)} €`}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--chart-axis)", fontSize: 12 }}
                width={64}
              />
              <Tooltip
                cursor={{ fill: "var(--muted)", opacity: 0.6 }}
                content={(props) => <StackTooltip {...props} series={series} />}
              />
              {series.map((s, i) => (
                <Bar
                  key={s.key}
                  dataKey={s.key}
                  name={s.label}
                  stackId="stack"
                  fill={s.color}
                  stroke="var(--card)"
                  strokeWidth={2}
                  maxBarSize={24}
                  radius={i === series.length - 1 ? [4, 4, 0, 0] : 0}
                  isAnimationActive={false}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function StackTooltip({
  active,
  payload,
  label,
  series,
}: TooltipContentProps<ValueType, NameType> & { series: StackSeries[] }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload as StackRow;
  const sum = series.reduce((s, x) => s + Number(row[x.key] ?? 0), 0);
  return (
    <div className="min-w-48 rounded-lg border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md">
      <p className="mb-1.5 font-medium">{formatMonthLabel(String(label))}</p>
      {[...series].reverse().map((s) =>
        Number(row[s.key] ?? 0) > 0 ? (
          <p key={s.key} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-2 text-muted-foreground">
              <span className="size-2 rounded-sm" style={{ backgroundColor: s.color }} />
              {s.label}
            </span>
            <span className="tabular-nums">{formatCents(Number(row[s.key]))}</span>
          </p>
        ) : null,
      )}
      <p className="mt-1.5 flex justify-between gap-4 border-t pt-1.5">
        <span className="text-muted-foreground">Summe</span>
        <span className="font-medium tabular-nums">{formatCents(sum)}</span>
      </p>
    </div>
  );
}

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
import type { CashflowPoint } from "@/lib/data/dashboard";

// Zwei Serien: Slot 1 (blau) = Einnahmen, Slot 2 (orange) = Ausgaben.
// Farben kommen aus --chart-1/--chart-2 (eigene Stufen für Hell/Dunkel, validiert).
const SERIES = [
  { key: "income", label: "Einnahmen", color: "var(--chart-1)" },
  { key: "expense", label: "Ausgaben", color: "var(--chart-2)" },
] as const;

const shortMonth = new Intl.DateTimeFormat("de-DE", { month: "short", timeZone: "UTC" });
const axisEuro = new Intl.NumberFormat("de-DE", { notation: "compact", maximumFractionDigits: 1 });

function monthTick(month: string) {
  const [y, m] = month.split("-").map(Number);
  return shortMonth.format(new Date(Date.UTC(y, m - 1, 1))).replace(".", "");
}

export function CashflowChart({ data }: { data: CashflowPoint[] }) {
  const [view, setView] = useState<"chart" | "table">("chart");
  const hasData = data.some((d) => d.income > 0 || d.expense > 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Legende: immer sichtbar bei zwei Serien */}
        <ul className="flex items-center gap-4 text-sm text-muted-foreground">
          {SERIES.map((s) => (
            <li key={s.key} className="flex items-center gap-2">
              <span className="size-2.5 rounded-sm" style={{ backgroundColor: s.color }} aria-hidden />
              {s.label}
            </li>
          ))}
        </ul>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setView(view === "chart" ? "table" : "chart")}
          aria-pressed={view === "table"}
        >
          {view === "chart" ? <Table2 /> : <BarChart3 />}
          {view === "chart" ? "Als Tabelle" : "Als Diagramm"}
        </Button>
      </div>

      {view === "table" ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground">
              <tr className="border-b">
                <th className="py-2 text-left font-medium">Monat</th>
                <th className="py-2 text-right font-medium">Einnahmen</th>
                <th className="py-2 text-right font-medium">Ausgaben</th>
                <th className="py-2 text-right font-medium">Saldo</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {[...data].reverse().map((d) => (
                <tr key={d.month} className="border-b last:border-0">
                  <td className="py-2">{formatMonthLabel(d.month)}</td>
                  <td className="py-2 text-right">{formatCents(d.income)}</td>
                  <td className="py-2 text-right">{formatCents(d.expense)}</td>
                  <td className="py-2 text-right">{formatCents(d.income - d.expense)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : !hasData ? (
        <p className="flex h-64 items-center justify-center text-sm text-muted-foreground">
          Noch keine Buchungen in den letzten 12 Monaten.
        </p>
      ) : (
        <div className="h-72" role="img" aria-label="Einnahmen und Ausgaben der letzten 12 Monate">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barGap={2} barCategoryGap="28%" margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
              <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
              <XAxis
                dataKey="month"
                tickFormatter={monthTick}
                tickLine={false}
                axisLine={{ stroke: "var(--chart-grid)" }}
                tick={{ fill: "var(--chart-axis)", fontSize: 12 }}
                interval="preserveStartEnd"
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
                content={(props) => <CashflowTooltip {...props} />}
              />
              {SERIES.map((s) => (
                <Bar
                  key={s.key}
                  dataKey={s.key}
                  name={s.label}
                  fill={s.color}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={20}
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

function CashflowTooltip({ active, payload, label }: TooltipContentProps<ValueType, NameType>) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload as CashflowPoint;
  const balance = point.income - point.expense;
  return (
    <div className="min-w-44 rounded-lg border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md">
      <p className="mb-1.5 font-medium">{formatMonthLabel(String(label))}</p>
      {SERIES.map((s) => (
        <p key={s.key} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-2 text-muted-foreground">
            <span className="size-2 rounded-sm" style={{ backgroundColor: s.color }} />
            {s.label}
          </span>
          <span className="tabular-nums">{formatCents(point[s.key])}</span>
        </p>
      ))}
      <p className="mt-1.5 flex justify-between gap-4 border-t pt-1.5">
        <span className="text-muted-foreground">Saldo</span>
        <span className="font-medium tabular-nums">
          {balance > 0 ? "+" : ""}
          {formatCents(balance)}
        </span>
      </p>
    </div>
  );
}

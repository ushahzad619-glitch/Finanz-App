"use client";

import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { cn } from "cn";
import type { Segment } from "@/lib/chart-palette";
import { CategoryIcon } from "@/lib/category-icons";
import { formatCents } from "@/lib/money";

/**
 * Ring-Diagramm für Anteile (≤ 6 Segmente inkl. "Weitere").
 * Die Legende daneben zeigt immer Name, Betrag und Anteil – Werte sind also
 * nie nur per Farbe oder Tooltip ablesbar.
 */
export function DonutChart({
  segments,
  centerLabel,
  emptyText,
}: {
  segments: Segment[]; // Werte in Cent
  centerLabel: string;
  emptyText: string;
}) {
  const formatValue = formatCents;
  const [active, setActive] = useState<string | null>(null);
  const total = segments.reduce((s, x) => s + x.value, 0);

  if (total <= 0) {
    return <p className="flex h-48 items-center justify-center text-sm text-muted-foreground">{emptyText}</p>;
  }

  const activeSeg = segments.find((s) => s.id === active);

  return (
    <div className="grid items-center gap-6 sm:grid-cols-[minmax(0,200px)_1fr]">
      <div className="relative mx-auto aspect-square w-full max-w-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={segments}
              dataKey="value"
              nameKey="name"
              innerRadius="64%"
              outerRadius="100%"
              startAngle={90}
              endAngle={-270}
              stroke="var(--card)"
              strokeWidth={2}
              isAnimationActive={false}
              onMouseEnter={(_, i) => setActive(segments[i]?.id ?? null)}
              onMouseLeave={() => setActive(null)}
            >
              {segments.map((s) => (
                <Cell
                  key={s.id}
                  fill={s.color}
                  opacity={active && active !== s.id ? 0.35 : 1}
                />
              ))}
            </Pie>
            <Tooltip content={() => null} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-xs text-muted-foreground">{activeSeg ? activeSeg.name : centerLabel}</span>
          <span className="text-lg font-semibold">{formatValue(activeSeg ? activeSeg.value : total)}</span>
          {activeSeg && (
            <span className="text-xs text-muted-foreground">{Math.round((activeSeg.value / total) * 100)} %</span>
          )}
        </div>
      </div>

      <ul className="space-y-1">
        {segments.map((s) => (
          <li
            key={s.id}
            onMouseEnter={() => setActive(s.id)}
            onMouseLeave={() => setActive(null)}
            className={cn(
              "flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm transition-colors",
              active === s.id && "bg-muted",
            )}
          >
            <span className="flex min-w-0 items-center gap-2">
              <span className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: s.color }} aria-hidden />
              {s.icon && <CategoryIcon name={s.icon} className="size-3.5 shrink-0 text-muted-foreground" />}
              <span className="truncate">{s.name}</span>
            </span>
            <span className="shrink-0 tabular-nums">
              {formatValue(s.value)}
              <span className="ml-2 inline-block w-9 text-right text-muted-foreground">
                {Math.round((s.value / total) * 100)} %
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

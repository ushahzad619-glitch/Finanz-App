import { cn } from "cn";
import { formatMoney, formatPercent } from "@/lib/numbers";

/**
 * Divergierende Balken: Gewinn (blau) nach rechts, Verlust (rot) nach links,
 * neutrale Mittellinie. Wert und Prozent stehen immer als Text daneben.
 */
export function GainLossBars({
  items,
}: {
  items: { id: string; label: string; gainEur: number; ratio: number | null }[];
}) {
  if (items.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Kaufkurse eintragen, um Gewinn und Verlust zu sehen.
      </p>
    );
  }
  const max = Math.max(...items.map((i) => Math.abs(i.gainEur)), 1);

  return (
    <ul className="space-y-3">
      {items.map((item) => {
        const pct = (Math.abs(item.gainEur) / max) * 50;
        const loss = item.gainEur < 0;
        return (
          <li key={item.id} className="space-y-1">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium">{item.label}</span>
              <span className={cn("tabular-nums", loss && "text-destructive")}>
                {item.gainEur > 0 ? "+" : ""}
                {formatMoney(item.gainEur, "EUR")}
                {item.ratio !== null && (
                  <span className="ml-2 inline-block w-14 text-right text-muted-foreground">
                    {formatPercent(item.ratio)}
                  </span>
                )}
              </span>
            </div>
            <div className="relative h-2 rounded-full bg-muted" aria-hidden>
              <div className="absolute inset-y-[-3px] left-1/2 w-px bg-[var(--chart-axis)]" />
              <div
                className="absolute inset-y-0 rounded-full"
                style={{
                  width: `${Math.max(pct, 1)}%`,
                  left: loss ? `${50 - Math.max(pct, 1)}%` : "50%",
                  backgroundColor: loss ? "var(--chart-loss)" : "var(--chart-gain)",
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

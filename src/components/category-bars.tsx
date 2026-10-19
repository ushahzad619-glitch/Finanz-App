import { CategoryIcon } from "@/lib/category-icons";
import { formatCents } from "@/lib/money";

export type CategoryBarItem = {
  id: string;
  name: string;
  /** Optionaler Zusatz neben dem Namen, z. B. der Ticker */
  detail?: string;
  icon?: string;
  color?: string;
  value: number; // Cent
};

/**
 * Anteile nach Kategorie als horizontale Balken.
 * Eine Serie → eine Farbe (chart-1) für alle Balken; die Kategoriefarbe
 * erscheint nur am Icon als Wiedererkennung. Beträge stehen immer als Text daneben.
 */
export function CategoryBars({ items, emptyText }: { items: CategoryBarItem[]; emptyText: string }) {
  if (items.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{emptyText}</p>;
  }
  const total = items.reduce((s, i) => s + i.value, 0);
  const max = Math.max(...items.map((i) => i.value));

  return (
    <ul className="space-y-3">
      {items.map((item) => {
        const share = total > 0 ? item.value / total : 0;
        return (
          <li key={item.id} className="space-y-1.5">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                {item.icon && (
                  <CategoryIcon name={item.icon} className="size-4 shrink-0" style={{ color: item.color }} />
                )}
                <span className="truncate">{item.name}</span>
                {item.detail && <span className="shrink-0 text-muted-foreground">{item.detail}</span>}
              </span>
              <span className="shrink-0 tabular-nums">
                {formatCents(item.value)}
                <span className="ml-2 inline-block w-10 text-right text-muted-foreground">
                  {Math.round(share * 100)} %
                </span>
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted" aria-hidden>
              <div
                className="h-full rounded-full bg-chart-1"
                style={{ width: `${max > 0 ? Math.max(2, (item.value / max) * 100) : 0}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

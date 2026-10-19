import { formatCents } from "@/lib/money";

/**
 * Anteilsbalken (Teil vom Ganzen) mit 2px Lücke zwischen den Segmenten
 * und Legende inkl. Beträgen. Negative Werte zählen als 0 für die Breite.
 */
export function ProportionBar({
  parts,
}: {
  parts: { id: string; label: string; value: number; color: string }[];
}) {
  const positive = parts.map((p) => ({ ...p, width: Math.max(0, p.value) }));
  const total = positive.reduce((s, p) => s + p.width, 0);

  return (
    <div className="space-y-3">
      <div className="flex h-3 gap-0.5 overflow-hidden rounded-full bg-muted" aria-hidden>
        {total > 0 &&
          positive
            .filter((p) => p.width > 0)
            .map((p) => (
              <div
                key={p.id}
                className="h-full first:rounded-l-full last:rounded-r-full"
                style={{ width: `${(p.width / total) * 100}%`, backgroundColor: p.color }}
              />
            ))}
      </div>
      <ul className="grid gap-2 text-sm sm:grid-cols-2">
        {parts.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-muted-foreground">
              <span className="size-2.5 rounded-sm" style={{ backgroundColor: p.color }} aria-hidden />
              {p.label}
            </span>
            <span className="tabular-nums">
              {formatCents(p.value)}
              {total > 0 && (
                <span className="ml-2 text-muted-foreground">{Math.round((Math.max(0, p.value) / total) * 100)} %</span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

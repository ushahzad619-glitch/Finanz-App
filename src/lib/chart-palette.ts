// Kategoriale Diagrammfarben in fester Reihenfolge (validiert, siehe globals.css).
// Regeln: nie zyklisch erweitern – mehr als 5 Einträge werden zu "Weitere" zusammengefasst.

export const SLOT_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
] as const;

export const OTHER_COLOR = "var(--chart-other)";
export const OTHER_ID = "__other";

export type Segment = {
  id: string;
  name: string;
  value: number; // Cent
  color: string;
  icon?: string;
};

/**
 * Ordnet Einträgen Farben zu. `order` legt die Farbreihenfolge fest (Farbe folgt der
 * Entität, nicht dem Rang im aktuellen Ausschnitt). Alles außerhalb der ersten
 * `maxSlots` IDs landet in "Weitere".
 */
export function toSegments(
  items: { id: string; name: string; value: number; icon?: string }[],
  order: string[],
  maxSlots = 5,
): Segment[] {
  const slotIds = order.slice(0, maxSlots);
  const segments: Segment[] = [];
  let other = 0;
  for (const item of items) {
    const slot = slotIds.indexOf(item.id);
    if (slot === -1) other += item.value;
    else segments.push({ ...item, color: SLOT_COLORS[slot] });
  }
  segments.sort((a, b) => slotIds.indexOf(a.id) - slotIds.indexOf(b.id));
  if (other > 0) segments.push({ id: OTHER_ID, name: "Weitere", value: other, color: OTHER_COLOR });
  return segments.filter((s) => s.value > 0);
}

/** IDs nach absteigendem Wert – Grundlage für eine stabile Farbzuordnung. */
export function rankIds(items: { id: string; value: number }[]): string[] {
  return [...items].sort((a, b) => b.value - a.value).map((i) => i.id);
}

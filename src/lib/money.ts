// Geldbeträge werden überall als Integer in Cent geführt.
// Umrechnung von/zu Euro passiert nur an den Rändern (Formular-Eingabe, Anzeige).

const eurFormatter = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
});

/** 123456 → "1.234,56 €" */
export function formatCents(cents: number): string {
  return eurFormatter.format(cents / 100);
}

/** 1299 → "12,99" (für Eingabefelder) */
export function centsToInput(cents: number): string {
  const euros = Math.trunc(cents / 100);
  const rest = Math.abs(cents % 100).toString().padStart(2, "0");
  return `${euros},${rest}`;
}

/**
 * Wandelt eine Euro-Eingabe in Cent um, ohne Float-Rundungsfehler.
 * Akzeptiert z. B. "12", "12,5", "12,99", "1.234,56", "1234.56", "1.234", "12,99 €".
 * Gibt `null` zurück, wenn die Eingabe kein gültiger, nicht-negativer Betrag ist.
 */
export function parseEuroToCents(input: string): number | null {
  const s = input.replace(/[\s€]/g, "");
  if (!s) return null;

  let normalized: string;
  if (s.includes(",")) {
    // Deutsches Format: Punkte sind Tausendertrenner, Komma ist Dezimaltrenner
    if (!/^\d{1,3}(\.\d{3})*,\d{0,2}$|^\d+,\d{0,2}$/.test(s)) return null;
    normalized = s.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    // "1.234" → Tausendertrenner
    normalized = s.replace(/\./g, "");
  } else {
    normalized = s;
  }

  const match = /^(\d+)(?:\.(\d{0,2}))?$/.exec(normalized);
  if (!match) return null;

  const euros = Number(match[1]);
  const cents = Number((match[2] ?? "").padEnd(2, "0"));
  const total = euros * 100 + cents;
  return Number.isSafeInteger(total) ? total : null;
}

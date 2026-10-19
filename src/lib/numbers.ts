/**
 * Parst eine Dezimalzahl in deutscher oder englischer Schreibweise
 * ("3,5", "1.234,5678", "1234.5"). Gibt null bei ungültiger Eingabe zurück.
 */
export function parseDecimal(input: string, maxDecimals = 6): number | null {
  const s = input.replace(/\s/g, "");
  if (!s) return null;
  let normalized: string;
  if (s.includes(",")) {
    if (!/^\d{1,3}(\.\d{3})*,\d+$|^\d+,\d+$/.test(s)) return null;
    normalized = s.replace(/\./g, "").replace(",", ".");
  } else {
    normalized = s;
  }
  const re = new RegExp(`^\\d+(\\.\\d{1,${maxDecimals}})?$`);
  if (!re.test(normalized)) return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

const decimalFormatters = new Map<number, Intl.NumberFormat>();

/** Zahl im deutschen Format mit bis zu `maxDecimals` Nachkommastellen. */
export function formatDecimal(value: number, maxDecimals = 4): string {
  let f = decimalFormatters.get(maxDecimals);
  if (!f) {
    f = new Intl.NumberFormat("de-DE", { maximumFractionDigits: maxDecimals });
    decimalFormatters.set(maxDecimals, f);
  }
  return f.format(value);
}

/** Betrag in beliebiger Währung, z. B. formatMoney(343.46, "USD") → "343,46 $" */
export function formatMoney(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat("de-DE", { style: "currency", currency }).format(value);
  } catch {
    return `${formatDecimal(value, 2)} ${currency}`;
  }
}

const percentFormatter = new Intl.NumberFormat("de-DE", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
  signDisplay: "exceptZero",
});

/** 0.1234 → "+12,3 %" */
export function formatPercent(ratio: number): string {
  return percentFormatter.format(ratio);
}

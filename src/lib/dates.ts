// Buchungsdaten werden als UTC-Mitternacht des Kalendertags gespeichert.
// Formatierung und Monatsgrenzen rechnen deshalb konsequent in UTC,
// damit ein Datum nie durch die lokale Zeitzone auf den Vortag rutscht.

const MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Aktueller Monat als "yyyy-MM" (lokale Zeit des Servers). */
export function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/** Heutiger Kalendertag (lokale Zeit) als UTC-Mitternacht – passend zu gespeicherten Daten. */
export function todayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

/** Validiert einen "yyyy-MM"-Parameter, sonst aktueller Monat. */
export function parseMonth(value: unknown): string {
  return typeof value === "string" && MONTH_RE.test(value) ? value : currentMonth();
}

export function monthRange(month: string): { start: Date; end: Date } {
  const [, y, m] = MONTH_RE.exec(month)!;
  const year = Number(y);
  const monthIndex = Number(m) - 1;
  return {
    start: new Date(Date.UTC(year, monthIndex, 1)),
    end: new Date(Date.UTC(year, monthIndex + 1, 1)),
  };
}

export function shiftMonth(month: string, delta: number): string {
  const { start } = monthRange(month);
  const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

const monthLabelFormatter = new Intl.DateTimeFormat("de-DE", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** "2026-10" → "Oktober 2026" */
export function formatMonthLabel(month: string): string {
  return monthLabelFormatter.format(monthRange(month).start);
}

const dayFormatter = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

/** Date → "18.10.2026" */
export function formatDay(date: Date): string {
  return dayFormatter.format(date);
}

/** Date → "2026-10-18" (UTC-Kalendertag) */
export function toDayString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** "2026-10-18" → Date (UTC-Mitternacht) oder null */
export function parseDayString(value: string): Date | null {
  if (!DAY_RE.test(value)) return null;
  const d = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) || toDayString(d) !== value ? null : d;
}

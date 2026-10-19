// Reine Rechenlogik für wiederkehrende Zahlungen (ohne DB-Zugriff, gut testbar).
// Alle Daten sind UTC-Kalendertage, siehe lib/dates.ts.

import { monthRange } from "@/lib/dates";

export type BillingInterval = "MONTHLY" | "YEARLY";

export type SubscriptionLike = {
  amount: number; // Cent pro Intervall
  interval: BillingInterval;
  startDate: Date;
  billingDay: number;
};

export const intervalLabel: Record<BillingInterval, string> = {
  MONTHLY: "monatlich",
  YEARLY: "jährlich",
};

/** Auf einen Monat umgerechnete Kosten in Cent (jährliche Abos anteilig). */
export function monthlyCost(sub: Pick<SubscriptionLike, "amount" | "interval">): number {
  return sub.interval === "YEARLY" ? Math.round(sub.amount / 12) : sub.amount;
}

/** Auf ein Jahr hochgerechnete Kosten in Cent. */
export function yearlyCost(sub: Pick<SubscriptionLike, "amount" | "interval">): number {
  return sub.interval === "YEARLY" ? sub.amount : sub.amount * 12;
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

/**
 * Fälligkeitsdatum eines Abos im Monat "yyyy-MM" oder null, wenn in diesem Monat
 * nichts fällig ist (vor Start, oder jährliches Abo in einem anderen Monat).
 * Der Abrechnungstag wird auf das Monatsende gekürzt (31. → 28./29./30.).
 */
export function dueDateInMonth(sub: SubscriptionLike, month: string): Date | null {
  const { start } = monthRange(month);
  const year = start.getUTCFullYear();
  const monthIndex = start.getUTCMonth();

  const startYear = sub.startDate.getUTCFullYear();
  const startMonth = sub.startDate.getUTCMonth();
  if (year * 12 + monthIndex < startYear * 12 + startMonth) return null;
  if (sub.interval === "YEARLY" && monthIndex !== startMonth) return null;

  const day = Math.min(Math.max(1, sub.billingDay), daysInMonth(year, monthIndex));
  const due = new Date(Date.UTC(year, monthIndex, day));
  return due < startOfDay(sub.startDate) ? null : due;
}

/** Nächste Fälligkeit ab (einschließlich) `from`. */
export function nextDueDate(sub: SubscriptionLike, from: Date): Date | null {
  const today = startOfDay(from);
  for (let i = 0; i <= 13; i++) {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + i, 1));
    const month = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const due = dueDateInMonth(sub, month);
    if (due && due >= today) return due;
  }
  return null;
}

function startOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

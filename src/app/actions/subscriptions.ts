"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { validationFailed, type ActionState } from "@/lib/action-state";
import { formatMonthLabel, parseMonth } from "@/lib/dates";
import { dueDateInMonth } from "@/lib/subscriptions";
import {
  subscriptionFormSchema,
  type SubscriptionFormField,
} from "@/lib/validations/subscription";

// Lokale Single-User-App ohne Login: keine Auth-Prüfung (siehe actions/transactions.ts).

export type SubscriptionActionState = ActionState<SubscriptionFormField>;

function revalidateFinanceViews() {
  revalidatePath("/", "layout");
}

export async function saveSubscription(
  _prev: SubscriptionActionState,
  formData: FormData,
): Promise<SubscriptionActionState> {
  const id = formData.get("id");
  const parsed = subscriptionFormSchema.safeParse({
    title: formData.get("title") ?? "",
    amount: formData.get("amount") ?? "",
    interval: formData.get("interval") ?? undefined,
    startDate: formData.get("startDate") ?? "",
    categoryId: formData.get("categoryId") ?? undefined,
    isActive: formData.get("isActive") ?? undefined,
    note: formData.get("note") ?? undefined,
  });
  if (!parsed.success) return validationFailed<SubscriptionFormField>(parsed.error);

  const data = parsed.data;
  const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
  if (!category || category.type !== "EXPENSE") {
    return {
      ok: false,
      fieldErrors: { categoryId: "Bitte eine Ausgaben-Kategorie wählen." },
      ts: Date.now(),
    };
  }

  // Abrechnungstag folgt dem Tag der ersten Fälligkeit
  const record = { ...data, billingDay: data.startDate.getUTCDate() };
  try {
    if (typeof id === "string" && id) {
      await prisma.subscription.update({ where: { id }, data: record });
    } else {
      await prisma.subscription.create({ data: record });
    }
  } catch (error) {
    console.error("saveSubscription failed", error);
    return { ok: false, message: "Speichern fehlgeschlagen.", ts: Date.now() };
  }

  revalidateFinanceViews();
  return { ok: true, message: id ? "Abo aktualisiert." : "Abo angelegt.", ts: Date.now() };
}

export async function setSubscriptionActive(id: string, isActive: boolean): Promise<ActionState> {
  if (typeof id !== "string" || !id || typeof isActive !== "boolean") {
    return { ok: false, message: "Ungültige Eingabe." };
  }
  try {
    await prisma.subscription.update({ where: { id }, data: { isActive } });
  } catch (error) {
    console.error("setSubscriptionActive failed", error);
    return { ok: false, message: "Ändern fehlgeschlagen." };
  }
  revalidateFinanceViews();
  return { ok: true, message: isActive ? "Abo aktiviert." : "Abo pausiert." };
}

export async function deleteSubscription(id: string): Promise<ActionState> {
  if (typeof id !== "string" || !id) return { ok: false, message: "Ungültige ID." };
  try {
    // Bereits gebuchte Transaktionen bleiben erhalten (subscriptionId → NULL)
    await prisma.subscription.delete({ where: { id } });
  } catch (error) {
    console.error("deleteSubscription failed", error);
    return { ok: false, message: "Löschen fehlgeschlagen." };
  }
  revalidateFinanceViews();
  return { ok: true, message: "Abo gelöscht. Bereits gebuchte Zahlungen bleiben erhalten." };
}

/**
 * Erzeugt für alle aktiven Abos, die im Monat fällig sind, eine Ausgaben-Buchung.
 * Bereits gebuchte Fälligkeiten werden übersprungen (zusätzlich DB-Unique-Index).
 */
export async function bookSubscriptionsForMonth(monthInput: string): Promise<ActionState> {
  const month = parseMonth(monthInput);
  const subs = await prisma.subscription.findMany({ where: { isActive: true } });

  let created = 0;
  let skipped = 0;
  for (const sub of subs) {
    const due = dueDateInMonth(sub, month);
    if (!due) continue;
    const exists = await prisma.transaction.findFirst({
      where: { subscriptionId: sub.id, date: due },
      select: { id: true },
    });
    if (exists) {
      skipped++;
      continue;
    }
    await prisma.transaction.create({
      data: {
        amount: sub.amount,
        type: "EXPENSE",
        date: due,
        categoryId: sub.categoryId,
        subscriptionId: sub.id,
        note: sub.title,
      },
    });
    created++;
  }

  revalidateFinanceViews();
  const label = formatMonthLabel(month);
  if (created === 0) {
    return {
      ok: true,
      message: skipped ? `Alle Abos für ${label} sind bereits gebucht.` : `Im ${label} ist kein Abo fällig.`,
    };
  }
  return {
    ok: true,
    message: `${created} Abo-Zahlung${created === 1 ? "" : "en"} für ${label} gebucht${skipped ? `, ${skipped} übersprungen` : ""}.`,
  };
}

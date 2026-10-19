"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { ActionState } from "@/lib/action-state";
import { parseEuroToCents } from "@/lib/money";

// Lokale Single-User-App ohne Login: keine Auth-Prüfung (siehe actions/transactions.ts).

export async function saveOpeningBalance(
  _prev: ActionState<"openingBalance">,
  formData: FormData,
): Promise<ActionState<"openingBalance">> {
  const raw = String(formData.get("openingBalance") ?? "").trim();
  const negative = raw.startsWith("-");
  const cents = parseEuroToCents(negative ? raw.slice(1) : raw || "0");
  if (cents === null) {
    return { ok: false, fieldErrors: { openingBalance: "Bitte einen gültigen Betrag eingeben." }, ts: Date.now() };
  }
  const openingBalance = negative ? -cents : cents;
  await prisma.setting.upsert({
    where: { id: 1 },
    update: { openingBalance },
    create: { id: 1, openingBalance },
  });
  revalidatePath("/", "layout");
  return { ok: true, message: "Startguthaben gespeichert.", ts: Date.now() };
}

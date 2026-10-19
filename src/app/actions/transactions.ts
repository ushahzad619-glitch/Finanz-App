"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { validationFailed, type ActionState as BaseActionState } from "@/lib/action-state";
import {
  transactionFormSchema,
  type TransactionFormField,
} from "@/lib/validations/transaction";

// Lokale Single-User-App ohne Login: keine Auth-Prüfung.
// Sobald die App außerhalb von localhost erreichbar wäre, muss hier eine hin.

export type ActionState = BaseActionState<TransactionFormField>;

function revalidateFinanceViews() {
  revalidatePath("/", "layout");
}

export async function saveTransaction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = formData.get("id");
  const parsed = transactionFormSchema.safeParse({
    amount: formData.get("amount") ?? "",
    type: formData.get("type") ?? undefined,
    date: formData.get("date") ?? "",
    categoryId: formData.get("categoryId") ?? undefined,
    note: formData.get("note") ?? undefined,
  });

  if (!parsed.success) return validationFailed<TransactionFormField>(parsed.error);

  const data = parsed.data;
  const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
  if (!category) {
    return { ok: false, fieldErrors: { categoryId: "Kategorie existiert nicht." }, ts: Date.now() };
  }
  if (category.type !== data.type) {
    return {
      ok: false,
      fieldErrors: { categoryId: "Die Kategorie passt nicht zum gewählten Typ." },
      ts: Date.now(),
    };
  }

  try {
    if (typeof id === "string" && id) {
      await prisma.transaction.update({ where: { id }, data });
    } else {
      await prisma.transaction.create({ data });
    }
  } catch (error) {
    console.error("saveTransaction failed", error);
    return { ok: false, message: "Speichern fehlgeschlagen.", ts: Date.now() };
  }

  revalidateFinanceViews();
  return {
    ok: true,
    message: id ? "Buchung aktualisiert." : "Buchung gespeichert.",
    ts: Date.now(),
  };
}

export async function deleteTransaction(id: string): Promise<ActionState> {
  if (typeof id !== "string" || !id) return { ok: false, message: "Ungültige ID." };
  try {
    await prisma.transaction.delete({ where: { id } });
  } catch (error) {
    console.error("deleteTransaction failed", error);
    return { ok: false, message: "Löschen fehlgeschlagen." };
  }
  revalidateFinanceViews();
  return { ok: true, message: "Buchung gelöscht." };
}

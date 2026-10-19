import { z } from "zod";
import { parseEuroToCents } from "@/lib/money";
import { parseDayString } from "@/lib/dates";

const MAX_AMOUNT_CENTS = 100_000_000_00; // 100 Mio. € als Plausibilitätsgrenze

export const transactionFormSchema = z.object({
  amount: z.string().transform((value, ctx) => {
    const cents = parseEuroToCents(value);
    if (cents === null || cents <= 0) {
      ctx.addIssue({ code: "custom", message: "Bitte einen gültigen Betrag größer 0 eingeben." });
      return z.NEVER;
    }
    if (cents > MAX_AMOUNT_CENTS) {
      ctx.addIssue({ code: "custom", message: "Der Betrag ist unrealistisch hoch." });
      return z.NEVER;
    }
    return cents;
  }),
  type: z.enum(["INCOME", "EXPENSE"], { error: "Bitte Einnahme oder Ausgabe wählen." }),
  date: z.string().transform((value, ctx) => {
    const date = parseDayString(value);
    if (!date) {
      ctx.addIssue({ code: "custom", message: "Bitte ein gültiges Datum wählen." });
      return z.NEVER;
    }
    return date;
  }),
  categoryId: z.string({ error: "Bitte eine Kategorie wählen." }).min(1, "Bitte eine Kategorie wählen."),
  note: z
    .string()
    .trim()
    .max(500, "Die Notiz darf höchstens 500 Zeichen lang sein.")
    .optional()
    .transform((v) => v || null),
});

export type TransactionFormField = keyof z.input<typeof transactionFormSchema>;

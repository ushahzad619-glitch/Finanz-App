import { z } from "zod";
import { parseEuroToCents } from "@/lib/money";
import { parseDayString } from "@/lib/dates";

const MAX_AMOUNT_CENTS = 10_000_000; // 100.000 € pro Intervall

export const subscriptionFormSchema = z.object({
  title: z
    .string({ error: "Bitte einen Titel eingeben." })
    .trim()
    .min(1, "Bitte einen Titel eingeben.")
    .max(100, "Der Titel darf höchstens 100 Zeichen lang sein."),
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
  interval: z.enum(["MONTHLY", "YEARLY"], { error: "Bitte ein Intervall wählen." }),
  startDate: z.string().transform((value, ctx) => {
    const date = parseDayString(value);
    if (!date) {
      ctx.addIssue({ code: "custom", message: "Bitte ein gültiges Datum wählen." });
      return z.NEVER;
    }
    return date;
  }),
  categoryId: z.string({ error: "Bitte eine Kategorie wählen." }).min(1, "Bitte eine Kategorie wählen."),
  isActive: z
    .string()
    .optional()
    .transform((v) => v !== "false"),
  note: z
    .string()
    .trim()
    .max(500, "Die Notiz darf höchstens 500 Zeichen lang sein.")
    .optional()
    .transform((v) => v || null),
});

export type SubscriptionFormField = keyof z.input<typeof subscriptionFormSchema>;

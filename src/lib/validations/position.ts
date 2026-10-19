import { z } from "zod";
import { parseDecimal } from "@/lib/numbers";

export const positionFormSchema = z.object({
  ticker: z
    .string({ error: "Bitte einen Ticker eingeben." })
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9][A-Z0-9.\-=^]{0,19}$/, "Ungültiger Ticker, z. B. AAPL oder VWCE.DE."),
  shares: z.string().transform((value, ctx) => {
    const n = parseDecimal(value, 6);
    if (n === null || n <= 0) {
      ctx.addIssue({ code: "custom", message: "Bitte eine Anzahl größer 0 eingeben." });
      return z.NEVER;
    }
    return n;
  }),
  buyInPrice: z
    .string()
    .optional()
    .transform((value, ctx) => {
      if (!value?.trim()) return null;
      const n = parseDecimal(value, 4);
      if (n === null || n <= 0) {
        ctx.addIssue({ code: "custom", message: "Bitte einen gültigen Kaufkurs eingeben oder leer lassen." });
        return z.NEVER;
      }
      return n;
    }),
});

export type PositionFormField = keyof z.input<typeof positionFormSchema>;

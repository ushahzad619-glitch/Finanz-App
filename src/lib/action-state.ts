import { z } from "zod";

/** Einheitliches Rückgabeformat aller Server Actions. */
export type ActionState<Field extends string = string> = {
  ok: boolean;
  message?: string;
  fieldErrors?: Partial<Record<Field, string>>;
  /** Wechselt bei jedem Aufruf, damit der Client auch identische Ergebnisse erkennt. */
  ts?: number;
};

/** Wandelt einen Zod-Fehler in ein ActionState mit der ersten Meldung pro Feld um. */
export function validationFailed<Field extends string>(error: z.ZodError): ActionState<Field> {
  const { fieldErrors } = z.flattenError(error);
  return {
    ok: false,
    message: "Bitte die markierten Felder prüfen.",
    fieldErrors: Object.fromEntries(
      Object.entries(fieldErrors).map(([k, v]) => [k, (v as string[] | undefined)?.[0]]),
    ) as Partial<Record<Field, string>>,
    ts: Date.now(),
  };
}

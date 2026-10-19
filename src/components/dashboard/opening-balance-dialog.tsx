"use client";

import { useActionState, useState } from "react";
import { Loader2, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { saveOpeningBalance } from "@/app/actions/settings";
import type { ActionState } from "@/lib/action-state";
import { centsToInput } from "@/lib/money";
import { FieldError } from "@/components/forms/field-error";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function OpeningBalanceDialog({ openingBalance }: { openingBalance: number }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Settings2 /> Startguthaben
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Startguthaben</DialogTitle>
          <DialogDescription>
            Kontostand vor deiner ersten erfassten Buchung. Das Cash ergibt sich aus Startguthaben + Einnahmen − Ausgaben.
          </DialogDescription>
        </DialogHeader>
        {open && <OpeningBalanceForm openingBalance={openingBalance} onDone={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function OpeningBalanceForm({ openingBalance, onDone }: { openingBalance: number; onDone: () => void }) {
  const [value, setValue] = useState(
    openingBalance < 0 ? `-${centsToInput(-openingBalance)}` : centsToInput(openingBalance),
  );
  const [state, formAction, pending] = useActionState<ActionState<"openingBalance">, FormData>(
    async (prev, formData) => {
      const result = await saveOpeningBalance(prev, formData);
      if (result.ok) {
        toast.success(result.message);
        onDone();
      }
      return result;
    },
    { ok: false },
  );

  return (
    <form action={formAction} className="grid gap-4" noValidate>
      <div className="grid gap-2">
        <Label htmlFor="openingBalance">Betrag</Label>
        <div className="relative">
          <Input
            id="openingBalance"
            name="openingBalance"
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-invalid={Boolean(state.fieldErrors?.openingBalance)}
            className="pr-8 text-right tabular-nums"
            autoFocus
          />
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
            €
          </span>
        </div>
        <FieldError message={state.fieldErrors?.openingBalance} />
      </div>
      <DialogFooter>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          Speichern
        </Button>
      </DialogFooter>
    </form>
  );
}

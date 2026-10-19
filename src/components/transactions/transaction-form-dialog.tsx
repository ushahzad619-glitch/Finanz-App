"use client";

import { useActionState, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import { saveTransaction, type ActionState } from "@/app/actions/transactions";
import type { CategoryOption } from "@/lib/data/transactions";
import { centsToInput } from "@/lib/money";
import { CategoryIcon } from "@/lib/category-icons";
import { DateField, parseLocalDay } from "@/components/forms/date-field";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type TxType = "INCOME" | "EXPENSE";

export type EditableTransaction = {
  id: string;
  amount: number; // Cent
  type: TxType;
  date: string; // yyyy-MM-dd
  categoryId: string;
  note: string | null;
};

export function TransactionFormDialog({
  categories,
  transaction,
  trigger,
}: {
  categories: CategoryOption[];
  transaction?: EditableTransaction;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const isEdit = Boolean(transaction);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Buchung bearbeiten" : "Neue Buchung"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Änderungen werden sofort übernommen." : "Erfasse eine Einnahme oder Ausgabe."}
          </DialogDescription>
        </DialogHeader>
        {/* Formular nur im geöffneten Zustand mounten → bei jedem Öffnen frischer State */}
        {open && (
          <TransactionForm
            categories={categories}
            transaction={transaction}
            onDone={() => setOpen(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function TransactionForm({
  categories,
  transaction,
  onDone,
}: {
  categories: CategoryOption[];
  transaction?: EditableTransaction;
  onDone: () => void;
}) {
  // Felder sind kontrolliert, weil React Formulare nach einer Action sonst zurücksetzt
  // und Eingaben bei Validierungsfehlern verloren gingen.
  const [type, setType] = useState<TxType>(transaction?.type ?? "EXPENSE");
  const [amount, setAmount] = useState(transaction ? centsToInput(transaction.amount) : "");
  const [date, setDate] = useState<Date>(() =>
    transaction ? parseLocalDay(transaction.date) : new Date(),
  );
  const [categoryId, setCategoryId] = useState(transaction?.categoryId ?? "");
  const [note, setNote] = useState(transaction?.note ?? "");

  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    async (prev, formData) => {
      const result = await saveTransaction(prev, formData);
      if (result.ok) {
        toast.success(result.message);
        onDone();
      } else if (!result.fieldErrors) {
        toast.error(result.message ?? "Unbekannter Fehler.");
      }
      return result;
    },
    { ok: false },
  );
  const errors = state.fieldErrors ?? {};

  const visibleCategories = categories.filter((c) => c.type === type);

  function changeType(next: TxType) {
    setType(next);
    if (!categories.some((c) => c.id === categoryId && c.type === next)) setCategoryId("");
  }

  return (
    <form action={formAction} className="grid gap-4" noValidate>
      {transaction && <input type="hidden" name="id" value={transaction.id} />}
      <input type="hidden" name="type" value={type} />

      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Typ">
        <TypeButton active={type === "EXPENSE"} onClick={() => changeType("EXPENSE")} tone="expense">
          <ArrowDownRight /> Ausgabe
        </TypeButton>
        <TypeButton active={type === "INCOME"} onClick={() => changeType("INCOME")} tone="income">
          <ArrowUpRight /> Einnahme
        </TypeButton>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="amount">Betrag</Label>
        <div className="relative">
          <Input
            id="amount"
            name="amount"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0,00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            aria-invalid={Boolean(errors.amount)}
            className="pr-8 text-right tabular-nums"
            autoFocus
          />
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
            €
          </span>
        </div>
        <FieldError message={errors.amount} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label>Datum</Label>
          <DateField name="date" value={date} onChange={setDate} invalid={Boolean(errors.date)} />
          <FieldError message={errors.date} />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="categoryId">Kategorie</Label>
          <Select name="categoryId" value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger id="categoryId" className="w-full" aria-invalid={Boolean(errors.categoryId)}>
              <SelectValue placeholder="Wählen …" />
            </SelectTrigger>
            <SelectContent>
              {visibleCategories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  <CategoryIcon name={c.icon} style={{ color: c.color }} />
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError message={errors.categoryId} />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="note">
          Notiz <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id="note"
          name="note"
          rows={2}
          maxLength={500}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          aria-invalid={Boolean(errors.note)}
          placeholder="z. B. Wocheneinkauf bei Rewe"
        />
        <FieldError message={errors.note} />
      </div>

      <DialogFooter>
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {pending && <Loader2 className="animate-spin" />}
          {transaction ? "Speichern" : "Hinzufügen"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function TypeButton({
  active,
  tone,
  onClick,
  children,
}: {
  active: boolean;
  tone: "income" | "expense";
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      role="radio"
      aria-checked={active}
      variant="outline"
      onClick={onClick}
      className={cn(
        active &&
          (tone === "income"
            ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-400"
            : "border-rose-500/50 bg-rose-500/10 text-rose-700 hover:bg-rose-500/15 dark:text-rose-400"),
      )}
    >
      {children}
    </Button>
  );
}

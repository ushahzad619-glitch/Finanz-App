"use client";

import { useActionState, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { saveSubscription, type SubscriptionActionState } from "@/app/actions/subscriptions";
import type { CategoryOption } from "@/lib/data/transactions";
import { CategoryIcon } from "@/lib/category-icons";
import { centsToInput } from "@/lib/money";
import type { BillingInterval } from "@/lib/subscriptions";
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

export type EditableSubscription = {
  id: string;
  title: string;
  amount: number; // Cent
  interval: BillingInterval;
  startDate: string; // yyyy-MM-dd
  categoryId: string;
  isActive: boolean;
  note: string | null;
};

export function SubscriptionFormDialog({
  categories,
  defaultCategoryId,
  subscription,
  trigger,
}: {
  categories: CategoryOption[]; // nur Ausgaben-Kategorien
  defaultCategoryId?: string;
  subscription?: EditableSubscription;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{subscription ? "Abo bearbeiten" : "Neues Abo / Fixkosten"}</DialogTitle>
          <DialogDescription>
            Wiederkehrende Zahlung, z. B. Netflix, Miete oder Versicherung.
          </DialogDescription>
        </DialogHeader>
        {open && (
          <SubscriptionForm
            categories={categories}
            defaultCategoryId={defaultCategoryId}
            subscription={subscription}
            onDone={() => setOpen(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function SubscriptionForm({
  categories,
  defaultCategoryId,
  subscription,
  onDone,
}: {
  categories: CategoryOption[];
  defaultCategoryId?: string;
  subscription?: EditableSubscription;
  onDone: () => void;
}) {
  const [title, setTitle] = useState(subscription?.title ?? "");
  const [amount, setAmount] = useState(subscription ? centsToInput(subscription.amount) : "");
  const [interval, setBillingInterval] = useState<BillingInterval>(subscription?.interval ?? "MONTHLY");
  const [startDate, setStartDate] = useState<Date>(() =>
    subscription ? parseLocalDay(subscription.startDate) : new Date(),
  );
  const [categoryId, setCategoryId] = useState(subscription?.categoryId ?? defaultCategoryId ?? "");
  const [note, setNote] = useState(subscription?.note ?? "");

  const [state, formAction, pending] = useActionState<SubscriptionActionState, FormData>(
    async (prev, formData) => {
      const result = await saveSubscription(prev, formData);
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

  return (
    <form action={formAction} className="grid gap-4" noValidate>
      {subscription && <input type="hidden" name="id" value={subscription.id} />}
      <input type="hidden" name="isActive" value={String(subscription?.isActive ?? true)} />

      <div className="grid gap-2">
        <Label htmlFor="title">Titel</Label>
        <Input
          id="title"
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="z. B. Netflix"
          maxLength={100}
          aria-invalid={Boolean(errors.title)}
          autoFocus
        />
        <FieldError message={errors.title} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
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
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
              €
            </span>
          </div>
          <FieldError message={errors.amount} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="interval">Intervall</Label>
          <Select name="interval" value={interval} onValueChange={(v) => setBillingInterval(v as BillingInterval)}>
            <SelectTrigger id="interval" className="w-full" aria-invalid={Boolean(errors.interval)}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MONTHLY">Monatlich</SelectItem>
              <SelectItem value="YEARLY">Jährlich</SelectItem>
            </SelectContent>
          </Select>
          <FieldError message={errors.interval} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label>Erste Fälligkeit</Label>
          <DateField name="startDate" value={startDate} onChange={setStartDate} invalid={Boolean(errors.startDate)} />
          <FieldError message={errors.startDate} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="categoryId">Kategorie</Label>
          <Select name="categoryId" value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger id="categoryId" className="w-full" aria-invalid={Boolean(errors.categoryId)}>
              <SelectValue placeholder="Wählen …" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
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
      <p className="-mt-2 text-xs text-muted-foreground">
        Der Tag der ersten Fälligkeit gilt als Abrechnungstag
        {interval === "YEARLY" ? ", der Monat als jährlicher Fälligkeitsmonat" : ""}.
      </p>

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
        />
        <FieldError message={errors.note} />
      </div>

      <DialogFooter>
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {pending && <Loader2 className="animate-spin" />}
          {subscription ? "Speichern" : "Hinzufügen"}
        </Button>
      </DialogFooter>
    </form>
  );
}

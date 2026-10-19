"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CategoryOption } from "@/lib/data/transactions";
import { formatMonthLabel, shiftMonth } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL = "all";

function buildHref(month: string, categoryId?: string) {
  const params = new URLSearchParams({ month });
  if (categoryId) params.set("category", categoryId);
  return `/transactions?${params}`;
}

export function TransactionFilters({
  month,
  categoryId,
  categories,
}: {
  month: string;
  categoryId?: string;
  categories: CategoryOption[];
}) {
  const router = useRouter();
  const expense = categories.filter((c) => c.type === "EXPENSE");
  const income = categories.filter((c) => c.type === "INCOME");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center rounded-lg border">
        <Button variant="ghost" size="icon" asChild aria-label="Vorheriger Monat">
          <Link href={buildHref(shiftMonth(month, -1), categoryId)}>
            <ChevronLeft />
          </Link>
        </Button>
        <span className="min-w-36 px-2 text-center text-sm font-medium tabular-nums">
          {formatMonthLabel(month)}
        </span>
        <Button variant="ghost" size="icon" asChild aria-label="Nächster Monat">
          <Link href={buildHref(shiftMonth(month, 1), categoryId)}>
            <ChevronRight />
          </Link>
        </Button>
      </div>

      <Select
        value={categoryId ?? ALL}
        onValueChange={(v) => router.push(buildHref(month, v === ALL ? undefined : v))}
      >
        <SelectTrigger className="w-48" aria-label="Nach Kategorie filtern">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Alle Kategorien</SelectItem>
          <SelectSeparator />
          <SelectGroup>
            <SelectLabel>Ausgaben</SelectLabel>
            {expense.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectGroup>
          <SelectSeparator />
          <SelectGroup>
            <SelectLabel>Einnahmen</SelectLabel>
            {income.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}

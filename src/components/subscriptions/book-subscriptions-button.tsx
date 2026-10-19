"use client";

import { useTransition } from "react";
import { CalendarCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { bookSubscriptionsForMonth } from "@/app/actions/subscriptions";
import { Button } from "@/components/ui/button";

export function BookSubscriptionsButton({
  month,
  monthLabel,
  openCount,
}: {
  month: string;
  monthLabel: string;
  openCount: number;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      disabled={pending || openCount === 0}
      onClick={() =>
        startTransition(async () => {
          const result = await bookSubscriptionsForMonth(month);
          if (result.ok) toast.success(result.message);
          else toast.error(result.message ?? "Buchen fehlgeschlagen.");
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" /> : <CalendarCheck />}
      {openCount > 0 ? `${openCount} offene für ${monthLabel} buchen` : `${monthLabel} vollständig gebucht`}
    </Button>
  );
}

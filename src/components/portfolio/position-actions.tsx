"use client";

import { useTransition } from "react";
import { Loader2, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deletePosition, refreshQuotes } from "@/app/actions/portfolio";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function RefreshQuotesButton({ disabled }: { disabled?: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      disabled={pending || disabled}
      onClick={() =>
        startTransition(async () => {
          const result = await refreshQuotes();
          if (result.ok) toast.success(result.message);
          else toast.warning(result.message ?? "Aktualisierung fehlgeschlagen.");
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" /> : <RefreshCw />}
      Kurse aktualisieren
    </Button>
  );
}

export function DeletePositionButton({ id, ticker }: { id: string; ticker: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`${ticker} löschen`} disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Trash2 />}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{ticker} aus dem Depot entfernen?</AlertDialogTitle>
          <AlertDialogDescription>Die Position wird gelöscht. Das lässt sich nicht rückgängig machen.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() =>
              startTransition(async () => {
                const result = await deletePosition(id);
                if (result.ok) toast.success(result.message);
                else toast.error(result.message ?? "Löschen fehlgeschlagen.");
              })
            }
          >
            Löschen
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

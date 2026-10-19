"use client";

import { useTransition } from "react";
import { Loader2, Pause, Play, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteSubscription, setSubscriptionActive } from "@/app/actions/subscriptions";
import type { ActionState } from "@/lib/action-state";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

function notify(result: ActionState) {
  if (result.ok) toast.success(result.message);
  else toast.error(result.message ?? "Aktion fehlgeschlagen.");
}

export function ToggleSubscriptionButton({ id, isActive }: { id: string; isActive: boolean }) {
  const [pending, startTransition] = useTransition();
  const label = isActive ? "Pausieren" : "Aktivieren";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={label}
          disabled={pending}
          onClick={() => startTransition(async () => notify(await setSubscriptionActive(id, !isActive)))}
        >
          {pending ? <Loader2 className="animate-spin" /> : isActive ? <Pause /> : <Play />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function DeleteSubscriptionButton({ id, title }: { id: string; title: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Abo löschen" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Trash2 />}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>„{title}“ löschen?</AlertDialogTitle>
          <AlertDialogDescription>
            Das Abo wird entfernt. Bereits gebuchte Zahlungen bleiben in den Transaktionen erhalten.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => startTransition(async () => notify(await deleteSubscription(id)))}
          >
            Löschen
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

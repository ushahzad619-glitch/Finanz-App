"use client";

import { useState } from "react";
import { format } from "date-fns";
import { de as dayPickerDe } from "react-day-picker/locale";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/** "2026-10-18" → lokales Date (für den Kalender) */
export function parseLocalDay(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Datumsauswahl per Kalender. Übermittelt den Kalendertag als verstecktes
 * Feld `name` im Format yyyy-MM-dd.
 */
export function DateField({
  name,
  value,
  onChange,
  invalid,
}: {
  name: string;
  value: Date;
  onChange: (date: Date) => void;
  invalid?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <input type="hidden" name={name} value={format(value, "yyyy-MM-dd")} />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" className="justify-start font-normal" aria-invalid={invalid}>
            <CalendarIcon />
            {format(value, "dd.MM.yyyy")}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            required
            selected={value}
            onSelect={(d) => {
              onChange(d);
              setOpen(false);
            }}
            locale={dayPickerDe}
            defaultMonth={value}
          />
        </PopoverContent>
      </Popover>
    </>
  );
}

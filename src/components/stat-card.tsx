import type { LucideIcon } from "lucide-react";
import { cn } from "cn";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Farbiges Icon-Plättchen – rein dekorativ (Wiedererkennung der Kachel), keine Datenfarbe.
const tones = {
  blue: { bg: "var(--tint-blue)", fg: "var(--chart-1)" },
  orange: { bg: "var(--tint-orange)", fg: "var(--chart-2)" },
  aqua: { bg: "var(--tint-aqua)", fg: "var(--chart-3)" },
  amber: { bg: "var(--tint-amber)", fg: "var(--chart-4)" },
  pink: { bg: "var(--tint-pink)", fg: "var(--chart-5)" },
  violet: { bg: "var(--tint-violet)", fg: "var(--primary)" },
} as const;

export type StatTone = keyof typeof tones;

/** Kennzahl-Kachel. Der Wert nutzt proportionale Ziffern (keine tabular-nums). */
export function StatCard({
  title,
  value,
  icon: Icon,
  hint,
  tone = "violet",
  valueClassName,
}: {
  title: string;
  value: string;
  icon?: LucideIcon;
  hint?: React.ReactNode;
  tone?: StatTone;
  valueClassName?: string;
}) {
  const t = tones[tone];
  return (
    // Farbverlauf in der Tönung der Kachel, läuft zur Kartenfläche aus
    <Card className="gap-3" style={{ backgroundImage: `linear-gradient(135deg, ${t.bg} 0%, transparent 65%)` }}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {Icon && (
          <span className="flex size-9 items-center justify-center rounded-lg" style={{ backgroundColor: t.bg, color: t.fg }}>
            <Icon className="size-[18px]" />
          </span>
        )}
      </CardHeader>
      <CardContent className="space-y-1">
        <p className={cn("text-2xl font-semibold tracking-tight", valueClassName)}>{value}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

/** Hervorgehobene Kachel mit Farbverlauf für die wichtigste Kennzahl. */
export function HeroStatCard({
  title,
  value,
  icon: Icon,
  hint,
}: {
  title: string;
  value: string;
  icon?: LucideIcon;
  hint?: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-6 text-white shadow-lg shadow-indigo-500/20 dark:from-indigo-500 dark:via-violet-600 dark:to-fuchsia-700">
      <div className="absolute -top-10 -right-10 size-40 rounded-full bg-white/10" aria-hidden />
      <div className="absolute -bottom-16 -left-6 size-40 rounded-full bg-white/5" aria-hidden />
      <div className="relative flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-medium text-white/80">{title}</p>
          <p className="text-3xl font-semibold tracking-tight sm:text-4xl">{value}</p>
          {hint && <p className="text-sm text-white/80">{hint}</p>}
        </div>
        {Icon && (
          <span className="flex size-11 items-center justify-center rounded-xl bg-white/15">
            <Icon className="size-5" />
          </span>
        )}
      </div>
    </div>
  );
}

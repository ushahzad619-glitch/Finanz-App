"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  CalendarSync,
  ChartCandlestick,
  LayoutDashboard,
  Menu,
  Wallet,
} from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme-toggle";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "Transaktionen", icon: ArrowLeftRight },
  { href: "/subscriptions", label: "Abos & Fixkosten", icon: CalendarSync },
  { href: "/portfolio", label: "Portfolio", icon: ChartCandlestick },
] as const;

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
      <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-fuchsia-600 text-white shadow-sm shadow-indigo-500/30">
        <Wallet className="size-4" />
      </span>
      Finanzen
    </Link>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {navItems.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              active && "bg-sidebar-accent text-sidebar-accent-foreground",
            )}
          >
            <Icon className={cn("size-4", active && "text-primary")} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Feste Seitenleiste ab md-Breakpoint. */
export function AppSidebar() {
  return (
    <aside className="app-glass sticky top-0 hidden h-svh w-60 shrink-0 flex-col gap-6 border-r p-4 md:flex">
      <div className="flex items-center justify-between">
        <Brand />
        <ThemeToggle />
      </div>
      <NavLinks />
    </aside>
  );
}

/** Kopfzeile mit Burger-Menü für kleine Bildschirme. */
export function MobileHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="app-glass sticky top-0 z-30 flex items-center justify-between border-b px-4 py-3 md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Menü öffnen">
            <Menu />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-4">
          <SheetHeader className="p-0 pb-4">
            <SheetTitle asChild>
              <div>
                <Brand />
              </div>
            </SheetTitle>
          </SheetHeader>
          <NavLinks onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
      <Brand />
      <ThemeToggle />
    </header>
  );
}

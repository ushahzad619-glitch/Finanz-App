import {
  Briefcase,
  Car,
  Circle,
  CircleEllipsis,
  Gamepad2,
  HandCoins,
  HeartPulse,
  House,
  PiggyBank,
  Repeat,
  Shield,
  ShoppingBag,
  ShoppingCart,
  TrendingUp,
  Utensils,
  Zap,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";
import { createElement } from "react";

// Explizite Zuordnung statt dynamischem Import: hält das Bundle klein
// und macht Tippfehler im Seed sofort sichtbar (Fallback: Circle).
const icons: Record<string, LucideIcon> = {
  house: House,
  zap: Zap,
  "shopping-cart": ShoppingCart,
  utensils: Utensils,
  "shopping-bag": ShoppingBag,
  car: Car,
  "heart-pulse": HeartPulse,
  "gamepad-2": Gamepad2,
  shield: Shield,
  repeat: Repeat,
  "circle-ellipsis": CircleEllipsis,
  briefcase: Briefcase,
  "hand-coins": HandCoins,
  "trending-up": TrendingUp,
  "piggy-bank": PiggyBank,
};

/** Rendert das Lucide-Icon einer Kategorie anhand seines Namens. */
export function CategoryIcon({ name, ...props }: { name: string } & LucideProps) {
  return createElement(icons[name] ?? Circle, props);
}

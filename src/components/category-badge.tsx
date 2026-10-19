import { CategoryIcon } from "@/lib/category-icons";

export function CategoryBadge({ name, color, icon }: { name: string; color: string; icon: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm">
      <span
        className="flex size-7 shrink-0 items-center justify-center rounded-md"
        style={{ backgroundColor: `${color}22`, color }}
      >
        <CategoryIcon name={icon} className="size-4" />
      </span>
      <span className="truncate">{name}</span>
    </span>
  );
}

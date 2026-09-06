import { cn } from "@/lib/utils";
import { useI18n, type Msg } from "@/lib/i18n.ts";

export function Onglets<T extends string>({
  items,
  actuel,
  onChange,
  label,
}: {
  items: { id: T; label: Msg }[];
  actuel: T;
  onChange: (id: T) => void;
  label: string;
}) {
  const { t } = useI18n();
  return (
    <div role="tablist" aria-label={label} className="flex flex-wrap gap-1 print:hidden">
      {items.map((it) => {
        const on = actuel === it.id;
        return (
          <button
            key={it.id}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(it.id)}
            className={cn(
              "h-11 min-w-11 rounded-sm px-3 font-mono text-[12px] tracking-wide",
              on
                ? "bg-or text-or-fg"
                : "text-sourd shadow-[0_0_0_1px_rgb(198_203_209_/_0.24)] hover:text-encre",
            )}
          >
            {t(it.label)}
          </button>
        );
      })}
    </div>
  );
}

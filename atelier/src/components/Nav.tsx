import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n.ts";
import { GROUPES, GUIDE, groupeDe, type NavId, type Page } from "@/lib/navigation.ts";

export type { NavId } from "@/lib/navigation.ts";

/** Trois registres et le Guide, depuis la liste unique de lib/navigation.ts. */
function Onglet({ it, actuel }: { it: Page; actuel: NavId }) {
  const { t } = useI18n();
  return (
    <Link
      to={it.to}
      aria-current={actuel === it.id ? "page" : undefined}
      className={cn(
        "h-8 rounded-sm px-2.5 font-mono text-[11px] tracking-wide",
        "inline-flex items-center",
        actuel === it.id
          ? "bg-or text-or-fg"
          : "text-sourd shadow-[0_0_0_1px_rgb(198_203_209_/_0.24)] hover:text-encre",
      )}
    >
      {t(it.label)}
    </Link>
  );
}

export function Nav({ actuel }: { actuel: NavId }) {
  const { t } = useI18n();
  const courant = groupeDe(actuel);
  return (
    <nav className="flex flex-wrap items-start justify-center gap-x-3 gap-y-2" aria-label="Sections">
      {GROUPES.map((g) => (
        <div key={g.id} className="flex flex-col items-center gap-1">
          <span
            className={cn(
              "font-mono text-[9.5px] uppercase tracking-[0.16em]",
              courant === g.id ? "text-encre" : "text-sourd/70",
            )}
          >
            {t(g.label)}
          </span>
          <div className="flex flex-wrap items-center justify-center gap-1">
            {g.items.map((it) => (
              <Onglet key={it.id} it={it} actuel={actuel} />
            ))}
          </div>
        </div>
      ))}
      <div className="flex flex-col items-center gap-1">
        <span className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-sourd/70">·</span>
        <Onglet it={GUIDE} actuel={actuel} />
      </div>
    </nav>
  );
}

import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n.ts";
import {
  GROUPES,
  GUIDE,
  groupeDe,
  registreDe,
  sousOnglets,
  type NavId,
  type Page,
} from "@/lib/navigation.ts";

export type { NavId } from "@/lib/navigation.ts";

/**
 * Deux rangs, depuis la liste unique de lib/navigation.ts : les trois registres
 * et le Guide en tête, puis les pages du seul registre courant en sous-onglets.
 * Sur le Guide il n'y a pas de second rang — il n'appartient à aucun registre.
 */
function Onglet({ it, actuel }: { it: Page; actuel: NavId }) {
  const { t } = useI18n();
  return (
    <Link
      to={it.to}
      aria-current={actuel === it.id ? "page" : undefined}
      className={cn(
        "h-7 rounded-sm px-2.5 font-mono text-[11px] tracking-wide",
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
  const sous = sousOnglets(actuel);
  const registre = registreDe(actuel);
  return (
    <nav className="flex flex-col items-center gap-2" aria-label="Sections">
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {GROUPES.map((g) => (
          <Link
            key={g.id}
            to={g.defaut}
            aria-current={courant === g.id ? "true" : undefined}
            className={cn(
              "h-8 rounded-sm px-3 font-mono text-[11.5px] tracking-wide",
              "inline-flex items-center",
              courant === g.id
                ? "text-encre shadow-[0_0_0_1px_rgb(198_203_209_/_0.4)]"
                : "text-sourd hover:text-encre",
            )}
          >
            {t(g.label)}
          </Link>
        ))}
        <Onglet it={GUIDE} actuel={actuel} />
      </div>
      {sous.length > 0 ? (
        <div
          className="flex flex-wrap items-center justify-center gap-1"
          aria-label={registre ? t(registre.label) : undefined}
        >
          {sous.map((it) => (
            <Onglet key={it.id} it={it} actuel={actuel} />
          ))}
        </div>
      ) : null}
    </nav>
  );
}

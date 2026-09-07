import { Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n.ts";
import { GROUPES, GUIDE, groupeDe, type NavId } from "@/lib/navigation.ts";

/**
 * L'écosystème depuis l'accueil : les mêmes pages que la barre de navigation,
 * repliées par registre. Seul le registre de la page courante est ouvert ;
 * les autres tiennent en une ligne et s'ouvrent d'un geste (`<details>` natif :
 * pas d'état React, le clavier et le mode « mouvement réduit » suivent).
 * La liste vit dans lib/navigation.ts ; ajouter une page ne touche pas ce composant.
 */
export function Ecosysteme({ actuel }: { actuel: NavId }) {
  const { t } = useI18n();
  return (
    <section className="rounded-lg bg-carte p-5 shadow-[0_0_0_1px_rgb(198_203_209_/_0.10)] sm:p-6">
      <h2 className="font-mono text-base font-normal text-encre">{t("eco.titre")}</h2>
      <p className="mt-1 font-mono text-[12.5px] leading-relaxed text-sourd text-pretty">
        {t("eco.lede")}
      </p>
      <div className="mt-4 flex flex-col gap-2">
        {GROUPES.map((g) => {
          const items = g.items.filter((p) => p.id !== actuel);
          if (items.length === 0) return null;
          return (
            <details key={g.id} open={groupeDe(actuel) === g.id} className="group">
              <summary className="flex cursor-pointer list-none items-baseline gap-2 rounded-md px-1 py-1 font-mono text-[9.5px] uppercase tracking-[0.16em] text-sourd/70 hover:text-encre">
                <span>{t(g.label)}</span>
                <span className="truncate text-[10px] normal-case tracking-normal text-sourd/60 group-open:hidden">
                  {items.map((p) => t(p.label)).join(", ")}
                </span>
              </summary>
              <ul className="mt-1.5 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {items.map((p) => (
                  <li key={p.id}>
                    <Link
                      to={p.to}
                      className="block rounded-md bg-creux px-3 py-2.5 shadow-[0_0_0_1px_rgb(198_203_209_/_0.10)] hover:shadow-[0_0_0_1px_rgb(198_203_209_/_0.3)]"
                    >
                      <span className="font-mono text-[12.5px] text-encre">{t(p.label)}</span>
                      <span className="mt-0.5 block font-mono text-[11px] leading-snug text-sourd">
                        {t(p.lede)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
          );
        })}
        {actuel !== GUIDE.id ? (
          <Link
            to={GUIDE.to}
            className="block rounded-md px-3 py-2.5 font-mono text-[12px] text-sourd shadow-[0_0_0_1px_rgb(198_203_209_/_0.16)] hover:text-encre"
          >
            {t(GUIDE.label)} · {t(GUIDE.lede)}
          </Link>
        ) : null}
      </div>
    </section>
  );
}

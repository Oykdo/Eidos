import { Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n.ts";
import {
  GROUPES,
  GUIDE,
  groupeDe,
  parentDe,
  registreDe,
  type NavId,
  type Page,
} from "@/lib/navigation.ts";

export type { NavId } from "@/lib/navigation.ts";

/**
 * Un seul menu déroulant, depuis la liste unique de lib/navigation.ts : le
 * bouton dit où l'on est (« Jouer › Tour »), la liste montre les trois
 * registres et leurs pages, puis le Guide. Décision d'auteur du 2026-09-14 :
 * la barre à deux rangs (registres, puis sous-onglets) tenait la règle des
 * quatre pages par registre mais ne montrait jamais le tout ; ici tout se
 * voit d'un coup, et rien de plus n'est chargé — c'est un `<details>` natif,
 * clavier et lecteur d'écran compris, qui se referme quand on choisit, quand
 * on clique ailleurs ou sur Échap.
 */
function Entree({ it, actuel, fermer }: { it: Page; actuel: NavId; fermer: () => void }) {
  const { t } = useI18n();
  const ici = actuel === it.id;
  return (
    <Link
      to={it.to}
      role="menuitem"
      aria-current={ici ? "page" : undefined}
      onClick={fermer}
      className={cn(
        "flex h-8 items-center rounded-sm px-2.5 font-mono text-[12px] tracking-wide",
        ici ? "bg-or text-or-fg" : "text-encre hover:bg-[rgb(198_203_209_/_0.12)]",
      )}
    >
      {t(it.label)}
    </Link>
  );
}

export function Nav({ actuel }: { actuel: NavId }) {
  const { t } = useI18n();
  const boite = useRef<HTMLDetailsElement>(null);
  const registre = registreDe(actuel);
  const courant = groupeDe(actuel);
  // Une page rattachée allume l'entrée de son parent ; le bouton, lui, la nomme.
  const allumee = parentDe(actuel);
  const nomPage =
    GROUPES.flatMap((g) => g.items).find((p) => p.id === actuel)?.label ??
    (actuel === "guide" ? GUIDE.label : `nav.${actuel}` as Page["label"]);
  const fermer = () => boite.current?.removeAttribute("open");

  useEffect(() => {
    const surPointeur = (e: PointerEvent) => {
      const el = boite.current;
      if (el !== null && el.open && e.target instanceof Node && !el.contains(e.target)) fermer();
    };
    const surTouche = (e: KeyboardEvent) => {
      if (e.key === "Escape") fermer();
    };
    document.addEventListener("pointerdown", surPointeur);
    document.addEventListener("keydown", surTouche);
    return () => {
      document.removeEventListener("pointerdown", surPointeur);
      document.removeEventListener("keydown", surTouche);
    };
  }, []);

  return (
    <nav className="flex justify-center" aria-label={t("nav.menu")}>
      <details ref={boite} className="relative">
        <summary
          className={cn(
            "flex h-9 cursor-pointer select-none list-none items-center gap-2 rounded-sm px-3",
            "font-mono text-[12px] tracking-wide text-encre",
            "shadow-[0_0_0_1px_rgb(198_203_209_/_0.4)] hover:shadow-[0_0_0_1px_rgb(198_203_209_/_0.7)]",
            "[&::-webkit-details-marker]:hidden",
          )}
        >
          {registre !== null ? (
            <>
              <span className="text-sourd">{t(registre.label)}</span>
              <span className="text-sourd" aria-hidden="true">
                ›
              </span>
            </>
          ) : null}
          <span>{t(nomPage)}</span>
          <span className="text-sourd" aria-hidden="true">
            ▾
          </span>
        </summary>
        <div
          role="menu"
          className={cn(
            "absolute left-1/2 z-30 mt-2 w-[15rem] -translate-x-1/2 rounded-md bg-fond p-2",
            "shadow-[0_0_0_1px_rgb(198_203_209_/_0.4),0_12px_32px_rgb(0_0_0_/_0.35)]",
          )}
        >
          {GROUPES.map((g) => (
            <div key={g.id} className="mb-2 last:mb-0">
              <div
                className={cn(
                  "px-2.5 pb-1 pt-1 font-mono text-[10px] uppercase tracking-[0.2em]",
                  courant === g.id ? "text-or" : "text-sourd",
                )}
              >
                {t(g.label)}
              </div>
              {g.items.map((it) => (
                <Entree key={it.id} it={it} actuel={allumee} fermer={fermer} />
              ))}
            </div>
          ))}
          <div className="mt-2 border-t border-[rgb(198_203_209_/_0.24)] pt-2">
            <Entree it={GUIDE} actuel={actuel} fermer={fermer} />
          </div>
        </div>
      </details>
    </nav>
  );
}

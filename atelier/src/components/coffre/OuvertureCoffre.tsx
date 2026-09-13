import { useEffect, useMemo, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { VoxelIcon } from "@/components/inventaire/VoxelIcon";
import { useI18n } from "@/lib/i18n.ts";
import { useCoffre } from "@/lib/store";
import { museDuTier, PROBA_TIER } from "@/lib/eidos/coffre-horaire.ts";
import { ficheDe } from "@/lib/eidos/fiche.ts";
import { titreDe } from "@/lib/eidos/titres.ts";
import type { ObjetPorte } from "@/lib/eidos/types.ts";

/**
 * L'ouverture d'un coffre de l'heure — le moment, pas la règle.
 * Montre exactement ce que le juge a accepté (`store.ouverture`) : le bloc, le tier, la muse
 * du tier (une lecture), les t objets tels qu'ils sont entrés à l'inventaire, et la graine
 * dont tout se rejoue. Un `<dialog>` natif, aucune dépendance ; se referme au clic, à Échap,
 * ou en passant à l'inventaire. Rien ici ne tire, ne juge ni ne persiste — la révélation
 * relit `coffre.objets`, elle ne l'écrit pas.
 */
export function OuvertureCoffre() {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const ouverture = useCoffre((s) => s.ouverture);
  const fermer = useCoffre((s) => s.fermerOuverture);
  const objets = useCoffre((s) => s.coffre.objets);
  const ref = useRef<HTMLDialogElement>(null);
  const ouverte = ouverture != null && !ouverture.lue;

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (ouverte && !d.open) d.showModal();
    else if (!ouverte && d.open) d.close();
  }, [ouverte]);

  const titres = useMemo(
    () => (ouverture ? ouverture.objets.map((o) => titreDe(ficheDe(o, objets), locale)) : []),
    [ouverture, objets, locale],
  );

  if (!ouverture) return null;
  const muse = museDuTier(ouverture.tier);
  const chance = `1/${Math.round(1 / PROBA_TIER[ouverture.tier - 1]!)}`;

  return (
    <dialog
      ref={ref}
      onClose={fermer}
      aria-labelledby="ouverture-titre"
      className="m-auto w-[min(92vw,34rem)] rounded-lg bg-carte p-0 text-encre shadow-[0_0_0_1px_rgb(201_162_39_/_0.35),0_24px_64px_rgb(0_0_0_/_0.6)] backdrop:bg-fond/85 backdrop:backdrop-blur-[2px]"
    >
      <div className="relative overflow-hidden px-5 pb-5 pt-6 sm:px-7">
        {/* le halo de la muse : la teinte de l'or, jamais celle de l'objet — une lecture */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-or/15 blur-3xl"
        />
        <p
          aria-hidden
          className="ouverture-astre text-center font-display text-[56px] font-light leading-none text-or"
        >
          {muse.astre}
        </p>
        <h2
          id="ouverture-titre"
          className="mt-2 text-center font-display text-[26px] font-light leading-tight text-encre"
        >
          {t("coffreh.ouverture.titre")}
        </h2>
        <p className="mt-1 text-center font-mono text-[11px] uppercase tracking-[0.14em] text-sourd">
          {t("coffreh.ouverture.sous", { h: ouverture.hauteur, t: ouverture.tier, p: chance })}
        </p>
        <p className="mt-0.5 text-center font-mono text-[12px] text-or">
          {t("coffreh.ouverture.muse", { muse: muse.muse })}
        </p>

        <ul className="mt-5 flex flex-wrap justify-center gap-3">
          {ouverture.objets.map((o: ObjetPorte, i) => (
            <li
              key={`${o.mot}-${o.nonce}`}
              className="ouverture-objet flex w-[132px] flex-col items-center rounded-md bg-fond px-2 py-2.5 shadow-[0_0_0_1px_rgb(198_203_209_/_0.16)]"
              style={{ animationDelay: `${120 + i * 90}ms` }}
            >
              <VoxelIcon objet={o} size={72} />
              <span className="mt-1.5 line-clamp-2 w-full text-center font-mono text-[10.5px] leading-tight text-or">
                {titres[i]?.nom ?? o.nom}
              </span>
              <span className="mt-0.5 line-clamp-2 w-full text-center font-mono text-[9.5px] leading-tight text-sourd">
                {titres[i]?.epithete ?? o.genre} · {o.age}
              </span>
            </li>
          ))}
        </ul>

        <p className="mt-4 text-center font-mono text-[12px] text-encre">
          {t("coffreh.ouverture.pris", { n: ouverture.objets.length })}
        </p>
        <p className="mt-1 break-all text-center font-mono text-[10px] text-sourd/80">
          {t("coffreh.ouverture.graine")} {ouverture.graine.slice(0, 16)}…{ouverture.graine.slice(-8)}
        </p>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
          <Button
            type="button"
            variant="or"
            className="sm:flex-1"
            onClick={() => {
              fermer();
              void navigate({ to: "/" });
            }}
          >
            {t("coffreh.ouverture.inventaire")}
          </Button>
          <Button
            type="button"
            variant="discret"
            className="sm:flex-1"
            onClick={() => ref.current?.close()}
          >
            {t("coffreh.ouverture.fermer")}
          </Button>
        </div>
      </div>
    </dialog>
  );
}

import { useEffect, useMemo } from "react";
import { useI18n } from "@/lib/i18n.ts";
import { useCoffre } from "@/lib/store";
import { cleClaim, coffreDe, PROBA_TIER, TIERS } from "@/lib/eidos/coffre-horaire.ts";
import { tourDe } from "@/lib/eidos/jauge.ts";
import { VoxelIcon } from "@/components/inventaire/VoxelIcon";
import { OuvertureCoffre } from "@/components/coffre/OuvertureCoffre";

/**
 * Le coffre de l'heure (docs/SPEC_COFFRE_HORAIRE.md).
 * Pour la tête suivie et chaque pièce du coffre, montre le coffre que cette pièce ouvrirait —
 * graine, tier, contenu : une lecture, tout se rejoue depuis la tête publiée. Le bouton
 * « Ouvrir » réclame pour de vrai (`store.reclamerCoffreHoraire` : le juge, puis l'inventaire),
 * et `OuvertureCoffre` montre ce que le juge a accepté. Une pièce, un bloc, une fois ; la page
 * n'offre que la tête suivie. Sans tête suivie, elle le dit et n'invente aucune heure —
 * l'horloge est le bloc.
 */
export function CoffreHoraire() {
  const { t } = useI18n();
  const hydrater = useCoffre((s) => s.hydrater);
  const reseau = useCoffre((s) => s.reseau);
  const coffre = useCoffre((s) => s.coffre);

  useEffect(() => {
    hydrater();
  }, [hydrater]);

  const tete = reseau?.verdict.ok ? reseau.tete : null;
  const miennes = useMemo(() => {
    if (!tete || !reseau) return [];
    const adresses = new Set(coffre.sorties.map((s) => s.adresse));
    return reseau.sorties.filter((s) => adresses.has(s.adresse));
  }, [tete, reseau, coffre.sorties]);

  const reclamerCoffreHoraire = useCoffre((s) => s.reclamerCoffreHoraire);
  const deja = useMemo(() => new Set(tourDe(coffre).coffres), [coffre]);
  const coffres = useMemo(
    () =>
      tete
        ? miennes.map((p) => ({
            piece: p,
            c: coffreDe(tete.idBloc, p, tete.hauteur),
            pris: deja.has(cleClaim(tete.idBloc, p)),
          }))
        : [],
    [tete, miennes, deja],
  );

  return (
    <section className="rounded-lg bg-carte p-5 shadow-[0_0_0_1px_rgb(198_203_209_/_0.10)] sm:p-6">
      <h2 className="font-mono text-base font-normal text-encre">{t("coffreh.titre")}</h2>
      <p className="mt-1 font-mono text-[12.5px] leading-relaxed text-sourd text-pretty">
        {t("coffreh.lede")}
      </p>

      {!tete ? (
        <p className="mt-4 rounded-md bg-creux px-3 py-2.5 font-mono text-[12px] text-sourd">
          {t("coffreh.sansTete")}
        </p>
      ) : (
        <>
          <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-sourd">
            {t("coffreh.bloc", { h: tete.hauteur })}
          </p>
          {coffres.length === 0 ? (
            <p className="mt-2 rounded-md bg-creux px-3 py-2.5 font-mono text-[12px] text-sourd">
              {t("coffreh.sansPiece")}
            </p>
          ) : (
            <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {coffres.map(({ piece, c, pris }) => (
                <li
                  key={`${piece.txid}:${piece.rang}`}
                  className="rounded-md bg-creux px-3 py-2.5 shadow-[0_0_0_1px_rgb(198_203_209_/_0.10)]"
                >
                  <p className="flex items-baseline justify-between gap-2 font-mono text-[12px] text-encre">
                    <span className="truncate">
                      {piece.txid.slice(0, 10)}…:{piece.rang}
                    </span>
                    <span className="text-or">{t("coffreh.tier", { t: c.tier })}</span>
                  </p>
                  <p className="mt-0.5 font-mono text-[10.5px] text-sourd">
                    {t("coffreh.chance", { p: `1/${Math.round(1 / PROBA_TIER[c.tier - 1]!)}` })} ·{" "}
                    {c.graine.slice(0, 12)}…
                  </p>
                  {/* Fermé : t places sourdes, le contenu n'est montré qu'à l'ouverture — une politique
                      d'interface, pas un secret : la graine est là, n'importe qui rejoue le tirage. */}
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {c.objets.map((o, i) => (
                      <li key={o.mot} className="flex w-[68px] flex-col items-center gap-0.5">
                        {pris ? (
                          <VoxelIcon objet={o} size={56} />
                        ) : (
                          <span
                            aria-hidden
                            className="block size-14 rounded-sm bg-fond shadow-[inset_0_0_0_1px_rgb(198_203_209_/_0.14)]"
                          />
                        )}
                        <span className="w-full truncate text-center font-mono text-[9.5px] text-sourd">
                          {pris ? `${o.genre} · ${o.age}` : `${i + 1}/${c.tier}`}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {pris ? (
                    <p className="mt-2 font-mono text-[11px] text-sourd/70">{t("coffreh.deja")}</p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => reclamerCoffreHoraire(`${piece.txid}:${piece.rang}`)}
                      className="mt-2 h-7 rounded-sm px-2.5 font-mono text-[11px] tracking-wide text-encre shadow-[0_0_0_1px_rgb(198_203_209_/_0.3)] hover:bg-or hover:text-or-fg"
                    >
                      {t("coffreh.reclamer")}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <p className="mt-4 font-mono text-[11px] leading-relaxed text-sourd/80">
        {t("coffreh.regle", { k: TIERS })}
      </p>
      <OuvertureCoffre />
    </section>
  );
}

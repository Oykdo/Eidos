import { useMemo } from "react";
import { useI18n, type Msg } from "@/lib/i18n.ts";
import { ficheDe, texteFiche } from "@/lib/eidos/fiche.ts";
import { titreDe } from "@/lib/eidos/titres.ts";
import type { ObjetPorte } from "@/lib/eidos/types.ts";

/**
 * La fiche d'un objet en trois registres — forme, caractère, traits — et un pied (sceau, bloc).
 * Une lecture, écrite sous la règle de `lib/ecriture.ts` : le joueur ne lit rien de la chaîne.
 */
export function FicheObjet({ objet, autres }: { objet: ObjetPorte; autres: readonly ObjetPorte[] }) {
  const { t, locale } = useI18n();
  const fiche = useMemo(() => ficheDe(objet, autres), [objet, autres]);
  const registres = useMemo(() => texteFiche(fiche, locale), [fiche, locale]);
  const titre = useMemo(() => titreDe(fiche, locale), [fiche, locale]);
  const blocs = [
    ["fiche.forme", registres.forme],
    ["fiche.caractere", registres.caractere],
    ["fiche.traits", registres.traits],
  ] as const;
  return (
    <div className="mt-3">
      <p className="font-mono text-[13px] text-encre">
        <span className="text-or">{titre.nom}</span>, {titre.epithete},{" "}
        <span className="text-cuivre">{titre.suffixe}</span>
      </p>
      <div className="mt-2 grid gap-3 sm:grid-cols-3">
        {blocs.map(([cle, phrases]) => (
          <section key={cle} className="rounded-md bg-fond p-3">
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-sourd">
              {t(cle as Msg)}
            </p>
            {phrases.map((s, i) => (
              <p key={i} className="mt-1 font-mono text-[12px] leading-relaxed text-encre text-pretty">
                {s}
              </p>
            ))}
            {cle === "fiche.traits" && fiche.emplacement ? (
              <p className="mt-1 font-mono text-[12px] leading-relaxed text-encre">
                {t("fiche.emplacement")} : {t(`inv.slot.${fiche.emplacement}` as Msg)}
              </p>
            ) : null}
          </section>
        ))}
      </div>
      <p className="mt-2 font-mono text-[11px] text-sourd">{registres.pied}</p>
    </div>
  );
}

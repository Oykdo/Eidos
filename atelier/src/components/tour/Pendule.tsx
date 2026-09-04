import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n.ts";
import { useCoffre } from "@/lib/store.ts";
import { cn } from "@/lib/utils";
import { ascensionDe, choixDeSalle, enCours } from "@/lib/eidos/ascension.ts";
import { tourDe } from "@/lib/eidos/jauge.ts";
import { ETAPES } from "@/lib/eidos/pendule.ts";
import { SIGNATURES } from "@/lib/eidos/signatures.ts";

/** Crans du cadran : Terre en bas, Uranie en haut — même ordre que la Tour. */
const CRANS = [...SIGNATURES].reverse();

function court(h: string): string {
  return `${h.slice(0, 8)}…${h.slice(-4)}`;
}

/** Le pendule : cadran à neuf crans, salle courante, fin de salle. */
export function Pendule() {
  const { t } = useI18n();
  const coffre = useCoffre((s) => s.coffre);
  const reseau = useCoffre((s) => s.reseau);
  const suivreReseau = useCoffre((s) => s.suivreReseau);
  const commencer = useCoffre((s) => s.commencerAscension);
  const finDeSalle = useCoffre((s) => s.finDeSalle);
  const abandonner = useCoffre((s) => s.abandonnerAscension);
  const derniere = useCoffre((s) => s.derniereAscension);
  const [ref, setRef] = useState("");

  const tour = tourDe(coffre);
  const a = ascensionDe(coffre);
  const active = enCours(coffre);
  const miennes = new Set(coffre.sorties.map((s) => s.adresse));
  const ancrables = reseau?.verdict.ok ? reseau.sorties.filter((s) => miennes.has(s.adresse)) : [];
  const choixLu = active ? choixDeSalle(tour, tour.etage) : null;

  return (
    <div className="mt-4 rounded-md bg-fond p-3">
      <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-sourd">{t("tour.pendule")}</p>
      <p className="mt-1 font-mono text-[12px] leading-relaxed text-sourd text-pretty">{t("tour.pendule.lede")}</p>

      <div className="mt-3 flex items-start gap-4">
        <ol className="flex flex-col gap-[3px]" aria-label={t("tour.pendule.cadran")}>
          {CRANS.map((s, i) => {
            const cran = CRANS.length - 1 - i;
            const ici = a !== null && a.p === cran;
            return (
              <li
                key={s.id}
                className={cn(
                  "flex h-5 items-center gap-2 rounded-sm px-1.5 font-mono text-[11px]",
                  ici ? "bg-or text-or-fg" : "text-sourd",
                )}
              >
                <span className="w-3 text-center">{s.astre}</span>
                <span className={ici ? "" : "opacity-70"}>{s.muse}</span>
                {ici ? <span className="ml-1">◀</span> : null}
              </li>
            );
          })}
        </ol>
        <div className="min-w-0 flex-1 font-mono text-[12px] text-encre">
          {a ? (
            <>
              <p>
                {t("tour.pendule.salle", { i: a.etape + 1, n: ETAPES })} · {a.ancre ? t("tour.pendule.ancree") : t("tour.pendule.libre")}
              </p>
              <p className="mt-1 text-sourd">
                {t("tour.pendule.arrivee", { x: a.spawn.x, y: a.spawn.y })}
                {a.ancre ? ` · ${t("tour.pendule.piece")} ${court(a.ancre.piece.txid)}:${a.ancre.piece.rang} · ${t("carte.bloc", { b: a.ancre.tete.hauteur })}` : ""}
              </p>
              {a.fin ? (
                <p className="mt-1 text-cuivre">{t(`tour.pendule.fin.${a.fin}`)}</p>
              ) : (
                <p className="mt-1 text-sourd">
                  {t("tour.pendule.lu")} : <span className="text-encre">{t(`tour.pendule.choix.${choixLu ?? "monter"}`)}</span>
                  {tour.porte !== null ? ` · ${t("tour.pendule.porte")}` : ` · ${t("tour.pendule.sansPorte")}`}
                </p>
              )}
            </>
          ) : (
            <p className="text-sourd">{t("tour.pendule.aucune")}</p>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {active ? (
          <>
            <Button type="button" variant="or" className="w-auto" onClick={() => finDeSalle()}>
              {t("tour.pendule.finDeSalle")}
            </Button>
            <Button type="button" variant="discret" className="w-auto" onClick={() => abandonner()}>
              {t("tour.pendule.abandonner")}
            </Button>
          </>
        ) : (
          <>
            <Button type="button" variant="or" className="w-auto" onClick={() => commencer(null)}>
              {t("tour.pendule.commencerLibre")}
            </Button>
            {reseau?.verdict.ok ? (
              ancrables.length > 0 ? (
                <>
                  <select
                    value={ref}
                    onChange={(e) => setRef(e.target.value)}
                    className="rounded-sm bg-creux px-2 py-1 font-mono text-[11px] text-encre shadow-[0_0_0_1px_rgb(198_203_209_/_0.16)]"
                  >
                    <option value="">{t("tour.pendule.choisirPiece")}</option>
                    {ancrables.map((s) => (
                      <option key={`${s.txid}:${s.rang}`} value={`${s.txid}:${s.rang}`}>
                        {court(s.txid)}:{s.rang} · {(s.montant / 1e8).toFixed(4)}
                      </option>
                    ))}
                  </select>
                  <Button type="button" variant="discret" className="w-auto" disabled={!ref} onClick={() => commencer(ref)}>
                    {t("tour.pendule.commencerAncree")}
                  </Button>
                </>
              ) : (
                <span className="self-center font-mono text-[11px] text-sourd">{t("tour.pendule.sansPiece")}</span>
              )
            ) : (
              <Button type="button" variant="discret" className="w-auto" onClick={() => void suivreReseau()}>
                {t("temoin.reseau.suivre")}
              </Button>
            )}
          </>
        )}
      </div>

      {derniere ? (
        <div className="mt-3">
          <p className="font-mono text-[12px] text-cuivre">{t("tour.pendule.exportee")}</p>
          <textarea readOnly value={derniere} rows={3} className="mt-1 w-full rounded-sm bg-carte p-2 font-mono text-[10px] text-sourd" />
          <Button type="button" variant="discret" className="mt-1 w-auto" onClick={() => void navigator.clipboard?.writeText(derniere)}>
            {t("relique.qr.copier")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

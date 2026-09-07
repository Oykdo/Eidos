import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Shell } from "@/components/Shell";
import { useI18n, type Msg } from "@/lib/i18n.ts";
import { useCoffre } from "@/lib/store.ts";
import { cn } from "@/lib/utils";
import { destinationsDeSalle } from "@/lib/eidos/ascension.ts";
import { estCapsule, occupantsRestants } from "@/lib/eidos/capsules.ts";
import { tetesDeLaVeillee } from "@/lib/eidos/chaine-reseau.ts";
import { fantomeDe, nomDeSalle } from "@/lib/eidos/fantomes.ts";
import { spawnIci } from "@/lib/eidos/fouilles.ts";
import { aUnHote, donHonore } from "@/lib/eidos/hotes.ts";
import { tourDe } from "@/lib/eidos/jauge.ts";
import { ETAPES } from "@/lib/eidos/pendule.ts";
import { aUneAlcove } from "@/lib/eidos/secrets.ts";
import { biomeDe } from "@/lib/eidos/tour.ts";
import { FEUILLES, feuillesRestantes, jugerVeillee, lectureVeillee, scoreVeillee } from "@/lib/eidos/veillee.ts";
import { REPLIQUES_VEILLEE } from "@/lib/eidos/veillee-lexique.ts";
import { SAC_PLACES, veilleeDe } from "@/lib/eidos/veillee-tour.ts";
import { fantomesDeSalle, nomDeFichier } from "@/lib/eidos/classement.ts";
import { ArbreFeuilles } from "@/components/veillee/ArbreFeuilles";

function court(h: string): string {
  return `${h.slice(0, 8)}…${h.slice(-4)}`;
}

/** Une issue préremplie : le titre dit « veillée », le corps reste au joueur (le fichier s'y glisse). */
const ISSUE_VEILLEE_URL =
  "https://github.com/Oykdo/Eidos/issues/new?title=" +
  encodeURIComponent("veillée") +
  "&body=" +
  encodeURIComponent("Ma preuve de veillée est jointe ci-dessous (glisser le fichier .json ici).\n");

/** La Veillée : l'arbre de feuilles, la salle du jour, les gestes, la preuve. */
export function VeilleeView() {
  const { t, locale } = useI18n();
  const coffre = useCoffre((s) => s.coffre);
  const monde = useCoffre((s) => s.monde);
  const reseau = useCoffre((s) => s.reseau);
  const reseauOccupe = useCoffre((s) => s.reseauOccupe);
  const suivreReseau = useCoffre((s) => s.suivreReseau);
  const chaine = useCoffre((s) => s.chaine);
  const chaineOccupe = useCoffre((s) => s.chaineOccupe);
  const suivreChaine = useCoffre((s) => s.suivreChaine);
  const federation = useCoffre((s) => s.federation);
  const ouvrir = useCoffre((s) => s.ouvrirVeillee);
  const parler = useCoffre((s) => s.veilleeParler);
  const creuser = useCoffre((s) => s.veilleeCreuser);
  const alcove = useCoffre((s) => s.veilleeAlcove);
  const capturer = useCoffre((s) => s.veilleeCapturer);
  const franchir = useCoffre((s) => s.veilleeFranchir);
  const effacer = useCoffre((s) => s.veilleeAbandonner);
  const nouvelle = useCoffre((s) => s.veilleeEffacer);
  const derniere = useCoffre((s) => s.derniereVeillee);
  const classement = useCoffre((s) => s.classement);
  const classementRefus = useCoffre((s) => s.classementRefus);
  const classementOccupe = useCoffre((s) => s.classementOccupe);
  const lireClassement = useCoffre((s) => s.lireClassement);
  const erreur = useCoffre((s) => s.erreur);
  const flash = useCoffre((s) => s.flash);
  const [ref, setRef] = useState("");

  const tour = tourDe(coffre);
  const etage = tour.etage;
  const w = veilleeDe(coffre);
  const active = w !== null && w.v.fin === null;
  const jourInfo = useMemo(() => (chaine ? tetesDeLaVeillee(chaine.tetes) : null), [chaine]);
  const miennes = new Set(coffre.sorties.map((s) => s.adresse));
  const ancrables = reseau?.verdict.ok ? reseau.sorties.filter((s) => miennes.has(s.adresse)) : [];
  const dests = useMemo(() => (active ? destinationsDeSalle(coffre, monde) : null), [active, coffre, monde]);
  const biome = biomeDe(etage);
  const spawn = active ? spawnIci(coffre, etage) : null;
  const capsuleIndex = (coffre.objets ?? []).findIndex((o) => estCapsule(o));
  const occupants = active ? occupantsRestants(coffre, etage) : [];
  const verdict = w && w.v.fin !== null && w.v.ancre && federation ? jugerVeillee(w.v, federation) : null;
  const lecture = w ? lectureVeillee(w.v) : null;
  const fantome =
    w && w.v.fin !== null
      ? fantomeDe(
          { fin: w.v.fin, etageFinal: etage, hauteurBloc: w.v.tete.hauteur },
          reseau?.tete.hauteur ?? w.v.tete.hauteur,
          locale,
        )
      : null;
  const feuilles = w ? feuillesRestantes(w.v) : FEUILLES;
  const hauteurCourante = reseau?.tete.hauteur ?? w?.v.tete.hauteur ?? 0;
  const fantomesIci = useMemo(
    () => (w && classement ? fantomesDeSalle(classement.classees, etage, hauteurCourante, locale) : []),
    [w, classement, etage, hauteurCourante, locale],
  );
  const fichier = w && w.v.fin !== null && w.v.ancre ? nomDeFichier(w.v) : null;

  return (
    <Shell actuel="veillee">
      <section className="rounded-lg bg-carte p-4 shadow-[0_0_0_1px_rgb(198_203_209_/_0.10)] sm:p-5">
        <h2 className="font-mono text-base font-normal text-encre">{t("veillee.titre")}</h2>
        <p className="mt-2 font-mono text-[12.5px] leading-relaxed text-sourd text-pretty">
          {t("veillee.lede")}
        </p>

        {/* Le jour : la chaîne lue, la tête suivie */}
        <div className="mt-4 rounded-md bg-fond p-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-sourd">{t("veillee.jour.titre")}</p>
          <p className="mt-1 font-mono text-[12px] text-encre">
            {chaine ? t("veillee.chaine.hauteur", { h: chaine.hauteur }) : t("veillee.chaine.aucune")}
            {" · "}
            {reseau?.verdict.ok ? t("carte.bloc", { b: reseau.tete.hauteur }) : t("veillee.reseau.aucun")}
          </p>
          <p className="mt-1 font-mono text-[12px] text-sourd">
            {jourInfo
              ? `${t("veillee.jour", { h: jourInfo.tete.hauteur, v: jourInfo.veille.hauteur })} · ${court(jourInfo.tete.idBloc)}`
              : chaine
                ? t("veillee.jour.aucun")
                : ""}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Button type="button" variant="discret" className="w-auto" disabled={chaineOccupe} onClick={() => void suivreChaine()}>
              {t("veillee.chaine.lire")}
            </Button>
            <Button type="button" variant="discret" className="w-auto" disabled={reseauOccupe} onClick={() => void suivreReseau()}>
              {t("temoin.reseau.suivre")}
            </Button>
          </div>
        </div>

        {/* Ouvrir, ou la salle en cours, ou la fin */}
        <div className="mt-4 rounded-md bg-fond p-3">
          {!w ? (
            <>
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-sourd">{t("veillee.ouvrir")}</p>
              {coffre.nature === "atelier" ? (
                <p className="mt-1 font-mono text-[12px] text-cuivre">{t("veillee.atelier")}</p>
              ) : null}
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <Button
                  type="button"
                  variant="discret"
                  className="w-auto"
                  disabled={!jourInfo}
                  title={!jourInfo ? t("veillee.err.chaine") : undefined}
                  onClick={() => ouvrir(null)}
                >
                  {t("veillee.ouvrirLibre")}
                </Button>
                {ancrables.length > 0 ? (
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
                    <Button type="button" variant="or" className="w-auto" disabled={!ref || !jourInfo} onClick={() => ouvrir(ref)}>
                      {t("veillee.ouvrir")}
                    </Button>
                  </>
                ) : (
                  <span className="font-mono text-[11px] text-sourd">
                    {reseau?.verdict.ok ? t("tour.pendule.sansPiece") : t("veillee.err.tete")}
                  </span>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-baseline gap-3">
                <span className={cn("font-mono text-3xl tabular-nums", feuilles <= 8 ? "text-cuivre" : "text-encre")}>
                  {feuilles}
                </span>
                <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-sourd">{t("veillee.feuilles")}</span>
              </div>
              <p className="mt-2 font-mono text-[13px] text-encre">
                {t("veillee.salle", { i: (tour.ascension?.etape ?? 0) + 1, n: ETAPES, e: etage })} · {biome.astre} {biome.muse}
                {" · "}
                <span className={w.v.ancre ? "text-or" : "text-sourd"}>{w.v.ancre ? t("veillee.ancree") : t("veillee.libre")}</span>
              </p>
              <p className="mt-1 font-mono text-[12px] text-or">{nomDeSalle(etage, locale)}</p>
              <p className="mt-1 font-mono text-[12px] text-sourd">
                {t("veillee.sac", { n: w.sac.length, max: SAC_PLACES })}
                {w.sac.length > 0 ? ` · ${w.sac.map((o) => o.nom).join(", ")}` : ""}
              </p>
              <p className="mt-1 font-mono text-[12px] italic text-sourd">« {REPLIQUES_VEILLEE[biome.id][locale]} »</p>
              <div className="mt-3">
                <ArbreFeuilles v={w.v} langue={locale} />
              </div>
              {classement ? (
                <p className="mt-2 font-mono text-[12px] text-sourd">
                  {t("veillee.fantomes.salle")} :{" "}
                  {fantomesIci.length === 0
                    ? t("veillee.fantomes.aucun")
                    : fantomesIci.map((f) => t("veillee.fantomes.un", { nom: f.fantome.nom, n: f.feuilles })).join(" · ")}
                </p>
              ) : null}
              {w.v.fin === null ? (
                <>
                  <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.12em] text-sourd">{t("veillee.gestes")}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Button
                      type="button"
                      variant="discret"
                      className="w-auto"
                      disabled={!aUnHote(etage) || donHonore(coffre, etage)}
                      title={!aUnHote(etage) ? t("veillee.parler.aucun") : donHonore(coffre, etage) ? t("veillee.parler.deja") : undefined}
                      onClick={() => parler()}
                    >
                      {t("veillee.parler")}
                    </Button>
                    {spawn ? (
                      <Button type="button" variant="discret" className="w-auto" onClick={() => creuser(spawn.x, spawn.y)}>
                        {t("veillee.creuser", { x: spawn.x, y: spawn.y })}
                      </Button>
                    ) : null}
                    {aUneAlcove(etage) ? (
                      <Button type="button" variant="discret" className="w-auto" disabled={tour.alcoves.includes(etage)} onClick={() => alcove()}>
                        {t("veillee.alcove")}
                      </Button>
                    ) : null}
                    {occupants.map((o) => (
                      <Button
                        key={o.k}
                        type="button"
                        variant="discret"
                        className="w-auto"
                        disabled={capsuleIndex < 0}
                        title={capsuleIndex < 0 ? t("veillee.prendre.sansCapsule") : undefined}
                        onClick={() => capturer(o.k, capsuleIndex)}
                      >
                        {t("veillee.prendre", { k: o.k })}
                      </Button>
                    ))}
                  </div>
                  <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.12em] text-sourd">{t("veillee.franchir")}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {dests?.map((d) => (
                      <Button
                        key={d.choix}
                        type="button"
                        variant={d.lu ? "or" : "discret"}
                        className="w-auto"
                        title={d.porteFermee ? t("tour.pendule.porteFermee") : undefined}
                        onClick={() => franchir(d.choix)}
                      >
                        {t(`tour.pendule.choix.${d.choix}` as Msg)} →{" "}
                        {t("tour.pendule.vers", { n: d.etage, muse: biomeDe(d.etage).muse })}
                        {d.porteFermee ? ` · ${t("tour.pendule.porteFermee")}` : ""}
                      </Button>
                    ))}
                    <Button type="button" variant="discret" className="w-auto" onClick={() => effacer()}>
                      {t("veillee.effacer")}
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="mt-3 font-mono text-[12px] text-cuivre">{t(`veillee.fin.${w.v.fin}` as Msg)}</p>
                  <p className="mt-1 font-mono text-[12px] text-encre">
                    {!w.v.ancre && lecture
                      ? t("veillee.libre.lecture", { salles: lecture.salles, butin: lecture.butin, score: scoreVeillee(lecture) })
                      : verdict
                        ? verdict.ok
                          ? t("veillee.verdict", { salles: verdict.salles, butin: verdict.butin, score: scoreVeillee(verdict) })
                          : t("veillee.verdict.ko", { motif: verdict.motif })
                        : t("veillee.verdict.sansFed")}
                  </p>
                  {fantome ? <p className="mt-1 font-mono text-[12px] text-sourd">{t("veillee.fantome", { nom: fantome.nom })}</p> : null}
                  {derniere ? (
                    <div className="mt-2">
                      <p className="font-mono text-[12px] text-cuivre">{t("veillee.exportee")}</p>
                      {fichier ? <p className="mt-1 font-mono text-[11px] text-sourd">{t("veillee.export.fichier", { f: fichier })}</p> : null}
                      <p className="mt-1 font-mono text-[11px] text-sourd">{t("veillee.export.issue")}</p>
                      <Button asChild variant="discret" className="mt-1 w-auto">
                        <a href={ISSUE_VEILLEE_URL} target="_blank" rel="noreferrer">
                          {t("veillee.export.issueBouton")}
                        </a>
                      </Button>
                      <textarea readOnly value={derniere} rows={3} className="mt-1 w-full rounded-sm bg-carte p-2 font-mono text-[10px] text-sourd" />
                      <Button type="button" variant="discret" className="mt-1 w-auto" onClick={() => void navigator.clipboard?.writeText(derniere)}>
                        {t("relique.qr.copier")}
                      </Button>
                    </div>
                  ) : coffre.nature === "atelier" ? (
                    <p className="mt-1 font-mono text-[12px] text-sourd">{t("veillee.atelier")}</p>
                  ) : null}
                  <Button type="button" variant="discret" className="mt-2 w-auto" onClick={() => nouvelle()}>
                    {t("veillee.nouvelle")}
                  </Button>
                </>
              )}
            </>
          )}
        </div>

        {/* Le classement : des preuves relues, jamais un serveur */}
        <div className="mt-4 rounded-md bg-fond p-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-sourd">{t("veillee.classement.titre")}</p>
          <p className="mt-1 font-mono text-[12px] leading-relaxed text-sourd text-pretty">{t("veillee.classement.lede")}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Button type="button" variant="discret" className="w-auto" disabled={classementOccupe || !federation} title={!federation ? t("veillee.err.classement") : undefined} onClick={() => void lireClassement()}>
              {t("veillee.classement.lire")}
            </Button>
          </div>
          {classement ? (
            classement.classees.length === 0 && classement.refusees.length === 0 && classementRefus.length === 0 ? (
              <p className="mt-2 font-mono text-[12px] text-sourd">{t("veillee.classement.vide")}</p>
            ) : (
              <>
                <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.1em] text-sourd">{t("veillee.classement.colonnes")}</p>
                <ol className="mt-1 flex flex-col gap-[2px]">
                  {classement.classees.map((c) => (
                    <li key={`${c.jour}:${c.piece}`} className="font-mono text-[12px] text-encre">
                      <span className="text-or">{c.rang}</span> · {c.fantome.nom} · {c.salles} · {c.butin} · {c.score} · {c.feuilles} · {c.jour} · {court(c.piece)}
                    </li>
                  ))}
                </ol>
                {classement.refusees.length > 0 || classementRefus.length > 0 ? (
                  <div className="mt-2">
                    <p className="font-mono text-[11px] text-cuivre">{t("veillee.classement.refus")}</p>
                    <ul className="mt-1 flex flex-col gap-[2px]">
                      {classementRefus.map((r) => (
                        <li key={`f:${r.fichier}`} className="font-mono text-[11px] text-sourd">
                          {r.fichier} — {r.motif}
                        </li>
                      ))}
                      {classement.refusees.map((r) => (
                        <li key={`r:${r.n}`} className="font-mono text-[11px] text-sourd">
                          {r.piece ? court(r.piece) : "—"} · {r.jour} — {r.motif}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </>
            )
          ) : null}
        </div>

        {erreur ? <p className="mt-3 font-mono text-[12px] text-cuivre">{erreur}</p> : null}
        {flash ? <p className="mt-3 font-mono text-[12px] text-or">{flash}</p> : null}
      </section>
    </Shell>
  );
}

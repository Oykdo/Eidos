import { useEffect, useMemo } from "react";
import { Droplets, Mail, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlyphAddress } from "@/components/GlyphAddress";
import { courrielDemande, demanderAuReseau } from "@/lib/eidos/robinet.ts";
import { useCoffre } from "@/lib/store.ts";
import { useI18n } from "@/lib/i18n.ts";

/**
 * Le robinet, depuis l'accueil. Coffre d'atelier : un versement local,
 * gratuit et sans valeur. Coffre personnel : la demande au réseau par l'un
 * des canaux que le nœud publie (etat.json.robinet_canaux) — l'issue GitHub
 * préremplie, ou un courriel prérempli quand une boîte est déclarée —, puis
 * le suivi de la demande dans mempool.json et l'import des pièces servies.
 * La page porte la demande ; le nœud tranche.
 */
export function Robinet() {
  const { t } = useI18n();
  const coffre = useCoffre((s) => s.coffre);
  const robinet = useCoffre((s) => s.robinet);
  const canaux = useCoffre((s) => s.canaux);
  const statut = useCoffre((s) => s.demandeStatut);
  const hauteur = useCoffre((s) => s.reseauHauteur);
  const occupe = useCoffre((s) => s.robinetOccupe);
  const lireRobinet = useCoffre((s) => s.lireRobinet);
  const chargerReseau = useCoffre((s) => s.chargerReseau);
  const noterDemande = useCoffre((s) => s.noterDemande);
  const erreur = useCoffre((s) => s.erreur);
  const flash = useCoffre((s) => s.flash);

  const personnel = coffre.nature === "personnel";
  const maitre = coffre.maitre;
  const n = coffre.n;

  useEffect(() => {
    void lireRobinet();
  }, [lireRobinet, maitre, n]);

  const issue = useMemo(() => (personnel ? demanderAuReseau(coffre) : null), [coffre, personnel]);
  const courriel = useMemo(
    () => (personnel && canaux?.courriel ? courrielDemande(coffre, canaux.courriel) : null),
    [coffre, personnel, canaux],
  );

  return (
    <section className="rounded-lg bg-carte p-5 shadow-[0_0_0_1px_rgb(198_203_209_/_0.10)] sm:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-mono text-base font-normal text-encre">{t("robinet.titre")}</h2>
        {hauteur !== null ? (
          <p className="font-mono text-[11px] tabular-nums text-sourd">{t("robinet.hauteur", { h: hauteur })}</p>
        ) : null}
      </div>
      <p className="mt-1 font-mono text-[12.5px] leading-relaxed text-sourd text-pretty">{t("robinet.lede")}</p>

      {!personnel ? (
        <div className="mt-4 flex flex-col gap-2">
          <p className="font-mono text-[12.5px] leading-relaxed text-sourd text-pretty">{t("atelier.aidePublique")}</p>
          <Button type="button" variant="discret" onClick={() => void robinet()}>
            <Droplets className="size-4" strokeWidth={1.75} />
            {t("atelier.robinetLocal")}
          </Button>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {issue && !("refus" in issue) ? (
            <div>
              <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.12em] text-sourd">{t("robinet.adresse")}</p>
              <GlyphAddress hexa={issue.hexa} compact />
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            {issue && !("refus" in issue) ? (
              <a
                href={issue.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => noterDemande(issue)}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-sm bg-or px-4 font-mono text-sm font-medium text-or-fg hover:opacity-90"
              >
                <Droplets className="size-4" strokeWidth={1.75} />
                {t("robinet.parIssue")}
              </a>
            ) : null}
            <p className="font-mono text-[11px] leading-snug text-sourd">{t("robinet.parIssueAide")}</p>

            {courriel && !("refus" in courriel) ? (
              <>
                <a
                  href={courriel.url}
                  onClick={() => noterDemande(courriel)}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-sm bg-transparent px-4 font-mono text-sm font-medium text-encre shadow-[0_0_0_1px_rgb(198_203_209_/_0.24)] hover:shadow-[0_0_0_1px_rgb(198_203_209_/_0.4)]"
                >
                  <Mail className="size-4" strokeWidth={1.75} />
                  {t("robinet.parCourriel")}
                </a>
                <p className="font-mono text-[11px] leading-snug text-sourd">
                  {t("robinet.parCourrielAide", { boite: canaux?.courriel ?? "" })}
                </p>
              </>
            ) : (
              <p className="font-mono text-[11px] leading-snug text-sourd">{t("robinet.sansCourriel")}</p>
            )}
          </div>

          <p className="font-mono text-[12.5px] leading-relaxed text-encre" role="status">
            {statut === null
              ? t("robinet.statut.aucune")
              : statut.etat === "en_attente"
                ? t("robinet.statut.attente", { canal: statut.canal })
                : statut.etat === "servie"
                  ? t("robinet.statut.servie", { bloc: statut.bloc ?? "?" })
                  : t("robinet.statut.refus", { motif: statut.motif ?? "" })}
          </p>

          <Button type="button" variant="discret" disabled={occupe} onClick={() => void chargerReseau()}>
            <RefreshCw className="size-4" strokeWidth={1.75} />
            {t("robinet.charger")}
          </Button>
        </div>
      )}

      <p className="verdict mt-3 min-h-5 font-mono text-sm" role="status">
        {erreur ? <span className="text-fer">{erreur}</span> : null}
        {!erreur && flash ? <span className="text-cuivre">{flash}</span> : null}
      </p>
    </section>
  );
}

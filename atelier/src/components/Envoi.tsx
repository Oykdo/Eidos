import { useMemo, useState } from "react";
import { ArrowUpRight, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { useCoffre } from "@/lib/store.ts";
import { parserMontant, selectionner } from "@/lib/eidos/coinselect.ts";
import { useI18n } from "@/lib/i18n.ts";

/**
 * Envoyer une pièce — deux temps, et il faut les distinguer.
 *
 * **Signer** est local et irréversible : le coffre retire ses pièces et brûle
 * la clé WOTS+ de chaque entrée, puisqu'une clé ne signe qu'une fois.
 * **Déposer** porte la dépense au réseau, par une issue que `robinet.py` lit
 * et que `noeud.py` rejoue sur une copie du carnet avant de l'inclure ou de
 * la refuser avec un motif. Entre les deux, rien n'est envoyé — et le texte
 * de l'interface doit le dire, sous peine de promettre plus que le code.
 *
 * La destination se saisit **en glyphes** et jamais en hexadécimal : les
 * quatre derniers groupes sont la somme de contrôle (`verifierAdresse`), donc
 * une adresse altérée est refusée **avant** toute signature. Sans ce garde-fou
 * une saisie vide signait vers l'adresse nulle, ce qui brûlait la pièce et la
 * clé sans rien transmettre à personne.
 *
 * LIMITE : rien ici n'engage. Le dépôt est un lien vers une issue, que
 * l'utilisateur poste lui-même ; l'atelier ne parle jamais au réseau pour
 * dépenser. Seul le carnet du nœud tranche.
 */
export function Envoi() {
  const { t } = useI18n();
  const coffre = useCoffre((s) => s.coffre);
  const saisie = useCoffre((s) => s.saisieMontant);
  const setMontant = useCoffre((s) => s.setMontant);
  const dest = useCoffre((s) => s.saisieDest);
  const setDest = useCoffre((s) => s.setDest);
  const envoyer = useCoffre((s) => s.envoyer);
  const regrouper = useCoffre((s) => s.regrouper);
  const envoiSigne = useCoffre((s) => s.envoiSigne);
  const oublierEnvoi = useCoffre((s) => s.oublierEnvoi);
  const erreur = useCoffre((s) => s.erreur);
  const flash = useCoffre((s) => s.flash);
  const [copie, setCopie] = useState(false);
  const m = parserMontant(saisie);
  const sel = useMemo(() => {
    if (m == null) return selectionner(coffre.sorties, 0);
    return selectionner(coffre.sorties, m);
  }, [coffre.sorties, m]);

  const fragmente = sel && !sel.ok && sel.code === "fragmente";
  // Le bouton n'est offert que si le montant tient ET qu'une destination est
  // saisie : signer sans destinataire n'a aucun sens, et coûterait une clé.
  const pret = Boolean(sel && sel.ok && m && m > 0 && dest.trim().length > 0);

  async function copier(texte: string) {
    try {
      await navigator.clipboard.writeText(texte);
      setCopie(true);
    } catch {
      setCopie(false);
    }
  }

  return (
    <section className="rounded-lg bg-carte p-5 shadow-[0_0_0_1px_rgb(198_203_209_/_0.10)] sm:p-6">
      <h2 className="font-mono text-base font-normal text-encre">{t("envoi.titre")}</h2>

      <Label htmlFor="montant">{t("envoi.montant")}</Label>
      <Input
        id="montant"
        inputMode="decimal"
        autoComplete="off"
        placeholder="0.50"
        value={saisie}
        onChange={(e) => setMontant(e.target.value)}
        className="tabular-nums"
      />

      <div className="mt-3">
        <Label htmlFor="dest">{t("envoi.dest")}</Label>
        <Input
          id="dest"
          autoComplete="off"
          spellCheck={false}
          aria-describedby="dest-aide"
          value={dest}
          onChange={(e) => setDest(e.target.value)}
        />
        <p id="dest-aide" className="mt-1 font-mono text-[11px] leading-snug text-sourd">
          {t("envoi.destAide")}
        </p>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {fragmente ? (
          <Button type="button" onClick={() => void regrouper()}>
            {t("envoi.regrouper")}
          </Button>
        ) : (
          <Button type="button" disabled={!pret} onClick={() => void envoyer()}>
            <ArrowUpRight className="size-4" strokeWidth={1.75} />
            {t("envoi.envoyer")}
          </Button>
        )}
      </div>

      <p className="verdict mt-3 min-h-5 font-mono text-sm" role="status">
        {erreur ? <span className="text-fer">{erreur}</span> : null}
        {!erreur && flash ? <span className="text-cuivre">{flash}</span> : null}
      </p>

      {envoiSigne ? (
        <div className="mt-4 rounded-md bg-creux p-4 shadow-[0_0_0_1px_rgb(198_203_209_/_0.10)]">
          <p className="font-mono text-[12.5px] leading-relaxed text-sourd text-pretty">
            {t("envoi.signe")}
          </p>
          <p className="mt-2 font-mono text-[11px] text-sourd">
            txid <span className="text-encre">{envoiSigne.txid.slice(0, 16)}…</span>
          </p>
          {envoiSigne.texte.length > 65_536 ? (
            <p className="mt-2 font-mono text-[12px] text-fer">{t("envoi.tropLong")}</p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" onClick={() => void copier(envoiSigne.texte)}>
              <Copy className="size-4" strokeWidth={1.75} />
              {copie ? t("envoi.copie") : t("envoi.copier")}
            </Button>
            <a
              href={envoiSigne.url}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-2 rounded-md bg-carte px-3 py-2 font-mono text-[12.5px] text-encre shadow-[0_0_0_1px_rgb(198_203_209_/_0.10)] hover:shadow-[0_0_0_1px_rgb(198_203_209_/_0.3)]"
            >
              <ExternalLink className="size-4" strokeWidth={1.75} />
              {t("envoi.deposer")}
            </a>
            <Button type="button" onClick={oublierEnvoi}>
              {t("envoi.oublier")}
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

import { useMemo } from "react";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { useCoffre } from "@/lib/store.ts";
import { parserMontant, selectionner } from "@/lib/eidos/coinselect.ts";
import { useI18n } from "@/lib/i18n.ts";

export function Envoi() {
  const { t } = useI18n();
  const coffre = useCoffre((s) => s.coffre);
  const saisie = useCoffre((s) => s.saisieMontant);
  const setMontant = useCoffre((s) => s.setMontant);
  const envoyer = useCoffre((s) => s.envoyer);
  const regrouper = useCoffre((s) => s.regrouper);
  const erreur = useCoffre((s) => s.erreur);
  const flash = useCoffre((s) => s.flash);
  const m = parserMontant(saisie);
  const sel = useMemo(() => {
    if (m == null) return selectionner(coffre.sorties, 0);
    return selectionner(coffre.sorties, m);
  }, [coffre.sorties, m]);

  if (!coffre) return null;

  const fragmente = sel && !sel.ok && sel.code === "fragmente";
  const pret = Boolean(sel && sel.ok && m && m > 0);

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
    </section>
  );
}

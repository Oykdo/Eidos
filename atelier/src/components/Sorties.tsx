import { useState } from "react";
import { formaterAtomes } from "@/lib/eidos/coinselect.ts";
import { ATOMES } from "@/lib/eidos/constantes.ts";
import { artefactDeGoutte, preuveArtefact, SIGNATURES } from "@/lib/eidos/signatures.ts";
import { useCoffre } from "@/lib/store.ts";
import { GlyphAddress } from "./GlyphAddress";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n.ts";

export function Sorties() {
  const { t } = useI18n();
  const coffre = useCoffre((s) => s.coffre);
  const [copie, setCopie] = useState<string | null>(null);
  if (!coffre) return null;
  const sorties = [...coffre.sorties].sort((a, b) => b.montant - a.montant);
  if (sorties.length === 0) return null;

  return (
    <section className="rounded-lg bg-carte p-5 shadow-[0_0_0_1px_rgb(198_203_209_/_0.10)] sm:p-6">
      <h2 className="font-mono text-base font-normal text-encre">
        {t("sorties.titre", { n: sorties.length })}
      </h2>
      <ul className="mt-3 flex flex-col gap-2.5">
        {sorties.map((s) => {
          const oeuf = s.montant === ATOMES ? artefactDeGoutte(s.txid, s.adresse) : null;
          const sig = oeuf ? SIGNATURES.find((x) => x.id === oeuf.id) : null;
          return (
            <li
              key={s.ref}
              className="rounded-md bg-creux px-3 py-3 shadow-[0_0_0_1px_rgb(198_203_209_/_0.10)]"
            >
              <p className="mb-2 font-mono text-sm tabular-nums text-encre">
                {formaterAtomes(s.montant)}
                {sig ? (
                  <span className="ml-2 text-or">
                    {sig.astre} {sig.muse}
                  </span>
                ) : null}
              </p>
              <GlyphAddress hexa={s.adresse} compact />
              {oeuf ? (
                <Button
                  type="button"
                  variant="discret"
                  size="sm"
                  className="mt-2 w-auto"
                  onClick={() => {
                    void navigator.clipboard.writeText(
                      JSON.stringify(preuveArtefact(oeuf), null, 1),
                    );
                    setCopie(s.ref);
                  }}
                >
                  {copie === s.ref ? t("sig.copie") : t("sig.preuve")}
                </Button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

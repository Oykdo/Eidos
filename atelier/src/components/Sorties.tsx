import { formaterAtomes } from "@/lib/eidos/coinselect.ts";
import { useCoffre } from "@/lib/store.ts";
import { GlyphAddress } from "./GlyphAddress";
import { useI18n } from "@/lib/i18n.ts";

export function Sorties() {
  const { t } = useI18n();
  const coffre = useCoffre((s) => s.coffre);
  if (!coffre) return null;
  const sorties = [...coffre.sorties].sort((a, b) => b.montant - a.montant);
  if (sorties.length === 0) return null;

  return (
    <section className="rounded-lg bg-carte p-5 shadow-[0_0_0_1px_rgb(198_203_209_/_0.10)] sm:p-6">
      <h2 className="font-mono text-base font-normal text-encre">
        {t("sorties.titre", { n: sorties.length })}
      </h2>
      <ul className="mt-3 flex flex-col gap-2.5">
        {sorties.map((s) => (
          <li
            key={s.ref}
            className="rounded-md bg-creux px-3 py-3 shadow-[0_0_0_1px_rgb(198_203_209_/_0.10)]"
          >
            <p className="mb-2 font-mono text-sm tabular-nums text-encre">
              {formaterAtomes(s.montant)}
            </p>
            <GlyphAddress hexa={s.adresse} compact />
          </li>
        ))}
      </ul>
    </section>
  );
}

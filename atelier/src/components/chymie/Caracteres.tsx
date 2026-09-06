import { Marque } from "@/components/chymie/Marque.tsx";
import { CARACTERES, caracteresDe } from "@/lib/eidos/chymie.ts";
import { empreinteCarnet } from "@/lib/eidos/carnet.ts";
import { useCoffre } from "@/lib/store.ts";
import { useI18n } from "@/lib/i18n.ts";
import { cn } from "@/lib/utils";

export function Caracteres() {
  const { t, locale } = useI18n();
  const coffre = useCoffre((s) => s.coffre);
  const personnel = coffre.nature === "personnel";
  const ligne = personnel ? caracteresDe(empreinteCarnet(coffre)) : [];
  const vus = new Set(ligne.map((c) => c.id));

  return (
    <section className="rounded-lg bg-carte p-5 shadow-[0_0_0_1px_rgb(198_203_209_/_0.10)] sm:p-6">
      <h2 className="font-mono text-base font-normal text-encre">{t("chymie.h")}</h2>
      <p className="mt-1 font-mono text-[12.5px] leading-relaxed text-sourd text-pretty">
        {t("chymie.lede")}
      </p>

      {ligne.length ? (
        <ol className="mt-4 flex flex-wrap gap-1.5" aria-label={t("chymie.ligne")}>
          {ligne.map((c, i) => (
            <li key={`${c.id}-${i}`} title={locale === "fr" ? c.fr : c.en}>
              <Marque trait={c.trait} className="size-5" />
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-3 font-mono text-[12.5px] text-sourd">{t("chymie.vide")}</p>
      )}

      <h3 className="mt-5 font-mono text-[12.5px] text-encre">{t("chymie.plaque")}</h3>
      <ul className="mt-2 columns-2 gap-x-4 sm:columns-3">
        {CARACTERES.map((c) => (
          <li
            key={c.id}
            className={cn(
              "mb-1 flex break-inside-avoid items-center justify-between gap-2 font-mono text-[11px] leading-tight",
              vus.has(c.id) ? "text-or" : "text-sourd",
            )}
          >
            <span className="min-w-0 truncate">{locale === "fr" ? c.fr : c.en}</span>
            <Marque trait={c.trait} className={cn("size-3.5", vus.has(c.id) ? "text-or" : "text-plomb")} />
          </li>
        ))}
      </ul>
    </section>
  );
}

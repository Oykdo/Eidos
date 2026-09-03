import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCoffre } from "@/lib/store.ts";
import { useI18n } from "@/lib/i18n.ts";

export function Creer() {
  const { t } = useI18n();
  const nature = useCoffre((s) => s.coffre.nature);
  const creer = useCoffre((s) => s.creer);

  if (nature === "personnel") return null;

  return (
    <section className="rounded-lg bg-carte p-5 shadow-[0_0_0_1px_rgb(198_203_209_/_0.10)] sm:p-6">
      <h2 className="font-mono text-base font-normal text-encre">{t("creer.titre")}</h2>
      <p className="mb-4 mt-1 font-mono text-[12.5px] leading-relaxed text-sourd text-pretty">
        {t("creer.lede")}
      </p>
      <Button type="button" onClick={() => void creer()}>
        <KeyRound className="size-4" strokeWidth={1.75} />
        {t("creer.bouton")}
      </Button>
    </section>
  );
}

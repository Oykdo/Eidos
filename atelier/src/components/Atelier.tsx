import { Button } from "@/components/ui/button";
import type { ScenarioId } from "@/lib/eidos/types.ts";
import { useCoffre } from "@/lib/store.ts";
import { useI18n, type Msg } from "@/lib/i18n.ts";

const ORDRE: ScenarioId[] = ["mixte", "poussiere", "fragmente", "une-piece", "vide"];
const NOM: Record<ScenarioId, Msg> = {
  mixte: "atelier.mixte",
  poussiere: "atelier.poussiere",
  fragmente: "atelier.fragmente",
  "une-piece": "atelier.unePiece",
  vide: "atelier.vide",
};
const AIDE: Record<ScenarioId, Msg> = {
  mixte: "atelier.aide.mixte",
  poussiere: "atelier.aide.poussiere",
  fragmente: "atelier.aide.fragmente",
  "une-piece": "atelier.aide.une-piece",
  vide: "atelier.aide.vide",
};

export function Atelier() {
  const { t } = useI18n();
  const scenario = useCoffre((s) => s.coffre?.scenario);
  const charger = useCoffre((s) => s.charger);

  return (
    <section className="rounded-lg bg-carte p-5 shadow-[0_0_0_1px_rgb(198_203_209_/_0.10)] sm:p-6">
      <h2 className="font-mono text-base font-normal text-encre">{t("atelier.titre")}</h2>
      <p className="mb-4 mt-1 font-mono text-[12.5px] leading-relaxed text-sourd text-pretty">
        {t("atelier.lede")}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {ORDRE.map((id) => (
          <Button
            key={id}
            type="button"
            variant={scenario === id ? "or" : "discret"}
            size="chip"
            className="w-auto"
            onClick={() => void charger(id)}
          >
            {t(NOM[id])}
          </Button>
        ))}
      </div>
      {scenario ? (
        <p className="mt-4 font-mono text-[12.5px] leading-relaxed text-sourd text-pretty">
          {t(AIDE[scenario])}
        </p>
      ) : null}
    </section>
  );
}

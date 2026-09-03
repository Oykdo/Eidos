import { cheminDecision } from "@/lib/eidos/decision.ts";
import type { Sortie } from "@/lib/eidos/types.ts";
import { cn } from "@/lib/utils";
import { useI18n, type Msg } from "@/lib/i18n.ts";

export function Decision({
  sorties,
  montant,
}: {
  sorties: Sortie[];
  montant: number | null;
}) {
  const { t } = useI18n();
  const chemin = cheminDecision(sorties, montant);
  const fer =
    chemin.feuille.id === "fragmente" ||
    chemin.feuille.id === "insuffisant" ||
    chemin.feuille.id === "invalide" ||
    chemin.feuille.id === "vide";
  const or =
    chemin.feuille.id === "poussiere" ||
    chemin.feuille.id === "rendu" ||
    chemin.feuille.id === "exact";
  const id = chemin.feuille.id;

  return (
    <div className="mt-5 border-t border-trait pt-4">
      <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.12em] text-sourd">
        {t("decision.titre")}
      </p>
      <ol className="flex flex-col gap-1.5">
        {chemin.questions.map((q) => (
          <li key={q.id} className="flex items-center gap-2">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-sm bg-creux font-mono text-[11px] text-sourd shadow-[0_0_0_1px_rgb(198_203_209_/_0.14)]">
              ?
            </span>
            <span className="min-w-0 flex-1 font-mono text-[12.5px] text-encre">
              {t(`decision.q.${q.id}` as Msg)}
            </span>
            <span
              className={cn(
                "shrink-0 rounded-sm px-2 py-0.5 font-mono text-[11px] uppercase tracking-wide",
                q.reponse === "oui"
                  ? "bg-cuivre/20 text-cuivre"
                  : "bg-fer/15 text-fer",
              )}
            >
              {q.reponse === "oui" ? t("decision.oui") : t("decision.non")}
            </span>
          </li>
        ))}
      </ol>
      <div
        className={cn(
          "mt-3 rounded-md p-3",
          fer && "bg-fer/10 shadow-[0_0_0_1px_rgb(168_51_42_/_0.28)]",
          or && "bg-or/10 shadow-[0_0_0_1px_rgb(201_162_39_/_0.28)]",
        )}
      >
        <p className="font-mono text-sm text-encre">
          {t(`decision.${id}.titre` as Msg)}
        </p>
        <p className="mt-1 font-mono text-[12px] text-or">{chemin.feuille.formule}</p>
        <p className="mt-1 font-mono text-[12.5px] leading-relaxed text-sourd">
          {t(`decision.${id}.aide` as Msg)}
        </p>
      </div>
      <p className="mt-3 font-mono text-[11px] leading-relaxed text-sourd text-pretty">
        {t("decision.note")}
      </p>
    </div>
  );
}

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  Eye,
  EyeOff,
  Shield,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  analyserGraine,
  auditerCoffre,
  demonstrerReemploi,
  type EtatConstat,
  type ForgeDemo,
} from "@/lib/eidos/lamport.ts";
import { useCoffre } from "@/lib/store.ts";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n.ts";

function Marque({ etat }: { etat: EtatConstat }) {
  if (etat === "ok") return <Check className="size-4 text-cuivre" strokeWidth={1.75} />;
  if (etat === "attention") {
    return <AlertTriangle className="size-4 text-or" strokeWidth={1.75} />;
  }
  return <X className="size-4 text-fer" strokeWidth={1.75} />;
}

function masque(maitre: string): string {
  if (maitre.length <= 12) return maitre;
  return `${maitre.slice(0, 6)}…${maitre.slice(-4)}`;
}

export function Cles() {
  const { t } = useI18n();
  const coffre = useCoffre((s) => s.coffre);
  const [montre, setMontre] = useState(false);
  const [forge, setForge] = useState<ForgeDemo | null>(null);

  const constats = useMemo(() => auditerCoffre(coffre), [coffre]);
  const graine = analyserGraine(coffre.maitre);
  const fautes = constats.filter((c) => c.etat === "faute").length;
  const attentions = constats.filter((c) => c.etat === "attention").length;

  return (
    <section className="rounded-lg bg-carte p-5 shadow-[0_0_0_1px_rgb(198_203_209_/_0.10)] sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-mono text-base font-normal text-encre">{t("cles.titre")}</h2>
          <p className="mb-4 mt-1 font-mono text-[12.5px] leading-relaxed text-sourd text-pretty">
            {t("cles.lede")}
          </p>
        </div>
        <Shield className="mt-0.5 size-4 shrink-0 text-sourd" strokeWidth={1.5} />
      </div>

      <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.12em] text-sourd">
        {fautes === 0 && attentions === 0
          ? t("cles.tous")
          : fautes > 0
            ? t("cles.fautes", { n: fautes, a: attentions })
            : t("cles.attentions", { a: attentions })}
      </p>

      <ul className="flex flex-col gap-2.5">
        {constats.map((c) => (
          <li
            key={c.id}
            className="flex gap-3 rounded-md bg-creux px-3 py-3 shadow-[0_0_0_1px_rgb(198_203_209_/_0.10)]"
          >
            <span className="mt-0.5 shrink-0">
              <Marque etat={c.etat} />
            </span>
            <div className="min-w-0">
              <p className="font-mono text-sm text-encre">{c.titre}</p>
              <p className="mt-1 font-mono text-[12.5px] leading-relaxed text-sourd text-pretty">
                {c.detail}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-5 rounded-md bg-creux px-3 py-3 shadow-[0_0_0_1px_rgb(198_203_209_/_0.10)]">
        <div className="flex items-center justify-between gap-2">
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-sourd">
            Graine · {coffre.nature === "personnel" ? "personnel" : "atelier"}
          </p>
          <button
            type="button"
            onClick={() => setMontre((v) => !v)}
            className="relative inline-flex size-8 items-center justify-center text-sourd after:absolute after:top-1/2 after:left-1/2 after:size-11 after:-translate-x-1/2 after:-translate-y-1/2 hover:text-encre"
            aria-label={montre ? t("cles.masquer") : t("cles.afficher")}
          >
            {montre ? (
              <EyeOff className="size-3.5" strokeWidth={1.75} />
            ) : (
              <Eye className="size-3.5" strokeWidth={1.75} />
            )}
          </button>
        </div>
        <p
          className={cn(
            "mt-1 break-all font-mono text-[12.5px] leading-relaxed",
            graine.publique ? "text-or" : "text-argent",
          )}
        >
          {montre ? coffre.maitre : masque(coffre.maitre)}
        </p>
      </div>

      <div className="mt-6 border-t border-trait pt-4">
        <h3 className="font-mono text-sm text-encre">Deux signatures, une forge</h3>
        <p className="mb-3 mt-1 font-mono text-[12.5px] leading-relaxed text-sourd text-pretty">
          SHA-256 ne protège pas du réemploi. La deuxième signature livre assez
          de moitiés pour écrire un troisième message. Le validateur refuse
          toute clé déjà vue — c'est la seule barrière.
        </p>
        <Button
          type="button"
          variant="discret"
          onClick={() => setForge(demonstrerReemploi())}
        >
          Rejouer l'attaque
        </Button>
        {forge ? (
          <ul className="mt-4 flex flex-col gap-2 font-mono text-[12.5px] leading-relaxed">
            <li className="flex justify-between gap-3 text-sourd">
              <span>Signatures authentiques</span>
              <span className="text-cuivre">
                {forge.verifie1 && forge.verifie2 ? "vérifiées" : "échec"}
              </span>
            </li>
            <li className="flex justify-between gap-3 text-sourd">
              <span>Bits divergents</span>
              <span className="tabular-nums text-encre">{forge.bits}</span>
            </li>
            <li className="flex justify-between gap-3 text-sourd">
              <span>Messages forgeables</span>
              <span className="tabular-nums text-encre">{forge.forgeables}</span>
            </li>
            <li className="flex justify-between gap-3 text-sourd">
              <span>Troisième message, jamais signé</span>
              <span className={forge.verifieForge ? "text-fer" : "text-cuivre"}>
                {forge.verifieForge ? "accepté" : "rejeté"}
              </span>
            </li>
          </ul>
        ) : null}
      </div>
    </section>
  );
}

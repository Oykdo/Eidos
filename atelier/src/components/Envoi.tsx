import { useMemo } from "react";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Selecteur } from "@/components/Selecteur";
import { Decision } from "@/components/Decision";
import { useCoffre } from "@/lib/store.ts";
import { parserMontant, selectionner } from "@/lib/eidos/coinselect.ts";

const RAPIDES: { label: string; valeur: string; hint: string }[] = [
  { label: "0,50", valeur: "0.50", hint: "deux petites" },
  { label: "1,00", valeur: "1.00", hint: "poussière" },
  { label: "3,00", valeur: "3.00", hint: "trois pièces" },
  { label: "4,00", valeur: "4.00", hint: "fragmenté" },
];

export function Envoi() {
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
      <h2 className="font-mono text-base font-normal text-encre">Envoyer</h2>
      <p className="mb-5 mt-1 font-mono text-[12.5px] leading-relaxed text-sourd text-pretty">
        Les plus petites sorties qui atteignent le montant + la poussière, au plus
        trois. Une signature Lamport par entrée.
      </p>

      <Label htmlFor="montant">Montant (eidôlon)</Label>
      <Input
        id="montant"
        inputMode="decimal"
        autoComplete="off"
        placeholder="0.000000"
        value={saisie}
        onChange={(e) => setMontant(e.target.value)}
        className="tabular-nums"
      />

      <div className="mt-2 mb-5 flex flex-wrap gap-1.5">
        {RAPIDES.map((r) => (
          <Button
            key={r.valeur}
            type="button"
            variant={saisie === r.valeur ? "or" : "discret"}
            size="chip"
            className="w-auto"
            onClick={() => setMontant(r.valeur)}
          >
            {r.label}
            <span className="text-[10px] opacity-70">{r.hint}</span>
          </Button>
        ))}
      </div>

      <Selecteur selection={sel} sorties={coffre.sorties} />

      <Decision sorties={coffre.sorties} montant={m} />

      <div className="mt-5 flex flex-col gap-2">
        {fragmente ? (
          <Button type="button" onClick={() => void regrouper()}>
            Regrouper d'abord
          </Button>
        ) : (
          <Button type="button" disabled={!pret} onClick={() => void envoyer()}>
            <ArrowUpRight className="size-4" strokeWidth={1.75} />
            Préparer l'envoi
          </Button>
        )}
        <Button
          type="button"
          variant="discret"
          disabled={coffre.sorties.length < 2}
          onClick={() => void regrouper()}
        >
          Regrouper (≤ 3 sorties → 1)
        </Button>
      </div>

      <p className="verdict mt-3 min-h-5 font-mono text-sm" role="status">
        {erreur ? <span className="text-fer">{erreur}</span> : null}
        {!erreur && flash ? <span className="text-cuivre">{flash}</span> : null}
      </p>
    </section>
  );
}

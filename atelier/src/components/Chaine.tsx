import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { chaineSaine, tete, verifierChaine } from "@/lib/eidos/chaine.ts";
import {
  encoderJson,
  serialiserTete,
  teteDeBloc,
} from "@/lib/eidos/temoin.ts";
import { useCoffre } from "@/lib/store.ts";
import { cn } from "@/lib/utils";

const MOTIF: Record<string, string> = {
  genese: "genèse",
  atelier: "atelier",
  envoi: "envoi",
  regroupement: "regroupement",
  robinet: "robinet",
};

function court(h: string): string {
  return `${h.slice(0, 8)}…${h.slice(-4)}`;
}

export function Chaine() {
  const coffre = useCoffre((s) => s.coffre);
  const ch = coffre.chaine ?? [];
  const tip = tete(ch);
  const controles = verifierChaine(coffre);
  const ok = chaineSaine(coffre);
  const recents = ch.length <= 4 ? ch : [ch[0]!, ...ch.slice(-3)];
  const [copie, setCopie] = useState(false);

  const portable = tip && tip.motif !== "genese" ? serialiserTete(teteDeBloc(tip)) : null;
  const codeTete = portable ? encoderJson(portable) : null;

  async function exporter() {
    if (!portable) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(portable, null, 2));
      setCopie(true);
      window.setTimeout(() => setCopie(false), 1600);
    } catch {
      /* */
    }
  }

  return (
    <section className="rounded-lg bg-carte p-5 shadow-[0_0_0_1px_rgb(198_203_209_/_0.10)] sm:p-6">
      <h2 className="font-mono text-base font-normal text-encre">Chaîne</h2>
      <p className="mb-4 mt-1 font-mono text-[12.5px] leading-relaxed text-sourd text-pretty">
        Bloc 0 : Merkle du message de genèse, 18 bits de travail, gelé. Les
        suivants : Merkle du carnet, bits 0. Exporter la tête : un autre
        appareil peut l'adopter sans ouvrir ce coffre.
      </p>

      <p className={cn("mb-3 font-mono text-sm", ok ? "text-cuivre" : "text-fer")}>
        {ok
          ? `Tête · bloc ${tip?.hauteur ?? "—"} · chainage intact`
          : "Chainage rompu"}
      </p>

      <ol className="flex flex-col gap-2">
        {recents.map((b, i) => (
          <li
            key={b.hash + i}
            className="rounded-md bg-creux px-3 py-3 shadow-[0_0_0_1px_rgb(198_203_209_/_0.10)]"
          >
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-sourd">
              bloc {b.hauteur} · {MOTIF[b.motif] ?? b.motif}
              {b.bits === 0 ? " · sans PoW" : ` · ${b.bits} bits`}
            </p>
            <p className="mt-1 break-all font-mono text-[12px] text-encre">
              {court(b.hash)}
            </p>
            <p className="mt-1 font-mono text-[11px] text-sourd">
              merkle · {court(b.merkle)}
            </p>
          </li>
        ))}
      </ol>

      <ul className="mt-4 flex flex-col gap-1.5">
        {controles.map((c) => (
          <li
            key={c.id}
            className={cn(
              "font-mono text-[12px]",
              c.ok ? "text-sourd" : "text-fer",
            )}
          >
            {c.ok ? "·" : "×"} {c.label}
          </li>
        ))}
      </ul>

      {portable && codeTete ? (
        <div className="mt-4 flex flex-wrap gap-1.5">
          <Button type="button" variant="discret" className="w-auto" onClick={() => void exporter()}>
            {copie ? "Tête copiée" : "Exporter la tête"}
          </Button>
          <Button asChild variant="or" className="w-auto">
            <Link to="/temoin" search={{ tete: codeTete }}>
              Ouvrir dans le témoin
            </Link>
          </Button>
        </div>
      ) : null}
    </section>
  );
}

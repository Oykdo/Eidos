import { Link } from "@tanstack/react-router";
import { formaterAtomes } from "@/lib/eidos/coinselect.ts";
import { ancreDe, etiquetteAncre } from "@/lib/arbre/ancre.ts";
import { useCoffre } from "@/lib/store.ts";
import { GlyphAddress } from "./GlyphAddress";

export function Sorties() {
  const coffre = useCoffre((s) => s.coffre);
  const preuveRef = useCoffre((s) => s.preuveRef);
  const setPreuveRef = useCoffre((s) => s.setPreuveRef);
  if (!coffre) return null;
  const sorties = [...coffre.sorties].sort((a, b) => b.montant - a.montant);

  return (
    <section className="rounded-lg bg-carte p-5 shadow-[0_0_0_1px_rgb(198_203_209_/_0.10)] sm:p-6">
      <h2 className="font-mono text-base font-normal text-encre">
        Carnet · {sorties.length} sortie{sorties.length === 1 ? "" : "s"}
      </h2>
      <p className="mb-4 mt-1 font-mono text-[12.5px] leading-relaxed text-sourd text-pretty">
        Une clé Lamport ne signe qu'une fois. Toucher « preuve » calcule le
        chemin Merkle de cette sortie jusqu'à la racine du carnet.
      </p>
      {sorties.length === 0 ? (
        <p className="font-mono text-sm text-sourd">Aucune sortie. Servez le robinet.</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {sorties.map((s) => {
            const ancre = ancreDe(s.adresse || s.ref);
            return (
              <li
                key={s.ref}
                className="rounded-md bg-creux px-3 py-3 shadow-[0_0_0_1px_rgb(198_203_209_/_0.10)]"
              >
                <div className="mb-2 flex items-baseline justify-between gap-3 font-mono text-xs text-sourd">
                  <span className="truncate">
                    {s.txid.slice(0, 8)}:{s.rang}
                  </span>
                  <span className="tabular-nums text-encre">
                    {formaterAtomes(s.montant)}
                  </span>
                </div>
                <GlyphAddress hexa={s.adresse} compact />
                <div className="mt-2 flex flex-wrap items-center gap-x-3">
                  <Link
                    to="/arbre"
                    search={{ noeud: ancre.noeud }}
                    className="inline-flex h-8 items-center font-mono text-[11px] text-or hover:text-encre"
                  >
                    nœud {ancre.noeud} · {etiquetteAncre(ancre)}
                  </Link>
                  <Link
                    to="/journal"
                    className={
                      preuveRef === s.ref
                        ? "inline-flex h-8 items-center font-mono text-[11px] text-encre"
                        : "inline-flex h-8 items-center font-mono text-[11px] text-sourd hover:text-encre"
                    }
                    onClick={() => setPreuveRef(s.ref)}
                  >
                    preuve
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {coffre.historique.length > 0 && (
        <div className="mt-6 border-t border-trait pt-4">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.12em] text-sourd">
            Journal
          </p>
          <ul className="flex flex-col gap-2">
            {coffre.historique.slice(0, 8).map((h) => (
              <li
                key={h.txid + h.at}
                className="flex items-baseline justify-between gap-3 font-mono text-xs"
              >
                <span className="min-w-0 truncate text-sourd">{h.note}</span>
                <span className="shrink-0 tabular-nums text-encre">
                  {formaterAtomes(h.montant)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

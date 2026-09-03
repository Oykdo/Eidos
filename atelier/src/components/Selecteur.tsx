import { AlertTriangle, Layers, Minus } from "lucide-react";
import { formaterAtomes } from "@/lib/eidos/coinselect.ts";
import { MAX_ENTREES, POUSSIERE_ATOMES } from "@/lib/eidos/constantes.ts";
import type { Selection, Sortie } from "@/lib/eidos/types.ts";
import { cn } from "@/lib/utils";

function KoIcon() {
  return <AlertTriangle className="size-4 text-fer" strokeWidth={1.75} />;
}

export function Selecteur({
  selection,
  sorties,
  className,
}: {
  selection: Selection | null;
  sorties: Sortie[];
  className?: string;
}) {
  const max = sorties.reduce((m, s) => Math.max(m, s.montant), 1);
  const choisies = new Set(
    selection && selection.ok ? selection.entrees.map((e) => e.ref) : [],
  );

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div>
        <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.12em] text-sourd">
          Sorties · glouton borné à {MAX_ENTREES}
        </p>
        {sorties.length === 0 ? (
          <p className="font-mono text-sm text-sourd">Coffre vide.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {sorties
              .slice()
              .sort((a, b) => a.montant - b.montant)
              .map((s) => {
                const on = choisies.has(s.ref);
                const pct = Math.max(6, (s.montant / max) * 100);
                const fragmente =
                  selection && !selection.ok && selection.code === "fragmente";
                return (
                  <li key={s.ref} className="flex items-center gap-3">
                    <div className="h-2 min-w-0 flex-1 rounded-sm bg-creux">
                      <div
                        className={cn(
                          "h-2 rounded-sm transition-[width,background-color] duration-[var(--motion-fast)] ease-[var(--ease-smooth-out)]",
                          fragmente ? "bg-fer/70" : on ? "bg-or" : "bg-plomb/50",
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span
                      className={cn(
                        "w-[7.2rem] shrink-0 text-right font-mono text-xs tabular-nums",
                        on && !fragmente ? "text-or" : "text-sourd",
                      )}
                    >
                      {formaterAtomes(s.montant)}
                    </span>
                  </li>
                );
              })}
          </ul>
        )}
      </div>

      {selection && selection.ok && (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-trait pt-4 font-mono text-sm">
          <div className="col-span-2 flex justify-between gap-2">
            <dt className="text-sourd">Entrées</dt>
            <dd className="tabular-nums text-encre">
              {selection.entrees.length} · {formaterAtomes(selection.totalEntrees)}
            </dd>
          </div>
          <div className="col-span-2 flex justify-between gap-2">
            <dt className="text-sourd">Témoins Lamport</dt>
            <dd className="tabular-nums text-encre">
              {(selection.octetsTemoins / 1024).toFixed(1).replace(".", ",")} Ko
            </dd>
          </div>
          <div className="col-span-2 flex justify-between gap-2">
            <dt className="text-sourd">Rendu</dt>
            <dd className="tabular-nums text-encre">
              {selection.rendu === 0
                ? selection.poussiere
                  ? "aucune sortie"
                  : "—"
                : formaterAtomes(selection.rendu)}
            </dd>
          </div>
          <div className="col-span-2 flex justify-between gap-2">
            <dt className="text-sourd">Frais</dt>
            <dd
              className={cn(
                "tabular-nums",
                selection.frais > 0 ? "text-or" : "text-encre",
              )}
            >
              {formaterAtomes(selection.frais)}
            </dd>
          </div>
        </dl>
      )}

      {selection && selection.ok && selection.poussiere && (
        <p className="flex gap-2 border-l-2 border-or pl-3.5 font-mono text-[12.5px] leading-relaxed text-sourd">
          <Minus className="mt-0.5 size-3.5 shrink-0 text-or" strokeWidth={1.75} />
          <span>
            Rendu de {selection.frais.toLocaleString("fr-FR")} atomes, sous le seuil de{" "}
            {POUSSIERE_ATOMES.toLocaleString("fr-FR")}. Pas de sortie de rendu — l'écart
            devient frais. Un atome de rendu resterait légal côté validateur.
          </span>
        </p>
      )}

      {selection && !selection.ok && selection.code === "fragmente" && (
        <p className="flex gap-2 border-l-2 border-fer pl-3.5 font-mono text-[12.5px] leading-relaxed text-sourd">
          <KoIcon />
          <span>
            <span className="text-fer">{selection.message}</span>
            <br />
            Solde {formaterAtomes(selection.solde)} · {MAX_ENTREES} plus grandes ={" "}
            {formaterAtomes(selection.couvertureMax)}. Chaque entrée coûte une signature
            Lamport.
          </span>
        </p>
      )}

      {selection && !selection.ok && selection.code === "insuffisant" && (
        <p className="flex gap-2 border-l-2 border-fer pl-3.5 font-mono text-[12.5px] leading-relaxed text-sourd">
          <KoIcon />
          <span>Solde insuffisant — {formaterAtomes(selection.solde)} disponibles.</span>
        </p>
      )}

      {selection && selection.ok && selection.entrees.length === 3 && (
        <p className="flex gap-2 font-mono text-[12px] leading-relaxed text-sourd">
          <Layers className="mt-0.5 size-3.5 shrink-0 text-etain" strokeWidth={1.75} />
          Plafond atteint. Une quatrième entrée ferait un objet trop gros pour une issue.
        </p>
      )}
    </div>
  );
}

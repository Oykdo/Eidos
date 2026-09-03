import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { tete } from "@/lib/eidos/chaine.ts";
import { formaterAtomes } from "@/lib/eidos/coinselect.ts";
import {
  etapesDe,
  merkleDuCarnet,
  parserPreuve,
  preuvePourSortie,
  serialiser,
  verifierPreuve,
} from "@/lib/eidos/merkle.ts";
import { useCoffre } from "@/lib/store.ts";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n.ts";

function court(h: string): string {
  return `${h.slice(0, 8)}…${h.slice(-4)}`;
}

export function Merkle() {
  const { t } = useI18n();
  const coffre = useCoffre((s) => s.coffre);
  const preuveRef = useCoffre((s) => s.preuveRef);
  const setPreuveRef = useCoffre((s) => s.setPreuveRef);
  const soumettrePreuve = useCoffre((s) => s.soumettrePreuve);
  const navigate = useNavigate();
  const sorties = coffre.sorties;
  const [colle, setColle] = useState("");
  const [verdict, setVerdict] = useState<string | null>(null);
  const [copie, setCopie] = useState(false);
  const [alteree, setAlteree] = useState(false);

  const { niveaux, preuve, ok, etapes } = useMemo(() => {
    const m = merkleDuCarnet(sorties);
    const ref = preuveRef && sorties.some((s) => s.ref === preuveRef)
      ? preuveRef
      : sorties[0]?.ref;
    let p = ref ? preuvePourSortie(sorties, ref) : null;
    if (p && alteree && p.feuille.length === 64) {
      p = {
        ...p,
        feuille: (p.feuille.startsWith("00") ? "01" : "00") + p.feuille.slice(2),
      };
    }
    return {
      niveaux: m.niveaux,
      preuve: p,
      ok: p ? verifierPreuve(p) : false,
      etapes: p ? etapesDe(p) : [],
    };
  }, [sorties, preuveRef, alteree]);

  if (sorties.length === 0) {
    return (
      <section
        id="preuve-inclusion"
        className="rounded-lg bg-carte p-5 shadow-[0_0_0_1px_rgb(198_203_209_/_0.10)] sm:p-6"
      >
        <h2 className="font-mono text-base font-normal text-encre">{t("merkle.titre")}</h2>
        <p className="mt-2 font-mono text-[12.5px] leading-relaxed text-sourd">
          {t("merkle.vide")}
        </p>
      </section>
    );
  }

  const duSol = [...niveaux.hashes].reverse();
  const chemin = new Set(etapes.map((e) => e.hash));
  if (preuve) {
    for (const f of preuve.freres) chemin.add(f.hash);
  }
  const sortie = sorties.find((s) => s.ref === preuve?.ref) ?? sorties[0]!;
  const selIdx = sorties.findIndex((s) => s.ref === sortie.ref);
  const tip = tete(coffre.chaine ?? []);
  const ancree = Boolean(
    preuve && tip && tip.motif !== "genese" && preuve.racine === tip.merkle && ok,
  );

  async function copier() {
    if (!preuve) return;
    const txt = JSON.stringify(serialiser(preuve), null, 2);
    try {
      await navigator.clipboard.writeText(txt);
      setCopie(true);
      window.setTimeout(() => setCopie(false), 1600);
    } catch {
      setColle(txt);
    }
  }

  function verifierColle() {
    const raw = colle.trim();
    if (!raw) {
      setVerdict("colle vide");
      return;
    }
    const lu = parserPreuve(raw);
    if ("erreur" in lu) {
      setVerdict(lu.erreur);
      return;
    }
    if (!verifierPreuve(lu)) {
      setVerdict("exclue — le chemin ne reproduit pas cette racine");
      return;
    }
    if (lu.racine !== niveaux.racine) {
      setVerdict("incluse dans une autre racine — pas ce carnet");
      return;
    }
    setVerdict("incluse — racine du carnet reproduite");
  }

  return (
    <section
      id="preuve-inclusion"
      className="rounded-lg bg-carte p-5 shadow-[0_0_0_1px_rgb(198_203_209_/_0.10)] sm:p-6"
    >
      <h2 className="font-mono text-base font-normal text-encre">{t("merkle.titre")}</h2>
      <p className="mb-4 mt-1 font-mono text-[12.5px] leading-relaxed text-sourd text-pretty">
        Feuille, frères, racine — puis la tête de chaîne. Si la racine de la
        preuve est celle du dernier bloc, la pièce est dans ce carnet scellé.
        L'arbre des premiers n'entre pas dans ce calcul.
      </p>

      <div className="overflow-x-auto">
        <div className="flex min-w-[280px] flex-col items-stretch gap-2">
          {duSol.map((lvl, li) => (
            <div key={li} className="flex justify-center gap-1">
              {lvl.map((h, j) => {
                const estRacine = li === 0;
                const estFeuille = li === duSol.length - 1;
                const pad = estFeuille && (niveaux.paddings[j] ?? false);
                const actif = chemin.has(h);
                const feuilleIdx = estFeuille && !pad ? j : null;
                return (
                  <button
                    key={`${li}-${j}-${h.slice(0, 8)}`}
                    type="button"
                    disabled={feuilleIdx == null}
                    onClick={() => {
                      if (feuilleIdx == null) return;
                      setAlteree(false);
                      setPreuveRef(sorties[feuilleIdx]!.ref);
                    }}
                    className={cn(
                      "min-w-0 flex-1 rounded-sm px-1 py-1.5 font-mono text-[10px] leading-tight",
                      estRacine && "bg-or text-or-fg",
                      !estRacine && actif && "bg-cuivre/20 text-encre",
                      !estRacine &&
                        !actif &&
                        "bg-creux text-sourd shadow-[0_0_0_1px_rgb(198_203_209_/_0.10)]",
                      pad && "opacity-45",
                    )}
                  >
                    {estRacine ? "racine" : estFeuille ? (pad ? "copie" : `s${j + 1}`) : "nœud"}
                    <span className="mt-0.5 block truncate tabular-nums">{h.slice(0, 6)}…</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {preuve ? (
        <div className="mt-4 border-t border-trait pt-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-sourd">
            Chemin · s{selIdx + 1} · {formaterAtomes(sortie.montant)}
          </p>
          <ol className="mt-3 flex flex-col gap-2">
            {etapes.map((e, k) => (
              <li
                key={k}
                className="rounded-md bg-creux px-3 py-2 shadow-[0_0_0_1px_rgb(198_203_209_/_0.10)]"
              >
                <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-sourd">
                  {e.role === "feuille"
                    ? "feuille"
                    : e.role === "racine"
                      ? "racine"
                      : `nœud · frère ${e.cote}`}
                </p>
                <p className="mt-1 break-all font-mono text-[12px] text-encre">
                  {court(e.hash)}
                </p>
                {e.role !== "feuille" && e.cote ? (
                  <p className="mt-1 font-mono text-[11px] text-sourd">
                    SHA-256d(
                    {e.cote === "droite" ? "h ‖ frère" : "frère ‖ h"})
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
          <p className={cn("mt-3 font-mono text-sm", ok ? "text-cuivre" : "text-fer")}>
            {ok
              ? t("merkle.ok")
              : t("merkle.ko")}
          </p>
          {ancree && tip ? (
            <p className="mt-1 font-mono text-[12px] text-sourd">
              Ancrée dans le bloc {tip.hauteur} · {tip.hash.slice(0, 12)}…
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Button type="button" variant="discret" className="w-auto" onClick={() => void copier()}>
              {copie ? t("merkle.copie") : t("merkle.copier")}
            </Button>
            <Button
              type="button"
              variant="or"
              className="w-auto"
              onClick={() => {
                if (!preuve) return;
                soumettrePreuve(serialiser(preuve));
                void navigate({ to: "/temoin" });
              }}
            >
              Soumettre au témoin
            </Button>
            <Button
              type="button"
              variant="discret"
              className="w-auto"
              onClick={() => setAlteree((v) => !v)}
            >
              {alteree ? t("merkle.restaurer") : t("merkle.alterer")}
            </Button>
          </div>
        </div>
      ) : null}

      <div className="mt-4 border-t border-trait pt-4">
        <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.12em] text-sourd">
          Vérifier une preuve
        </p>
        <textarea
          value={colle}
          onChange={(e) => {
            setColle(e.target.value);
            setVerdict(null);
          }}
          spellCheck={false}
          rows={4}
          placeholder='{"v":1,"feuille":"…","freres":[],"racine":"…"}'
          className="w-full resize-y rounded-sm bg-creux px-3 py-2 font-mono text-[11px] text-encre shadow-[0_0_0_1px_rgb(198_203_209_/_0.16)] placeholder:text-sourd/70"
        />
        <Button type="button" variant="or" className="mt-2 w-auto" onClick={verifierColle}>
          Vérifier
        </Button>
        {verdict ? (
          <p
            className={cn(
              "mt-2 font-mono text-[12.5px] leading-relaxed",
              verdict.startsWith("incluse —") ? "text-cuivre" : "text-fer",
            )}
          >
            {verdict}
          </p>
        ) : null}
      </div>
    </section>
  );
}

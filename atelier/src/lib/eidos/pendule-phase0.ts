/**
 * Phase 0 du pendule-9 — le bot et les trois mesures (docs/SPEC_PENDULE.md §4).
 * L'aléa est celui du bot (xorshift32), jamais celui du jeu : chaque run est
 * rejouable depuis sa graine et ses choix.
 *
 *   node --experimental-strip-types src/lib/eidos/pendule-phase0.ts [runs]
 */

import { sha256d, utf8 } from "./hash.ts";
import { CHOIX, ETAGES_PAR_BANDE, ETAPES, genreDon, graineRun, run, type Choix, type Etape } from "./pendule.ts";
import { ETAGES } from "./tour.ts";

export const SEUILS = {
  /** Étages atteints au moins une fois sur 255 ; en dessous, le pendule ne diversifie pas. */
  couvertureMin: 200,
  /** Part d'étages communs entre deux runs successifs ; au-dessus, il répète. */
  repetitionMax: 0.6,
  /** Part des gemmes tombant sur une même ligne de spawn ; au-dessus, le loot est prévisible. */
  gemmesParLigneMax: 0.4,
} as const;

export type Rapport = {
  runs: number;
  couverture: number;
  repetitionMoyenne: number;
  repetitionMax: number;
  gemmesParLigne: number[];
  gemmesParLigneMax: number;
  genres: Record<string, number>;
  verdict: { couverture: boolean; repetition: boolean; loot: boolean; ok: boolean };
};

/** xorshift32 — le hasard du bot. */
export function xorshift(seed: number): () => number {
  let x = seed >>> 0 || 0x9e3779b9;
  return () => {
    x ^= x << 13;
    x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5;
    x >>>= 0;
    return x / 0x1_0000_0000;
  };
}

export function repetition(a: Etape[], b: Etape[]): number {
  const sa = new Set(a.map((x) => x.e));
  let c = 0;
  for (const x of b) if (sa.has(x.e)) c += 1;
  return c / ETAPES;
}

export function simuler(nRuns: number, graineBot = 7, maitre = "bot-phase0"): Rapport {
  const alea = xorshift(graineBot);
  const vus = new Set<number>();
  const gemmes = new Array(9).fill(0) as number[];
  const genres: Record<string, number> = {};
  let precedent: Etape[] | null = null;
  let somme = 0;
  let max = 0;
  for (let r = 0; r < nRuns; r++) {
    const graine = graineRun(maitre, r, sha256d(utf8(`ville/${graineBot}`)));
    const choix = Array.from({ length: ETAPES }, () => CHOIX[Math.floor(alea() * CHOIX.length)] as Choix);
    const mots = Array.from({ length: ETAPES }, () => Math.floor(alea() * 0x1_0000_0000));
    const etapes = run(graine, (i) => choix[i]!, (i) => mots[i]!);
    for (const et of etapes) {
      vus.add(et.e);
      const g = genreDon(et.e, et.s, maitre, r);
      genres[g] = (genres[g] ?? 0) + 1;
      if (g === "gemme") gemmes[et.s.y]! += 1;
    }
    if (precedent) {
      const rep = repetition(precedent, etapes);
      somme += rep;
      if (rep > max) max = rep;
    }
    precedent = etapes;
  }
  const totalGemmes = gemmes.reduce((s, x) => s + x, 0) || 1;
  const parts = gemmes.map((x) => x / totalGemmes);
  const gemmesParLigneMax = Math.max(...parts);
  const repetitionMoyenne = nRuns > 1 ? somme / (nRuns - 1) : 0;
  const verdict = {
    couverture: vus.size >= SEUILS.couvertureMin,
    repetition: repetitionMoyenne <= SEUILS.repetitionMax,
    loot: gemmesParLigneMax <= SEUILS.gemmesParLigneMax,
    ok: false,
  };
  verdict.ok = verdict.couverture && verdict.repetition && verdict.loot;
  return {
    runs: nRuns,
    couverture: vus.size,
    repetitionMoyenne,
    repetitionMax: max,
    gemmesParLigne: parts,
    gemmesParLigneMax,
    genres,
    verdict,
  };
}

export function formaterRapport(r: Rapport): string {
  const l: string[] = [];
  l.push(`phase 0 — ${r.runs} runs × ${ETAPES} étapes (${ETAGES_PAR_BANDE} étages par bande)`);
  l.push(`couverture        ${r.couverture} / ${ETAGES} étages  (seuil ≥ ${SEUILS.couvertureMin})  ${r.verdict.couverture ? "ok" : "ABANDON"}`);
  l.push(`répétition        moyenne ${(r.repetitionMoyenne * 100).toFixed(1)} %, max ${(r.repetitionMax * 100).toFixed(1)} %  (seuil ≤ ${SEUILS.repetitionMax * 100} %)  ${r.verdict.repetition ? "ok" : "ABANDON"}`);
  l.push(`gemmes par ligne  ${r.gemmesParLigne.map((x) => (x * 100).toFixed(0).padStart(3)).join(" ")} %  (max ${(r.gemmesParLigneMax * 100).toFixed(1)} %, seuil ≤ ${SEUILS.gemmesParLigneMax * 100} %)  ${r.verdict.loot ? "ok" : "ABANDON"}`);
  l.push(`dons              ${Object.entries(r.genres).map(([g, n]) => `${g} ${n}`).join(" · ")}`);
  l.push(r.verdict.ok ? "verdict : la chaîne pendule → parcours → spawn → don tient." : "verdict : revoir la transition, pas le lore.");
  return l.join("\n");
}

if (process.argv[1] && /pendule-phase0\.[mc]?ts$/.test(process.argv[1])) {
  const n = Number(process.argv[2] ?? 10_000);
  const t = Date.now();
  const r = simuler(n);
  console.log(formaterRapport(r));
  console.log(`(${((Date.now() - t) / 1000).toFixed(1)} s)`);
  process.exit(r.verdict.ok ? 0 : 1);
}

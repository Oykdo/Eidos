/**
 * Lectures de la Tour — ce que deux mots se disent, au grain des figures.
 *
 * Trois lectures, aucune n'est une soustraction :
 *   - l'orbite : la première figure de `glypheLecture`, min(3, 4|Re q|/|q|).
 *     Un mot (échelle 724) et une coupe (norme 10⁸) ne partagent jamais un
 *     rapport entier exact ; la Tour lit l'angle avec ses quatre figures ;
 *   - la parade : x, conjugué par l'objet porté g, tient-il l'axe de y au
 *     seuil élite (`tientAxe`, 87/100) ? La conjugaison ne change pas l'orbite,
 *     elle déplace l'axe : c'est l'axe qu'on lit ;
 *   - la résonance d'ensemble : `resonanceDe`, tenue > 0.
 * Le mot d'une coupe (`motDeQ`) ramène ses composantes à l'échelle du mot,
 * arrondi au plus proche ; la première figure survit à ce passage.
 *
 * LIMITE : ces lectures sont des jauges. Le mot reste l'identité ; rien ici
 * n'entre dans la feuille ni dans le carnet.
 */

import { isqrt, norme2, type Q } from "./cosmos.ts";
import { COS_DEN, COS_ELITE, COS_SUPREME, conjuguerPar, tientAxe } from "./groupe.ts";
import { etagesDe } from "./glyphs.ts";
import { Q_SCALE, paqueter, sceauObjet, type Objet } from "./objets.ts";

export const FIGURES_ORBITE = 4;

function abs(x: bigint): bigint {
  return x < 0n ? -x : x;
}

/** Première figure de la lecture : min(3, 4|q₀|/|q|). Zéro pour le mot nul. */
export function figureOrbite(q: Q): number {
  const n = isqrt(norme2(q));
  if (n === 0n) return 0;
  const k = Number((abs(q[0]) * BigInt(FIGURES_ORBITE)) / n);
  return Math.max(0, Math.min(FIGURES_ORBITE - 1, k));
}

/** Même orbite, au grain de la lecture : même première figure. */
export function memeOrbiteLue(p: Q, q: Q): boolean {
  return figureOrbite(p) === figureOrbite(q);
}

/** Tient l'axe au seuil élite (87/100). */
export function tientAxeElite(etat: Q, ancre: Q): boolean {
  return tientAxe(etat, ancre, COS_ELITE, COS_DEN);
}

/** Tient l'axe au seuil suprême (92/100). */
export function tientAxeSupreme(etat: Q, ancre: Q): boolean {
  return tientAxe(etat, ancre, COS_SUPREME, COS_DEN);
}

/** La parade : x conjugué par g (g x ḡ) tient l'axe de y au seuil élite. */
export function paradeLue(g: Q, x: Q, y: Q): boolean {
  return tientAxeElite(conjuguerPar(g, x), y);
}

/** Alignement en centièmes, |⟨p, q⟩| · 100 / (|p||q|) — pour l'affichage. */
export function alignementCentiemes(p: Q, q: Q): number {
  const np = isqrt(norme2(p));
  const nq = isqrt(norme2(q));
  if (np === 0n || nq === 0n) return 0;
  const d = abs(p[0] * q[0] + p[1] * q[1] + p[2] * q[2] + p[3] * q[3]);
  return Number((d * 100n) / (np * nq));
}

/** Mot d'une coupe : composantes ramenées à Q_SCALE, arrondi au plus proche. */
export function motDeQ(q: Q): number {
  const n = isqrt(norme2(q));
  if (n === 0n) return paqueter([Q_SCALE, 0, 0, 0]);
  const s = (x: bigint): number => {
    const num = x * BigInt(Q_SCALE) * 2n;
    const neg = num < 0n;
    const a = neg ? -num : num;
    const r = (a + n) / (2n * n);
    return Number(neg ? -r : r);
  };
  return paqueter([s(q[0]), s(q[1]), s(q[2]), s(q[3])]);
}

/** Les trois étages du sceau d'un objet : son visage, régénérable. */
export function glypheDe(o: Objet): [number, number, number] {
  return etagesDe(sceauObjet(o).split(" ")[0] ?? "");
}

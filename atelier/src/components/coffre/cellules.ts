/**
 * Cellules du coffre au pas de la coque — jauge, hors feuille
 * (docs/SPEC_AUDIT_COFFRES.md). Aucun three : la scène pose, ce fichier décide.
 * Les indices sont ceux de CoffreScene (1 poignée, 2 couvercle, 4 coque,
 * 6 flancs, 7 serrure) ; l'ordre des huit clartés est conservé : la trame et
 * le contact déplacent d'UNE clarté, jamais vers 0 (tas) ni vers 7 (serrure).
 *
 * LIMITE : la trame est le réseau « < 4 » de Bayer 4 × 4 lu dans le plan de la
 * face (seuilFace), non le repli 3D de texel.seuilBayer ; sur les faces
 * verticales elle ne court que sur y = ±1. Une lecture, jamais une preuve.
 */
import {
  voxelsCouronne,
  voxelsFerrures,
  voxelsTasCouvercle,
  type Ornement,
} from "../../lib/eidos/coffres.ts";
import { cleCellule, seuilBayer } from "../canvas/texel.ts";

export type CelluleCoffre = { x: number; y: number; z: number; i: number };

/**
 * Seuil de trame lu dans le plan de la face : seuilBayer du socle n'est exact
 * qu'en (x, z) à y fixe (sur une face x = ±4 son repli ne porte que deux
 * lignes du motif, soit une cellule sur deux). Dessus et dessous en (x, z),
 * avant et arrière en (x, y), flancs en (y, z). Sur les faces verticales la
 * phase est décalée d'une rangée : la trame court sur y = ±1, la rangée de la
 * serrure (y = 0) et la ligne du couvercle (y = ±2) restent nettes — et sur
 * ces petites faces (5 × 5 à 9 × 7) la part reste au quart.
 */
export function seuilFace(x: number, y: number, z: number): number {
  if (Math.abs(y) === 3) return seuilBayer(x, 0, z);
  if (Math.abs(z) === 3) return seuilBayer(x, 0, y + 1);
  return seuilBayer(y + 1, 0, z);
}

/** Indice brut d'une cellule de coque (règles de CoffreScene, sans ornement). */
export function indiceCoque(x: number, y: number, z: number): number {
  const ax = Math.abs(x);
  const ay = Math.abs(y);
  const az = Math.abs(z);
  let i = 4;
  if (y >= 2) i = 2;
  if (ay === 3 && ax <= 1 && az === 3) i = 1;
  if (ax === 0 && y === 0 && az === 3) i = 7; // serrure, toujours la clarté la plus sombre
  if (ax === 4 && ay <= 1) i = 6;
  return i;
}

/** Coque 9 × 7 × 7 creuse (266 cellules), ferrures recolorées, contact puis trame. */
export function cellulesCoque(ornements: readonly Ornement[]): CelluleCoffre[] {
  const map = new Map<number, CelluleCoffre>();
  for (let x = -4; x <= 4; x++) {
    for (let y = -3; y <= 3; y++) {
      for (let z = -3; z <= 3; z++) {
        if (!(Math.abs(x) === 4 || Math.abs(y) === 3 || Math.abs(z) === 3)) continue;
        map.set(cleCellule(x, y, z), { x, y, z, i: indiceCoque(x, y, z) });
      }
    }
  }
  // Ferrures (x = ±4, z = ±3) : ce sont les angles de la coque, toujours dans la
  // Map — elles recolorent, elles ne doublent plus.
  if (ornements.includes("ferrures")) {
    for (const c of voxelsFerrures()) {
      const e = map.get(cleCellule(c.x, c.y, c.z));
      if (e) e.i = 1;
    }
  }
  // Contact : cellule de coque sous une cellule d'ornement posé (tas au pas 0,16 → ×0,8 ;
  // couronne au pas 0,2) ou dans le 3 × 3 sous la cage.
  const sous = new Set<number>();
  if (ornements.includes("tas")) {
    for (const c of voxelsTasCouvercle())
      sous.add(cleCellule(Math.round(c.x * 0.8), 3, Math.round(c.z * 0.8)));
  }
  if (ornements.includes("couronne")) {
    for (const c of voxelsCouronne()) sous.add(cleCellule(c.x, 3, c.z));
  }
  if (ornements.includes("cage")) {
    for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) sous.add(cleCellule(x, y, 3));
  }
  for (const e of map.values()) {
    if (e.i !== 2 && e.i !== 4 && e.i !== 6) continue; // jamais 0 (tas), 1 (poignée, ferrures), 7 (serrure)
    if (sous.has(cleCellule(e.x, e.y, e.z))) {
      if (e.i !== 6) e.i += 1; // contact : 2→3, 4→5, jamais 6→7
    } else if (seuilFace(e.x, e.y, e.z) < 4) {
      e.i -= 1; // trame : un quart des cellules monte d'une clarté (2→1, 4→3, 6→5)
    }
  }
  return [...map.values()];
}

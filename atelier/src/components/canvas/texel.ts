/**
 * Jauge — hors feuille. Tramage et occlusion par cellule entière ; aucune
 * interpolation. Ne crée ni ne retire aucune cellule : lit une occupance.
 * Aucune dépendance : partagé par l'inventaire, la tour et le coffre.
 */

export type Cellule3 = { readonly x: number; readonly y: number; readonly z: number };

export const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5] as const;

/** Seuil ordonné 0..15 (Bayer 4×4 replié sur les trois axes : à y fixe, motif exact en (x,z), coordonnées négatives comprises). */
export function seuilBayer(x: number, y: number, z: number): number {
  return BAYER4[((x + 2 * y) & 3) * 4 + ((z + y) & 3)]!;
}

/** Clé entière d'une cellule dans [-64, 63]³. */
export function cleCellule(x: number, y: number, z: number): number {
  return x + 64 + 128 * (y + 64 + 128 * (z + 64));
}

/** Voisins occupés : n6 (faces) et n26 (cube 3×3×3 sans la cellule). */
export function voisinage(
  occ: ReadonlySet<number>,
  x: number,
  y: number,
  z: number,
): { n6: number; n26: number } {
  let n6 = 0;
  let n26 = 0;
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dz = -1; dz <= 1; dz++) {
        if (dx === 0 && dy === 0 && dz === 0) continue;
        if (!occ.has(cleCellule(x + dx, y + dy, z + dz))) continue;
        n26++;
        if (Math.abs(dx) + Math.abs(dy) + Math.abs(dz) === 1) n6++;
      }
    }
  }
  return { n6, n26 };
}

/** Palier d'occlusion 0..3 : coin libre, arête, face plane, enfoncé. */
export function palierOcclusion(n26: number): 0 | 1 | 2 | 3 {
  return n26 <= 7 ? 0 : n26 <= 12 ? 1 : n26 <= 18 ? 2 : 3;
}

export const CLARTE_OCCLUSION = [1.0, 0.93, 0.86, 0.74] as const;

/** Facteur multiplicatif sRGB d'une cellule : occlusion, puis un quart des cellules remonte d'un palier (trame). */
export function clarteCellule(occ: ReadonlySet<number>, x: number, y: number, z: number): number {
  let j: number = palierOcclusion(voisinage(occ, x, y, z).n26);
  if (j > 0 && seuilBayer(x, y, z) < 4) j -= 1;
  return CLARTE_OCCLUSION[j]!;
}

/** Occupance + cellules visibles (n6 < 6 : une cellule enclose n'a aucune face exposée). */
export function visibles<T extends Cellule3>(vs: readonly T[]): { occ: Set<number>; vus: T[] } {
  const occ = new Set(vs.map((v) => cleCellule(v.x, v.y, v.z)));
  return { occ, vus: vs.filter((v) => voisinage(occ, v.x, v.y, v.z).n6 < 6) };
}

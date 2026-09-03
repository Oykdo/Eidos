/** Champ discret sur l'arbre — ∇, ∇·, ∇×, ∇² du potentiel de descendance. */

import {
  N_TIERS,
  type Arbre,
  type Noeud,
  arbre,
  rayonDuPalier,
  yDuPalier,
} from "./modele.ts";

export type Plongement = "cone" | "puits";
export type Operateur = "grad" | "div" | "curl" | "lap";
export type Vue = "orbite" | "axiale";

export type Vec3 = { x: number; y: number; z: number };

/** Φ = 9 − palier. D0 (continuité) est le maximum, D9 le minimum. */
export function potentiel(n: Pick<Noeud, "palier">): number {
  return N_TIERS - 1 - n.palier;
}

/**
 * Rayon de D0, analogue d'horizon pour le plongement puits.
 * Ce n'est PAS r_s = 2GM/c² : l'arbre n'a ni masse ni c.
 */
export const R_HORIZON = rayonDuPalier(0);
export const R_PHOTON = R_HORIZON * 1.5;

export function poser(p: Vec3, mode: Plongement): Vec3 {
  if (mode === "cone") return { x: p.x, y: p.y, z: p.z };
  const r = Math.hypot(p.x, p.z);
  const rs = R_HORIZON * 0.92;
  const depth = 2 * Math.sqrt(Math.max(1e-9, rs * Math.max(0, r - rs)));
  return { x: p.x, y: depth * 1.55, z: p.z };
}

export function poserPalier(
  t: number,
  mode: Plongement,
): { y: number; r: number } {
  const r = rayonDuPalier(t);
  const p = poser({ x: r, y: yDuPalier(t), z: 0 }, mode);
  return { y: p.y, r };
}

export type ChampNoeud = {
  id: number;
  phi: number;
  grad: Vec3;
  div: number;
  curlAzim: number;
  laplacien: number;
  nEnfants: number;
};

export type Champ = {
  noeuds: ChampNoeud[];
  curlMoyen: number;
  sommeDiv: number;
  foret: boolean;
};

export function enfantsDe(a: Arbre): number[][] {
  const e: number[][] = a.noeuds.map(() => []);
  for (const n of a.noeuds) {
    if (n.parent != null) e[n.parent]!.push(n.id);
  }
  return e;
}

/**
 * Flux de descendance : 1 par arête parent → enfant (direction −∇Φ).
 * ∇·v = k − 1_parent : sources en D0, puits en D9, somme nulle.
 * Le graphe est une forêt : aucun cycle ⇒ rotationnel combinatoire nul.
 * curlAzim n'est que la fuite azimutale du plongement 3D (parents à l'angle
 * le plus proche, plus un jitter) — ce n'est pas ∇×.
 * ∇²Φ graphe = Σ(Φn − Φm) = k − 1_parent (ΔΦ = 1 le long d'une arête).
 */
export function estForet(a: Arbre): boolean {
  for (const n of a.noeuds) {
    const vus = new Set<number>();
    let cur: number | null = n.id;
    let pas = 0;
    while (cur != null) {
      if (vus.has(cur)) return false;
      vus.add(cur);
      pas += 1;
      if (pas > N_TIERS) return false;
      cur = a.noeuds[cur]!.parent;
    }
  }
  return true;
}

export function calculerChamp(
  a: Arbre = arbre(),
  mode: Plongement = "cone",
): Champ {
  const enfants = enfantsDe(a);
  const pos = a.noeuds.map((n) => poser(n, mode));
  const noeuds: ChampNoeud[] = [];
  let curlAbs = 0;
  let sommeDiv = 0;

  for (const n of a.noeuds) {
    const phi = potentiel(n);
    const p = pos[n.id]!;
    const k = enfants[n.id]!.length;
    const parentId = n.parent;
    const hasP = parentId != null;

    let grad: Vec3 = { x: 0, y: 0, z: 0 };
    if (parentId != null) {
      const par = a.noeuds[parentId]!;
      const q = pos[parentId]!;
      const dx = q.x - p.x;
      const dy = q.y - p.y;
      const dz = q.z - p.z;
      const dist = Math.hypot(dx, dy, dz) || 1;
      const s = (potentiel(par) - phi) / dist;
      grad = { x: (dx / dist) * s, y: (dy / dist) * s, z: (dz / dist) * s };
    } else {
      const dist = Math.hypot(p.x, p.z) || 1;
      grad = { x: -p.x / dist, y: 0, z: -p.z / dist };
    }

    const div = k - (hasP ? 1 : 0);
    const laplacien = k - (hasP ? 1 : 0);

    const vx = -grad.x;
    const vz = -grad.z;
    const rho = Math.hypot(p.x, p.z);
    let curlAzim = 0;
    if (rho > 1e-6) {
      const eThetaX = -p.z / rho;
      const eThetaZ = p.x / rho;
      const vmag = Math.hypot(vx, -grad.y, vz) || 1;
      curlAzim = (eThetaX * vx + eThetaZ * vz) / vmag;
    }
    curlAbs += Math.abs(curlAzim);
    sommeDiv += div;

    noeuds.push({
      id: n.id,
      phi,
      grad,
      div,
      curlAzim,
      laplacien,
      nEnfants: k,
    });
  }

  return {
    noeuds,
    curlMoyen: noeuds.length ? curlAbs / noeuds.length : 0,
    sommeDiv,
    foret: estForet(a),
  };
}

export function palierLePlusProche(r: number): number {
  let best = 0;
  let bestD = Infinity;
  for (let t = 0; t < N_TIERS; t++) {
    const d = Math.abs(rayonDuPalier(t) - r);
    if (d < bestD) {
      bestD = d;
      best = t;
    }
  }
  return best;
}

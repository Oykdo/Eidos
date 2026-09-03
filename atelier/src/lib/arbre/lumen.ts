/**
 * Lumen de l'arbre — l'image sur la forme.
 *
 * La forme (modele.ts, champ.ts) ne bouge pas : 425 nœuds, Φ = 9 − palier, forêt.
 * Ici : ρ = R(h)/a souffle ; la charge UTXO pique à part (même à D9, même à ρ = 1).
 * La chroma d'âge module les 11 familles. Pas un Merkle, pas un (h·41 mod 425).
 */

import { ageOf, rewardAt, T, H0 } from "../eidos/eonis.ts";
import { ATOMES } from "../eidos/constantes.ts";
import { couleurSecteur, rayonDuPalier, yDuPalier, type Noeud } from "./modele.ts";
import { poser, potentiel, type Plongement, type Vec3 } from "./champ.ts";

export const PREMIER_CULMINATION = 41;

export const METAUX = {
  Satya: "#c9a227",
  Treta: "#3e8e6e",
  Dvapara: "#3a6ea5",
  Kali: "#a8332a",
} as const;

export const OR = "#c9a227";

const A_SATYA = 40;
const SOUFFLE_ANNEAU = 0.06;
const AMP_CAP = 0.35;
const AMP_K = 0.28;
/** Poids de la circulation. Même rapport que b/a des reliques — pas un second souffle. */
export const CHARGE_POIDS = 0.5;

export type NomAgeLumen = keyof typeof METAUX;

export type LumenArbre = {
  h: number;
  rho: number;
  sigma: number;
  theta: number;
  age: NomAgeLumen;
  a: number;
  metal: string;
  culmination: boolean;
};

export type LumenScene = {
  lumen: LumenArbre;
  charges: Map<number, number>;
  chargeMax: number;
  chaudNoeud: number | null;
  chaudSecteur: number | null;
};

function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}

export function estCulmination(h: number): boolean {
  const phase = ((h % T) + T) % T;
  const d = Math.abs(phase - H0);
  return Math.min(d, T - d) <= 1;
}

export function lumenArbre(h: number): LumenArbre {
  const age = ageOf(h);
  if (!age) {
    return {
      h,
      rho: 1,
      sigma: 0.25,
      theta: 0,
      age: "Kali",
      a: 10,
      metal: METAUX.Kali,
      culmination: false,
    };
  }
  const local = h - age.start;
  const phase = ((local % T) + T) % T;
  const R = rewardAt(h);
  const denom = age.a * ATOMES;
  const rho = denom > 0 ? R / denom : 1;
  const nom = (age.nom in METAUX ? age.nom : "Satya") as NomAgeLumen;
  return {
    h,
    rho: clamp(rho, 0.5, 1.5),
    sigma: age.a / A_SATYA,
    theta: (2 * Math.PI * (phase - H0)) / T,
    age: nom,
    a: age.a,
    metal: METAUX[nom],
    culmination: estCulmination(local),
  };
}

export function sceneVide(h = 0): LumenScene {
  return {
    lumen: lumenArbre(h),
    charges: new Map(),
    chargeMax: 0,
    chaudNoeud: null,
    chaudSecteur: null,
  };
}

/**
 * Amplitude radiale, bornée.
 * Deux termes : le souffle (ρ, Φ) et la circulation (UTXO).
 * D9 a Φ = 0 : il ne respire pas, il porte encore la charge.
 * À ρ = 1 le souffle s'annule ; les nœuds chargés restent proéminents.
 */
export function amplitude(
  n: Pick<Noeud, "palier" | "x" | "z">,
  L: LumenArbre,
  charge = 0,
  chargeMax = 0,
): number {
  const r = Math.hypot(n.x, n.z) || 1;
  const phi = potentiel(n);
  const souffle = (L.rho - 1) * (phi / 9);
  const cap = Math.min(AMP_CAP, AMP_K * r);
  const frac = chargeMax > 0 ? charge / chargeMax : 0;
  return cap * (souffle + CHARGE_POIDS * frac);
}

/** Déplacement dans l'espace de la forme, avant plongement. */
export function deplacer(
  p: Vec3,
  n: Pick<Noeud, "palier" | "x" | "z">,
  L: LumenArbre,
  charge = 0,
  chargeMax = 0,
): Vec3 {
  const r = Math.hypot(n.x, n.z) || 1;
  const amp = amplitude(n, L, charge, chargeMax);
  return {
    x: p.x + (n.x / r) * amp,
    y: p.y,
    z: p.z + (n.z / r) * amp,
  };
}

export function poserLumen(
  p: Vec3,
  n: Pick<Noeud, "palier" | "x" | "z">,
  mode: Plongement,
  L: LumenArbre,
  charge = 0,
  chargeMax = 0,
): Vec3 {
  return poser(deplacer(p, n, L, charge, chargeMax), mode);
}

export function poserPalierLumen(
  t: number,
  mode: Plongement,
  L: LumenArbre,
): { y: number; r: number } {
  const r0 = rayonDuPalier(t);
  const r = r0 * (1 + SOUFFLE_ANNEAU * (L.rho - 1));
  const p = poser({ x: r, y: yDuPalier(t), z: 0 }, mode);
  return { y: p.y, r };
}

export function facteurAnneau(L: LumenArbre): number {
  return 1 + SOUFFLE_ANNEAU * (L.rho - 1);
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function rgbToHex(r: number, g: number, b: number): string {
  const u = (n: number) =>
    Math.round(clamp(n, 0, 255))
      .toString(16)
      .padStart(2, "0");
  return `#${u(r)}${u(g)}${u(b)}`;
}

export function lerpHex(a: string, b: string, t: number): string {
  const u = clamp(t, 0, 1);
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return rgbToHex(r1 + (r2 - r1) * u, g1 + (g2 - g1) * u, b1 + (b2 - b1) * u);
}

/**
 * Nuit (ρ = ½) : métal de l'âge. Jour (ρ → 3/2) : couleur de famille, désaturée par σ.
 * Le secteur de la coinbase (trésor) tire vers l'or.
 */
export function chromaNoeud(
  n: Pick<Noeud, "id" | "secteur">,
  L: LumenArbre,
  opts: { chaudNoeud: number | null; chaudSecteur: number | null },
): string {
  const famille = couleurSecteur(n.secteur);
  const jour = clamp((L.rho - 0.5) * L.sigma, 0, 1);
  let c = lerpHex(L.metal, famille, jour);
  if (opts.chaudSecteur != null && n.secteur === opts.chaudSecteur) {
    c = lerpHex(c, OR, clamp(L.rho, 0, 1) * 0.55);
  }
  if (opts.chaudNoeud === n.id) {
    c = lerpHex(c, OR, 0.7);
  }
  return c;
}

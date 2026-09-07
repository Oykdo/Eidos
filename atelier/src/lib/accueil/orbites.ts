/**
 * Orbites de l'accueil — la géométrie pure du fond orbital (PR 4).
 *
 * Le fond de la page d'accueil lit Eidos au lieu de le décorer :
 *   - l'orbite principale est le limaçon de la loi d'émission,
 *     R(θ) = a + (a/2)·cos θ, tracé en unités de a (R/a = 1 + cos θ / 2) et
 *     rapporté au rayon de l'orbite médiane (rang 4, Melpomène ☉) ; a est
 *     celui de l'âge courant (eonis.ageOf) ; POINTS_LIMACON = 144 échantillons,
 *     multiple de 4 : les quatre points cardinaux sont des échantillons ;
 *   - l'astre du réseau est le point du limaçon à la phase
 *     2π·((h − h₀) mod T)/T de la tête suivie : où l'époque en est — une
 *     lecture, jamais une garantie ;
 *   - neuf astres-muses (signatures.ts) sur neuf orbites emboîtées, Thalie
 *     (⊕, rang 0) au plus près du centre, Uranie (★, rang 8) au plus loin ;
 *     rayon = fraction du demi-côté min(largeur, hauteur)/2, de 0,18 à 0,86
 *     par pas de 0,085 (FRACTIONS_ORBITES) ; période de révolution
 *     PERIODE_DANSE_S × (2 + rang), plus lente en s'éloignant (22,6 s pour
 *     Thalie, 113 s pour Uranie) ; à t = 0 les neuf forment une spirale
 *     (angle initial 2π·rang/9) ;
 *   - chaque astre est modulé par sa danse (reliques/danse.ts, fam = son
 *     indice dans SIGNATURES : 0 Uranie … 8 Thalie, phase = 2π·t/PERIODE_DANSE_S).
 *     La danse déplace un point témoin (1, 1, 1)/√3 — aucun axe n'y domine,
 *     donc aucune danse n'y est invisible : la flamme ne bouge que y, la ronde
 *     que x et z — et le déplacement (x, y) est rapporté à la portée de la
 *     danse sur une période (mesurée à la charge sur 256 phases : de 0,075
 *     pour la flamme à 1,39 pour la ronde), puis à AMPLITUDE_DANSE × demi-côté :
 *     même portée pour les neuf, chacune sa figure ; identité à phase 0 ;
 *   - le plan est incliné vers le pointeur d'au plus INCLINAISON_MAX = 3° :
 *     compression cos(t) sur chaque axe et glissement du centre de
 *     sin(t) × demi-côté vers le pointeur (au plus 5,2 % du demi-côté) —
 *     lisible, pas une vraie 3D ; sans pointeur, à plat.
 *
 * Coordonnées : pixels CSS, y vers le bas ; les angles tournent dans le sens
 * trigonométrique tel qu'on le voit (x = cx + r·cos α, y = cy − r·sin α) ;
 * θ = 0 (émission maximale, 3a/2) est à droite du centre.
 *
 * Tout dérive de t, de la hauteur et du pointeur : aucun aléa, aucune trace
 * (le pointeur traverse `scene` et n'est ni gardé ni transmis). Figures, pas
 * preuves : ce fond n'engage rien. reduit = true rend l'image fixe (t = 0,
 * pas de pointeur), celle du mouvement réduit.
 *
 * LIMITE assumée : le limaçon est tracé en unités de a — R/a = 1 + cos θ/2 ne
 * dépend pas de a, sa forme est la même aux quatre âges et ageOf n'y change
 * rien de visible ; le fond montre la forme de la loi et la phase de l'époque,
 * pas le montant versé. Les orbites sont des cercles (le contrat les donne par
 * leur rayon) alors que les astres sont comprimés de cos(3°) = 0,9986 au
 * plus : l'écart, 0,14 %, est invisible. La portée d'une danse est mesurée sur
 * 256 phases : entre deux échantillons la modulation peut dépasser 1 d'une
 * fraction de pour cent. Après le dernier bloc (ageOf = null) a vaut celui de
 * Kali ; une hauteur illisible (NaN, ±∞) se lit comme h₀, une fractionnaire
 * est tronquée ; une dimension de vue illisible ou négative vaut 0 (tout au
 * centre, jamais NaN). Rien ici n'est du consensus : phaseEpoque réduit en
 * entiers modulo T avant toute conversion — la hauteur d'abord, h₀ ensuite,
 * exact même au-delà de 2⁵³ —, le reste est flottant, présentation seulement.
 */

import { H0, T, ageOf } from "../eidos/eonis.ts";
import { SIGNATURES, type SignatureId } from "../eidos/signatures.ts";
import type { Chemin } from "../navigation.ts";
import { PERIODE_DANSE_S, danse, type Vec3 } from "../reliques/danse.ts";

/** Normalisé dans [−1, 1] par rapport au centre de la vue ; null = pas de pointeur. */
export type Pointeur = { x: number; y: number } | null;

/** Pixels CSS. */
export type Vue = { largeur: number; hauteur: number };

/** rang 0 = Thalie (le plus proche du centre) … 8 = Uranie ; angle en radians dans [0, 2π[. */
export type Astre = {
  id: SignatureId;
  astre: string;
  muse: string;
  x: number;
  y: number;
  rayonOrbite: number;
  angle: number;
  rang: number;
};

export type Scene = {
  centre: { x: number; y: number };
  orbites: { rayon: number; rang: number }[];
  limacon: { x: number; y: number }[];
  reseau: { x: number; y: number; phase: number };
  astres: Astre[];
};

export const IMAGES_PAR_SECONDE = 30;
export const DPR_MAX = 2;

/** Un clic sur un astre mène à la page de sa muse. Neuf chemins de navigation.ts, tous distincts. */
export const PAGE_DE_MUSE: Record<SignatureId, Chemin> = {
  terre: "/tour",
  uranie: "/temoin",
  lune: "/journal",
  mercure: "/glyphes",
  venus: "/veillee",
  soleil: "/reliques",
  mars: "/",
  jupiter: "/signatures",
  saturne: "/arbre",
};

/** Rayons des neuf orbites en fractions du demi-côté, rang 0 (Thalie) → 8 (Uranie). */
export const FRACTIONS_ORBITES: readonly number[] = Object.freeze([
  0.18, 0.265, 0.35, 0.435, 0.52, 0.605, 0.69, 0.775, 0.86,
]);

/** Le limaçon se rapporte au rayon de cette orbite (Melpomène ☉). */
export const ORBITE_MEDIANE = 4;

/** Multiple de 4 : θ = 0, π/2, π, 3π/2 tombent sur des échantillons. */
export const POINTS_LIMACON = 144;

/** 3° en radians (0,05236). */
export const INCLINAISON_MAX = (3 * Math.PI) / 180;

/** Portée de la modulation par la danse, en fraction du demi-côté. */
export const AMPLITUDE_DANSE = 0.03;

/** Rayon de survol par défaut d'un astre, en pixels CSS. */
export const RAYON_SURVOL = 18;

/** Kali : après le dernier bloc, ageOf rend null. */
const A_DERNIER_AGE = 10;

const TAU = 2 * Math.PI;

/** R(θ) = a + (a/2)·cos θ, dans l'unité de a. θ = 0 → 3a/2, π → a/2. */
export function limacon(a: number, theta: number): number {
  return a + (a / 2) * Math.cos(theta);
}

/** Une hauteur illisible (NaN, ±∞) se lit comme h₀ ; une fractionnaire est tronquée. */
function hauteurLisible(hauteur: number): number {
  return Number.isFinite(hauteur) ? Math.trunc(hauteur) : H0;
}

/**
 * 2π·((hauteur − h₀) mod T)/T dans [0, 2π[. Tout se réduit en entiers avant
 * la conversion en radians : la hauteur est d'abord réduite modulo T (`%` est
 * exact sur tout entier flottant, même au-delà de 2⁵³, là où h − h₀ ne le
 * serait plus), h₀ est retranché ensuite et le reste est ramené dans [0, T[,
 * positif même sous h₀.
 */
export function phaseEpoque(hauteur: number): number {
  const h = hauteurLisible(hauteur);
  const k = ((((h % T) - H0) % T) + T) % T;
  return TAU * (k / T);
}

function borner(v: number): number {
  return Number.isFinite(v) ? Math.max(-1, Math.min(1, v)) : 0;
}

/** Une dimension de vue en pixels CSS ; illisible ou négative = 0. */
function dimension(v: number): number {
  return Number.isFinite(v) && v > 0 ? v : 0;
}

/** Inclinaison du plan vers le pointeur, en radians, au plus 3° par axe ; 0 sans pointeur. */
export function inclinaison(p: Pointeur): { tx: number; ty: number } {
  if (!p) return { tx: 0, ty: 0 };
  return { tx: borner(p.x) * INCLINAISON_MAX, ty: borner(p.y) * INCLINAISON_MAX };
}

/** Période de révolution d'un astre, en secondes : plus lente en s'éloignant. */
export function periodeOrbite(rang: number): number {
  return PERIODE_DANSE_S * (2 + rang);
}

/** Angle d'un astre à t = 0 : une spirale, Thalie à droite du centre. */
export function angleInitial(rang: number): number {
  return (TAU * rang) / 9;
}

/** Le point témoin de la danse : aucun axe n'y domine. */
const TEMOIN: Vec3 = [1 / Math.sqrt(3), 1 / Math.sqrt(3), 1 / Math.sqrt(3)];
const ECHANTILLONS_PORTEE = 256;

/** Déplacement (x, y) du témoin par la danse, y d'écran vers le bas (le y de la danse monte). */
function deplacementDanse(fam: number, phase: number): [number, number] {
  const q = danse(TEMOIN, fam, phase);
  return [q[0] - TEMOIN[0], TEMOIN[1] - q[1]];
}

/** Portée de chaque danse sur une période, mesurée une fois à la charge. */
const PORTEES: readonly number[] = SIGNATURES.map((_, fam) => {
  let m = 0;
  for (let i = 0; i < ECHANTILLONS_PORTEE; i++) {
    const [dx, dy] = deplacementDanse(fam, (TAU * i) / ECHANTILLONS_PORTEE);
    m = Math.max(m, Math.hypot(dx, dy));
  }
  return m;
});

/**
 * Modulation d'une danse : déplacement (x, y) du témoin rapporté à la portée
 * de la danse, dans le disque unité (à une fraction de pour cent près) ;
 * (0, 0) à phase 0. fam = indice dans SIGNATURES (0 Uranie … 8 Thalie).
 */
export function modulationDanse(fam: number, phase: number): { x: number; y: number } {
  const portee = PORTEES[fam];
  if (!portee) return { x: 0, y: 0 };
  const [dx, dy] = deplacementDanse(fam, phase);
  return { x: dx / portee, y: dy / portee };
}

function mod2pi(a: number): number {
  return ((a % TAU) + TAU) % TAU;
}

/**
 * La scène à l'instant t. reduit = true ⇒ comme t = 0 et pointeur null : une
 * image fixe. Le pointeur n'est lu que pour l'inclinaison de cette image.
 * Pure : même entrées, même scène ; rien n'est gardé entre deux appels.
 */
export function scene(
  tSecondes: number,
  vue: Vue,
  hauteur: number,
  pointeur: Pointeur,
  reduit: boolean,
): Scene {
  const t = reduit || !Number.isFinite(tSecondes) ? 0 : tSecondes;
  const h = hauteurLisible(hauteur);
  const { tx, ty } = inclinaison(reduit ? null : pointeur);
  const largeur = dimension(vue.largeur);
  const haut = dimension(vue.hauteur);
  const demi = Math.min(largeur, haut) / 2;
  const centre = {
    x: largeur / 2 + Math.sin(tx) * demi,
    y: haut / 2 + Math.sin(ty) * demi,
  };
  const cx = Math.cos(tx);
  const cy = Math.cos(ty);
  const projeter = (X: number, Y: number) => ({ x: centre.x + X * cx, y: centre.y + Y * cy });

  const orbites = FRACTIONS_ORBITES.map((f, rang) => ({ rayon: f * demi, rang }));
  const rMedian = orbites[ORBITE_MEDIANE]!.rayon;

  // Le limaçon de l'âge courant, en unités de a, sur l'orbite médiane.
  const a = ageOf(h)?.a ?? A_DERNIER_AGE;
  const rayonLimacon = (theta: number) => (limacon(a, theta) / a) * rMedian;
  const limaconPts: { x: number; y: number }[] = [];
  for (let i = 0; i < POINTS_LIMACON; i++) {
    const theta = (TAU * i) / POINTS_LIMACON;
    const rho = rayonLimacon(theta);
    limaconPts.push(projeter(rho * Math.cos(theta), -rho * Math.sin(theta)));
  }

  // L'astre du réseau : où l'époque en est, sur le limaçon. Une lecture.
  const phase = phaseEpoque(h);
  const rhoReseau = rayonLimacon(phase);
  const reseau = {
    ...projeter(rhoReseau * Math.cos(phase), -rhoReseau * Math.sin(phase)),
    phase,
  };

  // Neuf astres : révolution propre, modulée par la danse de la muse.
  const phaseDanse = (TAU * t) / PERIODE_DANSE_S;
  const amplitude = AMPLITUDE_DANSE * demi;
  const astres: Astre[] = [];
  for (let rang = 0; rang < FRACTIONS_ORBITES.length; rang++) {
    const fam = SIGNATURES.length - 1 - rang; // indice dans SIGNATURES = famille de danse
    const s = SIGNATURES[fam]!;
    const rayonOrbite = orbites[rang]!.rayon;
    const angle = mod2pi(angleInitial(rang) + (TAU * t) / periodeOrbite(rang));
    const m = modulationDanse(fam, phaseDanse);
    const X = rayonOrbite * Math.cos(angle) + amplitude * m.x;
    const Y = -rayonOrbite * Math.sin(angle) + amplitude * m.y;
    astres.push({
      id: s.id,
      astre: s.astre,
      muse: s.muse,
      ...projeter(X, Y),
      rayonOrbite,
      angle,
      rang,
    });
  }

  return { centre, orbites, limacon: limaconPts, reseau, astres };
}

/** L'astre le plus proche de (x, y) à moins de rayon pixels, sinon null. À égalité, le premier. */
export function astreSous(
  astres: readonly Astre[],
  x: number,
  y: number,
  rayon = RAYON_SURVOL,
): Astre | null {
  let meilleur: Astre | null = null;
  let dMin = Infinity;
  for (const a of astres) {
    const d = Math.hypot(a.x - x, a.y - y);
    if (d <= rayon && d < dMin) {
      meilleur = a;
      dMin = d;
    }
  }
  return meilleur;
}

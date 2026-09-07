/**
 * Fond orbital — les calculs purs de FondOrbital.tsx, sans DOM : le lissage du
 * pointeur (retour lent à plat), la normalisation d'une position dans la vue,
 * la cadence des images, la place de l'étiquette. Tout dérive de ce qu'on
 * leur passe : aucun aléa, aucun stockage, aucune lecture d'horloge ici.
 * Présentation seulement — rien ne se rejoue ni n'engage.
 *
 * LIMITE : ces fonctions ne connaissent ni le canvas ni le navigateur ; la
 * cadence suppose les horodatages monotones de requestAnimationFrame — une
 * horloge qui recule ne gèle rien, l'image se dessine sans attendre et la
 * cadence se réancre là, un écart de plus que la tolérance n'est pas rattrapé ;
 * une étiquette plus large que la vue moins ses marges ne tient d'aucun côté
 * et déborde à droite, calée à la marge gauche.
 */

export type Point = { x: number; y: number };
export type Taille = { largeur: number; hauteur: number };

/** Part du chemin vers la cible parcourue à chaque image : dix pour cent. */
export const LISSAGE = 0.1;
/** En deçà de ce rayon, le pointeur lissé vaut « à plat » : null. */
export const SEUIL_PLAT = 1e-3;
/** Tolérance, en millisecondes, sur l'intervalle entre deux images (gigue de rAF). */
export const TOLERANCE_MS = 1;
/** Marge de l'étiquette au bord de la vue et à l'astre, en pixels CSS. */
export const MARGE_ETIQUETTE = 14;

function borner(v: number): number {
  return v < -1 ? -1 : v > 1 ? 1 : v;
}

/**
 * Un pas du pointeur effectif vers la cible ; cible null = vers le plat (0, 0).
 * Rend null quand la cible est nulle et que le pointeur est revenu à plat.
 */
export function lisser(effectif: Point | null, cible: Point | null, k = LISSAGE): Point | null {
  if (cible === null && effectif === null) return null;
  const de = effectif ?? { x: 0, y: 0 };
  const vers = cible ?? { x: 0, y: 0 };
  const x = de.x + (vers.x - de.x) * k;
  const y = de.y + (vers.y - de.y) * k;
  if (cible === null && Math.hypot(x, y) < SEUIL_PLAT) return null;
  return { x, y };
}

/** Position en pixels CSS → [−1, 1] par rapport au centre de la vue ; vue vide = centre. */
export function normaliser(x: number, y: number, vue: Taille): Point {
  const nx = vue.largeur > 0 ? (2 * x) / vue.largeur - 1 : 0;
  const ny = vue.hauteur > 0 ? (2 * y) / vue.hauteur - 1 : 0;
  return { x: borner(nx), y: borner(ny) };
}

/**
 * Cadence : l'horodatage à retenir si l'image se dessine, null si on la saute.
 * Deux images ne sont jamais plus proches que l'intervalle moins la tolérance :
 * « au plus » ips images par seconde, quitte à en perdre un peu quand l'écran
 * rafraîchit à un multiple non entier (144 Hz : 28,8 images par seconde).
 * Sans précédent, ou si l'horloge a reculé, l'image se dessine et sert d'ancre.
 */
export function cadencer(precedent: number | null, maintenant: number, ips: number): number | null {
  const intervalle = 1000 / ips;
  if (precedent === null || maintenant < precedent) return maintenant;
  if (maintenant - precedent + TOLERANCE_MS < intervalle) return null;
  return maintenant;
}

/**
 * Coin haut-gauche de l'étiquette : à droite de l'astre, à gauche si elle
 * déborderait, dans la vue à la marge près dès qu'elle y tient ; sinon calée à
 * la marge gauche et haute (voir LIMITE).
 */
export function placerEtiquette(
  astre: Point,
  etiquette: Taille,
  vue: Taille,
  marge = MARGE_ETIQUETTE,
): Point {
  let x = astre.x + marge;
  if (x + etiquette.largeur > vue.largeur - marge) x = astre.x - marge - etiquette.largeur;
  if (x < marge) x = marge;
  let y = astre.y - etiquette.hauteur / 2;
  const yMax = vue.hauteur - etiquette.hauteur - marge;
  if (y > yMax) y = yMax;
  if (y < marge) y = marge;
  return { x, y };
}

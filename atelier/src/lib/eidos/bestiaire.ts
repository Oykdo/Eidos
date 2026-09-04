/**
 * Bestiaire — la collection des captures, rangée par cellule de la doxa.
 *
 * Trois classes × sept régimes = vingt et une cellules (`CELLULES_DOXA`).
 * Une capture tombe dans la cellule de la forme du catalogue (les 101 de
 * `cosmos-empreintes.ts`, l'ancre exclue) la plus proche de son mot : le plus
 * grand |alignement|, à égalité le plus petit rang. La doxa est un treillis,
 * le quaternion vit entre les cases : la cellule se lit, elle ne se déclare pas.
 *
 * Le bestiaire vit dans le Coffre, à côté de l'inventaire : le Coffre montre
 * ce que j'ai, la carte montre le monde.
 *   - une cellule remplie : Polymnie l'inscrit dans ses hymnes (une réplique) ;
 *   - vingt et une cellules : Uranie ouvre, à l'observatoire, la lecture des
 *     101 formes avec celles que le coffre a rencontrées. Rien d'autre.
 *
 * Ce qu'une capture fait : compagne d'antre (libérée, au plus une par étage,
 * capsules.ts / secrets.ts) ; accord par le mercure (conjuguée par l'objet
 * porté → nouvelle capture, ancien mot noté dans `bus`) ; offrande à
 * Terpsichore (constructive avec l'objet porté → une gemme, la capture est
 * retirée). Interdits : élever, fusionner, faire combattre, vendre.
 *
 * LIMITE : la forme la plus proche est une lecture ; deux captures voisines
 * peuvent tomber dans deux cellules. C'est le treillis, pas une erreur.
 */

import { CELLULES_DOXA, CLASSES, REGIMES, alignement, type Q } from "./cosmos.ts";
import { VECTEUR_EMPREINTES } from "./cosmos-empreintes.ts";
import { affixeDe, habille } from "./equipement.ts";
import { especeActive } from "./elixirs.ts";
import { conjuguerPar } from "./groupe.ts";
import { concat, sha256d, u32, utf8 } from "./hash.ts";
import { hoteDe } from "./hotes.ts";
import { nomCapture } from "./hotes-lexique.ts";
import { celluleDoxa } from "./integrite.ts";
import { tourDe } from "./jauge.ts";
import { motDeQ } from "./lecture.ts";
import { objetDepuisGraine } from "./objets.ts";
import { paireDe, qDeMot } from "./resonance.ts";
import { porteurDe } from "./capsules.ts";
import type { SignatureId } from "./signatures.ts";
import type { Coffre, ObjetPorte } from "./types.ts";

export const TAG_OFFRANDE = utf8("eidos-offrande/1");

export type Forme = { rang: number; classe: string; regime: string; q: Q };

/** Les cent formes rangées (l'ancre, rang 0, exclue). */
export const FORMES: readonly Forme[] = VECTEUR_EMPREINTES.filter((o) => o.classe !== "ancre").map(
  (o) => ({
    rang: o.rang,
    classe: o.classe,
    regime: o.regime,
    q: [
      BigInt(o.orientation[0]!),
      BigInt(o.orientation[1]!),
      BigInt(o.orientation[2]!),
      BigInt(o.orientation[3]!),
    ] as Q,
  }),
);

/** Les 21 cellules, dans l'ordre classe puis régime. */
export const CELLULES: readonly string[] = CLASSES.flatMap((c) =>
  REGIMES.map((r) => celluleDoxa(c, r)),
);

if (CELLULES.length !== CELLULES_DOXA) throw new Error("cellules ≠ CELLULES_DOXA");

function abs(x: bigint): bigint {
  return x < 0n ? -x : x;
}

/** La forme la plus proche : plus grand |alignement| (mêmes normes au catalogue), à égalité le plus petit rang. */
export function formeProche(q: Q): Forme {
  let best = FORMES[0]!;
  let bestDot = -1n;
  for (const f of FORMES) {
    const d = abs(alignement(q, f.q));
    if (d > bestDot) {
      bestDot = d;
      best = f;
    }
  }
  return best;
}

export function celluleDe(o: Pick<ObjetPorte, "mot">): string {
  const f = formeProche(qDeMot(o.mot));
  return celluleDoxa(f.classe, f.regime);
}

export type Bestiaire = {
  cellules: Record<string, ObjetPorte[]>;
  remplies: string[];
  total: number;
  /** rangs des formes rencontrées */
  formes: number[];
  complet: boolean;
};

export function bestiaireDe(c: Pick<Coffre, "objets">): Bestiaire {
  const cellules: Record<string, ObjetPorte[]> = {};
  for (const k of CELLULES) cellules[k] = [];
  const formes = new Set<number>();
  for (const o of c.objets ?? []) {
    if (o.genre !== "capture") continue;
    const f = formeProche(qDeMot(o.mot));
    formes.add(f.rang);
    cellules[celluleDoxa(f.classe, f.regime)]!.push(o);
  }
  const remplies = CELLULES.filter((k) => cellules[k]!.length > 0);
  return {
    cellules,
    remplies,
    total: CELLULES_DOXA,
    formes: [...formes].sort((a, b) => a - b),
    complet: remplies.length === CELLULES_DOXA,
  };
}

/** La lecture d'Uranie : ouverte à vingt et une cellules ; les 101 formes, celles rencontrées cerclées. */
export function lectureUranie(c: Pick<Coffre, "objets">): {
  ouverte: boolean;
  rencontrees: number[];
  total: number;
} {
  const b = bestiaireDe(c);
  return { ouverte: b.complet, rencontrees: b.formes, total: VECTEUR_EMPREINTES.length };
}

// ---------------------------------------------------------------------------
// Accord — le mercure conjugue une capture par l'objet porté
// ---------------------------------------------------------------------------

export type AccordKo = { ok: false; code: "capture" | "mercure" | "porte" | "meme" };
export type AccordOk = { ok: true; coffre: Coffre; capture: ObjetPorte; ancien: number };

export function accorderDansCoffre(c: Coffre, i: number, etage: number): AccordOk | AccordKo {
  const objets = c.objets ?? [];
  const o = objets[i];
  if (!o || o.genre !== "capture") return { ok: false, code: "capture" };
  if (!especeActive(c, etage, "mercure")) return { ok: false, code: "mercure" };
  const porte = porteurDe(c);
  if (!porte || porte.mot >>> 0 === o.mot >>> 0) return { ok: false, code: "porte" };
  const q = conjuguerPar(qDeMot(porte.mot), qDeMot(o.mot));
  const mot = motDeQ(q);
  if (mot === o.mot >>> 0) return { ok: false, code: "meme" };
  const t = tourDe(c);
  const neuve = habille(
    { mot, archetype: o.archetype, age: o.age, nonce: o.nonce, hauteur: o.hauteur },
    mot,
    {
      genre: "capture",
      emplacement: null,
      affixe: null,
      sockets: 0,
      gemmes: [],
      nom: nomCapture(o.archetype as SignatureId, mot % 12),
      palierLair: null,
    },
  );
  const rest = objets.filter((_, k) => k !== i);
  const liberee = t.liberee === o.mot >>> 0 ? mot : t.liberee;
  return {
    ok: true,
    capture: neuve,
    ancien: o.mot >>> 0,
    coffre: {
      ...c,
      objets: [...rest, neuve],
      tour: { ...t, bus: [...t.bus, o.mot >>> 0], liberee },
    },
  };
}

// ---------------------------------------------------------------------------
// Offrande — Terpsichore rend une gemme
// ---------------------------------------------------------------------------

export type OffrandeKo = { ok: false; code: "capture" | "muse" | "porte" | "resonance" };
export type OffrandeOk = { ok: true; coffre: Coffre; gemme: ObjetPorte };

export function graineOffrande(mot: number, c: Pick<Coffre, "maitre" | "n">): Uint8Array {
  return sha256d(concat(TAG_OFFRANDE, u32(mot >>> 0), utf8(`${c.maitre}:${c.n}`)));
}

/** Chez Terpsichore : une capture en résonance constructive avec l'objet porté → une gemme ; la capture est retirée. */
export function offrirDansCoffre(c: Coffre, i: number, etage: number): OffrandeOk | OffrandeKo {
  const objets = c.objets ?? [];
  const o = objets[i];
  if (!o || o.genre !== "capture") return { ok: false, code: "capture" };
  const h = hoteDe(etage);
  if (!h || !h.majeur || h.muse !== "venus") return { ok: false, code: "muse" };
  const porte = porteurDe(c);
  if (!porte) return { ok: false, code: "porte" };
  const lecture = paireDe(
    { q: qDeMot(porte.mot), classe: porte.archetype },
    { q: qDeMot(o.mot), classe: o.archetype },
    0,
    1,
  );
  if (lecture.polarite !== "constructif") return { ok: false, code: "resonance" };
  const g = graineOffrande(o.mot, c);
  const tip = c.chaine[c.chaine.length - 1];
  const base = objetDepuisGraine(g, o.age);
  const gemme = habille(
    { mot: base.mot, archetype: "venus", age: o.age, nonce: g[8]!, hauteur: tip?.hauteur ?? 0 },
    g[9]!,
    {
      genre: "gemme",
      emplacement: null,
      affixe: affixeDe(g[9]!),
      sockets: 0,
      gemmes: [],
      nom: affixeDe(g[9]!),
      palierLair: null,
    },
  );
  const t = tourDe(c);
  const rest = objets.filter((_, k) => k !== i);
  const liberee = t.liberee === o.mot >>> 0 ? null : t.liberee;
  return { ok: true, gemme, coffre: { ...c, objets: [...rest, gemme], tour: { ...t, liberee } } };
}

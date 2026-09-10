/**
 * Équipement du coffre — jauge. Le mot ne mute pas.
 * Pierre : tourne (préfixe T à gauche, suffixe S à droite) → nouvelle pièce.
 * Gemme : s'enchâsse, lecture composée, mot inchangé.
 * Philosophale : coffres 1–10, une arme divine. Même norme.
 * Lair : ticket d'antre — ouvre l'antre de sa bande (secrets.ts).
 * Elixir : sel, mercure, soufre ; se boit à un étage (elixirs.ts).
 * Capsule : glyphe creux, prend un occupant (capsules.ts).
 * Capture : un occupant d'étage devenu objet ; le bestiaire les range (bestiaire.ts).
 * Ces trois genres ne sortent jamais d'un tirage (genreDeRoll) : la Tour les donne.
 *
 * Le catalogue des pierres : 13 axes × 3 angles = 39 pierres, deux côtés,
 * 78 affixes. Composantes entières, `w = isqrt(724² − |v|²)` — l'aller-retour
 * `paqueter`/`depaqueter` est exact par construction, aucun flottant nulle part.
 * Les six affixes d'hier (`T1`..`S3`) sont les trois axes purs à l'angle Talc :
 * ils restent valides, se relisent d'un coffre et tournent à l'identique.
 *
 * AVERTISSEMENT : **T et S donnent le même plafond d'orbite**, parce que
 * `Re(g·q) = Re(q·g) = g₀q₀ − g⃗·q⃗` — vérifié exact, 0 écart sur 15 600
 * produits en BigInt, normes comprises. Le côté redistribue les axes, il ne
 * déplace pas l'orbite. Les six affixes n'ont donc jamais valu que **trois**
 * leviers, et les 78 n'en valent que 39 (`N_LEVIERS`).
 *
 * LIMITE : ce plafond est celui du **quaternion**, pas celui du mot. `paqueter`
 * ne garde que trois composantes et reconstruit `w` de `|v|` ; comme les parts
 * vectorielles de `g·q` et `q·g` diffèrent de `2·(g⃗ × q⃗)`, les deux mots
 * emballés diffèrent, jusqu'à 79 ‰ de plafond mesuré. L'égalité est
 * géométrique, l'écart est de l'arrondi.
 *
 * LIMITE : la pierre **tourne** (`composer`, un produit d'un seul côté) — elle
 * déplace le plafond et fait une autre pièce. La gemme **sertit**
 * (`conjuguerPar`) — elle redistribue les axes sous le même plafond. Confondre
 * les deux revient à vendre l'identité d'une pièce ; c'est un bug, pas un choix.
 */

import { composer, isqrt, objetDepuisGraine, paqueter, Q_SCALE } from "./objets.ts";
import { conjugue } from "./cosmos.ts";
import { conjuguerPar } from "./groupe.ts";
import { motDeQ } from "./lecture.ts";
import { qDeMot } from "./resonance.ts";
import { sha256d, utf8 } from "./hash.ts";
import type {
  Affixe,
  Coffre,
  Emplacement,
  EmplacementArmure,
  Genre,
  NomAge,
  ObjetPorte,
} from "./types.ts";

export type { Affixe, Emplacement, EmplacementArmure, Genre };

export const GENRES = [
  "trouve",
  "pierre",
  "arme",
  "armure",
  "gemme",
  "philosophale",
  "lair",
  "elixir",
  "capsule",
  "capture",
] as const;

/** Les genres que la Tour donne et que la ville ne tire pas. */
export const GENRES_TOUR = ["elixir", "capsule", "capture"] as const;

export const EMPLACEMENTS_ARMURE = [
  "casque",
  "plastron",
  "epaulieres",
  "gants",
  "bottes",
  "amulette",
  "anneau1",
  "anneau2",
  "accessoire",
] as const;

export const NOMS_ARME = [
  "Lance",
  "Faux",
  "Arc",
  "Lame",
  "Fronde",
  "Sceptre",
  "Aiguille",
] as const;
export type NomArme = (typeof NOMS_ARME)[number];

export const AFFIXES = ["T1", "T2", "T3", "S1", "S2", "S3"] as const;

export const COFFRES_PHILO = 10;
export const SOCKETS_MAX = 2;

/**
 * Les pièces qui portent des sertissures. Une gemme ne va pas partout : une
 * arme, un casque, un plastron, une amulette et les deux anneaux. Épaulières,
 * gants, bottes et accessoire n'en ont pas — on ne sertit pas une semelle.
 */
export const EMPLACEMENTS_SERTIS = [
  "arme",
  "casque",
  "plastron",
  "amulette",
  "anneau1",
  "anneau2",
] as const;

/** Vrai si ce genre et cet emplacement peuvent recevoir une gemme. */
export function accepteSertissure(genre: Genre, emplacement: Emplacement | null): boolean {
  if (genre !== "arme" && genre !== "armure") return false;
  if (emplacement === null) return false;
  return (EMPLACEMENTS_SERTIS as readonly string[]).includes(emplacement);
}

/* ------------------------------------------------------------------ *
 * Le catalogue des pierres — treize axes, trois angles, deux côtés.
 * ------------------------------------------------------------------ */

/**
 * Les treize directions de rotation. Chaque axe est un vecteur entier `u`
 * dont la **première composante non nulle est positive** : c'est la seule
 * écriture qui soit point fixe de `paqueter ∘ depaqueter`. `canon3`
 * (objets.ts) renverse la part vectorielle quand la première composante
 * stockée est négative et rend alors la rotation **conjuguée** — d'où
 * `(1,−1,−1)` et non `(−1,1,1)` pour la quatrième diagonale.
 */
export const AXES_PIERRE = [
  { id: "i", u: [1, 0, 0], sorte: "pur" },
  { id: "j", u: [0, 1, 0], sorte: "pur" },
  { id: "k", u: [0, 0, 1], sorte: "pur" },
  { id: "i+j", u: [1, 1, 0], sorte: "arete" },
  { id: "i-j", u: [1, -1, 0], sorte: "arete" },
  { id: "i+k", u: [1, 0, 1], sorte: "arete" },
  { id: "i-k", u: [1, 0, -1], sorte: "arete" },
  { id: "j+k", u: [0, 1, 1], sorte: "arete" },
  { id: "j-k", u: [0, 1, -1], sorte: "arete" },
  { id: "i+j+k", u: [1, 1, 1], sorte: "diagonale" },
  { id: "i+j-k", u: [1, 1, -1], sorte: "diagonale" },
  { id: "i-j+k", u: [1, -1, 1], sorte: "diagonale" },
  { id: "i-j-k", u: [1, -1, -1], sorte: "diagonale" },
] as const satisfies readonly {
  id: string;
  u: readonly [number, number, number];
  sorte: "pur" | "arete" | "diagonale";
}[];

export type AxePierre = (typeof AXES_PIERRE)[number];
export type AxePierreId = AxePierre["id"];

/**
 * Les trois angles, nommés par la dureté de Mohs : l'angle d'une pierre est
 * sa dureté. `v` est la longueur visée de la part vectorielle ; la torsion
 * `1000·w/|q|` en millièmes remplace le degré (aucun flottant, patron
 * d'`alignementCentiemes`). Le quatrième angle (v = 480, Cristal) est écarté :
 * le tier-plafond médian sature déjà à 12 avec 320 (SPEC_CHYMIE §9).
 */
export const ANGLES_PIERRE = [
  { id: "talc", v: 80, torsionMille: 994, mohsCentiemes: 100, fr: "Talc", en: "Talc", signe: "talc" },
  { id: "aimant", v: 160, torsionMille: 976, mohsCentiemes: 550, fr: "Aimant", en: "Lodestone", signe: "aimant" },
  { id: "marcassite", v: 320, torsionMille: 897, mohsCentiemes: 625, fr: "Marcassite", en: "Marcasite", signe: "marcasite" },
] as const;

export type AnglePierre = (typeof ANGLES_PIERRE)[number];
export type AnglePierreId = AnglePierre["id"];

export type CotePierre = "T" | "S";

/** `T:i-j:aimant` — côté, axe, angle. 2 × 13 × 3 = 78 affixes, 39 pierres. */
export type PierreId = `${CotePierre}:${AxePierreId}:${AnglePierreId}`;

/** Ce qu'une pierre ou une gemme peut être : les six anciens, ou l'un des 78. */
export type PierreRef = Affixe | PierreId;

const AXE_PAR_ID: ReadonlyMap<string, AxePierre> = new Map(AXES_PIERRE.map((a) => [a.id, a]));
const ANGLE_PAR_ID: ReadonlyMap<string, AnglePierre> = new Map(
  ANGLES_PIERRE.map((a) => [a.id, a]),
);

/**
 * Le multiple entier `t` tel que `|t·u|` approche au plus près la longueur
 * visée : celui des deux candidats autour de `isqrt(v²/|u|²)` dont `t²·|u|²`
 * est le plus proche de `v²`. Entier de bout en bout, BigInt, aucun `Math.sqrt`.
 */
export function multipleAxe(u: readonly [number, number, number], v: number): number {
  const m = BigInt(u[0] * u[0] + u[1] * u[1] + u[2] * u[2]);
  if (m <= 0n) throw new Error("axe nul : aucune direction à tourner");
  const vv = BigInt(v) * BigInt(v);
  const t0 = isqrt(vv / m);
  let best = t0;
  let ecart = -1n;
  for (const t of [t0, t0 + 1n]) {
    const d = t * t * m - vv;
    const a = d < 0n ? -d : d;
    if (ecart < 0n || a < ecart) {
      ecart = a;
      best = t;
    }
  }
  return Number(best);
}

/**
 * Le quaternion entier d'une pierre : `w = isqrt(724² − |v|²)`, donc l'entier
 * que `depaqueter` reconstruira — l'aller-retour est exact par construction.
 */
export function generateurPierre(
  axe: AxePierreId,
  angle: AnglePierreId,
): readonly [number, number, number, number] {
  const a = AXE_PAR_ID.get(axe);
  if (!a) throw new Error(`axe « ${axe} » au lieu de l'un des ${AXES_PIERRE.length}`);
  const g = ANGLE_PAR_ID.get(angle);
  if (!g) throw new Error(`angle « ${angle} » au lieu de l'un des ${ANGLES_PIERRE.length}`);
  const t = multipleAxe(a.u, g.v);
  const vx = t * a.u[0];
  const vy = t * a.u[1];
  const vz = t * a.u[2];
  const reste = BigInt(Q_SCALE * Q_SCALE - vx * vx - vy * vy - vz * vz);
  if (reste < 0n) throw new Error(`|v| ${g.v} au lieu de moins de ${Q_SCALE}`);
  return [Number(isqrt(reste)), vx, vy, vz];
}

export type Pierre = {
  readonly id: PierreId;
  readonly cote: CotePierre;
  readonly axe: AxePierreId;
  readonly angle: AnglePierreId;
  readonly sorte: AxePierre["sorte"];
  readonly q: readonly [number, number, number, number];
  readonly mot: number;
  /** `1000·w/|q|` en millièmes. 994 (talc), 976 (aimant), 897 (marcassite). */
  readonly torsionMille: number;
  /** `724² − |q|²` : de 140 à 867. L'ancienne pierre était à 815. */
  readonly deficit: number;
};

function torsionDe(q: readonly [number, number, number, number]): number {
  const n2 = BigInt(q[0]) ** 2n + BigInt(q[1]) ** 2n + BigInt(q[2]) ** 2n + BigInt(q[3]) ** 2n;
  const n = isqrt(n2);
  if (n === 0n) return 0;
  const w = q[0] < 0 ? -q[0] : q[0];
  return Number((BigInt(w) * 1000n) / n);
}

function batirPierre(cote: CotePierre, axe: AxePierreId, angle: AnglePierreId): Pierre {
  const q = generateurPierre(axe, angle);
  const n2 = q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3];
  return {
    id: `${cote}:${axe}:${angle}`,
    cote,
    axe,
    angle,
    sorte: AXE_PAR_ID.get(axe)!.sorte,
    q,
    mot: paqueter(q),
    torsionMille: torsionDe(q),
    deficit: Q_SCALE * Q_SCALE - n2,
  };
}

/**
 * Les 39 pierres du préfixe, puis les 39 du suffixe. Ordre gelé : axe majeur,
 * angle mineur — `pierreDeRoll` en dépend.
 *
 * **T et S donnent le même plafond d'orbite** : `Re(g·q) = Re(q·g) = g₀q₀ − g⃗·q⃗`.
 * Le côté change la répartition des axes, jamais l'orbite. C'est la raison
 * géométrique pour laquelle les six affixes d'hier n'ont jamais valu que
 * **trois** leviers, et pour laquelle 78 affixes n'en valent que 39.
 */
export const PIERRES: readonly Pierre[] = (["T", "S"] as const).flatMap((cote) =>
  AXES_PIERRE.flatMap((a) => ANGLES_PIERRE.map((g) => batirPierre(cote, a.id, g.id))),
);

export const PIERRE_PAR_ID: ReadonlyMap<string, Pierre> = new Map(PIERRES.map((p) => [p.id, p]));

/** Le nombre de leviers réels : un par (axe, angle), le côté n'en ajoute pas. */
export const N_LEVIERS = AXES_PIERRE.length * ANGLES_PIERRE.length;

/**
 * Les trois générateurs d'hier, gelés à l'octet. `T1`, `T2`, `T3` (et leurs
 * suffixes) sont exactement les axes purs à l'angle Talc : un coffre écrit
 * avant le catalogue se relit sans perte et tourne de la même façon.
 */
export const GENERATEURS_GELES: readonly (readonly [number, number, number, number])[] = [
  [719, 80, 0, 0],
  [719, 0, 80, 0],
  [719, 0, 0, 80],
];

const AFFIXE_VERS_PIERRE: Record<Affixe, PierreId> = {
  T1: "T:i:talc",
  T2: "T:j:talc",
  T3: "T:k:talc",
  S1: "S:i:talc",
  S2: "S:j:talc",
  S3: "S:k:talc",
};

export function estAffixeAncien(r: string): r is Affixe {
  return (AFFIXES as readonly string[]).includes(r);
}

export function estPierreId(r: string): r is PierreId {
  return PIERRE_PAR_ID.has(r);
}

export function estPierreRef(r: string): r is PierreRef {
  return estAffixeAncien(r) || estPierreId(r);
}

/** L'identifiant long d'une référence, ancienne ou neuve. Refuse le reste. */
export function refCanonique(r: PierreRef): PierreId {
  if (estAffixeAncien(r)) return AFFIXE_VERS_PIERRE[r];
  if (estPierreId(r)) return r;
  throw new Error(`pierre « ${r} » au lieu de l'un des ${AFFIXES.length + PIERRES.length} affixes`);
}

/** La pierre désignée, ancienne ou neuve. */
export function litPierre(r: PierreRef): Pierre {
  return PIERRE_PAR_ID.get(refCanonique(r))!;
}

export function generateurDe(rang: 1 | 2 | 3): number {
  return litPierre(AFFIXES[rang - 1]!).mot;
}

/** Le mot du générateur d'une référence : c'est lui qu'on compose ou conjugue. */
export function motGenerateur(r: PierreRef): number {
  return litPierre(r).mot;
}

export function affixeDe(roll: number): Affixe {
  return AFFIXES[((roll % 6) + 6) % 6]!;
}

/**
 * Une pierre du catalogue depuis un roll. Rien n'est tiré au sort : le roll
 * vient d'une graine `sha256d`. LIMITE : 256 mod 78 = 22, donc un octet nu
 * biaise les 22 premières pierres de +2,7 % — passer par `pierreDepuisGraine`
 * quand l'uniformité compte.
 */
export function pierreDeRoll(roll: number): PierreId {
  const r = ((roll % PIERRES.length) + PIERRES.length) % PIERRES.length;
  return PIERRES[r]!.id;
}

/** Rejet : le premier octet < 234 (3 × 78). Sans biais de modulo, sans flottant. */
export function pierreDepuisGraine(graine: Uint8Array): PierreId {
  let g = graine;
  for (let tour = 0; tour < 8; tour++) {
    for (const b of g) if (b < 234) return pierreDeRoll(b);
    g = sha256d(g);
  }
  throw new Error("graine sans octet sous 234 : rejet impossible");
}

export function rangAffixe(a: Affixe): 1 | 2 | 3 {
  return Number(a[1]) as 1 | 2 | 3;
}

export function estPrefixe(a: PierreRef): boolean {
  return a[0] === "T";
}

export function pierreDe(affixe: PierreRef): { affixe: PierreRef; mot: number } {
  return { affixe, mot: motGenerateur(affixe) };
}

/** T·q ou q·S. Le résultat est un autre mot — la pierre consomme et produit. */
export function tourner(mot: number, affixe: PierreRef): number {
  const g = motGenerateur(affixe);
  return estPrefixe(affixe) ? composer(g, mot) : composer(mot, g);
}

export function genreDeRoll(roll: number): Genre {
  const r = ((roll % 32) + 32) % 32;
  if (r < 8) return "armure";
  if (r < 12) return "arme";
  if (r < 18) return "pierre";
  if (r < 22) return "gemme";
  if (r < 25) return "lair";
  return "armure";
}

export function emplacementDe(genre: Genre, roll: number): Emplacement | null {
  if (genre === "arme") return "arme";
  if (genre === "armure") {
    return EMPLACEMENTS_ARMURE[((roll % 9) + 9) % 9]!;
  }
  return null;
}

export function socketsDe(
  genre: Genre,
  roll: number,
  emplacement: Emplacement | null = null,
): number {
  if (!accepteSertissure(genre, emplacement)) return 0;
  if (genre === "armure") return roll % (SOCKETS_MAX + 1);
  return roll & 1 ? roll % (SOCKETS_MAX + 1) : 0;
}

export function nomDe(genre: Genre, emplacement: Emplacement | null, roll: number): string {
  if (genre === "arme") return NOMS_ARME[((roll % 7) + 7) % 7]!;
  if (genre === "armure" && emplacement && emplacement !== "arme") return emplacement;
  if (genre === "pierre" || genre === "gemme") return affixeDe(roll);
  if (genre === "lair") return `lair-${1 + (roll % 3)}`;
  if (genre === "philosophale") return "philosophale";
  if (genre === "trouve") return "trouve";
  /* elixir, capsule, capture : nommés par la Tour (espèce, « ··· », lexique). */
  return genre;
}

export function peutEnchasser(o: ObjetPorte): boolean {
  if (!accepteSertissure(o.genre, o.emplacement)) return false;
  return (o.gemmes?.length ?? 0) < (o.sockets ?? 0);
}

/**
 * Sertir une gemme : `g q ḡ`. La conjugaison tourne la part vectorielle et
 * laisse `|q₀|` où il est — donc l'orbite, donc le plafond d'extrémité.
 *
 * C'est toute la différence avec la pierre. La **pierre tourne** (`composer`,
 * un produit d'un seul côté) : elle déplace l'orbite, elle fait une autre
 * pièce, et l'ancienne est consommée. La **gemme sertit** : elle redistribue
 * les axes sous le même plafond, sans jamais acheter l'identité de la pièce.
 * Un objet ne mute pas — la loi tient parce que l'orbite ne bouge pas.
 */
export function sertir(mot: number, affixe: PierreRef): number {
  const g = qDeMot(motGenerateur(affixe));
  const q = qDeMot(mot >>> 0);
  return motDeQ(conjuguerPar(estPrefixe(affixe) ? g : conjugue(g), q));
}

export function motEffectif(o: ObjetPorte): number {
  let m = o.mot >>> 0;
  for (const g of o.gemmes ?? []) m = sertir(m, g);
  return m;
}

export function peutPhilosopher(c: Pick<Coffre, "nature" | "n" | "philosophale">): boolean {
  if (c.nature !== "personnel") return false;
  if (c.n < 1 || c.n > COFFRES_PHILO) return false;
  if (c.philosophale) return false;
  return true;
}

export function habille(
  base: {
    mot: number;
    archetype: string;
    age: NomAge;
    nonce: number;
    hauteur: number;
  },
  roll: number,
  extra?: Partial<ObjetPorte>,
): ObjetPorte {
  const genre = extra?.genre ?? genreDeRoll(roll);
  const emplacement = extra?.emplacement ?? emplacementDe(genre, roll);
  const affixe =
    extra?.affixe ?? (genre === "pierre" || genre === "gemme" ? affixeDe(roll) : null);
  return {
    mot: base.mot >>> 0,
    archetype: base.archetype,
    age: base.age,
    nonce: base.nonce & 65535,
    hauteur: base.hauteur | 0,
    genre,
    emplacement,
    affixe,
    sockets: extra?.sockets ?? socketsDe(genre, roll, emplacement),
    /* Les six anciens et les 78 du catalogue passent ; le reste tombe. */
    gemmes: extra?.gemmes ? extra.gemmes.filter((a) => estPierreRef(a)) : [],
    nom: extra?.nom ?? nomDe(genre, emplacement, roll),
    palierLair: extra?.palierLair ?? (genre === "lair" ? 1 + (roll % 3) : null),
  };
}

export type CraftKo = { ok: false; code: "type" | "socket" | "vide" };
export type CraftOk<T> = { ok: true; coffre: T; objet: ObjetPorte };
export type Craft<T = Coffre> = CraftOk<T> | CraftKo;

function pieceEtMod(a: ObjetPorte, b: ObjetPorte): { piece: ObjetPorte; mod: ObjetPorte } | null {
  const piece = (x: ObjetPorte) => x.genre === "arme" || x.genre === "armure" || x.genre === "trouve";
  const mod = (x: ObjetPorte) => x.genre === "pierre" || x.genre === "gemme";
  if (piece(a) && mod(b)) return { piece: a, mod: b };
  if (piece(b) && mod(a)) return { piece: b, mod: a };
  return null;
}

/** Pierre → nouvelle pièce (l'ancienne est consommée). Gemme → enchâssée. */
export function craftDansCoffre<T extends { objets: ObjetPorte[] }>(c: T, i: number, j: number): Craft<T> {
  const objets = c.objets ?? [];
  const a = objets[i];
  const b = objets[j];
  if (!a || !b || i === j) return { ok: false, code: "vide" };
  const pair = pieceEtMod(a, b);
  if (!pair) return { ok: false, code: "type" };
  const { piece, mod } = pair;
  if (mod.genre === "gemme") {
    if (!peutEnchasser(piece) || !mod.affixe) return { ok: false, code: "socket" };
    const neuve: ObjetPorte = {
      ...piece,
      gemmes: [...piece.gemmes, mod.affixe],
    };
    const rest = objets.filter((_, k) => k !== i && k !== j);
    return { ok: true, objet: neuve, coffre: { ...c, objets: [...rest, neuve] } };
  }
  if (!mod.affixe) return { ok: false, code: "type" };
  const mot = tourner(piece.mot, mod.affixe);
  const neuve: ObjetPorte = {
    ...piece,
    mot,
    gemmes: piece.gemmes,
  };
  const rest = objets.filter((_, k) => k !== i && k !== j);
  return { ok: true, objet: neuve, coffre: { ...c, objets: [...rest, neuve] } };
}

export function divinDansCoffre(c: Coffre, nom: NomArme): Craft {
  if (!peutPhilosopher(c)) return { ok: false, code: "type" };
  if (!(NOMS_ARME as readonly string[]).includes(nom)) return { ok: false, code: "type" };
  const tip = c.chaine[c.chaine.length - 1];
  const age: NomAge = "Satya";
  const o = objetDepuisGraine(sha256d(utf8(`eidos-divin/${c.maitre}/${nom}`)), age);
  const porte = habille(
    {
      mot: o.mot,
      archetype: o.archetype,
      age: o.age,
      nonce: 0,
      hauteur: tip?.hauteur ?? 0,
    },
    8,
    { genre: "arme", emplacement: "arme", nom, sockets: 2, affixe: null, palierLair: null },
  );
  return {
    ok: true,
    objet: porte,
    coffre: { ...c, philosophale: nom, objets: [...(c.objets ?? []), porte] },
  };
}

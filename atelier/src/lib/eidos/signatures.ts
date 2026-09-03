/**
 * Signatures planétaires — lecture des 64 empilements.
 * Ce n'est pas un 5ᵉ glyphe, pas un 32ᵉ symbole, pas un secteur de l'arbre.
 * Neuf manières de tenir le temps, avec les quatre figures déjà là.
 */

import { FIGURES } from "./constantes.ts";
import { codeDuGroupe } from "./glyphs.ts";
import { concat, fromHex, hexOf, sha256d, utf8 } from "./hash.ts";

export type SignatureId =
  "uranie" | "saturne" | "jupiter" | "mars" | "soleil" | "venus" | "mercure" | "lune" | "terre";

export type Signature = {
  id: SignatureId;
  astre: string;
  muse: string;
  etages: [number, number, number];
};

/** Descente d'Uranie (fixes) à Thalie (terre). 9 ≠ 33. */
export const SIGNATURES: readonly Signature[] = [
  { id: "uranie", astre: "★", muse: "Uranie", etages: [0, 0, 0] },
  { id: "saturne", astre: "♄", muse: "Polymnie", etages: [3, 0, 0] },
  { id: "jupiter", astre: "♃", muse: "Euterpe", etages: [1, 1, 0] },
  { id: "mars", astre: "♂", muse: "Érato", etages: [3, 3, 3] },
  { id: "soleil", astre: "☉", muse: "Melpomène", etages: [1, 1, 1] },
  { id: "venus", astre: "♀", muse: "Terpsichore", etages: [1, 3, 1] },
  { id: "mercure", astre: "☿", muse: "Calliope", etages: [1, 2, 3] },
  { id: "lune", astre: "☽", muse: "Clio", etages: [2, 2, 2] },
  { id: "terre", astre: "⊕", muse: "Thalie", etages: [0, 0, 3] },
];

/** Trois étages = tria prima. Pas trois signes nouveaux. */
export const TRIA_PRIMA = [
  { etage: 0, id: "sel", figure: 1 },
  { etage: 1, id: "mercure", figure: 2 },
  { etage: 2, id: "soufre", figure: 3 },
] as const;

export function figuresDe(s: Signature): string {
  return s.etages.map((k) => FIGURES[k]!).join("");
}

export function codeDe(s: Signature): number {
  return codeDuGroupe(s.etages);
}

/** Même table que noeud.py. 9 codes parmi 64 — ~1 goutte sur 7. */
export const CODES_ARTEFACT: ReadonlyMap<number, SignatureId> = new Map(
  SIGNATURES.map((s) => [codeDe(s), s.id]),
);

const TAG_ARTEFACT = utf8("eidos-artefact/1");

export type Artefact = {
  id: SignatureId;
  code: number;
  txid: string;
  adresse: string;
  digest: string;
};

/** Preuve portable : tout se rejoue. Pas une inclusion Merkle. */
export type PreuveArtefact = {
  v: 1;
  spec: "eidos-artefact/1";
  txid: string;
  adresse: string;
  digest: string;
  code: number;
  id: SignatureId;
};

function digestGoutte(txid: string, adresse: string): Uint8Array | null {
  if (txid.length !== 64 || adresse.length !== 40) return null;
  return sha256d(concat(TAG_ARTEFACT, fromHex(txid), fromHex(adresse)));
}

/**
 * Œuf dans une extraction robinet.
 * sha256d(tag || txid || adresse)[0] & 63 ∈ codes du chœur.
 * Muet pour le carnet : pas de sortie, pas de 5ᵉ glyphe.
 */
export function artefactDeGoutte(txid: string, adresse: string): Artefact | null {
  const h = digestGoutte(txid, adresse);
  if (!h) return null;
  const code = h[0]! & 63;
  const id = CODES_ARTEFACT.get(code);
  if (!id) return null;
  return { id, code, txid, adresse, digest: hexOf(h) };
}

export function preuveArtefact(a: Artefact): PreuveArtefact {
  return {
    v: 1,
    spec: "eidos-artefact/1",
    txid: a.txid,
    adresse: a.adresse,
    digest: a.digest,
    code: a.code,
    id: a.id,
  };
}

export function verifierPreuveArtefact(
  p: PreuveArtefact,
): { ok: true; artefact: Artefact } | { ok: false; motif: string } {
  if (p.v !== 1 || p.spec !== "eidos-artefact/1") {
    return { ok: false, motif: "spec" };
  }
  const h = digestGoutte(p.txid, p.adresse);
  if (!h) return { ok: false, motif: "empreinte" };
  if (hexOf(h) !== p.digest.toLowerCase()) return { ok: false, motif: "digest" };
  const code = h[0]! & 63;
  if (code !== p.code) return { ok: false, motif: "code" };
  const id = CODES_ARTEFACT.get(code);
  if (!id || id !== p.id) return { ok: false, motif: "chœur" };
  return {
    ok: true,
    artefact: { id, code, txid: p.txid, adresse: p.adresse, digest: hexOf(h) },
  };
}

export function parserPreuveArtefact(raw: string): PreuveArtefact | { erreur: string } {
  try {
    const o = JSON.parse(raw) as Partial<PreuveArtefact>;
    if (o.v !== 1 || o.spec !== "eidos-artefact/1") return { erreur: "spec" };
    if (typeof o.txid !== "string" || o.txid.length !== 64) return { erreur: "txid" };
    if (typeof o.adresse !== "string" || o.adresse.length !== 40) return { erreur: "adresse" };
    if (typeof o.digest !== "string" || o.digest.length !== 64) return { erreur: "digest" };
    if (typeof o.code !== "number" || typeof o.id !== "string") return { erreur: "lecture" };
    if (!CODES_ARTEFACT.get(o.code as number) || CODES_ARTEFACT.get(o.code as number) !== o.id) {
      return { erreur: "chœur" };
    }
    return {
      v: 1,
      spec: "eidos-artefact/1",
      txid: o.txid.toLowerCase(),
      adresse: o.adresse.toLowerCase(),
      digest: o.digest.toLowerCase(),
      code: o.code,
      id: o.id as SignatureId,
    };
  } catch {
    return { erreur: "illisible" };
  }
}

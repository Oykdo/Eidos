/** Merkle des transactions — même règle que utxo.py. */

import { concat, fromHex, hexOf, sha256d, u32, u64 } from "./hash.ts";
import type { Sortie } from "./types.ts";

/** SHA-256d des paires. Feuille impaire : on recopie la dernière (Bitcoin / utxo.py). */
export function merkleRoot(txids: Uint8Array[]): Uint8Array {
  if (txids.length === 0) return new Uint8Array(32);
  let lvl: Uint8Array[] = txids.map((t) => t.slice());
  while (lvl.length > 1) {
    if (lvl.length % 2) lvl.push(lvl[lvl.length - 1]!.slice());
    const next: Uint8Array[] = [];
    for (let i = 0; i < lvl.length; i += 2) {
      next.push(sha256d(concat(lvl[i]!, lvl[i + 1]!)));
    }
    lvl = next;
  }
  return lvl[0]!;
}

export type SortieMin = Pick<Sortie, "txid" | "rang" | "adresse" | "montant">;

/** Engagement d'une sortie : txid ‖ rang ‖ adresse ‖ montant. */
export function feuilleSortie(s: SortieMin): Uint8Array {
  return sha256d(
    concat(fromHex(s.txid), u32(s.rang), fromHex(s.adresse), u64(s.montant)),
  );
}

export type Frere = {
  cote: "gauche" | "droite";
  hash: string;
};

export type Preuve = {
  indice: number;
  ref: string;
  feuille: string;
  freres: Frere[];
  racine: string;
};

/** Preuve portable : feuille + frères + racine. Suffit à revérifier hors du coffre. */
export type PreuvePortable = {
  v: 1;
  feuille: string;
  freres: Frere[];
  racine: string;
};

export type Etape = {
  hash: string;
  role: "feuille" | "nœud" | "racine";
  cote?: Frere["cote"];
};

export type Niveaux = {
  hashes: string[][];
  paddings: boolean[];
  racine: string;
};

export function niveauxDe(feuilles: Uint8Array[]): Niveaux {
  if (feuilles.length === 0) {
    const z = hexOf(new Uint8Array(32));
    return { hashes: [[z]], paddings: [], racine: z };
  }
  const paddings = feuilles.map(() => false);
  let cur: Uint8Array[] = feuilles.map((f) => f.slice());
  const hashes: string[][] = [cur.map((b) => hexOf(b))];
  while (cur.length > 1) {
    if (cur.length % 2) {
      cur.push(cur[cur.length - 1]!.slice());
      if (hashes.length === 1) paddings.push(true);
      hashes[hashes.length - 1] = cur.map((b) => hexOf(b));
    }
    const next: Uint8Array[] = [];
    for (let i = 0; i < cur.length; i += 2) {
      next.push(sha256d(concat(cur[i]!, cur[i + 1]!)));
    }
    cur = next;
    hashes.push(cur.map((b) => hexOf(b)));
  }
  return { hashes, paddings, racine: hashes[hashes.length - 1]![0]! };
}

export function preuveDe(
  feuilles: Uint8Array[],
  indice: number,
  ref = "",
): Preuve | null {
  if (indice < 0 || indice >= feuilles.length) return null;
  const n = niveauxDe(feuilles);
  const freres: Frere[] = [];
  let i = indice;
  for (let L = 0; L < n.hashes.length - 1; L++) {
    const lvl = n.hashes[L]!;
    const pair = i ^ 1;
    const sib = lvl[Math.min(pair, lvl.length - 1)]!;
    freres.push({ cote: i % 2 === 0 ? "droite" : "gauche", hash: sib });
    i = Math.floor(i / 2);
  }
  return {
    indice,
    ref,
    feuille: hexOf(feuilles[indice]!),
    freres,
    racine: n.racine,
  };
}

export function preuvePourSortie(sorties: Sortie[], ref: string): Preuve | null {
  const i = sorties.findIndex((s) => s.ref === ref);
  if (i < 0) return null;
  return preuveDe(
    sorties.map(feuilleSortie),
    i,
    ref,
  );
}

export function etapesDe(p: Preuve): Etape[] {
  const out: Etape[] = [{ hash: p.feuille, role: "feuille" }];
  let h = fromHex(p.feuille);
  for (let k = 0; k < p.freres.length; k++) {
    const f = p.freres[k]!;
    const sib = fromHex(f.hash);
    h = f.cote === "droite" ? sha256d(concat(h, sib)) : sha256d(concat(sib, h));
    out.push({
      hash: hexOf(h),
      role: k === p.freres.length - 1 ? "racine" : "nœud",
      cote: f.cote,
    });
  }
  if (out.length === 1) out[0]!.role = "racine";
  return out;
}

export function verifierPreuve(p: Pick<Preuve, "feuille" | "freres" | "racine">): boolean {
  const etapes = etapesDe({
    indice: 0,
    ref: "",
    feuille: p.feuille,
    freres: p.freres,
    racine: p.racine,
  });
  return etapes[etapes.length - 1]!.hash === p.racine;
}

export function serialiser(p: Preuve): PreuvePortable {
  return { v: 1, feuille: p.feuille, freres: p.freres, racine: p.racine };
}

export function parserPreuve(raw: string): PreuvePortable | { erreur: string } {
  try {
    const o = JSON.parse(raw) as Partial<PreuvePortable>;
    if (o.v !== 1 || typeof o.feuille !== "string" || typeof o.racine !== "string") {
      return { erreur: "preuve illisible" };
    }
    if (o.feuille.length !== 64 || o.racine.length !== 64) {
      return { erreur: "empreintes attendues sur 32 octets" };
    }
    if (!Array.isArray(o.freres)) return { erreur: "frères absents" };
    const freres: Frere[] = [];
    for (const f of o.freres) {
      if (f?.cote !== "gauche" && f?.cote !== "droite") {
        return { erreur: "côté de frère invalide" };
      }
      if (typeof f.hash !== "string" || f.hash.length !== 64) {
        return { erreur: "frère mal formé" };
      }
      freres.push({ cote: f.cote, hash: f.hash.toLowerCase() });
    }
    return {
      v: 1,
      feuille: o.feuille.toLowerCase(),
      freres,
      racine: o.racine.toLowerCase(),
    };
  } catch {
    return { erreur: "JSON invalide" };
  }
}

export function merkleDuCarnet(sorties: Sortie[]): {
  feuilles: Uint8Array[];
  niveaux: Niveaux;
} {
  const feuilles = sorties.map(feuilleSortie);
  return { feuilles, niveaux: niveauxDe(feuilles) };
}

// ---------------------------------------------------------------------------
// Racine UTXO du réseau = utxo.utxo_root : ordre canonique (txid, rang)
// ---------------------------------------------------------------------------
export function ordreCanonique<T extends SortieMin>(sorties: T[]): T[] {
  return sorties
    .slice()
    .sort((a, b) => (a.txid < b.txid ? -1 : a.txid > b.txid ? 1 : a.rang - b.rang));
}

/** Racine du carnet entier, telle que le nœud l'inscrit dans l'en-tête signé. */
export function utxoRoot(sorties: SortieMin[]): Uint8Array {
  return merkleRoot(ordreCanonique(sorties).map(feuilleSortie));
}

/** Preuve d'une sortie du réseau contre la racine UTXO, depuis la liste
 *  publiée (etat.json). `ref` = "txid:rang". */
export function preuveReseau(sorties: SortieMin[], ref: string): Preuve | null {
  const ordre = ordreCanonique(sorties);
  const i = ordre.findIndex((s) => `${s.txid}:${s.rang}` === ref);
  if (i < 0) return null;
  return preuveDe(ordre.map(feuilleSortie), i, ref);
}

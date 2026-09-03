/** Chaîne locale — la racine du carnet entre dans un en-tête. */

import { genesis } from "./genesis-data.ts";
import { header } from "./eonis.ts";
import { encoderGlyphes } from "./glyphs.ts";
import { fromHex, hexOf, sha256d } from "./hash.ts";
import { feuilleSortie, merkleRoot } from "./merkle.ts";
import type { BlocLocal, Coffre, MotifBloc, Sortie } from "./types.ts";

export type ControleChaine = {
  id: string;
  ok: boolean;
  label: string;
  detail: string;
};

export function merkleCarnet(sorties: Sortie[]): string {
  if (sorties.length === 0) return hexOf(new Uint8Array(32));
  return hexOf(merkleRoot(sorties.map(feuilleSortie)));
}

export function blocGenese(): BlocLocal {
  const b = genesis.bloc_genese;
  return {
    hauteur: 0,
    prev: b.prev,
    merkle: b.merkle_root,
    ts: b.horodatage_unix,
    nonce: b.nonce,
    bits: b.bits,
    hash: b.hash,
    glyphes: b.glyphes,
    motif: "genese",
  };
}

export function forgerBloc(p: {
  hauteur: number;
  prev: string;
  merkle: string;
  ts: number;
  nonce: number;
  bits: number;
  motif: MotifBloc;
}): BlocLocal {
  const hdr = header(
    p.hauteur,
    fromHex(p.prev),
    fromHex(p.merkle),
    p.ts,
    p.nonce,
  );
  const hash = sha256d(hdr);
  return { ...p, hash: hexOf(hash), glyphes: encoderGlyphes(hash) };
}

export function hashReproduit(b: BlocLocal): boolean {
  const h = sha256d(
    header(b.hauteur, fromHex(b.prev), fromHex(b.merkle), b.ts, b.nonce),
  );
  return hexOf(h) === b.hash;
}

function powOk(hashHex: string, bits: number): boolean {
  if (bits <= 0) return true;
  const n = BigInt("0x" + hashHex);
  return n < (1n << BigInt(256 - bits));
}

export function tete(chaine: BlocLocal[]): BlocLocal | null {
  return chaine.length ? chaine[chaine.length - 1]! : null;
}

export function sceller(coffre: Coffre, motif: MotifBloc): Coffre {
  const base = coffre.chaine?.length ? coffre.chaine : [blocGenese()];
  const prev = base[base.length - 1]!;
  const ts =
    coffre.nature === "atelier"
      ? genesis.bloc_genese.horodatage_unix + base.length
      : Math.floor(Date.now() / 1000);
  const bloc = forgerBloc({
    hauteur: prev.hauteur + 1,
    prev: prev.hash,
    merkle: merkleCarnet(coffre.sorties),
    ts,
    nonce: 0,
    bits: 0,
    motif,
  });
  return { ...coffre, chaine: [...base, bloc] };
}

export function verifierChaine(coffre: Coffre): ControleChaine[] {
  const g = blocGenese();
  const ch = coffre.chaine ?? [];
  const out: ControleChaine[] = [];
  const C = (
    id: string,
    ok: boolean,
    label: string,
    detail = "",
  ): ControleChaine => ({ id, ok, label, detail });

  const b0 = ch[0];
  out.push(
    C(
      "bloc0",
      Boolean(b0) && b0.hash === g.hash && b0.merkle === g.merkle,
      "bloc 0 = genèse gelée",
      b0 ? b0.hash.slice(0, 16) : "absent",
    ),
  );
  out.push(
    C(
      "pow0",
      Boolean(b0) && b0.bits === 18 && powOk(b0.hash, 18),
      "preuve de travail du bloc 0",
      "18 bits — le seul bloc miné",
    ),
  );

  let chainage = ch.length >= 2;
  for (let i = 1; i < ch.length; i++) {
    const b = ch[i]!;
    const p = ch[i - 1]!;
    if (b.prev !== p.hash || b.hauteur !== p.hauteur + 1 || !hashReproduit(b)) {
      chainage = false;
      break;
    }
    if (b.bits !== 0) chainage = false;
  }
  out.push(
    C(
      "chainage",
      chainage,
      "chaque prev = hash du précédent",
      `${Math.max(0, ch.length - 1)} bloc${ch.length - 1 === 1 ? "" : "s"} local${ch.length - 1 === 1 ? "" : "aux"}`,
    ),
  );

  const tip = tete(ch);
  const racine = merkleCarnet(coffre.sorties);
  const merkleOk = tip != null && tip.motif !== "genese" && tip.merkle === racine;
  out.push(
    C(
      "merkle",
      merkleOk,
      "tête : Merkle du carnet actuel",
      tip ? tip.merkle.slice(0, 16) : "",
    ),
  );
  out.push(
    C(
      "deux-racines",
      Boolean(b0) && b0.merkle !== racine,
      "bloc 0 ≠ carnet (message de genèse, pas les sorties)",
    ),
  );
  return out;
}

export function chaineSaine(coffre: Coffre): boolean {
  return verifierChaine(coffre).every((c) => c.ok);
}

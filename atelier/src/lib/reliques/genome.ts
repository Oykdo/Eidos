/**
 * Génome d'une relique.
 *
 * Tout se rejoue : même graine → même génome, sur n'importe quelle machine.
 * Aucun aléa. Le flux d'octets est un hachage, pas un PRNG.
 *
 * Table octet → paramètre (contrat v1, gelé) :
 *
 * Le flux commence par sha256d(graine || u32(0)), puis
 * sha256d(graine || u32(n)) à chaque bloc de 32 octets.
 * Chaque paramètre continu consomme 2 octets big-endian / 65535 → [0, 1].
 *
 *  off  type  nom       rôle
 *  0    u16   twist     torsion du domaine (mercure / flux)
 *  2    u16   graisse   épaisseur (sel / masse)
 *  4    u16   coupe     profondeur de taille (soufre / feu)
 *  6    u16   nids      satellites
 *  8    u16   grain     bruit de surface
 * 10    u16   orbite    excentricité
 * 12    u16   fuseau    allongement
 * 14    u16   facette   arrondi → arête
 * 16    u16   halo      verre vs métal
 * 18    u16   strie     gravure
 * 20    u16   azimuth   lacet initial
 * 22    u16   lean      inclinaison
 * 24    u16   creux     cavité
 * 26    u16   anneau    rayon d'anneau
 * 28    u16   pic       pointe
 * 30    u16   usure     patine
 *
 * Hors flux, lus du protocole :
 *  famille          — rang / 8  (0..1)
 *  etages           — signature / code de glyphe
 *  echelle          — a/40
 *  densite          — 1 − (a−10)/30   Kali dense, Satya plus verre
 *  metalR,G,B       — métal d'âge
 *  sel, mercure, soufre — étages / 3
 */

import { groupeDuCode } from "../eidos/glyphs.ts";
import { concat, fromHex, hexOf, sha256d, u32, utf8 } from "../eidos/hash.ts";
import { AGES_RELIQUE, type NomAge } from "../eidos/relique.ts";
import {
  artefactDeGoutte,
  CODES_ARTEFACT,
  SIGNATURES,
  type Artefact,
  type SignatureId,
} from "../eidos/signatures.ts";

export const PARAM_NOMS = [
  "twist",
  "graisse",
  "coupe",
  "nids",
  "grain",
  "orbite",
  "fuseau",
  "facette",
  "halo",
  "strie",
  "azimuth",
  "lean",
  "creux",
  "anneau",
  "pic",
  "usure",
] as const;

export type ParamNom = (typeof PARAM_NOMS)[number];

export const FAMILLE_ORDRE: readonly SignatureId[] = SIGNATURES.map((s) => s.id);

const METAUX_RGB: Record<NomAge, readonly [number, number, number]> = {
  Satya: [201 / 255, 162 / 255, 39 / 255],
  Treta: [62 / 255, 142 / 255, 110 / 255],
  Dvapara: [58 / 255, 110 / 255, 165 / 255],
  Kali: [168 / 255, 51 / 255, 42 / 255],
};

export type Genome = {
  readonly graine: string;
  readonly famille: SignatureId;
  readonly etages: [number, number, number];
  readonly age: NomAge;
  readonly params: Readonly<Record<string, number>>;
};

class Flux {
  private block: Uint8Array;
  private i = 0;
  private n = 0;
  private readonly seed: Uint8Array;

  constructor(seed: Uint8Array) {
    this.seed = seed;
    this.block = sha256d(concat(seed, u32(0)));
  }

  octet(): number {
    if (this.i >= 32) {
      this.n += 1;
      this.block = sha256d(concat(this.seed, u32(this.n)));
      this.i = 0;
    }
    return this.block[this.i++]!;
  }

  /** [0, 1] — deux octets big-endian / 65535. */
  u01(): number {
    return ((this.octet() << 8) | this.octet()) / 65535;
  }
}

export function graineOctets(hex: string): Uint8Array {
  const h = hex.replace(/^0x/i, "").toLowerCase();
  if (h.length === 64 && /^[0-9a-f]+$/.test(h)) return fromHex(h);
  return sha256d(utf8(hex));
}

function paramsDuFlux(flux: Flux): Record<string, number> {
  const o: Record<string, number> = {};
  for (const nom of PARAM_NOMS) o[nom] = flux.u01();
  return o;
}

export function rangFamille(id: SignatureId): number {
  const i = FAMILLE_ORDRE.indexOf(id);
  return i < 0 ? 0 : i;
}

function paramsDAge(
  age: NomAge,
  etages: [number, number, number],
  famille: SignatureId,
): Record<string, number> {
  const def = AGES_RELIQUE.find((a) => a.nom === age) ?? AGES_RELIQUE[0]!;
  const metal = METAUX_RGB[age];
  return {
    echelle: def.a / 40,
    densite: 1 - (def.a - 10) / 30,
    metalR: metal[0],
    metalG: metal[1],
    metalB: metal[2],
    sel: etages[0] / 3,
    mercure: etages[1] / 3,
    soufre: etages[2] / 3,
    famille: rangFamille(famille) / 8,
  };
}

function assembler(
  graine: string,
  famille: SignatureId,
  etages: [number, number, number],
  age: NomAge,
  tirage: Record<string, number>,
): Genome {
  return {
    graine,
    famille,
    etages,
    age,
    params: Object.freeze({ ...tirage, ...paramsDAge(age, etages, famille) }),
  };
}

function familleDeDigest(octets: Uint8Array): {
  famille: SignatureId;
  etages: [number, number, number];
} {
  const code = octets[0]! & 63;
  const id = CODES_ARTEFACT.get(code);
  const famille: SignatureId = id ?? SIGNATURES[octets[0]! % SIGNATURES.length]!.id;
  return { famille, etages: groupeDuCode(code) };
}

export function genomeDeGraine(hex: string, age: NomAge): Genome {
  const octets = graineOctets(hex);
  const graine = hexOf(octets);
  const { famille, etages } = familleDeDigest(octets);
  const flux = new Flux(octets);
  return assembler(graine, famille, etages, age, paramsDuFlux(flux));
}

export function genomeDeArtefact(a: Artefact): Genome {
  const octets = graineOctets(a.digest);
  const flux = new Flux(octets);
  return assembler(hexOf(octets), a.id, groupeDuCode(a.code), "Satya", paramsDuFlux(flux));
}

export function genomeAvecAge(g: Genome, age: NomAge): Genome {
  if (g.age === age) return g;
  const tirage: Record<string, number> = {};
  for (const nom of PARAM_NOMS) tirage[nom] = g.params[nom] ?? 0;
  return assembler(g.graine, g.famille, g.etages, age, tirage);
}

export function genomeDeGoutte(txid: string, adresse: string, age: NomAge): Genome {
  const oeuf = artefactDeGoutte(txid, adresse);
  if (oeuf) return genomeAvecAge(genomeDeArtefact(oeuf), age);
  if (txid.length === 64 && adresse.length === 40) {
    try {
      const h = sha256d(concat(utf8("eidos-artefact/1"), fromHex(txid), fromHex(adresse)));
      return genomeDeGraine(hexOf(h), age);
    } catch {
      /* hex invalide */
    }
  }
  return genomeDeAge(age);
}

export function genomeDeAge(age: NomAge): Genome {
  const h = hexOf(sha256d(utf8(`eidos-relique/1/${age}`)));
  return genomeDeGraine(h, age);
}

const CONTINUS = [
  ...PARAM_NOMS,
  "echelle",
  "densite",
  "metalR",
  "metalG",
  "metalB",
  "sel",
  "mercure",
  "soufre",
  "famille",
] as const;

export function genomeEstBorne(g: Genome): boolean {
  if (g.graine.length !== 64) return false;
  if (!/^[0-9a-f]+$/.test(g.graine)) return false;
  for (const k of g.etages) if (k < 0 || k > 3) return false;
  for (const nom of CONTINUS) {
    const v = g.params[nom];
    if (typeof v !== "number" || v < 0 || v > 1 || Number.isNaN(v)) return false;
  }
  return true;
}

export function distanceParams(a: Genome, b: Genome): number {
  let s = 0;
  for (const nom of PARAM_NOMS) {
    const d = (a.params[nom] ?? 0) - (b.params[nom] ?? 0);
    s += d * d;
  }
  if (a.famille !== b.famille) s += 1;
  for (let i = 0; i < 3; i++) {
    const d = (a.etages[i]! - b.etages[i]!) / 3;
    s += d * d;
  }
  return Math.sqrt(s);
}

export function vecteurGele(g: Genome): {
  graine: string;
  famille: SignatureId;
  etages: [number, number, number];
  age: NomAge;
  params: Record<string, number>;
} {
  const params: Record<string, number> = {};
  for (const nom of CONTINUS) params[nom] = g.params[nom] ?? 0;
  return {
    graine: g.graine,
    famille: g.famille,
    etages: g.etages,
    age: g.age,
    params,
  };
}

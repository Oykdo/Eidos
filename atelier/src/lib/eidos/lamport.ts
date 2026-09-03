import {
  concat,
  equalBytes,
  fromHex,
  hexOf,
  sha256,
  sha256d,
  u16,
  u32,
  u64,
  utf8,
} from "./hash.ts";
import type { Coffre, Sortie } from "./types.ts";

export const OCTETS_PK = 16_384;
export const OCTETS_SIG = 8_192;
const VERSION_TX = 1;

function bitDuMessage(msg32: Uint8Array, i: number): 0 | 1 {
  const octet = msg32[i >> 3]!;
  return ((octet >>> (7 - (i & 7))) & 1) as 0 | 1;
}

/** Graine d'une adresse : SHA-256(« maitre/indice »), comme utxo.py. */
export function graineDe(maitre: string, indice: number): Uint8Array {
  return sha256(utf8(`${maitre}/${indice}`));
}

/** 256 paires de 32 octets, dérivées. Seule la graine est à conserver. */
export function lamportSecret(seed: Uint8Array): Uint8Array {
  const sk = new Uint8Array(256 * 64);
  const buf = new Uint8Array(seed.length + 5);
  buf.set(seed, 0);
  buf[seed.length] = 0x73; // s
  buf[seed.length + 1] = 0x6b; // k
  for (let i = 0; i < 256; i++) {
    buf[seed.length + 3] = (i >>> 8) & 255;
    buf[seed.length + 4] = i & 255;
    buf[seed.length + 2] = 0x30; // sk0
    sk.set(sha256(buf), i * 64);
    buf[seed.length + 2] = 0x31; // sk1
    sk.set(sha256(buf), i * 64 + 32);
  }
  return sk;
}

/** 16 384 octets : le haché de chaque moitié du secret. */
export function lamportPublic(sk: Uint8Array): Uint8Array {
  const pk = new Uint8Array(OCTETS_PK);
  for (let i = 0; i < 512; i++) {
    pk.set(sha256(sk.subarray(i * 32, i * 32 + 32)), i * 32);
  }
  return pk;
}

/** 8 192 octets : pour chaque bit du message, la moitié correspondante. */
export function lamportSign(sk: Uint8Array, msg32: Uint8Array): Uint8Array {
  const sig = new Uint8Array(OCTETS_SIG);
  for (let i = 0; i < 256; i++) {
    const bit = bitDuMessage(msg32, i);
    const off = i * 64 + bit * 32;
    sig.set(sk.subarray(off, off + 32), i * 32);
  }
  return sig;
}

export function lamportVerify(
  pk: Uint8Array,
  msg32: Uint8Array,
  sig: Uint8Array,
): boolean {
  if (pk.length !== OCTETS_PK || sig.length !== OCTETS_SIG || msg32.length !== 32) {
    return false;
  }
  for (let i = 0; i < 256; i++) {
    const bit = bitDuMessage(msg32, i);
    const h = sha256(sig.subarray(i * 32, i * 32 + 32));
    const attendu = pk.subarray(i * 64 + bit * 32, i * 64 + bit * 32 + 32);
    if (!equalBytes(h, attendu)) return false;
  }
  return true;
}

export function addressOf(pk: Uint8Array): Uint8Array {
  return sha256(pk).subarray(0, 20);
}

const cacheAdr = new Map<string, string>();

export function adresseDe(maitre: string, indice: number): string {
  const k = `${maitre}/${indice}`;
  const hit = cacheAdr.get(k);
  if (hit) return hit;
  const pk = lamportPublic(lamportSecret(graineDe(maitre, indice)));
  const a = hexOf(addressOf(pk));
  if (cacheAdr.size > 256) cacheAdr.clear();
  cacheAdr.set(k, a);
  return a;
}

export function empreintePk(maitre: string, indice: number): string {
  const pk = lamportPublic(lamportSecret(graineDe(maitre, indice)));
  return hexOf(sha256(pk));
}

export function coreTx(
  inputs: { txid: Uint8Array; vout: number }[],
  outputs: { adresse: Uint8Array; atomes: number }[],
): Uint8Array {
  const parts: Uint8Array[] = [u32(VERSION_TX), u16(inputs.length)];
  for (const inp of inputs) {
    parts.push(inp.txid, u32(inp.vout));
  }
  parts.push(u16(outputs.length));
  for (const o of outputs) {
    parts.push(o.adresse, u64(o.atomes));
  }
  return concat(...parts);
}

export function txidCore(core: Uint8Array): Uint8Array {
  return sha256d(core);
}

export function sighash(txid: Uint8Array, index: number): Uint8Array {
  return sha256(concat(txid, u32(index)));
}

export function txidLabel(payload: string): string {
  return hexOf(sha256d(utf8(payload)));
}

export function signerEntrees(
  maitre: string,
  entrees: Sortie[],
  dest: Uint8Array,
  montant: number,
  rendu: number,
  indiceRendu: number | null,
): {
  txid: string;
  ok: boolean;
  empreintes: string[];
  octets: number;
  erreur: string | null;
  adresseRendu: string | null;
} {
  const inputs = entrees.map((e) => ({
    txid: fromHex(e.txid),
    vout: e.rang,
  }));
  const outputs: { adresse: Uint8Array; atomes: number }[] = [
    { adresse: dest, atomes: montant },
  ];
  let adresseRendu: string | null = null;
  if (rendu > 0 && indiceRendu != null) {
    adresseRendu = adresseDe(maitre, indiceRendu);
    outputs.push({ adresse: fromHex(adresseRendu), atomes: rendu });
  }
  const core = coreTx(inputs, outputs);
  const txid = txidCore(core);
  const empreintes: string[] = [];
  for (let i = 0; i < entrees.length; i++) {
    const e = entrees[i]!;
    const sk = lamportSecret(graineDe(maitre, e.indice));
    const pk = lamportPublic(sk);
    if (hexOf(addressOf(pk)) !== e.adresse) {
      return {
        txid: hexOf(txid),
        ok: false,
        empreintes,
        octets: entrees.length * (1 + OCTETS_PK + OCTETS_SIG),
        erreur: "La clé ne correspond pas à l'adresse.",
        adresseRendu,
      };
    }
    const emp = hexOf(sha256(pk));
    empreintes.push(emp);
    const sig = lamportSign(sk, sighash(txid, i));
    if (!lamportVerify(pk, sighash(txid, i), sig)) {
      return {
        txid: hexOf(txid),
        ok: false,
        empreintes,
        octets: entrees.length * (1 + OCTETS_PK + OCTETS_SIG),
        erreur: "Signature invalide.",
        adresseRendu,
      };
    }
  }
  return {
    txid: hexOf(txid),
    ok: true,
    empreintes,
    octets: entrees.length * (1 + OCTETS_PK + OCTETS_SIG),
    erreur: null,
    adresseRendu,
  };
}

export type EtatConstat = "ok" | "attention" | "faute";

export type Constat = {
  id: string;
  etat: EtatConstat;
  titre: string;
  detail: string;
};

export function analyserGraine(maitre: string): {
  bits: number;
  forme: "hex256" | "nom";
  publique: boolean;
} {
  if (/^[0-9a-f]{64}$/i.test(maitre)) {
    return { bits: 256, forme: "hex256", publique: false };
  }
  return { bits: 0, forme: "nom", publique: true };
}

export function auditerCoffre(coffre: Coffre): Constat[] {
  const g = analyserGraine(coffre.maitre);
  const constats: Constat[] = [];

  if (g.forme === "hex256") {
    constats.push({
      id: "entropie",
      etat: "ok",
      titre: "Graine à 256 bits",
      detail:
        "Tirée par le générateur cryptographique du navigateur. Indevinable.",
    });
  } else {
    constats.push({
      id: "entropie",
      etat: coffre.nature === "atelier" ? "attention" : "faute",
      titre: "Graine nominale — publique",
      detail: `« ${coffre.maitre} » : quiconque connaît ce nom reconstruit chaque secret. Réseau d'essai, sans valeur.`,
    });
  }

  constats.push({
    id: "derive",
    etat: "ok",
    titre: "Dérivation SHA-256 / Lamport",
    detail:
      "skᵢ = SHA-256(graine ∥ sk0|sk1 ∥ i). L'alphabet à trois figures n'entre jamais dans la graine.",
  });

  if (coffre.sorties.length > 0) {
    const s = coffre.sorties[0]!;
    const recalculee = adresseDe(coffre.maitre, s.indice);
    constats.push({
      id: "adresse",
      etat: recalculee === s.adresse ? "ok" : "faute",
      titre:
        recalculee === s.adresse
          ? "Adresse = SHA-256(clé publique)[:20]"
          : "Adresse non reproductible",
      detail:
        recalculee === s.adresse
          ? "Rejouée depuis la graine : l'empreinte concorde."
          : "L'adresse en coffre ne dérive pas de la graine. Coffre corrompu ou ancienne dérivation.",
    });
  }

  const adresses = coffre.sorties.map((s) => s.adresse);
  const uniques = new Set(adresses);
  const indices = coffre.sorties.map((s) => s.indice);
  const indicesUniques = new Set(indices);
  const reuseAdr = uniques.size !== adresses.length;
  const reuseIdx = indicesUniques.size !== indices.length;
  constats.push({
    id: "unique",
    etat: reuseAdr || reuseIdx ? "faute" : "ok",
    titre:
      reuseAdr || reuseIdx
        ? "Adresse ou indice réemployé"
        : "Une clé par sortie",
    detail: reuseAdr
      ? "Deux sorties partagent la même adresse : la seconde dépense forgerait."
      : `${coffre.sorties.length} sortie${coffre.sorties.length > 1 ? "s" : ""} · ${coffre.clesUsees.length} clé${coffre.clesUsees.length > 1 ? "s" : ""} déjà publiée${coffre.clesUsees.length > 1 ? "s" : ""}.`,
  });

  constats.push({
    id: "stockage",
    etat: "attention",
    titre: "Graine en clair dans ce navigateur",
    detail:
      "localStorage n'est pas un coffre-fort. Un autre script de cette origine la lirait. Prototype uniquement.",
  });

  if (coffre.derniereSig) {
    constats.push({
      id: "signature",
      etat: coffre.derniereSig.ok ? "ok" : "faute",
      titre: coffre.derniereSig.ok
        ? "Dernière signature vérifiée"
        : "Dernière signature refusée",
      detail: `${coffre.derniereSig.entrees} entrée${coffre.derniereSig.entrees > 1 ? "s" : ""} · ${coffre.derniereSig.octets.toLocaleString("fr-FR")} octets de témoin · ${coffre.derniereSig.txid.slice(0, 16)}…`,
    });
  }

  return constats;
}

export type ForgeDemo = {
  bits: number;
  forgeables: string;
  verifie1: boolean;
  verifie2: boolean;
  verifieForge: boolean;
  msg1: string;
  msg3: string;
};

export function bitsDifferents(a: Uint8Array, b: Uint8Array): number {
  let n = 0;
  for (let i = 0; i < a.length; i++) {
    let x = a[i]! ^ b[i]!;
    while (x) {
      n += x & 1;
      x >>>= 1;
    }
  }
  return n;
}

/** Deux signatures sur la même clé : un troisième message se forge. */
export function demonstrerReemploi(): ForgeDemo {
  const seed = graineDe("eidos-demo-reemploi", 0);
  const sk = lamportSecret(seed);
  const pk = lamportPublic(sk);
  const m1 = sha256(utf8("premier"));
  const m2 = sha256(utf8("second"));
  const s1 = lamportSign(sk, m1);
  const s2 = lamportSign(sk, m2);
  const bits = bitsDifferents(m1, m2);

  const m3 = new Uint8Array(m1);
  for (let i = 0; i < 256; i++) {
    if (bitDuMessage(m1, i) !== bitDuMessage(m2, i)) {
      const byte = i >> 3;
      const bit = 7 - (i & 7);
      m3[byte] ^= 1 << bit;
      break;
    }
  }
  const s3 = new Uint8Array(OCTETS_SIG);
  for (let i = 0; i < 256; i++) {
    const bt = bitDuMessage(m3, i);
    const src = bitDuMessage(m1, i) === bt ? s1 : s2;
    s3.set(src.subarray(i * 32, i * 32 + 32), i * 32);
  }

  return {
    bits,
    forgeables: `2^${bits}`,
    verifie1: lamportVerify(pk, m1, s1),
    verifie2: lamportVerify(pk, m2, s2),
    verifieForge: lamportVerify(pk, m3, s3),
    msg1: hexOf(m1),
    msg3: hexOf(m3),
  };
}

/**
 * eidos.relique-qr — une relique cachée dans le monde, lue depuis un QR.
 *
 * Le QR porte la graine (32 o) d'une adresse WOTS+ créditée par le gardien :
 *   https://oykdo.github.io/Eidos/reliques#r=1.<graine base64url>
 *   eidos:relique/1/<graine base64url>
 * Le fragment ne quitte jamais le navigateur. Récupérer la relique, c'est
 * dépenser cette pièce vers son coffre par le circuit des envois (P1) : une
 * clé ne signe qu'une fois, la chaîne fait foi. Le statut publié
 * (etat.json.reliques, reliques.json) est une lecture, pas une preuve.
 *
 * LIMITE. Secret au porteur : une photo du QR suffit. Premier arrivé.
 */

import { concat, fromHex, hexOf, sha256, utf8 } from "./hash.ts";
import { coreTx, sighash, txidCore } from "./lamport.ts";
import { encapsuler, serTx, transmissibilite, urlIssueEnvoi, type Transmissibilite } from "./envoi.ts";
import { adresse as adresseWots, adresseDeGraine, racineDepuisTemoin, signer } from "./wots.ts";

export const VERSION_RELIQUE = 1;
export const BASE_URL_RELIQUE = "https://oykdo.github.io/Eidos/reliques";
const TAG_ID = utf8("eidos-relique-qr/1");

export type ReliqueLue = {
  version: 1;
  graine: Uint8Array;
  adresse: string;
  id: string;
};

export function versBase64url(b: Uint8Array): string {
  const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  let s = "";
  let i = 0;
  for (; i + 2 < b.length; i += 3) {
    const n = (b[i]! << 16) | (b[i + 1]! << 8) | b[i + 2]!;
    s += A[(n >>> 18) & 63]! + A[(n >>> 12) & 63]! + A[(n >>> 6) & 63]! + A[n & 63]!;
  }
  if (i < b.length) {
    const n = (b[i]! << 16) | ((b[i + 1] ?? 0) << 8);
    s += A[(n >>> 18) & 63]! + A[(n >>> 12) & 63]! + (i + 1 < b.length ? A[(n >>> 6) & 63]! : "");
  }
  return s;
}

export function depuisBase64url(s: string): Uint8Array {
  const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  if (!/^[A-Za-z0-9_-]*$/.test(s) || s.length % 4 === 1) throw new Error("base64url invalide");
  const out: number[] = [];
  let acc = 0;
  let bits = 0;
  for (const ch of s) {
    acc = (acc << 6) | A.indexOf(ch);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out.push((acc >>> bits) & 255);
    }
  }
  return new Uint8Array(out);
}

export function idRelique(adresseHex: string): string {
  return hexOf(sha256(concat(TAG_ID, fromHex(adresseHex)))).slice(0, 16);
}

export function chargeUtile(graine: Uint8Array): string {
  return `${BASE_URL_RELIQUE}#r=${VERSION_RELIQUE}.${versBase64url(graine)}`;
}

/** URL complète, fragment seul, ou forme `eidos:relique/1/…`. */
export function parserRelique(texte: string): ReliqueLue | { erreur: string } {
  const t = texte.trim();
  let corps: string | null = null;
  const m1 = /#r=(\d+)\.([A-Za-z0-9_-]+)\s*$/.exec(t);
  const m2 = /^eidos:relique\/(\d+)\/([A-Za-z0-9_-]+)$/.exec(t);
  const m3 = /^r=(\d+)\.([A-Za-z0-9_-]+)$/.exec(t) ?? /^(\d+)\.([A-Za-z0-9_-]+)$/.exec(t);
  const m = m1 ?? m2 ?? m3;
  if (!m) return { erreur: "aucune relique dans ce texte" };
  if (Number(m[1]) !== VERSION_RELIQUE) return { erreur: `version ${m[1]} inconnue` };
  corps = m[2]!;
  let graine: Uint8Array;
  try {
    graine = depuisBase64url(corps);
  } catch {
    return { erreur: "graine illisible" };
  }
  if (graine.length !== 32) return { erreur: `graine de ${graine.length} octets, 32 attendus` };
  const adresse = hexOf(adresseDeGraine(graine));
  return { version: 1, graine, adresse, id: idRelique(adresse) };
}

// ---------------------------------------------------------------------------
// Statut depuis l'état publié
// ---------------------------------------------------------------------------
export type EntreeRelique = {
  id: string;
  adresse: string;
  etat: "attente" | "intacte" | "recuperee";
  age?: string;
  indice?: string;
  bloc?: number;
  txid?: string;
  vers?: string;
  artefact?: string | null;
  montant?: number;
  rang?: number;
};

export type SortieRelique = { txid: string; rang: number; montant: number };

export type StatutRelique =
  | { etat: "intacte"; entree: EntreeRelique | null; sortie: SortieRelique }
  | { etat: "recuperee"; entree: EntreeRelique }
  | { etat: "attente"; entree: EntreeRelique }
  | { etat: "hors-liste"; entree: null };

/** Croise etat.json.reliques (déclarée ?) et etat.json.sorties (pièce
 *  présente ?). Une pièce présente est récupérable même hors liste. */
export function statutRelique(etatBrut: unknown, adresseHex: string): StatutRelique {
  const o = (etatBrut ?? {}) as {
    reliques?: unknown;
    sorties?: Record<string, { adresse?: unknown; montant?: unknown }>;
  };
  let entree: EntreeRelique | null = null;
  if (Array.isArray(o.reliques)) {
    for (const r of o.reliques as Record<string, unknown>[]) {
      if (r?.adresse === adresseHex && typeof r.etat === "string" && typeof r.id === "string") {
        entree = r as unknown as EntreeRelique;
        break;
      }
    }
  }
  let sortie: SortieRelique | null = null;
  for (const [cle, v] of Object.entries(o.sorties ?? {})) {
    if (v?.adresse !== adresseHex || typeof v.montant !== "number") continue;
    const [txid, rang] = cle.split(":");
    if (txid && /^[0-9a-f]{64}$/.test(txid) && /^\d+$/.test(rang ?? "")) {
      sortie = { txid, rang: Number(rang), montant: v.montant };
      break;
    }
  }
  if (sortie) return { etat: "intacte", entree, sortie };
  if (entree?.etat === "recuperee") return { etat: "recuperee", entree };
  if (entree) return { etat: "attente", entree };
  return { etat: "hors-liste", entree: null };
}

// ---------------------------------------------------------------------------
// Récupérer : dépenser la pièce vers son coffre
// ---------------------------------------------------------------------------
export type Recuperation = {
  txid: string;
  texte: string;
  url: string;
  octets: number;
  transmissible: Transmissibilite;
};

export function preparerRecuperation(
  graine: Uint8Array,
  sortie: SortieRelique,
  destHex: string,
): Recuperation | { erreur: string } {
  const dest = fromHex(destHex);
  if (dest.length !== 20) return { erreur: "adresse de destination invalide" };
  if (!Number.isInteger(sortie.montant) || sortie.montant <= 0) return { erreur: "montant invalide" };
  const core = coreTx([{ txid: fromHex(sortie.txid), vout: sortie.rang }], [{ adresse: dest, atomes: sortie.montant }]);
  const txid = txidCore(core);
  const h = sighash(txid, 0);
  const temoin = signer(graine, h);
  const r = racineDepuisTemoin(temoin, h);
  if (r === null || hexOf(adresseWots(temoin.grainePub, r)) !== hexOf(adresseDeGraine(graine))) {
    return { erreur: "signature non reproductible" };
  }
  const octets = serTx({ core, temoins: [temoin] });
  const texte = encapsuler(octets);
  return {
    txid: hexOf(txid),
    texte,
    url: urlIssueEnvoi(texte),
    octets: octets.length,
    transmissible: transmissibilite(texte, 1),
  };
}

/** Référence « txid:rang » d'une pièce. */
export function refDe(s: SortieRelique): string {
  return `${s.txid}:${s.rang}`;
}

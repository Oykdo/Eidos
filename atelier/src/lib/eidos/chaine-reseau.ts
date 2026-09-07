/**
 * Les en-têtes de la chaîne du réseau d'essai, lus côté atelier — sans rejeu.
 *
 * `chaine-eidos.dat` (noeud.py, FORMAT 3) est public. On n'y rejoue pas le
 * carnet : on en lit les **en-têtes signés**, un par bloc, et on les vérifie
 * comme le Témoin vérifie la tête publiée — `id_bloc` recomposé depuis
 * l'en-tête étendu, signature XMSS contre federation.json, chaînage par
 * `prev`. Le corps d'un bloc ne sert qu'à recalculer la racine de Merkle des
 * transactions (`txid = SHA-256d(core)`, même règle que utxo.py), car
 * l'en-tête gelé la porte.
 *
 * Ce que cela donne à la veillée : la tête de la veille et la tête du jour
 * (`premierDuJour`), quelle que soit l'heure où l'on ouvre l'atelier ;
 * `etat.json` ne publie que la tête courante.
 *
 *   entête  MAGIC "EIDOS\0\0\1"(8) FORMAT(2)=3
 *   bloc    LONGUEUR(4) CORPS
 *   corps   height(8) prev(32) ts(8) utxo_root(32) validateur(2) indice(4)
 *           sig(2144) k(1) chemin(32k) n_tx(2) [tx]*
 *   tx      len_core(4) core n_temoins(2) [flag(1) (graine_pub(32) sig(2144))?]*
 *
 * LIMITE : le fichier entier est lu (≈ 2,4 Ko par bloc, un bloc par heure :
 * ~20 Mo par an). Rien ici n'est cru : une chaîne dont une signature ou un
 * chaînage manque est refusée en bloc, avec la hauteur du refus.
 */

import { hexOf, sha256d } from "./hash.ts";
import { merkleRoot } from "./merkle.ts";
import { idBlocDe, verifierTeteReseau, type FederationPublique, type TeteReseau } from "./temoin.ts";
import { jourDe } from "./veillee.ts";
import { OCTETS_GRAINE, OCTETS_SIG } from "./wots.ts";

export const CHAINE_URL = "https://raw.githubusercontent.com/Oykdo/Eidos/main/chaine-eidos.dat";
export const MAGIC = new Uint8Array([0x45, 0x49, 0x44, 0x4f, 0x53, 0, 0, 1]); // "EIDOS\0\0\1"
export const FORMAT = 3;

function u64(buf: Uint8Array, i: number): number {
  let n = 0;
  for (let k = 0; k < 8; k++) n = n * 256 + buf[i + k]!;
  if (!Number.isSafeInteger(n)) throw new Error("entier hors de 2^53");
  return n;
}
function u32(buf: Uint8Array, i: number): number {
  return ((buf[i]! << 24) >>> 0) + (buf[i + 1]! << 16) + (buf[i + 2]! << 8) + buf[i + 3]!;
}
function u16(buf: Uint8Array, i: number): number {
  return (buf[i]! << 8) + buf[i + 1]!;
}

/** Lit tous les en-têtes ; la première incohérence de format arrête tout. */
export function lireTetes(buf: Uint8Array): TeteReseau[] | { erreur: string } {
  if (buf.length < 10) return { erreur: "fichier trop court" };
  for (let k = 0; k < 8; k++) if (buf[k] !== MAGIC[k]) return { erreur: "fichier non reconnu (magic)" };
  if (u16(buf, 8) !== FORMAT) return { erreur: `format ${u16(buf, 8)} au lieu de ${FORMAT}` };
  const tetes: TeteReseau[] = [];
  let i = 10;
  try {
    while (i < buf.length) {
      const n = u32(buf, i);
      i += 4;
      const fin = i + n;
      if (fin > buf.length) return { erreur: `bloc ${tetes.length} : tronqué` };
      const hauteur = u64(buf, i);
      i += 8;
      const prev = hexOf(buf.subarray(i, i + 32));
      i += 32;
      const ts = u64(buf, i);
      i += 8;
      const utxoRoot = hexOf(buf.subarray(i, i + 32));
      i += 32;
      const validateur = u16(buf, i);
      i += 2;
      const indice = u32(buf, i);
      i += 4;
      const signature = hexOf(buf.subarray(i, i + OCTETS_SIG));
      i += OCTETS_SIG;
      const k = buf[i]!;
      i += 1;
      const chemin: string[] = [];
      for (let j = 0; j < k; j++) {
        chemin.push(hexOf(buf.subarray(i, i + 32)));
        i += 32;
      }
      const nTx = u16(buf, i);
      i += 2;
      const txids: Uint8Array[] = [];
      for (let t = 0; t < nTx; t++) {
        const lc = u32(buf, i);
        i += 4;
        txids.push(sha256d(buf.subarray(i, i + lc)));
        i += lc;
        const nw = u16(buf, i);
        i += 2;
        for (let w = 0; w < nw; w++) {
          const flag = buf[i]!;
          i += 1;
          if (flag === 1) i += OCTETS_GRAINE + OCTETS_SIG;
          else if (flag !== 0) return { erreur: `bloc ${hauteur} : témoin inconnu` };
        }
      }
      if (i !== fin) return { erreur: `bloc ${hauteur} : longueur incohérente` };
      const entete = { hauteur, prev, merkle: hexOf(merkleRoot(txids)), ts, utxoRoot };
      tetes.push({ ...entete, idBloc: idBlocDe(entete), validateur, indice, signature, chemin });
    }
  } catch (e) {
    return { erreur: `lecture rompue : ${e instanceof Error ? e.message : String(e)}` };
  }
  return tetes;
}

export type VerdictChaine = { ok: true; hauteur: number } | { ok: false; motif: string; hauteur: number };

/** Chaque tête signée par son validateur, chaînée à la précédente, ts croissant. */
export function verifierChaine(tetes: readonly TeteReseau[], fed: FederationPublique): VerdictChaine {
  if (tetes.length === 0) return { ok: false, motif: "chaîne vide", hauteur: -1 };
  for (let k = 0; k < tetes.length; k++) {
    const t = tetes[k]!;
    if (t.hauteur !== k) return { ok: false, motif: `hauteur ${t.hauteur} au lieu de ${k}`, hauteur: k };
    if (k > 0) {
      const p = tetes[k - 1]!;
      if (t.prev !== p.idBloc) return { ok: false, motif: "prev ne chaîne pas", hauteur: k };
      if (t.ts <= p.ts) return { ok: false, motif: "ts non croissant", hauteur: k };
    }
    const v = verifierTeteReseau(t, fed);
    if (!v.ok) return { ok: false, motif: `signature refusée (${v.motif})`, hauteur: k };
  }
  return { ok: true, hauteur: tetes.length - 1 };
}

export type TetesDuJour = { jour: number; tete: TeteReseau; veille: TeteReseau };

/** Le premier bloc du jour civil UTC `jour` et la tête de la veille ; null s'il n'y en a pas (ou s'il est le bloc 0). */
export function premierDuJour(tetes: readonly TeteReseau[], jour: number): TetesDuJour | null {
  for (let k = 1; k < tetes.length; k++) {
    const t = tetes[k]!;
    const j = jourDe(t.ts);
    if (j > jour) return null;
    if (j === jour && jourDe(tetes[k - 1]!.ts) < jour) return { jour, tete: t, veille: tetes[k - 1]! };
  }
  return null;
}

/** La veillée d'aujourd'hui (UTC), ou d'un instant donné. */
export function tetesDeLaVeillee(tetes: readonly TeteReseau[], tsUnix = Math.floor(Date.now() / 1000)): TetesDuJour | null {
  return premierDuJour(tetes, jourDe(tsUnix));
}

type FetchOctets = (url: string) => Promise<{ ok: boolean; status?: number; arrayBuffer(): Promise<ArrayBuffer> }>;

/** Lit la chaîne publiée, vérifie chaque en-tête, rend les têtes — ou le motif du refus. */
export async function suivreChaine(
  fed: FederationPublique,
  fetchImpl: FetchOctets = (u) => fetch(u, { cache: "no-store" }),
  url = CHAINE_URL,
): Promise<{ tetes: TeteReseau[]; hauteur: number } | { erreur: string }> {
  let buf: Uint8Array;
  try {
    const r = await fetchImpl(url);
    if (!r.ok) return { erreur: `chaîne injoignable (${r.status ?? "?"})` };
    buf = new Uint8Array(await r.arrayBuffer());
  } catch (e) {
    return { erreur: `réseau injoignable : ${e instanceof Error ? e.message : String(e)}` };
  }
  const tetes = lireTetes(buf);
  if ("erreur" in tetes) return tetes;
  const v = verifierChaine(tetes, fed);
  if (!v.ok) return { erreur: `bloc ${v.hauteur} : ${v.motif}` };
  return { tetes, hauteur: v.hauteur };
}

/**
 * eidos.envoi — une dépense signée au format du nœud, prête à être déposée.
 *
 * Même octets que noeud.py (ser_tx / deser_tx, FORMAT 2), gros-boutiste :
 *   tx    len_core(4) core n_témoins(2) [flag(1) (graine_pub(32) sig(2144))?]*
 *   core  VERSION(4)=2 n_in(2) [txid(32) vout(4)]* n_out(2) [addr(20) atomes(8)]*
 *
 * Encapsulée en base64 entre -----EIDOS----- et -----FIN-----, elle se colle
 * dans une issue GitHub titrée « envoi ». robinet.py l'inscrit dans la file
 * avec le créneau courant ; noeud.py la rejoue sur une copie du carnet, puis
 * l'inclut ou la refuse avec un motif ; sans bloc après T créneaux elle expire.
 * Rien ici n'engage : seul le carnet du nœud tranche.
 *
 * L'état publié (etat.json : sorties « txid:rang », soldes) sert à retrouver
 * les pièces du réseau d'essai qui appartiennent à un coffre — celles dont
 * l'adresse dérive de sa graine — pour les afficher et les dépenser.
 *
 * Un témoin WOTS+ pèse 2 177 octets : trois entrées font ~8,9 Ko en base64,
 * loin de la limite d'une issue GitHub (65 536 caractères).
 */

import { concat, equalBytes, u16, u32 } from "./hash.ts";
import { adresseDe, coreTx, signerEntrees, txidCore } from "./lamport.ts";
import { OCTETS_GRAINE, OCTETS_SIG } from "./wots.ts";
import type { Sortie } from "./types.ts";

export const DEBUT = "-----EIDOS-----";
export const FIN = "-----FIN-----";
export const VERSION_TX = 2;
export const LARGEUR_LIGNE = 76;
/** Corps d'une issue GitHub : au-delà, le dépôt est impossible. */
export const MAX_CARACTERES_ISSUE = 65_536;
/** robinet.py refuse au-delà (MAX_TX_CARACTERES). */
export const MAX_CARACTERES_ROBINET = 80_000;
export const ETAT_URL = "https://oykdo.github.io/Eidos/etat.json";

export type Temoin = { grainePub: Uint8Array; sig: Uint8Array } | null;

export type TxSignee = {
  core: Uint8Array;
  temoins: Temoin[];
};

export type TxLue = TxSignee & {
  inputs: { txid: Uint8Array; vout: number }[];
  outputs: { adresse: Uint8Array; atomes: number }[];
  txid: Uint8Array;
};

// ---------------------------------------------------------------------------
// base64, sans Buffer ni btoa : même code dans le navigateur et sous node
// ---------------------------------------------------------------------------
const ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const INDICE = new Map<string, number>();
for (let i = 0; i < 64; i++) INDICE.set(ALPHABET[i]!, i);

export function versBase64(b: Uint8Array): string {
  const parts: string[] = [];
  let i = 0;
  for (; i + 2 < b.length; i += 3) {
    const n = (b[i]! << 16) | (b[i + 1]! << 8) | b[i + 2]!;
    parts.push(
      ALPHABET[(n >>> 18) & 63]! +
        ALPHABET[(n >>> 12) & 63]! +
        ALPHABET[(n >>> 6) & 63]! +
        ALPHABET[n & 63]!,
    );
  }
  if (i < b.length) {
    const n = (b[i]! << 16) | ((b[i + 1] ?? 0) << 8);
    parts.push(
      ALPHABET[(n >>> 18) & 63]! +
        ALPHABET[(n >>> 12) & 63]! +
        (i + 1 < b.length ? ALPHABET[(n >>> 6) & 63]! : "=") +
        "=",
    );
  }
  return parts.join("");
}

export function depuisBase64(s: string): Uint8Array {
  if (s.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(s)) {
    throw new Error("base64 invalide");
  }
  const pad = s.endsWith("==") ? 2 : s.endsWith("=") ? 1 : 0;
  const out = new Uint8Array((s.length / 4) * 3 - pad);
  let o = 0;
  for (let i = 0; i < s.length; i += 4) {
    const n =
      ((INDICE.get(s[i]!) ?? 0) << 18) |
      ((INDICE.get(s[i + 1]!) ?? 0) << 12) |
      ((INDICE.get(s[i + 2]!) ?? 0) << 6) |
      (INDICE.get(s[i + 3]!) ?? 0);
    out[o++] = (n >>> 16) & 255;
    if (o < out.length) out[o++] = (n >>> 8) & 255;
    if (o < out.length) out[o++] = n & 255;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Sérialisation = noeud.py
// ---------------------------------------------------------------------------
export function serTx(tx: TxSignee): Uint8Array {
  const parts: Uint8Array[] = [u32(tx.core.length), tx.core, u16(tx.temoins.length)];
  for (const w of tx.temoins) {
    if (w === null) {
      parts.push(new Uint8Array([0]));
    } else {
      if (w.grainePub.length !== OCTETS_GRAINE || w.sig.length !== OCTETS_SIG) {
        throw new Error("témoin de taille inattendue");
      }
      parts.push(new Uint8Array([1]), w.grainePub, w.sig);
    }
  }
  return concat(...parts);
}

function lireU16(b: Uint8Array, i: number): number {
  return (b[i]! << 8) | b[i + 1]!;
}
function lireU32(b: Uint8Array, i: number): number {
  return ((b[i]! << 24) | (b[i + 1]! << 16) | (b[i + 2]! << 8) | b[i + 3]!) >>> 0;
}
function lireU64(b: Uint8Array, i: number): number {
  const hi = lireU32(b, i);
  const lo = lireU32(b, i + 4);
  if (hi > 0x1f_ffff) throw new Error("montant hors du domaine sûr");
  return hi * 0x1_0000_0000 + lo;
}

/** Aucune lecture tolérante : le core doit se retrouver à l'octet près,
 *  et le tampon doit être consommé entièrement. */
export function deserTx(buf: Uint8Array): TxLue {
  const besoin = (i: number, n: number) => {
    if (i + n > buf.length) throw new Error("transaction tronquée");
  };
  let i = 0;
  besoin(i, 4);
  const n = lireU32(buf, i);
  i += 4;
  besoin(i, n);
  const core = buf.subarray(i, i + n);
  i += n;

  let j = 0;
  const lireCore = (k: number) => {
    if (j + k > core.length) throw new Error("transaction non canonique");
  };
  lireCore(4);
  const version = lireU32(core, j);
  j += 4;
  if (version !== VERSION_TX) throw new Error(`version ${version} au lieu de ${VERSION_TX}`);
  lireCore(2);
  const nIn = lireU16(core, j);
  j += 2;
  const inputs: TxLue["inputs"] = [];
  for (let k = 0; k < nIn; k++) {
    lireCore(36);
    inputs.push({ txid: core.slice(j, j + 32), vout: lireU32(core, j + 32) });
    j += 36;
  }
  lireCore(2);
  const nOut = lireU16(core, j);
  j += 2;
  const outputs: TxLue["outputs"] = [];
  for (let k = 0; k < nOut; k++) {
    lireCore(28);
    outputs.push({ adresse: core.slice(j, j + 20), atomes: lireU64(core, j + 20) });
    j += 28;
  }
  if (!equalBytes(coreTx(inputs, outputs), core)) {
    throw new Error("transaction non canonique");
  }

  besoin(i, 2);
  const nw = lireU16(buf, i);
  i += 2;
  const temoins: Temoin[] = [];
  for (let k = 0; k < nw; k++) {
    besoin(i, 1);
    const flag = buf[i]!;
    i += 1;
    if (flag === 0) {
      temoins.push(null);
    } else {
      besoin(i, OCTETS_GRAINE + OCTETS_SIG);
      temoins.push({
        grainePub: buf.slice(i, i + OCTETS_GRAINE),
        sig: buf.slice(i + OCTETS_GRAINE, i + OCTETS_GRAINE + OCTETS_SIG),
      });
      i += OCTETS_GRAINE + OCTETS_SIG;
    }
  }
  if (i !== buf.length) {
    throw new Error(`longueur incohérente : ${i} octets lus, ${buf.length} reçus`);
  }
  return { core: core.slice(), temoins, inputs, outputs, txid: txidCore(core) };
}

// ---------------------------------------------------------------------------
// Encapsulation = robinet.extraire_transaction
// ---------------------------------------------------------------------------
export function encapsuler(octets: Uint8Array, largeur = LARGEUR_LIGNE): string {
  const b64 = versBase64(octets);
  const lignes: string[] = [DEBUT];
  for (let i = 0; i < b64.length; i += largeur) lignes.push(b64.slice(i, i + largeur));
  lignes.push(FIN);
  return lignes.join("\n") + "\n";
}

/** Entre les marqueurs, seules les lignes entièrement base64 sont retenues ;
 *  rien n'est assemblé à partir de morceaux dispersés. */
export function desencapsuler(texte: string): Uint8Array {
  const lignes = texte.split(/\r?\n/);
  const d = lignes.findIndex((l) => l.includes(DEBUT));
  const f = lignes.findIndex((l, i) => i > d && l.includes(FIN));
  if (d < 0 || f < 0) throw new Error("marqueurs -----EIDOS----- / -----FIN----- absents");
  const morceaux = lignes
    .slice(d + 1, f)
    .map((l) => l.trim())
    .filter((l) => /^[A-Za-z0-9+/=]{4,}$/.test(l));
  if (morceaux.length === 0) throw new Error("aucune transaction entre les marqueurs");
  return depuisBase64(morceaux.join(""));
}

export type Transmissibilite = {
  caracteres: number;
  issue: boolean;
  robinet: boolean;
  entrees: number;
};

export function transmissibilite(texte: string, entrees: number): Transmissibilite {
  const caracteres = texte.length;
  return {
    caracteres,
    issue: caracteres <= MAX_CARACTERES_ISSUE,
    robinet: caracteres <= MAX_CARACTERES_ROBINET,
    entrees,
  };
}

// ---------------------------------------------------------------------------
// Signer et exporter
// ---------------------------------------------------------------------------
export type EnvoiSigne = {
  txid: string;
  octets: Uint8Array;
  texte: string;
  empreintes: string[];
  adresseRendu: string | null;
  transmissible: Transmissibilite;
};

export function signerEnvoi(
  maitre: string,
  entrees: Sortie[],
  dest: Uint8Array,
  montant: number,
  rendu: number,
  indiceRendu: number | null,
): EnvoiSigne | { erreur: string } {
  const sig = signerEntrees(maitre, entrees, dest, montant, rendu, indiceRendu);
  if (!sig.ok) return { erreur: sig.erreur ?? "Signature refusée." };
  const octets = serTx({ core: sig.core, temoins: sig.temoins });
  const texte = encapsuler(octets);
  return {
    txid: sig.txid,
    octets,
    texte,
    empreintes: sig.empreintes,
    adresseRendu: sig.adresseRendu,
    transmissible: transmissibilite(texte, entrees.length),
  };
}

export function urlIssueEnvoi(texte: string): string {
  const corps =
    "Envoi sur le reseau d'essai.\n\n" +
    texte +
    "\n(Signe par le portefeuille Eidos. Ne modifiez pas les lignes.)";
  return (
    "https://github.com/Oykdo/Eidos/issues/new?title=" +
    encodeURIComponent("envoi") +
    "&labels=envoi&body=" +
    encodeURIComponent(corps)
  );
}

// ---------------------------------------------------------------------------
// État publié du réseau d'essai
// ---------------------------------------------------------------------------
export type SortieTestnet = {
  txid: string;
  rang: number;
  adresse: string;
  montant: number;
};

export type EtatTestnet = {
  hauteur: number;
  tete: string | null;
  majUnix: number | null;
  invariant: boolean | null;
  sorties: SortieTestnet[];
  soldes: Record<string, number>;
};

export function parserEtatTestnet(raw: unknown): EtatTestnet {
  const o = (raw ?? {}) as Record<string, unknown>;
  const sorties: SortieTestnet[] = [];
  if (o.sorties && typeof o.sorties === "object") {
    for (const [cle, v] of Object.entries(o.sorties as Record<string, unknown>)) {
      const s = v as { adresse?: unknown; montant?: unknown };
      const [txid, rangTexte] = cle.split(":");
      const rang = Number(rangTexte);
      if (
        typeof txid === "string" &&
        /^[0-9a-f]{64}$/.test(txid) &&
        Number.isInteger(rang) &&
        rang >= 0 &&
        typeof s.adresse === "string" &&
        /^[0-9a-f]{40}$/.test(s.adresse) &&
        typeof s.montant === "number" &&
        Number.isInteger(s.montant) &&
        s.montant > 0
      ) {
        sorties.push({ txid, rang, adresse: s.adresse, montant: s.montant });
      }
    }
  }
  sorties.sort((a, b) => (a.txid < b.txid ? -1 : a.txid > b.txid ? 1 : a.rang - b.rang));
  const soldes: Record<string, number> = {};
  if (o.soldes && typeof o.soldes === "object") {
    for (const [a, m] of Object.entries(o.soldes as Record<string, unknown>)) {
      if (/^[0-9a-f]{40}$/.test(a) && typeof m === "number") soldes[a] = m;
    }
  }
  return {
    hauteur: typeof o.hauteur === "number" ? o.hauteur : -1,
    tete: typeof o.tete === "string" ? o.tete : null,
    majUnix: typeof o.maj_unix === "number" ? o.maj_unix : null,
    invariant: typeof o.invariant === "boolean" ? o.invariant : null,
    sorties,
    soldes,
  };
}

type FetchMinimal = (url: string) => Promise<{ ok: boolean; status?: number; json(): Promise<unknown> }>;

export async function lireEtat(
  url: string = ETAT_URL,
  fetchImpl: FetchMinimal = (u) => fetch(u, { cache: "no-store" }),
): Promise<EtatTestnet> {
  const r = await fetchImpl(url);
  if (!r.ok) throw new Error(`etat.json injoignable (${r.status ?? "?"})`);
  return parserEtatTestnet(await r.json());
}

/** Les pièces du réseau dont l'adresse dérive de la graine du coffre :
 *  indices 0 … n + marge − 1 (le robinet verse sur l'indice n, pas encore
 *  consommé localement). Ordre canonique (txid, rang). */
export function sortiesDuCoffre(
  etat: EtatTestnet,
  maitre: string,
  n: number,
  marge = 8,
): Sortie[] {
  const indices = new Map<string, number>();
  for (let i = 0; i < n + marge; i++) indices.set(adresseDe(maitre, i), i);
  const out: Sortie[] = [];
  for (const s of etat.sorties) {
    const indice = indices.get(s.adresse);
    if (indice === undefined) continue;
    out.push({
      ref: `${s.txid}:${s.rang}`,
      txid: s.txid,
      rang: s.rang,
      adresse: s.adresse,
      indice,
      montant: s.montant,
    });
  }
  return out;
}

export function soldeTestnet(sorties: Sortie[]): number {
  return sorties.reduce((t, s) => t + s.montant, 0);
}

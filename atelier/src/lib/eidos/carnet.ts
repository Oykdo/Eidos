/**
 * eidos.carnet — unique fichier d'Eidos.
 *
 * Post-quantique comme Lamport : hachage seulement, aucune courbe.
 *   - Lamport (on-chain) signe une dépense, une seule fois.
 *   - On ne signe PAS le fichier : une sauvegarde brûlerait une clé.
 *   - La trace est SHA-256d du feuillet, liée à l'adresse Lamport
 *     courante (maître + indice). Qui a le fichier a le coffre.
 *
 * Ce n'est pas le .psnx holographique d'Eidolon (deux fragments, courbe).
 * Un ancien .psnx JSON d'Eidos s'ouvre encore, puis se réécrit ici.
 */

import type { Coffre } from "./types.ts";
import { estNomAge } from "./relique.ts";
import { hexOf, sha256d, utf8 } from "./hash.ts";
import { adresseDe } from "./lamport.ts";
import {
  estPsnxEtranger,
  parserPsnx,
} from "./portable.ts";
import { normaliserObjets } from "./inventaire.ts";

export const KIND_CARNET = "eidos-carnet/1";
export const TAG_CARNET = "eidos-carnet/1";
export const EXT_CARNET = ".carnet";
export const NOM_CARNET = "eidos.carnet";
export const SIG_CARNET = "lamport-sha256";
export const ALG_CARNET = "sha256d";

export type SnapshotCarnet = {
  v: 1;
  kind: typeof KIND_CARNET;
  alg: typeof ALG_CARNET;
  sig: typeof SIG_CARNET;
  feuillet: Coffre;
  adresse: string;
  empreinte: string;
};

export type Ouverture =
  | { coffre: Coffre; source: "carnet" | "psnx"; empreinte: string; adresse: string }
  | { erreur: string };

function normaliser(c: Coffre): Coffre {
  return {
    ...c,
    clesUsees: Array.isArray(c.clesUsees) ? c.clesUsees : [],
    reliques: Array.isArray(c.reliques) ? c.reliques.filter(estNomAge) : [],
    objets: normaliserObjets(c.objets),
  };
}

function corpsCarnet(coffre: Coffre) {
  const f = normaliser(coffre);
  return {
    v: 1 as const,
    kind: KIND_CARNET,
    alg: ALG_CARNET,
    sig: SIG_CARNET,
    feuillet: f,
    adresse: adresseDe(f.maitre, f.n),
  };
}

export function empreinteCarnet(coffre: Coffre): string {
  return hexOf(sha256d(utf8(TAG_CARNET + JSON.stringify(corpsCarnet(coffre)))));
}

export function exporterCarnet(coffre: Coffre): string {
  const corps = corpsCarnet(coffre);
  return JSON.stringify({ ...corps, empreinte: empreinteCarnet(coffre) });
}

export function nomFichierCarnet(_coffre?: Coffre): string {
  return NOM_CARNET;
}

function coffreValide(c: unknown): c is Coffre {
  if (!c || typeof c !== "object") return false;
  const o = c as Coffre;
  return typeof o.maitre === "string" && Array.isArray(o.sorties) && typeof o.n === "number";
}

export function parserCarnet(raw: string): SnapshotCarnet | { erreur: string } {
  let j: unknown;
  try {
    j = JSON.parse(raw);
  } catch {
    return { erreur: "carnet illisible" };
  }
  if (!j || typeof j !== "object") return { erreur: "carnet illisible" };
  const o = j as Record<string, unknown>;

  if (o.kind === KIND_CARNET) {
    if (o.v !== 1 || o.alg !== ALG_CARNET) {
      return { erreur: "version de carnet inconnue" };
    }
    if (o.sig !== SIG_CARNET) {
      return { erreur: "ce carnet n'est pas Lamport-SHA256" };
    }
    if (!coffreValide(o.feuillet)) return { erreur: "feuillet incomplet" };
    const feuillet = normaliser(o.feuillet);
    const adresse = adresseDe(feuillet.maitre, feuillet.n);
    if (typeof o.adresse !== "string" || o.adresse !== adresse) {
      return { erreur: "adresse Lamport rompue — graine et indice ne correspondent pas" };
    }
    const attendu = empreinteCarnet(feuillet);
    if (typeof o.empreinte !== "string" || o.empreinte !== attendu) {
      return { erreur: "empreinte rompue — carnet altéré" };
    }
    return {
      v: 1,
      kind: KIND_CARNET,
      alg: ALG_CARNET,
      sig: SIG_CARNET,
      feuillet,
      adresse,
      empreinte: attendu,
    };
  }

  return { erreur: "ce n'est pas un carnet Eidos" };
}

export function ouvrirFichier(nom: string, data: ArrayBuffer | Uint8Array | string): Ouverture {
  const octets =
    typeof data === "string"
      ? new TextEncoder().encode(data)
      : data instanceof Uint8Array
        ? data
        : new Uint8Array(data);

  if (estPsnxEtranger(nom, octets)) {
    return {
      erreur:
        "Fichier Eidolon (courbe) : l'empreinte se lit, pas les clés Lamport. Exportez un eidos.carnet d'ici.",
    };
  }

  const texte = typeof data === "string" ? data : new TextDecoder().decode(octets);
  const carnet = parserCarnet(texte);
  if (!("erreur" in carnet)) {
    return {
      coffre: carnet.feuillet,
      source: "carnet",
      empreinte: carnet.empreinte,
      adresse: carnet.adresse,
    };
  }

  const psnx = parserPsnx(texte);
  if (!("erreur" in psnx)) {
    return {
      coffre: psnx.coffre,
      source: "psnx",
      empreinte: psnx.empreinte,
      adresse: adresseDe(psnx.coffre.maitre, psnx.coffre.n),
    };
  }

  if (nom.toLowerCase().endsWith(EXT_CARNET)) return { erreur: carnet.erreur };
  return { erreur: psnx.erreur };
}

/**
 * Snapshot post-quantique du coffre Eidos — fichier `.psnx`.
 *
 * Ce n'est PAS le .psnx d'Eidolon (vault holographique, deux fragments).
 * Ici : un seul fichier, hachage SHA-256d, aucune courbe. Il porte
 * la graine, les pièces, et les reliques. Qui a le fichier a le coffre.
 *
 * Un vrai .psnx Eidolon (binaire) ne rouvre pas les clés Lamport :
 * on en lit seulement le spinor public.
 */

import type { Coffre, NomAge } from "./types.ts";
import { fromHex, hexOf, sha256d, utf8 } from "./hash.ts";
import { estNomAge } from "./relique.ts";
import { normaliserObjets } from "./inventaire.ts";

export const KIND_EIDOS = "eidos-coffre";
export const KIND_PSNX = "eidos-psnx/1";
export const TAG_PSNX = "eidos-psnx/1";
export const EXT_PSNX = ".psnx";

export type CoffrePortable = {
  v: 1;
  kind: typeof KIND_EIDOS;
  coffre: Coffre;
};

export type SnapshotPsnx = {
  v: 1;
  kind: typeof KIND_PSNX;
  alg: "sha256d";
  coffre: Coffre;
  empreinte: string;
};

function normaliserCoffre(c: Coffre): Coffre {
  return {
    ...c,
    clesUsees: Array.isArray(c.clesUsees) ? c.clesUsees : [],
    reliques: Array.isArray(c.reliques)
      ? c.reliques.filter(estNomAge)
      : [],
    objets: normaliserObjets((c as Coffre).objets),
    philosophale: c.philosophale ?? null,
  };
}

function corpsPsnx(coffre: Coffre) {
  return {
    v: 1 as const,
    kind: KIND_PSNX,
    alg: "sha256d" as const,
    coffre: normaliserCoffre(coffre),
  };
}

export function empreintePsnx(coffre: Coffre): string {
  return hexOf(sha256d(utf8(TAG_PSNX + JSON.stringify(corpsPsnx(coffre)))));
}

export function exporterPsnx(coffre: Coffre): string {
  const corps = corpsPsnx(coffre);
  return JSON.stringify({ ...corps, empreinte: empreintePsnx(coffre) });
}

/** Ancien format téléphone — encore lu. */
export function exporterCoffre(coffre: Coffre): string {
  return exporterPsnx(coffre);
}

export function nomFichierPsnx(coffre: Coffre): string {
  const n = (coffre.reliques ?? []).length;
  return `eidos-coffre-${n}r${EXT_PSNX}`;
}

function coffreValide(c: unknown): c is Coffre {
  if (!c || typeof c !== "object") return false;
  const o = c as Coffre;
  return typeof o.maitre === "string" && Array.isArray(o.sorties);
}

export function parserPsnx(raw: string): SnapshotPsnx | { erreur: string } {
  let j: unknown;
  try {
    j = JSON.parse(raw);
  } catch {
    return { erreur: "fichier illisible" };
  }
  if (!j || typeof j !== "object") return { erreur: "fichier illisible" };
  const o = j as Record<string, unknown>;

  if (o.kind === KIND_PSNX) {
    if (o.v !== 1 || o.alg !== "sha256d") {
      return { erreur: "version psnx inconnue" };
    }
    if (!coffreValide(o.coffre)) return { erreur: "coffre incomplet" };
    const coffre = normaliserCoffre(o.coffre);
    const attendu = empreintePsnx(coffre);
    if (typeof o.empreinte !== "string" || o.empreinte !== attendu) {
      return { erreur: "empreinte rompue — fichier altéré" };
    }
    try {
      if (fromHex(coffre.maitre).length < 16 && coffre.nature === "personnel") {
        return { erreur: "graine trop courte" };
      }
    } catch {
      /* graine atelier texte */
    }
    return { v: 1, kind: KIND_PSNX, alg: "sha256d", coffre, empreinte: attendu };
  }

  if (o.kind === KIND_EIDOS && o.v === 1 && coffreValide(o.coffre)) {
    const coffre = normaliserCoffre(o.coffre);
    return {
      v: 1,
      kind: KIND_PSNX,
      alg: "sha256d",
      coffre,
      empreinte: empreintePsnx(coffre),
    };
  }

  return { erreur: "ce n'est pas un coffre Eidos" };
}

export function parserCoffrePortable(
  raw: string,
): CoffrePortable | { erreur: string } {
  const lu = parserPsnx(raw);
  if ("erreur" in lu) return lu;
  return { v: 1, kind: KIND_EIDOS, coffre: lu.coffre };
}

/** Binaire Eidolon, ou extension .psnx sans JSON Eidos. */
export function estPsnxEtranger(nom: string, octets: Uint8Array): boolean {
  const nomPsnx = nom.toLowerCase().endsWith(EXT_PSNX);
  if (octets.length === 0) return nomPsnx;
  if (octets[0] === 0x7b) return false; // JSON {
  return nomPsnx || (octets.length > 8 && octets[0] !== 0x7b);
}

export function estPsnx(nom: string, octets: Uint8Array): boolean {
  return estPsnxEtranger(nom, octets);
}

export function reliquesDuCoffre(coffre: Coffre): NomAge[] {
  return Array.isArray(coffre.reliques) ? coffre.reliques.filter(estNomAge) : [];
}

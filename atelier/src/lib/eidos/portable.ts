/**
 * Format adapté téléphone : coffre.eidos.json
 * Ce n'est pas un .psnx Eidolon. Un .psnx n'ouvre pas les clés Lamport.
 */

import type { Coffre } from "./types.ts";
import { fromHex } from "./hash.ts";

export const KIND_EIDOS = "eidos-coffre";

export type CoffrePortable = {
  v: 1;
  kind: typeof KIND_EIDOS;
  coffre: Coffre;
};

export function exporterCoffre(coffre: Coffre): string {
  const p: CoffrePortable = { v: 1, kind: KIND_EIDOS, coffre };
  return JSON.stringify(p);
}

export function parserCoffrePortable(
  raw: string,
): CoffrePortable | { erreur: string } {
  let j: unknown;
  try {
    j = JSON.parse(raw);
  } catch {
    return { erreur: "fichier illisible" };
  }
  if (!j || typeof j !== "object") return { erreur: "fichier illisible" };
  const o = j as Record<string, unknown>;
  if (o.kind !== KIND_EIDOS || o.v !== 1) {
    return { erreur: "ce n'est pas un coffre Eidos" };
  }
  const c = o.coffre as Coffre | undefined;
  if (!c || typeof c.maitre !== "string" || !Array.isArray(c.sorties)) {
    return { erreur: "coffre incomplet" };
  }
  try {
    if (fromHex(c.maitre).length < 16 && c.nature === "personnel") {
      return { erreur: "graine trop courte" };
    }
  } catch {
    /* graine atelier texte */
  }
  return { v: 1, kind: KIND_EIDOS, coffre: c };
}

export function estPsnx(nom: string, octets: Uint8Array): boolean {
  if (nom.toLowerCase().endsWith(".psnx")) return true;
  return octets.length > 8 && octets[0] !== 0x7b; // pas un JSON {
}

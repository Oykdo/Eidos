/**
 * Sceaux d'âge — ce qu'une relique du monde vaut, et ce qu'elle ouvre.
 *
 * Un sceau est une relique du monde (reliques.json, QR) récupérée dans ce
 * coffre : une pièce à une adresse du coffre, et une entrée `recuperee` dont
 * `vers` est cette adresse. Trois usages, aucun dans le consensus :
 *   - la mise : la relique porte au moins le prix de son âge (noeud.mise_sceau) ;
 *   - la porte : les étages 64, 128, 192 de la Tour ne s'ouvrent qu'avec un
 *     sceau de l'âge du quartier (Dvâpara, Trétâ, Satya) ;
 *   - le trophée : une preuve d'inclusion de la pièce, jugée contre la racine
 *     UTXO signée (temoin.ts) — à venir avec la carte des reliques (H2).
 *
 * Le coffre d'atelier (graine publique) garde ses portes ouvertes : démonstration.
 * Un coffre personnel n'ouvre qu'avec un sceau trouvé. Rien ne s'achète.
 */

import { AGES_RELIQUE, estNomAge, prixReliqueAtomes } from "./relique.ts";
import type { Coffre, NomAge } from "./types.ts";

/** Quatre quartiers de 64 étages ; Satya en a 63 (192–254). */
export const QUARTIERS: readonly { age: NomAge; de: number; a: number }[] = [
  { age: "Kali", de: 0, a: 63 },
  { age: "Dvapara", de: 64, a: 127 },
  { age: "Treta", de: 128, a: 191 },
  { age: "Satya", de: 192, a: 254 },
];

export const PORTES: readonly number[] = QUARTIERS.slice(1).map((q) => q.de);

export function quartierDe(etage: number): NomAge {
  const q = QUARTIERS.find((x) => etage >= x.de && etage <= x.a);
  return q ? q.age : "Kali";
}

/** L'âge dont il faut le sceau pour franchir cet étage, ou null. */
export function ageDePorte(etage: number): NomAge | null {
  const q = QUARTIERS.find((x) => x.de === etage && x.de > 0);
  return q ? q.age : null;
}

/** Mise attendue en atomes = noeud.mise_sceau. */
export function miseSceau(age: NomAge): number {
  const a = AGES_RELIQUE.find((x) => x.nom === age);
  return a ? prixReliqueAtomes(a) : 0;
}

export type EntreeMonde = {
  id?: string;
  adresse?: string;
  age?: string;
  etat?: string;
  vers?: string;
  montant?: number;
  scellee?: boolean;
  txid?: string;
  bloc?: number;
  indice?: string;
  mise_attendue?: number;
};

export type Sceau = { id: string; age: NomAge; adresse: string; vers: string };

/** Les reliques du monde récupérées vers une adresse de ce coffre. */
export function sceauxDuCoffre(monde: readonly EntreeMonde[] | null | undefined, coffre: Pick<Coffre, "sorties">): Sceau[] {
  if (!monde) return [];
  const miennes = new Set(coffre.sorties.map((s) => s.adresse));
  const out: Sceau[] = [];
  for (const e of monde) {
    if (e.etat !== "recuperee" || typeof e.vers !== "string" || !miennes.has(e.vers)) continue;
    if (typeof e.adresse !== "string" || typeof e.id !== "string") continue;
    const age = typeof e.age === "string" && estNomAge(e.age) ? e.age : "Kali";
    out.push({ id: e.id, age, adresse: e.adresse, vers: e.vers });
  }
  return out;
}

/** Âges scellés : sceaux trouvés, plus les reliques d'âge simulées du coffre d'atelier. */
export function agesScelles(sceaux: readonly Sceau[], coffre: Pick<Coffre, "nature" | "reliques">): NomAge[] {
  const s = new Set<NomAge>(sceaux.map((x) => x.age));
  if (coffre.nature === "atelier") for (const a of coffre.reliques ?? []) s.add(a);
  return AGES_RELIQUE.map((a) => a.nom).filter((a) => s.has(a));
}

export type Porte =
  | { ouverte: true; age: NomAge | null }
  | { ouverte: false; age: NomAge };

/** Peut-on entrer à cet étage ? Le coffre d'atelier passe partout (démonstration). */
export function porteDe(etage: number, ages: readonly NomAge[], coffre: Pick<Coffre, "nature">): Porte {
  const age = ageDePorte(etage);
  if (age === null) return { ouverte: true, age: null };
  if (coffre.nature === "atelier" || ages.includes(age)) return { ouverte: true, age };
  return { ouverte: false, age };
}

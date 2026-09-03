/**
 * État du réseau d'essai — ce que l'arbre lit, pas ce qu'il croit.
 * etat.json est rejoué depuis la chaîne. L'ancre FNV du trésor est le secteur chaud.
 */

import { ancreDe, type Ancre } from "./ancre.ts";
import { lumenArbre, sceneVide, type LumenScene } from "./lumen.ts";

export const ETAT_URL = "https://raw.githubusercontent.com/Oykdo/Eidos/main/etat.json";

export type SortieReseau = { adresse: string; montant: number };

export type EtatReseau = {
  hauteur: number;
  age: string;
  a_courant: number;
  recompense_courante_atomes: number;
  tresor_adresse: string | null;
  sorties: SortieReseau[];
};

export function parserEtat(raw: unknown): EtatReseau {
  const o = (raw ?? {}) as Record<string, unknown>;
  const sortiesRaw = o.sorties;
  const sorties: SortieReseau[] = [];
  if (sortiesRaw && typeof sortiesRaw === "object") {
    for (const v of Object.values(sortiesRaw as Record<string, unknown>)) {
      const s = v as { adresse?: unknown; montant?: unknown };
      if (typeof s.adresse === "string" && typeof s.montant === "number") {
        sorties.push({ adresse: s.adresse, montant: s.montant });
      }
    }
  }
  const tresor =
    typeof o.tresor_adresse === "string" && o.tresor_adresse.length === 40
      ? o.tresor_adresse
      : null;
  return {
    hauteur: typeof o.hauteur === "number" ? o.hauteur : 0,
    age: typeof o.age === "string" ? o.age : "Satya",
    a_courant: typeof o.a_courant === "number" ? o.a_courant : 40,
    recompense_courante_atomes:
      typeof o.recompense_courante_atomes === "number" ? o.recompense_courante_atomes : 0,
    tresor_adresse: tresor,
    sorties,
  };
}

export function chargesDesSorties(sorties: SortieReseau[]): Map<number, number> {
  const m = new Map<number, number>();
  for (const s of sorties) {
    const n = ancreDe(s.adresse).noeud;
    m.set(n, (m.get(n) ?? 0) + s.montant);
  }
  return m;
}

export function ancreTresor(etat: EtatReseau): Ancre | null {
  if (etat.tresor_adresse) return ancreDe(etat.tresor_adresse);
  const cible = etat.recompense_courante_atomes;
  if (cible <= 0) return null;
  const hit = etat.sorties.find((s) => s.montant === cible);
  return hit ? ancreDe(hit.adresse) : null;
}

export function sceneDepuisEtat(etat: EtatReseau): LumenScene {
  const charges = chargesDesSorties(etat.sorties);
  let chargeMax = 0;
  for (const v of charges.values()) if (v > chargeMax) chargeMax = v;
  const ancre = ancreTresor(etat);
  return {
    lumen: lumenArbre(Math.max(0, etat.hauteur)),
    charges,
    chargeMax,
    chaudNoeud: ancre?.noeud ?? null,
    chaudSecteur: ancre?.secteur ?? null,
  };
}

export async function chargerEtat(url = ETAT_URL): Promise<EtatReseau | null> {
  try {
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) return null;
    return parserEtat(await r.json());
  } catch {
    return null;
  }
}

export function sceneOuVide(etat: EtatReseau | null): LumenScene {
  return etat ? sceneDepuisEtat(etat) : sceneVide(0);
}

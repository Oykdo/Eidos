/** Une sortie du coffre s'ancre sur un nœud : hachage déterministe de l'adresse. */

import { arbre, nomSecteur } from "./modele.ts";

function fnv(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}

export type Ancre = {
  noeud: number;
  palier: number;
  secteur: number;
  famille: number;
};

export function ancreDe(cle: string): Ancre {
  const a = arbre();
  const n = a.noeuds[fnv(cle) % a.noeuds.length]!;
  return {
    noeud: n.id,
    palier: n.palier,
    secteur: n.secteur,
    famille: n.famille,
  };
}

/** Libellé court pour le carnet et la fiche. */
export function etiquetteAncre(a: Ancre): string {
  return `D${a.palier} · ${nomSecteur(a.secteur)}`;
}

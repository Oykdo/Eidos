/**
 * Poste du jour — l'infini des blocs, un nombre fini.
 *
 * ∫∫ e^{-(x²+y²)} dx dy = π. Un jour, POSTE_JOUR blocs.
 * Hors invariant : le réseau n'en sait rien. Jauge locale, coffre personnel.
 * L'atelier public reste sans plafond (démonstration).
 *
 * Autre robinet : PALIERS_OBJET.tiragesMilliemes (2500 ‰ / 1500 ‰) —
 * rareté du catalogue, pas du calendrier. Ne pas les fusionner.
 */

import type { Coffre } from "./types.ts";

/** π, tronqué. Pas un palier d'émission. */
export const POSTE_JOUR = 3;

export function jourCivil(ts = Date.now()): number {
  const d = new Date(ts);
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

export function minesDuJour(c: Coffre, ts = Date.now()): number {
  const j = jourCivil(ts);
  let n = 0;
  for (const h of c.historique) {
    if (h.kind !== "mine") continue;
    if (jourCivil(h.at) === j) n += 1;
  }
  return n;
}

export type Poste = {
  jour: number;
  mines: number;
  restant: number;
  plafond: number;
  borne: boolean;
};

export function posteDe(c: Coffre, ts = Date.now()): Poste {
  const borne = c.nature === "personnel";
  const jour = jourCivil(ts);
  const mines = minesDuJour(c, ts);
  const plafond = borne ? POSTE_JOUR : Number.POSITIVE_INFINITY;
  const restant = borne ? Math.max(0, POSTE_JOUR - mines) : Number.POSITIVE_INFINITY;
  return { jour, mines, restant, plafond, borne };
}

export function peutMiner(c: Coffre, ts = Date.now()): boolean {
  return posteDe(c, ts).restant > 0;
}

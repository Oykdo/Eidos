/**
 * Trophée — un sceau exportable, adossé à une preuve.
 *
 * Détenir une relique, c'est détenir une pièce : la sortie de la transaction
 * de récupération, à une adresse du coffre. Le trophée emporte cette sortie,
 * sa preuve d'inclusion contre la racine UTXO, et la tête signée par le
 * validateur. Quiconque le juge recompose la feuille, remonte le chemin,
 * compare la racine à la tête, vérifie la signature XMSS contre
 * federation.json — sans rejouer. Le lien avec l'identifiant de relique est
 * une lecture de l'état publié (reliques.json) : dit, pas garanti.
 *
 * Un trophée prouve une possession à une hauteur donnée. Une pièce dépensée
 * depuis n'a plus de trophée valable à une tête plus récente.
 */

import { feuilleSortie, preuveReseau, serialiser, verifierPreuve, type PreuvePortable, type SortieMin } from "./merkle.ts";
import { hexOf } from "./hash.ts";
import { estNomAge } from "./relique.ts";
import type { EntreeMonde, Sceau } from "./sceaux.ts";
import { parserFederation, verifierTeteReseau, type FederationPublique, type TeteReseau } from "./temoin.ts";
import type { NomAge } from "./types.ts";

export const SPEC_TROPHEE = "eidos-sceau/1";

export type Trophee = {
  v: 1;
  spec: typeof SPEC_TROPHEE;
  id: string;
  age: NomAge;
  relique: string;
  sortie: SortieMin;
  preuve: PreuvePortable;
  tete: TeteReseau;
};

export function fabriquerTrophee(sceau: Sceau, sorties: readonly SortieMin[], tete: TeteReseau): Trophee | { erreur: string } {
  // la pièce récupérée : sortie 0 de la transaction de récupération, encore à l'adresse du coffre
  const liste = sorties.slice();
  const rec = liste.find((s) => s.adresse === sceau.vers);
  if (!rec) return { erreur: "la pièce de la relique n'est plus à cette adresse — dépensée depuis ?" };
  const p = preuveReseau(liste, `${rec.txid}:${rec.rang}`);
  if (!p) return { erreur: "preuve introuvable" };
  if (p.racine !== tete.utxoRoot) return { erreur: "l'état publié et la tête signée ne coïncident pas" };
  return {
    v: 1,
    spec: SPEC_TROPHEE,
    id: sceau.id,
    age: sceau.age,
    relique: sceau.adresse,
    sortie: { txid: rec.txid, rang: rec.rang, adresse: rec.adresse, montant: rec.montant },
    preuve: serialiser(p),
    tete,
  };
}

export function serialiserTrophee(t: Trophee): string {
  return JSON.stringify(t);
}

const HEX32 = /^[0-9a-f]{64}$/;
const HEX20 = /^[0-9a-f]{40}$/;

function teteValide(x: unknown): x is TeteReseau {
  const t = x as Record<string, unknown>;
  if (!t || typeof t !== "object") return false;
  for (const k of ["prev", "merkle", "utxoRoot", "idBloc"]) if (typeof t[k] !== "string" || !HEX32.test(t[k] as string)) return false;
  for (const k of ["hauteur", "ts", "validateur", "indice"]) if (typeof t[k] !== "number") return false;
  if (typeof t.signature !== "string" || !/^[0-9a-f]{4288}$/.test(t.signature)) return false;
  return Array.isArray(t.chemin) && t.chemin.every((c) => typeof c === "string" && HEX32.test(c));
}

export function parserTrophee(raw: string): Trophee | { erreur: string } {
  let o: Record<string, unknown>;
  try {
    o = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return { erreur: "JSON invalide" };
  }
  if (!o || o.v !== 1 || o.spec !== SPEC_TROPHEE) return { erreur: "ce n'est pas un trophée eidos-sceau/1" };
  if (typeof o.id !== "string" || typeof o.age !== "string" || !estNomAge(o.age)) return { erreur: "identifiant ou âge invalide" };
  if (typeof o.relique !== "string" || !HEX20.test(o.relique)) return { erreur: "adresse de relique invalide" };
  const s = o.sortie as Record<string, unknown> | undefined;
  if (!s || typeof s.txid !== "string" || !HEX32.test(s.txid) || typeof s.rang !== "number" ||
      typeof s.adresse !== "string" || !HEX20.test(s.adresse) || typeof s.montant !== "number") {
    return { erreur: "sortie mal formée" };
  }
  const p = o.preuve as Record<string, unknown> | undefined;
  if (!p || p.v !== 1 || typeof p.feuille !== "string" || typeof p.racine !== "string" || !Array.isArray(p.freres)) {
    return { erreur: "preuve mal formée" };
  }
  for (const f of p.freres as { cote?: unknown; hash?: unknown }[]) {
    if ((f?.cote !== "gauche" && f?.cote !== "droite") || typeof f.hash !== "string" || !HEX32.test(f.hash)) {
      return { erreur: "frère mal formé" };
    }
  }
  if (!teteValide(o.tete)) return { erreur: "tête mal formée" };
  return {
    v: 1,
    spec: SPEC_TROPHEE,
    id: o.id,
    age: o.age,
    relique: o.relique,
    sortie: { txid: s.txid as string, rang: s.rang as number, adresse: s.adresse as string, montant: s.montant as number },
    preuve: { v: 1, feuille: p.feuille as string, freres: p.freres as PreuvePortable["freres"], racine: p.racine as string },
    tete: o.tete,
  };
}

export type VerdictTrophee = {
  ok: boolean;
  motif: string;
  /** L'état publié connaît cette relique, récupérée par cette transaction. Lecture. */
  relie: boolean | null;
};

export function jugerTrophee(t: Trophee, fed: FederationPublique, monde?: readonly EntreeMonde[] | null): VerdictTrophee {
  if (hexOf(feuilleSortie(t.sortie)) !== t.preuve.feuille) return { ok: false, motif: "la feuille ne correspond pas à la sortie", relie: null };
  if (!verifierPreuve(t.preuve)) return { ok: false, motif: "chemin rompu", relie: null };
  if (t.preuve.racine !== t.tete.utxoRoot) return { ok: false, motif: "racine étrangère à la tête", relie: null };
  const v = verifierTeteReseau(t.tete, fed);
  if (!v.ok) return { ok: false, motif: `tête refusée (${v.motif})`, relie: null };
  let relie: boolean | null = null;
  if (monde) {
    const e = monde.find((x) => x.id === t.id);
    relie = !!e && e.etat === "recuperee" && e.txid === t.sortie.txid && e.vers === t.sortie.adresse;
  }
  return {
    ok: true,
    motif: `pièce prouvée au bloc ${t.tete.hauteur}, signée par le validateur ${v.validateur}`,
    relie,
  };
}

export { parserFederation };

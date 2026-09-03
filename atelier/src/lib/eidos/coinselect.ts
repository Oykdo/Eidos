

import { ATOMES, MAX_ENTREES, OCTETS_TEMOIN, POUSSIERE_ATOMES } from "./constantes.ts";
import type { Selection, SelectionOk, Sortie } from "./types.ts";

export const MSG_FRAGMENTE =
  "solde suffisant mais fragmenté — regrouper d'abord";

function soldeDe(sorties: Sortie[]): number {
  return sorties.reduce((s, o) => s + o.montant, 0);
}

function couvertureMax(sorties: Sortie[], k = MAX_ENTREES): number {
  return [...sorties]
    .sort((a, b) => b.montant - a.montant)
    .slice(0, k)
    .reduce((s, o) => s + o.montant, 0);
}

function plusPetiteRef(combo: Sortie[]): string {
  return combo
    .map((o) => o.ref)
    .sort()
    .join(",");
}

/**
 * Sélection des sorties — les deux trous de ARBRES.md, côté portefeuille.
 *
 * 1. Glouton borné : parmi les combinaisons d'au plus trois sorties, prendre
 *    les plus petites qui atteignent `m` (préférer celles qui atteignent
 *    aussi `m + poussière`, pour ne pas fabriquer un rendu poussiéreux).
 * 2. Poussière : si le rendu est strictement inférieur à 10 000 atomes, on
 *    n'ouvre pas de sortie de rendu ; l'écart devient frais.
 *
 * Le validateur n'est pas modifié : un atome de rendu reste légal. C'est le
 * portefeuille qui refuse d'en créer un.
 */
export function selectionner(
  sorties: Sortie[],
  montant: number,
  opts?: { poussiere?: number; max?: number },
): Selection {
  const dust = opts?.poussiere ?? POUSSIERE_ATOMES;
  const max = opts?.max ?? MAX_ENTREES;
  const solde = soldeDe(sorties);
  const maxK = couvertureMax(sorties, max);

  if (!Number.isFinite(montant) || montant <= 0 || !Number.isInteger(montant)) {
    return {
      ok: false,
      code: "montant",
      message: "Montant invalide.",
      solde,
      couvertureMax: maxK,
    };
  }
  if (sorties.length === 0) {
    return {
      ok: false,
      code: "vide",
      message: "Aucune sortie dépensable.",
      solde,
      couvertureMax: 0,
    };
  }
  if (solde < montant) {
    return {
      ok: false,
      code: "insuffisant",
      message: "Solde insuffisant.",
      solde,
      couvertureMax: maxK,
    };
  }

  let meilleur: SelectionOk | null = null;
  let meilleurCle: [number, number, number, string] | null = null;

  const considerer = (combo: Sortie[]) => {
    let total = 0;
    for (const o of combo) total += o.montant;
    if (total < montant) return;

    const brut = total - montant;
    const poussiere = brut > 0 && brut < dust;
    const rendu = poussiere ? 0 : brut;
    const frais = poussiere ? brut : 0;
    const cle: [number, number, number, string] = [
      poussiere ? 1 : 0,
      total,
      combo.length,
      plusPetiteRef(combo),
    ];
    if (
      !meilleurCle ||
      cle[0] < meilleurCle[0] ||
      (cle[0] === meilleurCle[0] && cle[1] < meilleurCle[1]) ||
      (cle[0] === meilleurCle[0] &&
        cle[1] === meilleurCle[1] &&
        cle[2] < meilleurCle[2]) ||
      (cle[0] === meilleurCle[0] &&
        cle[1] === meilleurCle[1] &&
        cle[2] === meilleurCle[2] &&
        cle[3] < meilleurCle[3])
    ) {
      meilleurCle = cle;
      const entrees = [...combo].sort(
        (a, b) => a.montant - b.montant || a.ref.localeCompare(b.ref),
      );
      meilleur = {
        ok: true,
        entrees,
        totalEntrees: total,
        montant,
        rendu,
        frais,
        poussiere,
        octetsTemoins: entrees.length * OCTETS_TEMOIN,
      };
    }
  };

  const n = sorties.length;
  const plafond = Math.min(max, n);

  for (let i = 0; i < n; i++) {
    considerer([sorties[i]!]);
  }
  if (plafond >= 2) {
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        considerer([sorties[i]!, sorties[j]!]);
      }
    }
  }
  if (plafond >= 3) {
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        for (let k = j + 1; k < n; k++) {
          considerer([sorties[i]!, sorties[j]!, sorties[k]!]);
        }
      }
    }
  }

  if (meilleur) return meilleur;

  return {
    ok: false,
    code: "fragmente",
    message: MSG_FRAGMENTE,
    solde,
    couvertureMax: maxK,
  };
}

/** Les plus petites sorties, au plus `max`, pour un regroupement. */
export function choisirRegroupement(
  sorties: Sortie[],
  max = MAX_ENTREES,
): Sortie[] {
  if (sorties.length < 2) return [];
  return [...sorties]
    .sort((a, b) => a.montant - b.montant || a.ref.localeCompare(b.ref))
    .slice(0, Math.min(max, sorties.length));
}

export function formaterAtomes(atomes: number, digits = 6): string {
  const signe = atomes < 0 ? "-" : "";
  const n = Math.abs(atomes);
  const eidl = Math.floor(n / ATOMES);
  const frac = n % ATOMES;
  return `${signe}${eidl}.${String(frac).padStart(8, "0").slice(0, digits)}`;
}

export function parserMontant(saisie: string): number | null {
  const t = saisie.trim().replace(",", ".");
  if (!t) return null;
  if (!/^\d+(\.\d{1,8})?$/.test(t)) return null;
  const [e, f = ""] = t.split(".");
  const frac = (f + "00000000").slice(0, 8);
  const atomes = Number(e) * ATOMES + Number(frac);
  if (!Number.isSafeInteger(atomes)) return null;
  return atomes;
}

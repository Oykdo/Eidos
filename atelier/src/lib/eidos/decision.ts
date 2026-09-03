/** Arbre de décision du glouton — forme d'un organigramme, pas une quadratique. */

import { MAX_ENTREES, POUSSIERE_ATOMES } from "./constantes.ts";
import { MSG_FRAGMENTE, selectionner } from "./coinselect.ts";
import type { Selection, Sortie } from "./types.ts";

export type IdQuestion = "montant" | "solde" | "couverture" | "poussiere";

export type Question = {
  id: IdQuestion;
  question: string;
  reponse: "oui" | "non" | null;
};

export type IdFeuille =
  | "invalide"
  | "vide"
  | "insuffisant"
  | "fragmente"
  | "poussiere"
  | "rendu"
  | "exact";

export type Feuille = {
  id: IdFeuille;
  titre: string;
  formule: string;
  aide: string;
};

export type Chemin = {
  questions: Question[];
  feuille: Feuille;
  selection: Selection;
};

const Q: Record<IdQuestion, string> = {
  montant: "montant > 0 ?",
  solde: "solde ≥ m ?",
  couverture: `les ${MAX_ENTREES} plus grosses ≥ m ?`,
  poussiere: `0 < rendu < ${POUSSIERE_ATOMES.toLocaleString("fr-FR")} atomes ?`,
};

function q(
  id: IdQuestion,
  reponse: Question["reponse"],
): Question {
  return { id, question: Q[id], reponse };
}

export function cheminDecision(
  sorties: Sortie[],
  montant: number | null,
): Chemin {
  const m =
    montant == null || !Number.isFinite(montant) || montant <= 0 ? 0 : montant;
  const selection = selectionner(sorties, m);

  if (!selection.ok && selection.code === "montant") {
    return {
      questions: [q("montant", "non")],
      feuille: {
        id: "invalide",
        titre: "Montant invalide",
        formule: "m ∉ ℕ*",
        aide: "Un entier d'atomes strictement positif.",
      },
      selection,
    };
  }
  if (!selection.ok && selection.code === "vide") {
    return {
      questions: [q("montant", "oui"), q("solde", "non")],
      feuille: {
        id: "vide",
        titre: "Coffre vide",
        formule: "n = 0",
        aide: "Aucune sortie dépensable.",
      },
      selection,
    };
  }
  if (!selection.ok && selection.code === "insuffisant") {
    return {
      questions: [q("montant", "oui"), q("solde", "non")],
      feuille: {
        id: "insuffisant",
        titre: "Solde insuffisant",
        formule: "Σ sorties < m",
        aide: selection.message,
      },
      selection,
    };
  }
  if (!selection.ok && selection.code === "fragmente") {
    return {
      questions: [
        q("montant", "oui"),
        q("solde", "oui"),
        q("couverture", "non"),
      ],
      feuille: {
        id: "fragmente",
        titre: "Fragmenté",
        formule: `max ${MAX_ENTREES} < m ≤ Σ`,
        aide: MSG_FRAGMENTE,
      },
      selection,
    };
  }
  if (selection.ok && selection.poussiere) {
    return {
      questions: [
        q("montant", "oui"),
        q("solde", "oui"),
        q("couverture", "oui"),
        q("poussiere", "oui"),
      ],
      feuille: {
        id: "poussiere",
        titre: "Poussière absorbée",
        formule: "rendu ← 0, écart → frais",
        aide: "Pas de sortie de rendu : l'écart devient frais.",
      },
      selection,
    };
  }
  if (selection.ok && selection.rendu === 0) {
    return {
      questions: [
        q("montant", "oui"),
        q("solde", "oui"),
        q("couverture", "oui"),
        q("poussiere", "non"),
      ],
      feuille: {
        id: "exact",
        titre: "Sans rendu",
        formule: "Σ entrées = m",
        aide: "Les entrées paient juste. Pas de poussière.",
      },
      selection,
    };
  }
  return {
    questions: [
      q("montant", "oui"),
      q("solde", "oui"),
      q("couverture", "oui"),
      q("poussiere", "non"),
    ],
    feuille: {
      id: "rendu",
      titre: "Rendu créé",
      formule: "rendu = Σ − m ≥ poussière",
      aide: "Le rendu est assez gros pour ouvrir une sortie.",
    },
    selection,
  };
}

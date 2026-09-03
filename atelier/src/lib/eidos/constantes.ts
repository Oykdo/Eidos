/** 1 eidôlon = 10⁸ atomes. */
export const ATOMES = 100_000_000;

/**
 * Seuil de poussière, en atomes.
 * Paramètre de portefeuille — le validateur accepte un atome de rendu.
 * En-dessous, le rendu coûte 24 Ko de témoin Lamport pour un
 * cent-millionième d'unité : on n'ouvre pas de sortie, l'écart devient frais.
 */
export const POUSSIERE_ATOMES = 10_000;

/**
 * Une signature Lamport par entrée (16 384 o de clé + 8 192 o de signature).
 * Au-delà de trois, la transaction devient un objet social : trop grosse
 * pour une issue GitHub, lourde à propager.
 */
export const MAX_ENTREES = 3;

export const OCTETS_PK = 16_384;
export const OCTETS_SIG = 8_192;
export const OCTETS_TEMOIN = 1 + OCTETS_PK + OCTETS_SIG; // 24 577

export const FIGURES = ["\u00b7", "\u25cb", "\u263d", "\u271a"] as const;
export const FIGURE_NOMS = ["vide", "cercle", "croissant", "croix"] as const;

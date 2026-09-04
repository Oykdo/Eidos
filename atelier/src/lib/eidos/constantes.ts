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

export const OCTETS_GRAINE_PUB = 32;
export const OCTETS_SIG = 2_144; // WOTS+ w=16, 67 chaînes de 32 octets
export const OCTETS_TEMOIN = 1 + OCTETS_GRAINE_PUB + OCTETS_SIG; // 2 177

/** Prototype de mine : 14 bits, comme le nœud Python. Le bloc 0 est à 18. */
export const BITS_MINE = 14;

export const FIGURES = ["\u00b7", "\u25cb", "\u263d", "\u271a"] as const;
export const FIGURE_NOMS = ["vide", "cercle", "croissant", "croix"] as const;

/**
 * Loi des glyphes — gelée.
 * Pas de Reed-Solomon, pas de Huffman, pas de 32ᵉ symbole.
 * Une figure = 2 bits. Trois étages = 6 bits. 31 groupes par adresse.
 * Changer un de ces nombres casse robinet.py, la CI, et chaque adresse déjà lue.
 */
export const LOI_GLYPHES = {
  bitsParFigure: 2,
  etages: 3,
  payload: 27,
  controle: 4,
  adresse: 31,
  bourrageBits: 2,
  octetsAdresse: 20,
  octetsControle: 3,
} as const;

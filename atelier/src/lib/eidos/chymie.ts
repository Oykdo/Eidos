/**
 * Caractères chymiques — lecture de l'empreinte de carnet.eidos.
 *
 * Plaque « Explication des plus communs Caractères Chymiques » (Fig. 6).
 * Soixante-quatre signes, six bits chacun, comme un glyphe d'adresse.
 * Ce n'est pas une preuve : un signe changé dit que le fichier a changé.
 * Les quatre figures d'adresse restent gelées (LOI_GLYPHES).
 */

import { fromHex } from "./hash.ts";

export type Caractere = {
  id: string;
  fr: string;
  en: string;
  /** Trait SVG, viewBox 16×16. */
  trait: string;
};

/** 64 signes, ordre de la plaque. Gelé. */
export const CARACTERES: readonly Caractere[] = [
  { id: "fer", fr: "Fer, ou Mars", en: "Iron, or Mars", trait: "mars" },
  { id: "aimant", fr: "Aimant", en: "Lodestone", trait: "aimant" },
  { id: "air", fr: "Air", en: "Air", trait: "air" },
  { id: "alambic", fr: "Alambic", en: "Alembic", trait: "alambic" },
  { id: "alun", fr: "Alun", en: "Alum", trait: "alun" },
  { id: "amalgame", fr: "Amalgame", en: "Amalgam", trait: "amalgame" },
  { id: "antimoine", fr: "Antimoine", en: "Antimony", trait: "antimoine" },
  { id: "aquarius", fr: "Aquarius", en: "Aquarius", trait: "aquarius" },
  { id: "lune", fr: "Argent, ou Lune", en: "Silver, or Moon", trait: "lune" },
  { id: "mercure", fr: "Argent vif, ou Mercure", en: "Quicksilver", trait: "mercure" },
  { id: "aries", fr: "Aries", en: "Aries", trait: "aries" },
  { id: "arsenic", fr: "Arsenic", en: "Arsenic", trait: "arsenic" },
  { id: "bainmarie", fr: "Bain-marie", en: "Bain-marie", trait: "bain" },
  { id: "balance", fr: "Balance", en: "Libra", trait: "balance" },
  { id: "borax", fr: "Borax", en: "Borax", trait: "borax" },
  { id: "calciner", fr: "Calciner", en: "Calcine", trait: "calciner" },
  { id: "cancer", fr: "Cancer", en: "Cancer", trait: "cancer" },
  { id: "capricorne", fr: "Capricorne", en: "Capricorn", trait: "capricorne" },
  { id: "cendres", fr: "Cendres", en: "Ashes", trait: "cendres" },
  { id: "chaux", fr: "Chaux", en: "Lime", trait: "chaux" },
  { id: "cinnabre", fr: "Cinnabre", en: "Cinnabar", trait: "cinnabre" },
  { id: "coaguler", fr: "Coaguler", en: "Coagulate", trait: "coaguler" },
  { id: "creuset", fr: "Creuset", en: "Crucible", trait: "creuset" },
  { id: "cristal", fr: "Cristal", en: "Crystal", trait: "cristal" },
  { id: "venus", fr: "Cuivre, ou Vénus", en: "Copper, or Venus", trait: "venus" },
  { id: "distiller", fr: "Distiller", en: "Distill", trait: "distiller" },
  { id: "eau", fr: "Eau", en: "Water", trait: "eau" },
  { id: "eauforte", fr: "Eau-forte", en: "Aqua fortis", trait: "eauforte" },
  { id: "eauregale", fr: "Eau régale", en: "Aqua regia", trait: "eauregale" },
  { id: "eaudevie", fr: "Eau-de-vie", en: "Aqua vitae", trait: "eaudevie" },
  { id: "esprit", fr: "Esprit de vin", en: "Spirit of wine", trait: "esprit" },
  { id: "jupiter", fr: "Étain, ou Jupiter", en: "Tin, or Jupiter", trait: "jupiter" },
  { id: "feu", fr: "Feu", en: "Fire", trait: "feu" },
  { id: "filtrer", fr: "Filtrer", en: "Filter", trait: "filtrer" },
  { id: "huile", fr: "Huile", en: "Oil", trait: "huile" },
  { id: "gemeaux", fr: "Gémeaux", en: "Gemini", trait: "gemeaux" },
  { id: "lion", fr: "Lion", en: "Leo", trait: "lion" },
  { id: "or", fr: "Or", en: "Gold", trait: "soleil" },
  { id: "plomb", fr: "Plomb", en: "Lead", trait: "plomb" },
  { id: "poissons", fr: "Poissons", en: "Pisces", trait: "poissons" },
  { id: "poudre", fr: "Poudre", en: "Powder", trait: "poudre" },
  { id: "precipiter", fr: "Précipiter", en: "Precipitate", trait: "precipiter" },
  { id: "purifier", fr: "Purifier", en: "Purify", trait: "purifier" },
  { id: "quintessence", fr: "Quinte essence", en: "Quintessence", trait: "quintessence" },
  { id: "realgar", fr: "Réalgar", en: "Realgar", trait: "realgar" },
  { id: "cornue", fr: "Retorte, ou Cornue", en: "Retort", trait: "cornue" },
  { id: "sagittaire", fr: "Sagittaire", en: "Sagittarius", trait: "sagittaire" },
  { id: "scorpion", fr: "Scorpion", en: "Scorpio", trait: "scorpion" },
  { id: "selalkali", fr: "Sel alkali", en: "Alkali salt", trait: "selalkali" },
  { id: "selammoniac", fr: "Sel ammoniac", en: "Sal ammoniac", trait: "selammoniac" },
  { id: "sel", fr: "Sel commun", en: "Common salt", trait: "sel" },
  { id: "soufre", fr: "Soufre", en: "Sulfur", trait: "soufre" },
  { id: "sublimer", fr: "Sublimer", en: "Sublime", trait: "sublimer" },
  { id: "talc", fr: "Talc", en: "Talc", trait: "talc" },
  { id: "terre", fr: "Terre", en: "Earth", trait: "terre" },
  { id: "taureau", fr: "Taureau", en: "Taurus", trait: "taureau" },
  { id: "verre", fr: "Verre", en: "Glass", trait: "verre" },
  { id: "vin", fr: "Vin", en: "Wine", trait: "vin" },
  { id: "vinaigre", fr: "Vinaigre", en: "Vinegar", trait: "vinaigre" },
  { id: "vitriol", fr: "Vitriol", en: "Vitriol", trait: "vitriol" },
  { id: "vitriolblanc", fr: "Vitriol blanc", en: "White vitriol", trait: "vitriolblanc" },
  { id: "vitriolbleu", fr: "Vitriol bleu", en: "Blue vitriol", trait: "vitriolbleu" },
  { id: "soufresages", fr: "Soufre des sages", en: "Sophic sulfur", trait: "soufresages" },
  { id: "selgemme", fr: "Sel gemme", en: "Rock salt", trait: "selgemme" },
] as const;

export const BITS_CHYMIE = 6;
export const N_CHYMIE = 64;

function bitsDe(octets: Uint8Array): string {
  let bits = "";
  for (const b of octets) bits += b.toString(2).padStart(8, "0");
  const pad = (BITS_CHYMIE - (bits.length % BITS_CHYMIE)) % BITS_CHYMIE;
  return bits + "0".repeat(pad);
}

/** Empreinte (32 octets) → 43 indices 0..63. */
export function encoderChymie(octets: Uint8Array): number[] {
  const bits = bitsDe(octets);
  const out: number[] = [];
  for (let i = 0; i < bits.length; i += BITS_CHYMIE) {
    out.push(parseInt(bits.slice(i, i + BITS_CHYMIE), 2));
  }
  return out;
}

export function decoderChymie(codes: number[], n: number): Uint8Array {
  let bits = "";
  for (const c of codes) bits += (c & 63).toString(2).padStart(BITS_CHYMIE, "0");
  bits = bits.slice(0, n * 8);
  const o = new Uint8Array(n);
  for (let i = 0; i < n; i++) o[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
  return o;
}

export function caracteresDe(empreinteHex: string): Caractere[] {
  const codes = encoderChymie(fromHex(empreinteHex));
  return codes.map((k) => CARACTERES[k]!);
}

export function caractereDe(code: number): Caractere {
  return CARACTERES[code & 63]!;
}

/**
 * Caractères chymiques — lecture de l'empreinte de carnet.eidos.
 *
 * Plaque « Explication des plus communs Caractères Chymiques » (Fig. 6).
 * Soixante-quatre signes, six bits chacun, comme un glyphe d'adresse.
 * Les signes Unicode (U+1F700… et planètes BMP) complètent la plaque.
 * Ce n'est pas une preuve : un signe changé dit que le fichier a changé.
 * Les quatre figures d'adresse restent gelées (LOI_GLYPHES).
 */

import { fromHex } from "./hash.ts";

const u = (n: number) => String.fromCodePoint(n);

export type Caractere = {
  id: string;
  fr: string;
  en: string;
  /** Trait SVG, viewBox 16×16 — repli si le glyphe Unicode manque. */
  trait: string;
  /** Glyphe Unicode (BMP ou U+1F700…). */
  uni: string;
};

/** 64 signes, ordre de la plaque. Gelé — c'est l'alphabet du carnet. */
export const CARACTERES: readonly Caractere[] = [
  { id: "fer", fr: "Fer, ou Mars", en: "Iron, or Mars", trait: "mars", uni: u(0x2642) },
  { id: "aimant", fr: "Aimant", en: "Lodestone", trait: "aimant", uni: u(0x1f753) },
  { id: "air", fr: "Air", en: "Air", trait: "air", uni: u(0x1f701) },
  { id: "alambic", fr: "Alambic", en: "Alembic", trait: "alambic", uni: u(0x2697) },
  { id: "alun", fr: "Alun", en: "Alum", trait: "alun", uni: u(0x1f745) },
  { id: "amalgame", fr: "Amalgame", en: "Amalgam", trait: "amalgame", uni: u(0x1f75b) },
  { id: "antimoine", fr: "Antimoine", en: "Antimony", trait: "antimoine", uni: u(0x2641) },
  { id: "aquarius", fr: "Aquarius", en: "Aquarius", trait: "aquarius", uni: u(0x2652) },
  { id: "lune", fr: "Argent, ou Lune", en: "Silver, or Moon", trait: "lune", uni: u(0x263d) },
  { id: "mercure", fr: "Argent vif, ou Mercure", en: "Quicksilver", trait: "mercure", uni: u(0x263f) },
  { id: "aries", fr: "Aries", en: "Aries", trait: "aries", uni: u(0x2648) },
  { id: "arsenic", fr: "Arsenic", en: "Arsenic", trait: "arsenic", uni: u(0x1f73a) },
  { id: "bainmarie", fr: "Bain-marie", en: "Bain-marie", trait: "bain", uni: u(0x1f76b) },
  { id: "balance", fr: "Balance", en: "Libra", trait: "balance", uni: u(0x264e) },
  { id: "borax", fr: "Borax", en: "Borax", trait: "borax", uni: u(0x1f742) },
  { id: "calciner", fr: "Calciner", en: "Calcine", trait: "calciner", uni: u(0x1f74c) },
  { id: "cancer", fr: "Cancer", en: "Cancer", trait: "cancer", uni: u(0x264b) },
  { id: "capricorne", fr: "Capricorne", en: "Capricorn", trait: "capricorne", uni: u(0x2651) },
  { id: "cendres", fr: "Cendres", en: "Ashes", trait: "cendres", uni: u(0x1f757) },
  { id: "chaux", fr: "Chaux", en: "Lime", trait: "chaux", uni: u(0x1f741) },
  { id: "cinnabre", fr: "Cinnabre", en: "Cinnabar", trait: "cinnabre", uni: u(0x1f713) },
  { id: "coaguler", fr: "Coaguler", en: "Coagulate", trait: "coaguler", uni: u(0x1f75c) },
  { id: "creuset", fr: "Creuset", en: "Crucible", trait: "creuset", uni: u(0x1f765) },
  { id: "cristal", fr: "Cristal", en: "Crystal", trait: "cristal", uni: u(0x25c7) },
  { id: "venus", fr: "Cuivre, ou Vénus", en: "Copper, or Venus", trait: "venus", uni: u(0x2640) },
  { id: "distiller", fr: "Distiller", en: "Distill", trait: "distiller", uni: u(0x1f760) },
  { id: "eau", fr: "Eau", en: "Water", trait: "eau", uni: u(0x1f704) },
  { id: "eauforte", fr: "Eau-forte", en: "Aqua fortis", trait: "eauforte", uni: u(0x1f705) },
  { id: "eauregale", fr: "Eau régale", en: "Aqua regia", trait: "eauregale", uni: u(0x1f706) },
  { id: "eaudevie", fr: "Eau-de-vie", en: "Aqua vitae", trait: "eaudevie", uni: u(0x1f708) },
  { id: "esprit", fr: "Esprit de vin", en: "Spirit of wine", trait: "esprit", uni: u(0x1f747) },
  { id: "jupiter", fr: "Étain, ou Jupiter", en: "Tin, or Jupiter", trait: "jupiter", uni: u(0x2643) },
  { id: "feu", fr: "Feu", en: "Fire", trait: "feu", uni: u(0x1f702) },
  { id: "filtrer", fr: "Filtrer", en: "Filter", trait: "filtrer", uni: u(0x1f761) },
  { id: "huile", fr: "Huile", en: "Oil", trait: "huile", uni: u(0x1f746) },
  { id: "gemeaux", fr: "Gémeaux", en: "Gemini", trait: "gemeaux", uni: u(0x264a) },
  { id: "lion", fr: "Lion", en: "Leo", trait: "lion", uni: u(0x264c) },
  { id: "or", fr: "Or", en: "Gold", trait: "soleil", uni: u(0x2609) },
  { id: "plomb", fr: "Plomb", en: "Lead", trait: "plomb", uni: u(0x2644) },
  { id: "poissons", fr: "Poissons", en: "Pisces", trait: "poissons", uni: u(0x2653) },
  { id: "poudre", fr: "Poudre", en: "Powder", trait: "poudre", uni: u(0x1f74b) },
  { id: "precipiter", fr: "Précipiter", en: "Precipitate", trait: "precipiter", uni: u(0x1f75f) },
  { id: "purifier", fr: "Purifier", en: "Purify", trait: "purifier", uni: u(0x1f763) },
  { id: "quintessence", fr: "Quinte essence", en: "Quintessence", trait: "quintessence", uni: u(0x1f700) },
  { id: "realgar", fr: "Réalgar", en: "Realgar", trait: "realgar", uni: u(0x1f73b) },
  { id: "cornue", fr: "Retorte, ou Cornue", en: "Retort", trait: "cornue", uni: u(0x1f76d) },
  { id: "sagittaire", fr: "Sagittaire", en: "Sagittarius", trait: "sagittaire", uni: u(0x2650) },
  { id: "scorpion", fr: "Scorpion", en: "Scorpio", trait: "scorpion", uni: u(0x264f) },
  { id: "selalkali", fr: "Sel alkali", en: "Alkali salt", trait: "selalkali", uni: u(0x1f736) },
  { id: "selammoniac", fr: "Sel ammoniac", en: "Sal ammoniac", trait: "selammoniac", uni: u(0x1f739) },
  { id: "sel", fr: "Sel commun", en: "Common salt", trait: "sel", uni: u(0x1f714) },
  { id: "soufre", fr: "Soufre", en: "Sulfur", trait: "soufre", uni: u(0x1f70d) },
  { id: "sublimer", fr: "Sublimer", en: "Sublime", trait: "sublimer", uni: u(0x1f75e) },
  { id: "talc", fr: "Talc", en: "Talc", trait: "talc", uni: u(0x2715) },
  { id: "terre", fr: "Terre", en: "Earth", trait: "terre", uni: u(0x1f703) },
  { id: "taureau", fr: "Taureau", en: "Taurus", trait: "taureau", uni: u(0x2649) },
  { id: "verre", fr: "Verre", en: "Glass", trait: "verre", uni: u(0x25cb) },
  { id: "vin", fr: "Vin", en: "Wine", trait: "vin", uni: u(0x1f70a) },
  { id: "vinaigre", fr: "Vinaigre", en: "Vinegar", trait: "vinaigre", uni: u(0x1f70b) },
  { id: "vitriol", fr: "Vitriol", en: "Vitriol", trait: "vitriol", uni: u(0x1f716) },
  { id: "vitriolblanc", fr: "Vitriol blanc", en: "White vitriol", trait: "vitriolblanc", uni: u(0x1f717) },
  { id: "vitriolbleu", fr: "Vitriol bleu", en: "Blue vitriol", trait: "vitriolbleu", uni: u(0x2295) },
  { id: "soufresages", fr: "Soufre des sages", en: "Sophic sulfur", trait: "soufresages", uni: u(0x1f70e) },
  { id: "selgemme", fr: "Sel gemme", en: "Rock salt", trait: "selgemme", uni: u(0x1f718) },
] as const;

export type SigneUnicode = { id: string; fr: string; en: string; uni: string };

/** Signes Unicode absents des 64 — lecture, hors alphabet du carnet. */
export const CHYMIE_UNICODE: readonly SigneUnicode[] = [
  { id: "soufrenoir", fr: "Soufre noir", en: "Black sulfur", uni: u(0x1f70f) },
  { id: "sublmercure", fr: "Mercure sublimé", en: "Mercury sublimate", uni: u(0x1f710) },
  { id: "nitre", fr: "Nitre, ou Salpêtre", en: "Nitre", uni: u(0x1f715) },
  { id: "orunicode", fr: "Or (alch.)", en: "Gold (alch.)", uni: u(0x1f71a) },
  { id: "argentunicode", fr: "Argent (alch.)", en: "Silver (alch.)", uni: u(0x1f71b) },
  { id: "mineraifer", fr: "Minerai de fer", en: "Iron ore", uni: u(0x1f71c) },
  { id: "safranmars", fr: "Safran de Mars", en: "Crocus of iron", uni: u(0x1f71e) },
  { id: "regulefer", fr: "Régule de fer", en: "Regulus of iron", uni: u(0x1f71f) },
  { id: "mineraicuivre", fr: "Minerai de cuivre", en: "Copper ore", uni: u(0x1f720) },
  { id: "safranvenus", fr: "Safran de Vénus", en: "Crocus of copper", uni: u(0x1f723) },
  { id: "aesustum", fr: "Cuivre brûlé", en: "Aes ustum", uni: u(0x1f724) },
  { id: "vertdegris", fr: "Vert-de-gris", en: "Verdigris", uni: u(0x1f728) },
  { id: "mineraietain", fr: "Minerai d'étain", en: "Tin ore", uni: u(0x1f729) },
  { id: "minerailead", fr: "Minerai de plomb", en: "Lead ore", uni: u(0x1f72a) },
  { id: "mineraiantimoine", fr: "Minerai d'antimoine", en: "Antimony ore", uni: u(0x1f72b) },
  { id: "regule", fr: "Régule", en: "Regulus", uni: u(0x1f732) },
  { id: "marcasite", fr: "Marcassite", en: "Marcasite", uni: u(0x1f738) },
  { id: "orpiment", fr: "Orpiment", en: "Orpiment", uni: u(0x1f73d) },
  { id: "bismuth", fr: "Bismuth", en: "Bismuth ore", uni: u(0x1f73e) },
  { id: "tartre", fr: "Tartre", en: "Tartar", uni: u(0x1f73f) },
  { id: "teinture", fr: "Teinture", en: "Tincture", uni: u(0x1f748) },
  { id: "gomme", fr: "Gomme", en: "Gum", uni: u(0x1f749) },
  { id: "cire", fr: "Cire", en: "Wax", uni: u(0x1f74a) },
  { id: "tutie", fr: "Tutie", en: "Tutty", uni: u(0x1f74d) },
  { id: "testemorte", fr: "Tête morte", en: "Caput mortuum", uni: u(0x1f74e) },
  { id: "caducee", fr: "Caducée", en: "Caduceus", uni: u(0x1f750) },
  { id: "savon", fr: "Savon", en: "Soap", uni: u(0x1f754) },
  { id: "urine", fr: "Urine", en: "Urine", uni: u(0x1f755) },
  { id: "brique", fr: "Brique", en: "Brick", uni: u(0x1f759) },
  { id: "stratum", fr: "Lit sur lit", en: "Stratum super stratum", uni: u(0x1f75d) },
  { id: "dissoudre", fr: "Dissoudre", en: "Dissolve", uni: u(0x1f762) },
  { id: "putrefaction", fr: "Putréfaction", en: "Putrefaction", uni: u(0x1f764) },
  { id: "bainvapeur", fr: "Bain vaporeux", en: "Bath of vapours", uni: u(0x1f76c) },
  { id: "alambicuni", fr: "Alambic (alch.)", en: "Alembic (alch.)", uni: u(0x1f76a) },
  { id: "heure", fr: "Heure", en: "Hour", uni: u(0x1f76e) },
  { id: "nuit", fr: "Nuit", en: "Night", uni: u(0x1f76f) },
  { id: "jour", fr: "Jour", en: "Day-night", uni: u(0x1f770) },
  { id: "mois", fr: "Mois", en: "Month", uni: u(0x1f771) },
  { id: "vierge", fr: "Vierge", en: "Virgo", uni: u(0x264d) },
  { id: "sablier", fr: "Sablier", en: "Hourglass", uni: u(0x231b) },
  { id: "purifierbmp", fr: "Purifier (nœud)", en: "Purify (node)", uni: u(0x260b) },
  { id: "sublimerbmp", fr: "Sublimé (nœud)", en: "Sublimate (node)", uni: u(0x260a) },
  { id: "sextile", fr: "Sel ammoniac (sextile)", en: "Sal ammoniac (sextile)", uni: u(0x26b9) },
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

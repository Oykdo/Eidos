/**
 * La règle d'écriture de l'atelier — ce que l'interface a le droit de dire,
 * et comment. Décision d'auteur du 2026-09-14 : Eidos est un jeu posé sur
 * des lois, mais le joueur n'a pas à lire la chaîne ; on se tutoie ; une
 * idée par phrase.
 *
 * Quatre règles, toutes mesurables sur `i18n.ts`, FR et EN :
 *
 *   1. le lexique — aucun mot de `BANNIS` dans un texte de l'interface ;
 *      le joueur voit une pièce, un coffre, un bloc, une clé, une feuille,
 *      un sceau, une preuve, une empreinte, une adresse, un mot, un tier,
 *      une salle, un étage, une dalle — jamais la mécanique qui les porte ;
 *   2. le chapeau — un texte d'entrée de page (`*.lede`, `sous.*`, `eco.*`)
 *      tient en `CHAPEAU_MAX` caractères ;
 *   3. la phrase — aucune phrase de plus de `PHRASE_MAX` mots ;
 *   4. le tutoiement — en FR, ni « vous », « votre », « vos », ni un
 *      impératif en -ez en tête de phrase.
 *
 * `manquements(cle, fr, en)` rend la liste de ce qui déroge, avec la règle et
 * la raison. Le test (`i18n.test.ts`) tient un **cliquet** : le nombre de
 * manquements ne remonte jamais, et il descend à zéro PR après PR ;
 * `scripts/langue.ts` les liste page par page pour qu'on sache quoi écrire.
 *
 * LIMITE : la règle mesure des mots et des longueurs, pas le sens. Un texte
 * court et faux passe ; c'est CLAUDE.md §8 qui exige que chaque phrase cite
 * une règle vraie du code, et c'est une relecture humaine qui le tient.
 */

export const CHAPEAU_MAX = 140;
export const PHRASE_MAX = 25;

/** Mots de la chaîne que le joueur n'a pas à lire. Communs aux deux langues, puis propres à chacune. */
export const BANNIS = {
  communs: [
    "UTXO",
    "Merkle",
    "WOTS",
    "XMSS",
    "txid",
    "hash",
    "quaternion",
    "spinor",
    "MSS",
    "Lamport",
    "sighash",
    "coinbase",
    "SHA-256",
    "sha256",
    "nonce",
    "base64",
    "hex",
  ],
  fr: ["racine"],
  en: ["root"],
} as const;

export type Regle = "lexique" | "chapeau" | "phrase" | "tutoiement";

export type Manquement = {
  readonly cle: string;
  readonly langue: "fr" | "en";
  readonly regle: Regle;
  readonly raison: string;
};

function motif(mots: readonly string[]): RegExp {
  const echappes = mots.map((m) => m.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return new RegExp(`(?<![\\p{L}\\p{N}])(?:${echappes.join("|")})(?![\\p{L}\\p{N}])`, "iu");
}

const MOTIF_FR = motif([...BANNIS.communs, ...BANNIS.fr]);
const MOTIF_EN = motif([...BANNIS.communs, ...BANNIS.en]);
/** « vous », « votre », « vos » ; un impératif en -ez en tête de phrase (Collez, Vérifiez…). */
const VOUS = /(?<![\p{L}])(vous|votre|vos)(?![\p{L}])/iu;
const IMPERATIF_EZ = /(?:^|[.!?…]\s+)([A-ZÉÈÊ][\p{Ll}]+ez)(?![\p{L}])/u;
/** Des mots en -ez qui ne sont pas des impératifs. */
const SAUF_EZ = new Set(["chez", "assez", "nez", "rez"]);

function vouvoiement(fr: string): string | null {
  const v = VOUS.exec(fr);
  if (v !== null) return v[1]!;
  const re = new RegExp(IMPERATIF_EZ.source, "gu");
  for (let m = re.exec(fr); m !== null; m = re.exec(fr)) {
    const mot = m[1]!;
    if (!SAUF_EZ.has(mot.toLowerCase())) return mot;
  }
  return null;
}

/** Vrai pour un texte d'entrée de page : le chapeau. */
export function estChapeau(cle: string): boolean {
  return /\.lede$/.test(cle) || /^(sous|eco)\./.test(cle);
}

/** Les phrases d'un texte : coupées sur `.`, `!`, `?`, `…`. Les vides ignorées. */
export function phrases(texte: string): string[] {
  return texte
    .split(/[.!?…]+/u)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

function mots(phrase: string): number {
  return phrase.split(/\s+/u).filter((m) => /[\p{L}\p{N}]/u.test(m)).length;
}

export function manquements(cle: string, fr: string, en: string): Manquement[] {
  const out: Manquement[] = [];
  const langues: readonly (readonly ["fr" | "en", string, RegExp])[] = [
    ["fr", fr, MOTIF_FR],
    ["en", en, MOTIF_EN],
  ];
  for (const [langue, brut, banni] of langues) {
    // Les {variables} d'interpolation ne sont pas des mots que le joueur lit.
    const texte = brut.replace(/\{[a-zA-Z0-9_]+\}/g, "");
    const m = banni.exec(texte);
    if (m !== null) out.push({ cle, langue, regle: "lexique", raison: `« ${m[0]} »` });
    if (estChapeau(cle) && brut.length > CHAPEAU_MAX)
      out.push({ cle, langue, regle: "chapeau", raison: `${brut.length} caractères au lieu de ${CHAPEAU_MAX} au plus` });
    const longue = phrases(texte).find((p) => mots(p) > PHRASE_MAX);
    if (longue !== undefined)
      out.push({ cle, langue, regle: "phrase", raison: `${mots(longue)} mots au lieu de ${PHRASE_MAX} au plus` });
  }
  const v = vouvoiement(fr);
  if (v !== null) out.push({ cle, langue: "fr", regle: "tutoiement", raison: `« ${v} »` });
  return out;
}

/** Tous les manquements d'un dictionnaire FR/EN, dans l'ordre des clés. */
export function manquementsDe(
  fr: Readonly<Record<string, string>>,
  en: Readonly<Record<string, string>>,
): Manquement[] {
  const out: Manquement[] = [];
  for (const cle of Object.keys(fr)) out.push(...manquements(cle, fr[cle] ?? "", en[cle] ?? ""));
  return out;
}

/** Compte par règle, pour le cliquet. */
export function compteParRegle(liste: readonly Manquement[]): Record<Regle, number> {
  const c: Record<Regle, number> = { lexique: 0, chapeau: 0, phrase: 0, tutoiement: 0 };
  for (const m of liste) c[m.regle] += 1;
  return c;
}

/**
 * Lexique de la veillée — une phrase par muse, dite à l'entrée de sa bande.
 *
 * Les hôtes ont leurs 27 répliques (hotes-lexique.ts, trois groupes de neuf,
 * jamais plus) ; la veillée en ajoute neuf à part, une par muse, qui disent
 * l'arbre et le jour. Ton inchangé : une phrase, un verbe, une règle vraie —
 * chaque ligne cite ce que veillee.ts fait. FR et EN. Une jauge : la changer
 * ne change ni un geste ni une preuve.
 */

import type { Bilingue } from "./objets-lexique.ts";
import type { SignatureId } from "./signatures.ts";

export const REPLIQUES_VEILLEE: Record<SignatureId, Bilingue> = {
  terre: {
    fr: "Soixante-quatre feuilles, et chacune ne signe qu'une fois.",
    en: "Sixty-four leaves, and each one signs only once.",
  },
  lune: {
    fr: "Ta veillée a deux têtes : la veille et le jour, toutes deux signées.",
    en: "Your vigil has two heads: the eve and the day, both signed.",
  },
  mercure: {
    fr: "Lire ne coûte rien ; signer coûte une feuille.",
    en: "Reading costs nothing; signing costs a leaf.",
  },
  venus: {
    fr: "Le pendule choisit l'étage, jamais ce qu'il contient.",
    en: "The pendulum picks the floor, never what it holds.",
  },
  soleil: {
    fr: "La dernière feuille ne remonte pas ; la preuve, elle, reste.",
    en: "The last leaf never returns; the proof remains.",
  },
  mars: {
    fr: "Une feuille brûlée deux fois, et tout le run est refusé.",
    en: "Burn one leaf twice and the whole run is refused.",
  },
  jupiter: {
    fr: "Le premier bloc du jour fait la veillée ; le second n'est plus qu'un bloc.",
    en: "The day's first block makes the vigil; the second is just a block.",
  },
  saturne: {
    fr: "Une porte sans sceau arrête la veillée, et ne brûle rien.",
    en: "A door without a seal ends the vigil, and burns nothing.",
  },
  uranie: {
    fr: "Ce que tu as signé, quiconque le juge sans rejouer la chaîne.",
    en: "What you signed, anyone judges without replaying the chain.",
  },
};

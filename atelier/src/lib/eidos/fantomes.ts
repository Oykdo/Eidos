/**
 * Fantômes et noms de salles — deux transpositions de la réserve Eidolon,
 * sans puissance, sans tirage (docs/PROMPT_ROGUELIKE_XMSS.md, C1 et C2).
 *
 * **Le nom d'une salle** est le nom d'ère de son œuf. La coupe d'un étage se
 * lit en quatre figures (`glypheLecture`) : la première est l'orbite (la
 * partie réelle, lecture.ts), les trois autres sont un empilement — un œuf
 * de la Chambre de Genèse (oeufs.ts). Soixante-quatre noms d'ère, déjà
 * traduits, pour deux cent cinquante-cinq étages : plusieurs salles portent
 * le même nom, comme plusieurs adresses partagent un glyphe.
 *
 * **Un fantôme** est le run d'un autre, relu depuis sa preuve. Il reçoit l'une
 * des six tournures que la réserve donnait aux œufs « légendaires » (Echo of,
 * Fading, Shadow, Whisper, Last, Reborn), transposées en épithètes qui disent
 * comment le run a fini — et rien d'autre : un fantôme n'a ni force ni nom
 * propre, il a la salle où il s'est arrêté.
 *
 *   écho      le bloc d'ancrage est d'un âge passé (une lecture d'archive)
 *   revenu    sommet : la vingt-septième salle atteinte
 *   dernier   épuisé : la dernière feuille brûlée avant le sommet
 *   ombre     porte : arrêté devant une porte sans sceau
 *   efface    abandon
 *   murmure   en cours : rien d'exporté encore
 *
 * Figures, pas preuves : une épithète se lit, elle n'engage rien.
 */

import { ageOf } from "./eonis.ts";
import { etagesDe } from "./glyphs.ts";
import { glypheLecture } from "./integrite.ts";
import type { Langue } from "./objets-lexique.ts";
import { oeufDeGroupe, type Oeuf } from "./oeufs.ts";
import { coupeDe, etageDe } from "./tour.ts";
import type { NomAge } from "./types.ts";
import type { Fin } from "./veillee.ts";

/** L'œuf d'une salle : les trois figures imaginaires de sa coupe. */
export function oeufDeSalle(etage: number): Oeuf {
  const figures = [...glypheLecture(coupeDe(etageDe(etage)))];
  return oeufDeGroupe(etagesDe(figures.slice(1).join("")));
}

/** « Ère du Vide primordial », « Era of Primordial Void » : le nom d'ère de l'œuf. */
export function nomDeSalle(etage: number, langue: Langue): string {
  return oeufDeSalle(etage).nomEre[langue];
}

export const TOURNURES = ["echo", "revenu", "dernier", "ombre", "efface", "murmure"] as const;
export type Tournure = (typeof TOURNURES)[number];

/** L'âge d'un bloc, par sa hauteur (eonis.ageOf) ; hors table = Kali. */
export function ageDuBloc(hauteur: number): NomAge {
  const a = ageOf(hauteur);
  const nom = a?.nom;
  return nom === "Satya" || nom === "Treta" || nom === "Dvapara" || nom === "Kali" ? nom : "Kali";
}

/** La tournure d'un run : son âge d'abord, sa fin ensuite. */
export function tournureDe(fin: Fin | null, ageBloc: NomAge, ageCourant: NomAge): Tournure {
  if (ageBloc !== ageCourant) return "echo";
  switch (fin) {
    case "sommet":
      return "revenu";
    case "epuise":
      return "dernier";
    case "porte":
      return "ombre";
    case "abandon":
      return "efface";
    default:
      return "murmure";
  }
}

/** Les six tournures, sur un nom d'ère (« Ère … » au féminin en français). */
export function epithete(tournure: Tournure, nomEre: string, langue: Langue): string {
  if (langue === "fr") {
    switch (tournure) {
      case "echo":
        return `Écho de l'${nomEre}`;
      case "revenu":
        return `L'${nomEre} revenue`;
      case "dernier":
        return `Dernière ${nomEre}`;
      case "ombre":
        return `Ombre de l'${nomEre}`;
      case "efface":
        return `L'${nomEre} qui s'efface`;
      case "murmure":
        return `Murmure de l'${nomEre}`;
    }
  }
  switch (tournure) {
    case "echo":
      return `Echo of the ${nomEre}`;
    case "revenu":
      return `${nomEre} Reborn`;
    case "dernier":
      return `Last ${nomEre}`;
    case "ombre":
      return `${nomEre}'s Shadow`;
    case "efface":
      return `Fading ${nomEre}`;
    case "murmure":
      return `Whisper of the ${nomEre}`;
  }
}

export type Fantome = {
  tournure: Tournure;
  /** l'étage de la dernière salle atteinte */
  etage: number;
  nom: string;
};

/** Le fantôme d'un run : sa dernière salle, sa fin, l'âge de son bloc contre l'âge de la tête suivie. */
export function fantomeDe(
  run: { fin: Fin | null; etageFinal: number; hauteurBloc: number },
  hauteurCourante: number,
  langue: Langue,
): Fantome {
  const tournure = tournureDe(run.fin, ageDuBloc(run.hauteurBloc), ageDuBloc(hauteurCourante));
  return { tournure, etage: run.etageFinal, nom: epithete(tournure, nomDeSalle(run.etageFinal, langue), langue) };
}

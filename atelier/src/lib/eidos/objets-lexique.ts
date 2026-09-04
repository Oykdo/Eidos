/**
 * Lexique des objets — les mots qui disent ce qu'un objet est, écrits une fois.
 *
 * Sept régimes × trois classes = vingt et un caractères (la cellule de la doxa
 * où tombe la forme la plus proche du mot), quatre orbites (la première figure
 * de la lecture), cinq raretés (la proximité à la forme, en centièmes), quatre
 * âges (un métal chacun), dix genres, six affixes, trois polarités, neuf
 * tempéraments de muse. FR et EN, même nombre partout.
 *
 * Ton : une phrase, un verbe, une règle vraie. Chaque entrée cite quelque chose
 * que le code fait — la norme ne change jamais, T·q avant et q·S après, deux
 * compositions par tour depuis l'ascendant, une capsule prend à même orbite.
 * Rien ici n'invente une puissance : un objet rare est plus orienté, pas plus
 * fort.
 *
 * Le lexique est une jauge : le changer ne change ni un mot ni une feuille.
 * fiche.ts choisit les entrées par des fonctions pures du mot ; ce fichier ne
 * calcule rien.
 *
 * LIMITE : les noms de régimes et de classes sont ceux du catalogue
 * (cosmos.ts, sans accents) ; l'affichage porte les accents, l'identité non.
 */

import type { Classe, Regime } from "./cosmos.ts";
import type { Affixe, Genre, NomAge } from "./types.ts";
import type { SignatureId } from "./signatures.ts";
import type { Polarite } from "./resonance.ts";

export type Langue = "fr" | "en";
export type Bilingue = { readonly fr: string; readonly en: string };

/** Noms affichés des régimes : accents en français, traduction en anglais. */
export const NOMS_REGIME: Record<Regime, Bilingue> = {
  Vide: { fr: "Vide", en: "Void" },
  Nebuleuse: { fr: "Nébuleuse", en: "Nebula" },
  Pulsar: { fr: "Pulsar", en: "Pulsar" },
  Eclipse: { fr: "Éclipse", en: "Eclipse" },
  Comete: { fr: "Comète", en: "Comet" },
  Horizon: { fr: "Horizon", en: "Horizon" },
  Quasar: { fr: "Quasar", en: "Quasar" },
};

export const NOMS_CLASSE: Record<Classe, Bilingue> = {
  arme: { fr: "arme", en: "weapon" },
  defense: { fr: "défense", en: "defence" },
  accessoire: { fr: "accessoire", en: "accessory" },
};

/**
 * Vingt et un caractères, un par cellule de la doxa. Chaque phrase dit la
 * classe (ce qu'elle fait dans une résonance : deux armes se nuisent, une
 * défense tient l'axe, un accessoire déplace) et le régime (sa manière).
 */
export const CARACTERES: Record<Classe, Record<Regime, Bilingue>> = {
  arme: {
    Vide: {
      fr: "Arme du Vide : elle ne vise personne et se compose contre elle-même, son ascendant est le Vide.",
      en: "Weapon of the Void: it aims at no one and composes against its own kind; the Void is its own ascendant.",
    },
    Nebuleuse: {
      fr: "Arme de Nébuleuse : diffuse, elle s'étend sur ce qu'elle frappe et ne rend jamais deux fois le même mot.",
      en: "Weapon of the Nebula: diffuse, it spreads over what it strikes and never returns the same word twice.",
    },
    Pulsar: {
      fr: "Arme de Pulsar : elle bat en cadence ; composée deux fois, elle revient presque sur son axe.",
      en: "Weapon of the Pulsar: it beats in time; composed twice, it comes almost back onto its axis.",
    },
    Eclipse: {
      fr: "Arme d'Éclipse : elle couvre l'axe qu'elle vise et ne laisse paraître que le bord.",
      en: "Weapon of the Eclipse: it covers the axis it aims at and lets only the rim show.",
    },
    Comete: {
      fr: "Arme de Comète : elle passe en ligne droite, tourne peu, et laisse une traîne dans l'ensemble.",
      en: "Weapon of the Comet: it passes in a straight line, turns little, and leaves a trail in the ensemble.",
    },
    Horizon: {
      fr: "Arme d'Horizon : elle sépare ; ce qui est au-dessus de son axe tient, ce qui est en dessous bascule.",
      en: "Weapon of the Horizon: it divides; what stands above its axis holds, what lies below tips over.",
    },
    Quasar: {
      fr: "Arme de Quasar : tout son mot est dans une seule direction, et cette direction se voit de loin.",
      en: "Weapon of the Quasar: its whole word points one way, and that way is seen from afar.",
    },
  },
  defense: {
    Vide: {
      fr: "Défense du Vide : elle ne tient aucun axe et n'en cède aucun ; conjuguée, elle rend le mot tel quel.",
      en: "Defence of the Void: it holds no axis and yields none; conjugated, it gives the word back unchanged.",
    },
    Nebuleuse: {
      fr: "Défense de Nébuleuse : elle absorbe en s'élargissant ; l'alignement se perd dans son épaisseur.",
      en: "Defence of the Nebula: it absorbs by widening; alignment gets lost in its thickness.",
    },
    Pulsar: {
      fr: "Défense de Pulsar : elle tient par intermittence, à chaque battement de sa figure.",
      en: "Defence of the Pulsar: it holds intermittently, on every beat of its figure.",
    },
    Eclipse: {
      fr: "Défense d'Éclipse : elle se place devant l'axe visé et le rend invisible sans le déplacer.",
      en: "Defence of the Eclipse: it stands before the aimed axis and hides it without moving it.",
    },
    Comete: {
      fr: "Défense de Comète : elle dévie plus qu'elle n'arrête ; l'axe glisse le long de sa traîne.",
      en: "Defence of the Comet: it deflects more than it stops; the axis slides along its trail.",
    },
    Horizon: {
      fr: "Défense d'Horizon : une ligne tenue ; au seuil élite, quatre-vingt-sept centièmes, rien ne passe.",
      en: "Defence of the Horizon: a line held; at the elite threshold, eighty-seven hundredths, nothing passes.",
    },
    Quasar: {
      fr: "Défense de Quasar : elle rayonne sur un seul axe et laisse tous les autres ouverts.",
      en: "Defence of the Quasar: it radiates along one axis and leaves every other one open.",
    },
  },
  accessoire: {
    Vide: {
      fr: "Accessoire du Vide : il ne déplace rien ; porté, il conjugue par l'identité.",
      en: "Accessory of the Void: it moves nothing; carried, it conjugates by the identity.",
    },
    Nebuleuse: {
      fr: "Accessoire de Nébuleuse : il brouille l'axe de ce qu'il conjugue et le rend plus large.",
      en: "Accessory of the Nebula: it blurs the axis of what it conjugates and makes it wider.",
    },
    Pulsar: {
      fr: "Accessoire de Pulsar : il donne le tempo ; conjugué par lui, un mot bat à sa cadence.",
      en: "Accessory of the Pulsar: it sets the tempo; conjugated by it, a word beats at its pace.",
    },
    Eclipse: {
      fr: "Accessoire d'Éclipse : il cache l'axe de ce qu'il porte, sans en changer l'orbite.",
      en: "Accessory of the Eclipse: it hides the axis of what it carries, without changing its orbit.",
    },
    Comete: {
      fr: "Accessoire de Comète : il entraîne ; ce qu'il conjugue suit sa direction un moment.",
      en: "Accessory of the Comet: it drags along; what it conjugates follows its direction for a while.",
    },
    Horizon: {
      fr: "Accessoire d'Horizon : il pose une limite ; conjugué par lui, un mot tient ou bascule, jamais entre.",
      en: "Accessory of the Horizon: it sets a limit; conjugated by it, a word holds or tips, never in between.",
    },
    Quasar: {
      fr: "Accessoire de Quasar : il oriente tout ce qu'il touche vers le même point du ciel.",
      en: "Accessory of the Quasar: it turns everything it touches toward the same point of the sky.",
    },
  },
};

/** Les quatre orbites : la première figure de la lecture, min(3, 4|w|/|q|). */
export const ORBITES: readonly Bilingue[] = [
  {
    fr: "Orbite vide · : presque un demi-tour ; composé avec lui-même, il revient sur ses pas.",
    en: "Empty orbit ·: almost a half-turn; composed with itself, it comes back on its steps.",
  },
  {
    fr: "Orbite du cercle ○ : un grand angle ; il retourne plus qu'il ne tient.",
    en: "Orbit of the circle ○: a wide angle; it overturns more than it holds.",
  },
  {
    fr: "Orbite du croissant ☽ : un angle franc ; il tourne et il tient.",
    en: "Orbit of the crescent ☽: a frank angle; it turns and it holds.",
  },
  {
    fr: "Orbite de la croix ✚ : un petit angle, près du repos ; il tient tout et tourne peu.",
    en: "Orbit of the cross ✚: a small angle, near rest; it holds everything and turns little.",
  },
];

/** Cinq raretés par proximité à la forme la plus proche (centièmes d'alignement). */
export const RARETES: readonly {
  readonly seuil: number;
  readonly nom: Bilingue;
  readonly texte: Bilingue;
}[] = [
  {
    seuil: 97,
    nom: { fr: "pur", en: "pure" },
    texte: {
      fr: "Pur : à trois centièmes de sa forme ; la distance angulaire à l'archétype est la rareté, sans table.",
      en: "Pure: within three hundredths of its form; the angular distance to the archetype is the rarity, no table.",
    },
  },
  {
    seuil: 90,
    nom: { fr: "franc", en: "frank" },
    texte: {
      fr: "Franc : sa forme se reconnaît au premier regard, avec un écart qui lui appartient.",
      en: "Frank: its form is known at first sight, with a deviation of its own.",
    },
  },
  {
    seuil: 78,
    nom: { fr: "mêlé", en: "mingled" },
    texte: {
      fr: "Mêlé : entre deux formes du catalogue, plus proche de l'une ; la cellule se lit, elle ne se déclare pas.",
      en: "Mingled: between two forms of the catalogue, closer to one; the cell is read, never declared.",
    },
  },
  {
    seuil: 60,
    nom: { fr: "hybride", en: "hybrid" },
    texte: {
      fr: "Hybride : aucune forme ne le tient ; il vit entre les cases du treillis.",
      en: "Hybrid: no form holds it; it lives between the cells of the lattice.",
    },
  },
  {
    seuil: 0,
    nom: { fr: "errant", en: "errant" },
    texte: {
      fr: "Errant : loin de tout archétype ; rare par la géométrie, pas par la puissance, la norme est la même.",
      en: "Errant: far from every archetype; rare by geometry, not by power, the norm is the same.",
    },
  },
];

/** Quatre âges, quatre métaux ; a est la récompense moyenne de l'âge (eonis). */
export const AGES: Record<
  NomAge,
  { readonly nom: Bilingue; readonly metal: Bilingue; readonly a: number; readonly texte: Bilingue }
> = {
  Satya: {
    nom: { fr: "Satya", en: "Satya" },
    metal: { fr: "or", en: "gold" },
    a: 40,
    texte: {
      fr: "Né sous Satya, a = 40 : l'or. L'âge est une géographie, pas une puissance ; la norme du mot est la même à tout âge.",
      en: "Born under Satya, a = 40: gold. An age is a geography, not a power; the norm of the word is the same in every age.",
    },
  },
  Treta: {
    nom: { fr: "Trétâ", en: "Tretâ" },
    metal: { fr: "argent", en: "silver" },
    a: 30,
    texte: {
      fr: "Né sous Trétâ, a = 30 : l'argent. Rien de Satya ne se reproduit ; rien de Trétâ ne vaut plus.",
      en: "Born under Tretâ, a = 30: silver. Nothing of Satya is reproduced; nothing of Tretâ is worth more.",
    },
  },
  Dvapara: {
    nom: { fr: "Dvâpara", en: "Dvâpara" },
    metal: { fr: "cuivre", en: "copper" },
    a: 20,
    texte: {
      fr: "Né sous Dvâpara, a = 20 : le cuivre. La moitié de l'émission est derrière lui ; sa rareté est son histoire.",
      en: "Born under Dvâpara, a = 20: copper. Half the emission lies behind it; its rarity is its history.",
    },
  },
  Kali: {
    nom: { fr: "Kali", en: "Kali" },
    metal: { fr: "fer", en: "iron" },
    a: 10,
    texte: {
      fr: "Né sous Kali, a = 10 : le fer. Le dernier âge, le plus court ; ce qui s'y forge est le plus nombreux.",
      en: "Born under Kali, a = 10: iron. The last age, the shortest; what is forged there is the most numerous.",
    },
  },
};

/** Dix genres : ce que l'objet peut faire dans le coffre et dans la Tour. */
export const GENRES_TEXTE: Record<Genre, Bilingue> = {
  trouve: {
    fr: "Trouvaille : le genre le plus humble, tirée de sous une case de la dalle ; les cases sont à tous, le contenu à chacun.",
    en: "Find: the humblest kind, drawn from under a cell of the slab; the cells belong to all, the content to each.",
  },
  pierre: {
    fr: "Pierre : elle tourne un mot, T·q en préfixe ou q·S en suffixe, et l'ordre change l'issue.",
    en: "Stone: it turns a word, T·q as prefix or q·S as suffix, and the order changes the outcome.",
  },
  arme: {
    fr: "Arme : un seul emplacement ; jusqu'à deux gemmes quand son tirage est impair.",
    en: "Weapon: a single slot; up to two gems when its roll is odd.",
  },
  armure: {
    fr: "Armure : neuf emplacements possibles, jusqu'à deux gemmes ; elle habille sans changer le mot.",
    en: "Armour: nine possible slots, up to two gems; it dresses without changing the word.",
  },
  gemme: {
    fr: "Gemme : enchâssée, elle tourne le mot effectif ; l'objet ne mute pas, sa lecture change.",
    en: "Gem: set, it turns the effective word; the item does not mutate, its reading changes.",
  },
  philosophale: {
    fr: "Philosophale : une par coffre personnel, et seulement parmi les dix premiers coffres.",
    en: "Philosophical: one per personal vault, and only among the first ten vaults.",
  },
  lair: {
    fr: "Ticket d'antre : il ouvre l'antre de sa bande et se consomme au passage.",
    en: "Lair ticket: it opens the lair of its band and is consumed on crossing.",
  },
  elixir: {
    fr: "Élixir : bu à un étage, son effet tient là seulement ; jamais rebu.",
    en: "Elixir: drunk on a floor, its effect holds there only; never drunk twice.",
  },
  capsule: {
    fr: "Capsule : un glyphe creux ; elle prend un occupant de même orbite, ou dont l'axe tient au seuil élite.",
    en: "Capsule: a hollow glyph; it takes an occupant of the same orbit, or whose axis holds at the elite threshold.",
  },
  capture: {
    fr: "Capture : un occupant pris, son mot intact ; compagne d'antre, une seule libérée par étage.",
    en: "Capture: an occupant taken, its word intact; lair companion, only one released per floor.",
  },
};

/** Six affixes : T en préfixe, S en suffixe, le rang est l'axe du générateur. */
export const AFFIXES_TEXTE: Record<Affixe, Bilingue> = {
  T1: {
    fr: "T1 : préfixe, tourne de 80 pour 719 autour du premier axe, avant le mot.",
    en: "T1: prefix, turns by 80 over 719 around the first axis, before the word.",
  },
  T2: {
    fr: "T2 : préfixe, tourne de 80 pour 719 autour du deuxième axe, avant le mot.",
    en: "T2: prefix, turns by 80 over 719 around the second axis, before the word.",
  },
  T3: {
    fr: "T3 : préfixe, tourne de 80 pour 719 autour du troisième axe, avant le mot.",
    en: "T3: prefix, turns by 80 over 719 around the third axis, before the word.",
  },
  S1: {
    fr: "S1 : suffixe, tourne de 80 pour 719 autour du premier axe, après le mot.",
    en: "S1: suffix, turns by 80 over 719 around the first axis, after the word.",
  },
  S2: {
    fr: "S2 : suffixe, tourne de 80 pour 719 autour du deuxième axe, après le mot.",
    en: "S2: suffix, turns by 80 over 719 around the second axis, after the word.",
  },
  S3: {
    fr: "S3 : suffixe, tourne de 80 pour 719 autour du troisième axe, après le mot.",
    en: "S3: suffix, turns by 80 over 719 around the third axis, after the word.",
  },
};

export const POLARITES_TEXTE: Record<Polarite, Bilingue> = {
  constructif: {
    fr: "constructif : les deux mots tirent dans le même sens, cos² ≥ 1/2",
    en: "constructive: both words pull the same way, cos² ≥ 1/2",
  },
  neutre: {
    fr: "neutre : ni dans le même sens, ni de la même classe",
    en: "neutral: neither the same way nor the same class",
  },
  destructif: {
    fr: "destructif : même classe, deux armes se nuisent",
    en: "destructive: same class, two weapons hinder each other",
  },
};

/** Neuf tempéraments, un par muse (l'archétype de l'objet). Chacun cite le rôle ou le don de la muse. */
export const TEMPERAMENTS: Record<SignatureId, Bilingue> = {
  uranie: {
    fr: "Marqué par Uranie ★ : il lit avant d'agir ; à l'observatoire, vingt et une cellules ouvrent la lecture des cent une formes.",
    en: "Marked by Urania ★: it reads before acting; at the observatory, twenty-one cells open the reading of the hundred and one forms.",
  },
  saturne: {
    fr: "Marqué par Polymnie ♄ : il retient ; chaque écho traversé s'inscrit dans les hymnes.",
    en: "Marked by Polyhymnia ♄: it remembers; every echo crossed is written into the hymns.",
  },
  jupiter: {
    fr: "Marqué par Euterpe ♃ : il donne le ton ; sa bande est celle des accords, et l'oreille y entend les paires.",
    en: "Marked by Euterpe ♃: it sets the tone; its band is the band of chords, and the ear hears the pairs there.",
  },
  mars: {
    fr: "Marqué par Érato ♂ : il forge ; T·q avant, q·S après, et une gemme sur du sel fait une capsule.",
    en: "Marked by Erato ♂: it forges; T·q before, q·S after, and a gem on salt makes a capsule.",
  },
  soleil: {
    fr: "Marqué par Melpomène ☉ : il tient le milieu de la Tour ; ce qui passe sa porte a montré son sceau.",
    en: "Marked by Melpomene ☉: it holds the middle of the Tower; what passes its door has shown its seal.",
  },
  venus: {
    fr: "Marqué par Terpsichore ♀ : il danse en ronde ; offert avec une résonance constructive, il rend une gemme.",
    en: "Marked by Terpsichore ♀: it dances the round; offered with a constructive resonance, it gives back a gem.",
  },
  mercure: {
    fr: "Marqué par Calliope ☿ : il accorde ; bu, le mercure accorde d'office la parade au seuil élite.",
    en: "Marked by Calliope ☿: it tunes; drunk, mercury grants the parry at the elite threshold outright.",
  },
  lune: {
    fr: "Marqué par Clio ☽ : il se souvient ; ce qu'il a traversé se relit, et l'archiviste en tient le registre.",
    en: "Marked by Clio ☽: it remembers; what it has crossed can be reread, and the archivist keeps the register.",
  },
  terre: {
    fr: "Marqué par Thalie ⊕ : il vient du sol ; une capsule par poste du jour honoré, trois blocs par capsule.",
    en: "Marked by Thalia ⊕: it comes from the ground; one capsule per honoured watch of the day, three blocks per capsule.",
  },
};

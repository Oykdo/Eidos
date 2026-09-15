/**
 * Lexique des objets — les mots qui disent ce qu'un objet est, écrits une fois.
 *
 * Sept régimes × trois classes = vingt et un caractères (la cellule de la doxa
 * où tombe la forme la plus proche du mot), quatre orbites (la première figure
 * de la lecture), cinq raretés (la proximité à la forme, en centièmes), quatre
 * âges (un métal chacun), dix genres, six affixes, trois polarités, neuf
 * tempéraments de muse. FR et EN, même nombre partout.
 *
 * Ton : la règle d'écriture de l'atelier (`lib/ecriture.ts`, décision d'auteur
 * du 2026-09-14) — une idée par phrase, vingt-cinq mots au plus, et jamais le
 * vocabulaire de la chaîne : le joueur lit une pièce, une pierre, un axe, une
 * orbite, un sceau, jamais un quaternion, une norme ou un produit. Chaque
 * entrée cite quelque chose que le code fait — une pierre consomme la pièce
 * qu'elle tourne, une gemme change la lecture et non la pièce, une capsule
 * prend à même orbite. Rien ici n'invente une puissance : un objet rare est
 * plus orienté, pas plus fort. `fiche.test.ts` passe chaque entrée par
 * `manquements()` : un mot banni ou une phrase trop longue casse le test.
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

/**
 * Noms affichés des régimes : accents en français, traduction en anglais ;
 * `de` et `le` portent l'article français (« d'Éclipse », « la Nébuleuse »),
 * l'anglais dit toujours « of the », « the ».
 */
export type NomRegime = Bilingue & { readonly de: string; readonly le: string };

export const NOMS_REGIME: Record<Regime, NomRegime> = {
  Vide: { fr: "Vide", en: "Void", de: "du Vide", le: "le Vide" },
  Nebuleuse: { fr: "Nébuleuse", en: "Nebula", de: "de Nébuleuse", le: "la Nébuleuse" },
  Pulsar: { fr: "Pulsar", en: "Pulsar", de: "de Pulsar", le: "le Pulsar" },
  Eclipse: { fr: "Éclipse", en: "Eclipse", de: "d'Éclipse", le: "l'Éclipse" },
  Comete: { fr: "Comète", en: "Comet", de: "de Comète", le: "la Comète" },
  Horizon: { fr: "Horizon", en: "Horizon", de: "d'Horizon", le: "l'Horizon" },
  Quasar: { fr: "Quasar", en: "Quasar", de: "de Quasar", le: "le Quasar" },
};

/** Les classes, avec leur article et leur genre français (arme et défense au féminin). */
export type NomClasse = Bilingue & { readonly un: string; readonly feminin: boolean };

export const NOMS_CLASSE: Record<Classe, NomClasse> = {
  arme: { fr: "arme", en: "weapon", un: "une", feminin: true },
  defense: { fr: "défense", en: "defence", un: "une", feminin: true },
  accessoire: { fr: "accessoire", en: "accessory", un: "un", feminin: false },
};

/**
 * Vingt et un caractères, un par cellule de la doxa : la manière de la classe
 * (deux armes se gênent, une défense tient l'axe, un accessoire déplace) sous
 * le régime. La phrase commence au pronom — « elle » pour une arme ou une
 * défense, « il » pour un accessoire — parce que la fiche vient de nommer la
 * classe et le régime juste avant (registre forme) : on ne les répète pas.
 */
export const CARACTERES: Record<Classe, Record<Regime, Bilingue>> = {
  arme: {
    Vide: {
      fr: "Elle ne vise personne et ne se retourne que contre elle-même.",
      en: "It aims at no one and turns only against itself.",
    },
    Nebuleuse: {
      fr: "Diffuse, elle s'étend sur ce qu'elle frappe et ne frappe jamais deux fois pareil.",
      en: "Diffuse, it spreads over what it strikes and never strikes the same way twice.",
    },
    Pulsar: {
      fr: "Elle bat en cadence ; deux coups, et elle revient presque sur son axe.",
      en: "It beats in time; two strokes, and it comes almost back onto its axis.",
    },
    Eclipse: {
      fr: "Elle couvre ce qu'elle vise et ne laisse paraître que le bord.",
      en: "It covers what it aims at and lets only the rim show.",
    },
    Comete: {
      fr: "Elle passe en ligne droite, tourne peu, et laisse une traîne derrière elle.",
      en: "It passes in a straight line, turns little, and leaves a trail behind.",
    },
    Horizon: {
      fr: "Elle sépare ; ce qui est au-dessus tient, ce qui est en dessous bascule.",
      en: "It divides; what stands above holds, what lies below tips over.",
    },
    Quasar: {
      fr: "Tout son élan va dans une seule direction, et cette direction se voit de loin.",
      en: "All its drive goes one way, and that way is seen from afar.",
    },
  },
  defense: {
    Vide: {
      fr: "Elle ne tient aucun axe et n'en cède aucun ; elle rend ce qu'on lui donne, tel quel.",
      en: "It holds no axis and yields none; it gives back what it is given, unchanged.",
    },
    Nebuleuse: {
      fr: "Elle absorbe en s'élargissant ; ce qui la vise se perd dans son épaisseur.",
      en: "It absorbs by widening; what aims at it gets lost in its thickness.",
    },
    Pulsar: {
      fr: "Elle tient par intermittence, à chaque battement.",
      en: "It holds intermittently, on every beat.",
    },
    Eclipse: {
      fr: "Elle se place devant ce qu'on vise et le cache sans le déplacer.",
      en: "It stands before what is aimed at and hides it without moving it.",
    },
    Comete: {
      fr: "Elle dévie plus qu'elle n'arrête ; le coup glisse le long de sa traîne.",
      en: "It deflects more than it stops; the blow slides along its trail.",
    },
    Horizon: {
      fr: "Une ligne tenue ; bien alignée, rien ne passe.",
      en: "A line held; well aligned, nothing passes.",
    },
    Quasar: {
      fr: "Elle rayonne sur un seul axe et laisse tous les autres ouverts.",
      en: "It radiates along one axis and leaves every other one open.",
    },
  },
  accessoire: {
    Vide: {
      fr: "Il ne déplace rien ; porté, il laisse la pièce telle quelle.",
      en: "It moves nothing; carried, it leaves the piece as it is.",
    },
    Nebuleuse: {
      fr: "Il brouille l'axe de ce qu'il touche et le rend plus large.",
      en: "It blurs the axis of what it touches and makes it wider.",
    },
    Pulsar: {
      fr: "Il donne le tempo ; ce qu'il touche bat à sa cadence.",
      en: "It sets the tempo; what it touches beats at its pace.",
    },
    Eclipse: {
      fr: "Il cache l'axe de ce qu'il porte, sans en changer l'orbite.",
      en: "It hides the axis of what it carries, without changing its orbit.",
    },
    Comete: {
      fr: "Il entraîne ; ce qu'il touche suit sa direction un moment.",
      en: "It drags along; what it touches follows its direction for a while.",
    },
    Horizon: {
      fr: "Il pose une limite ; ce qu'il touche tient ou bascule, jamais entre les deux.",
      en: "It sets a limit; what it touches holds or tips, never in between.",
    },
    Quasar: {
      fr: "Il oriente tout ce qu'il touche vers le même point du ciel.",
      en: "It turns everything it touches toward the same point of the sky.",
    },
  },
};

/** Les quatre orbites : la première figure de la lecture, min(3, 4|w|/|q|). */
export const ORBITES: readonly Bilingue[] = [
  {
    fr: "Orbite · : presque un demi-tour ; sur lui-même, il revient sur ses pas.",
    en: "Orbit ·: almost a half-turn; on itself, it comes back on its steps.",
  },
  {
    fr: "Orbite ○ : un grand angle ; il retourne plus qu'il ne tient.",
    en: "Orbit ○: a wide angle; it overturns more than it holds.",
  },
  {
    fr: "Orbite ☽ : un angle franc ; il tourne et il tient.",
    en: "Orbit ☽: a frank angle; it turns and it holds.",
  },
  {
    fr: "Orbite ✚ : un petit angle, près du repos ; il tient tout et tourne peu.",
    en: "Orbit ✚: a small angle, near rest; it holds everything and turns little.",
  },
];

/**
 * Cinq raretés par proximité à la forme la plus proche (centièmes d'alignement).
 * `nom` porte le féminin (une arme franche) ; `texte` est la suite de la
 * phrase « Une arme d'Éclipse, franche : … » — sans majuscule ni point.
 */
export const RARETES: readonly {
  readonly seuil: number;
  readonly nom: Bilingue & { readonly fem: string };
  readonly texte: Bilingue;
}[] = [
  {
    seuil: 97,
    nom: { fr: "pur", fem: "pure", en: "pure" },
    texte: {
      fr: "sa forme est nette, rien ne s'en écarte",
      en: "its form is clean, nothing strays from it",
    },
  },
  {
    seuil: 90,
    nom: { fr: "franc", fem: "franche", en: "frank" },
    texte: {
      fr: "sa forme se reconnaît au premier regard, avec un écart qui lui appartient",
      en: "its form is known at first sight, with a deviation of its own",
    },
  },
  {
    seuil: 78,
    nom: { fr: "mêlé", fem: "mêlée", en: "mingled" },
    texte: {
      fr: "entre deux formes, plus proche de celle-ci",
      en: "between two forms, closer to this one",
    },
  },
  {
    seuil: 60,
    nom: { fr: "hybride", fem: "hybride", en: "hybrid" },
    texte: {
      fr: "entre plusieurs formes, sans en tenir aucune",
      en: "between several forms, holding to none",
    },
  },
  {
    seuil: 0,
    nom: { fr: "errant", fem: "errante", en: "errant" },
    texte: {
      fr: "loin de toute forme ; rare par la géométrie, pas par la force",
      en: "far from every form; rare by geometry, not by strength",
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
      fr: "Sous Satya, l'âge de l'or : le premier, le plus long.",
      en: "Under Satya, the age of gold: the first, the longest.",
    },
  },
  Treta: {
    nom: { fr: "Trétâ", en: "Tretâ" },
    metal: { fr: "argent", en: "silver" },
    a: 30,
    texte: {
      fr: "Sous Trétâ, l'âge de l'argent : le deuxième des quatre.",
      en: "Under Tretâ, the age of silver: the second of four.",
    },
  },
  Dvapara: {
    nom: { fr: "Dvâpara", en: "Dvâpara" },
    metal: { fr: "cuivre", en: "copper" },
    a: 20,
    texte: {
      fr: "Sous Dvâpara, l'âge du cuivre : le troisième des quatre.",
      en: "Under Dvâpara, the age of copper: the third of four.",
    },
  },
  Kali: {
    nom: { fr: "Kali", en: "Kali" },
    metal: { fr: "fer", en: "iron" },
    a: 10,
    texte: {
      fr: "Sous Kali, l'âge du fer : le dernier, le plus court.",
      en: "Under Kali, the age of iron: the last, the shortest.",
    },
  },
};

/** Dix genres : ce que l'objet peut faire dans le coffre et dans la Tour. */
export const GENRES_TEXTE: Record<Genre, Bilingue> = {
  trouve: {
    fr: "Trouvaille : tirée de sous une case de la dalle ; les cases sont à tous, ce qu'on y trouve à chacun.",
    en: "Find: drawn from under a cell of the slab; the cells belong to all, what is found there to each.",
  },
  pierre: {
    fr: "Pierre : elle tourne une pièce et en fait une autre ; l'ancienne est consommée, et l'ordre change l'issue.",
    en: "Stone: it turns a piece and makes another; the old one is consumed, and the order changes the outcome.",
  },
  arme: {
    fr: "Arme : un seul emplacement ; jusqu'à deux gemmes.",
    en: "Weapon: a single slot; up to two gems.",
  },
  armure: {
    fr: "Armure : neuf emplacements possibles ; elle habille sans changer la pièce.",
    en: "Armour: nine possible slots; it dresses without changing the piece.",
  },
  gemme: {
    fr: "Gemme : sertie, elle change la lecture d'une pièce, jamais la pièce elle-même.",
    en: "Gem: set, it changes how a piece reads, never the piece itself.",
  },
  philosophale: {
    fr: "Philosophale : une par coffre, et seulement dans les dix premiers.",
    en: "Philosophical: one per vault, and only among the first ten.",
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
    fr: "Capsule : un glyphe creux ; elle prend un occupant de même orbite, ou assez bien aligné.",
    en: "Capsule: a hollow glyph; it takes an occupant of the same orbit, or well enough aligned.",
  },
  capture: {
    fr: "Capture : un occupant pris, tel quel ; compagnon d'antre, un seul libéré par étage.",
    en: "Capture: an occupant taken, as is; lair companion, only one released per floor.",
  },
};

/** Six affixes : T se place avant la pièce, S après ; le rang est l'axe. */
export const AFFIXES_TEXTE: Record<Affixe, Bilingue> = {
  T1: {
    fr: "T1 : se place avant la pièce et la tourne autour du premier axe.",
    en: "T1: goes before the piece and turns it around the first axis.",
  },
  T2: {
    fr: "T2 : se place avant la pièce et la tourne autour du deuxième axe.",
    en: "T2: goes before the piece and turns it around the second axis.",
  },
  T3: {
    fr: "T3 : se place avant la pièce et la tourne autour du troisième axe.",
    en: "T3: goes before the piece and turns it around the third axis.",
  },
  S1: {
    fr: "S1 : se place après la pièce et la tourne autour du premier axe.",
    en: "S1: goes after the piece and turns it around the first axis.",
  },
  S2: {
    fr: "S2 : se place après la pièce et la tourne autour du deuxième axe.",
    en: "S2: goes after the piece and turns it around the second axis.",
  },
  S3: {
    fr: "S3 : se place après la pièce et la tourne autour du troisième axe.",
    en: "S3: goes after the piece and turns it around the third axis.",
  },
};

export const POLARITES_TEXTE: Record<Polarite, Bilingue> = {
  constructif: {
    fr: "constructif : les deux tirent dans le même sens",
    en: "constructive: both pull the same way",
  },
  neutre: {
    fr: "neutre : ni le même sens, ni la même classe",
    en: "neutral: neither the same way nor the same class",
  },
  destructif: {
    fr: "destructif : même classe, deux armes se gênent",
    en: "destructive: same class, two weapons hinder each other",
  },
};

/** Neuf tempéraments, un par muse (l'archétype de l'objet). Chacun cite le rôle ou le don de la muse. */
export const TEMPERAMENTS: Record<SignatureId, Bilingue> = {
  uranie: {
    fr: "Marqué par Uranie ★ : il lit avant d'agir ; à l'observatoire, on lit toutes les formes.",
    en: "Marked by Urania ★: it reads before acting; at the observatory, every form is read.",
  },
  saturne: {
    fr: "Marqué par Polymnie ♄ : il retient ; ce qu'il traverse s'inscrit dans les hymnes.",
    en: "Marked by Polyhymnia ♄: it remembers; what it crosses is written into the hymns.",
  },
  jupiter: {
    fr: "Marqué par Euterpe ♃ : il donne le ton ; chez elle, l'oreille entend les paires.",
    en: "Marked by Euterpe ♃: it sets the tone; at her house, the ear hears the pairs.",
  },
  mars: {
    fr: "Marqué par Érato ♂ : il forge ; chez elle, une gemme sur du sel fait une capsule.",
    en: "Marked by Erato ♂: it forges; at her house, a gem on salt makes a capsule.",
  },
  soleil: {
    fr: "Marqué par Melpomène ☉ : il tient le milieu de la Tour ; ce qui passe sa porte a montré son sceau.",
    en: "Marked by Melpomene ☉: it holds the middle of the Tower; what passes its door has shown its seal.",
  },
  venus: {
    fr: "Marqué par Terpsichore ♀ : il danse en ronde ; offert en accord, il rend une gemme.",
    en: "Marked by Terpsichore ♀: it dances the round; offered in accord, it gives back a gem.",
  },
  mercure: {
    fr: "Marqué par Calliope ☿ : il accorde ; chez elle, le mercure qu'on boit donne la parade.",
    en: "Marked by Calliope ☿: it tunes; at her house, the mercury one drinks grants the parry.",
  },
  lune: {
    fr: "Marqué par Clio ☽ : il se souvient ; l'archiviste tient le registre de ce qu'il a traversé.",
    en: "Marked by Clio ☽: it remembers; the archivist keeps the register of what it has crossed.",
  },
  terre: {
    fr: "Marqué par Thalie ⊕ : il vient du sol ; une capsule par poste du jour, trois blocs chacune.",
    en: "Marked by Thalia ⊕: it comes from the ground; one capsule per watch of the day, three blocks each.",
  },
};

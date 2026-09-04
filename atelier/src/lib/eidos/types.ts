export type Sortie = {
  ref: string;
  txid: string;
  rang: number;
  adresse: string;
  indice: number;
  montant: number;
};

export type SelectionOk = {
  ok: true;
  entrees: Sortie[];
  totalEntrees: number;
  montant: number;
  rendu: number;
  frais: number;
  poussiere: boolean;
  octetsTemoins: number;
};

export type CodeEchec = "montant" | "vide" | "insuffisant" | "fragmente" | "cle";

export type SelectionKo = {
  ok: false;
  code: CodeEchec;
  message: string;
  solde: number;
  couvertureMax: number;
};

export type Selection = SelectionOk | SelectionKo;

export type ScenarioId = "mixte" | "poussiere" | "fragmente" | "une-piece" | "vide";

export type NatureCoffre = "atelier" | "personnel";

export type NomAge = "Satya" | "Treta" | "Dvapara" | "Kali";

export type Genre =
  | "trouve"
  | "pierre"
  | "arme"
  | "armure"
  | "gemme"
  | "philosophale"
  | "lair"
  | "elixir"
  | "capsule"
  | "capture";
export type EmplacementArmure =
  | "casque"
  | "plastron"
  | "epaulieres"
  | "gants"
  | "bottes"
  | "amulette"
  | "anneau1"
  | "anneau2"
  | "accessoire";
export type Emplacement = "arme" | EmplacementArmure;
export type Affixe = "T1" | "T2" | "T3" | "S1" | "S2" | "S3";

/** Jauge locale hors feuille : nonce et hauteur ne sont pas l'invariant. */
export type ObjetPorte = {
  mot: number;
  archetype: string;
  age: NomAge;
  nonce: number;
  hauteur: number;
  genre: Genre;
  emplacement: Emplacement | null;
  affixe: Affixe | null;
  sockets: number;
  gemmes: Affixe[];
  nom: string;
  palierLair: number | null;
};

export type DerniereSig = {
  txid: string;
  ok: boolean;
  entrees: number;
  octets: number;
};

export type MotifBloc = "genese" | "atelier" | "envoi" | "regroupement" | "robinet" | "mine";

export type BlocLocal = {
  hauteur: number;
  prev: string;
  merkle: string;
  ts: number;
  nonce: number;
  bits: number;
  hash: string;
  glyphes: string;
  motif: MotifBloc;
};

/**
 * Jauge de la Tour — hors feuille (docs/SPEC_TOUR.md §7).
 * Rien ici n'est vérifiable ni signé ; tout se recalcule depuis les graines.
 * Les élixirs, capsules et captures sont dans `objets`, pas ici.
 */
export type Espece = "sel" | "mercure" | "soufre";

export type ElixirBu = { etage: number; mot: number; espece: Espece };

export type Tour = {
  /** étage courant */
  etage: number;
  /** plus haut étage atteint (carte) */
  sommet: number;
  /** étage d'où part la montée en cours (un écho se lit sans redescendre) */
  depuis: number;
  /** étages dont l'hôte a été honoré : un don par (coffre, étage) */
  dons: number[];
  /** échos parcourus */
  echos: [number, number][];
  /** antres franchis */
  antres: number[];
  /** alcôves ouvertes */
  alcoves: number[];
  /** mots des élixirs bus et des captures accordées : jamais réutilisables */
  bus: number[];
  /** élixirs bus : l'effet tient à cet étage, et là seulement ; l'espèce est notée, le mot n'est pas réécrit */
  elixirs: ElixirBu[];
  /** portes ouvertes (lecture des sceaux au moment du passage) */
  portes: NomAge[];
  /** (étage, k) des occupants pris par ce coffre */
  captures: [number, number][];
  /** (étage, x, y) des cases creusées par ce coffre : trois coups de bêche par étage (fouilles.ts) */
  fouilles: [number, number, number][];
  /** l'ascension en cours ou finie (pendule) ; null hors ascension. Forme : ascension.ts */
  ascension: import("./ascension.ts").AscensionEnCours | null;
  /** mot de la capture libérée pour l'étage courant, au plus une */
  liberee: number | null;
  /** mot de l'objet porté dans la Tour ; null = le dernier du coffre */
  porte: number | null;
  /** jours civils où Thalie a donné une capsule (une par poste du jour honoré) */
  capsules: number[];
};

export type Coffre = {
  maitre: string;
  n: number;
  sorties: Sortie[];
  historique: HistoriqueTx[];
  scenario: ScenarioId;
  nature: NatureCoffre;
  clesUsees: string[];
  derniereSig: DerniereSig | null;
  chaine: BlocLocal[];
  reliques: NomAge[];
  objets: ObjetPorte[];
  philosophale: string | null;
  tour: Tour;
};

export type HistoriqueTx = {
  txid: string;
  at: number;
  montant: number;
  entrees: number;
  rendu: number;
  frais: number;
  poussiere: boolean;
  kind: "envoi" | "regroupement" | "robinet" | "mine" | "relique";
  note: string;
};

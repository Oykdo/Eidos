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

export type CodeEchec =
  | "montant"
  | "vide"
  | "insuffisant"
  | "fragmente"
  | "cle";

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

export type Genre = "trouve" | "pierre" | "arme" | "armure" | "gemme" | "philosophale" | "lair";
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

export type MotifBloc =
  | "genese"
  | "atelier"
  | "envoi"
  | "regroupement"
  | "robinet"
  | "mine";

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

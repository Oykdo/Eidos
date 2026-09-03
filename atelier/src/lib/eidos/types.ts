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

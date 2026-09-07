import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import {
  INDEX_VEILLEES,
  classer,
  comparer,
  fantomesDeSalle,
  feuillesALEtape,
  lireVeillees,
  nomDeFichier,
  refDePiece,
} from "./classement.ts";
import { nomDeSalle } from "./fantomes.ts";
import { preuveReseau, serialiser } from "./merkle.ts";
import { ETAPES } from "./pendule.ts";
import { parserFederation, parserTeteReseau, type TeteReseau } from "./temoin.ts";
import {
  FEUILLES,
  FRANCHIR_AU_SOMMET,
  arreterVeillee,
  construireArbre,
  graineArbre,
  jugerVeillee,
  ouvrirVeillee,
  serialiserVeillee,
  signerGeste,
  type ArbreFeuilles,
  type Veillee,
} from "./veillee.ts";

type TeteBrute = Record<string, unknown>;
type SortieBrute = { txid: string; rang: number; adresse: string; montant: number };
const VEC = JSON.parse(readFileSync(new URL("../../../../vecteurs.json", import.meta.url), "utf8")) as {
  veillee: {
    federation: { hauteur_mss: number; racines: string[]; graines_publiques: string[] };
    jour: number;
    veille: TeteBrute;
    premier_du_jour: TeteBrute;
    second_du_jour: TeteBrute;
    sorties_au_premier: SortieBrute[];
    sorties_au_second: SortieBrute[];
  };
};

function tete(raw: TeteBrute) {
  const t = parserTeteReseau(raw);
  if ("erreur" in t) throw new Error(t.erreur);
  return t;
}
const fed = parserFederation(VEC.veillee.federation);
if ("erreur" in fed) throw new Error(fed.erreur);
const veille = tete(VEC.veillee.veille);
const jour = tete(VEC.veillee.premier_du_jour);
const second = tete(VEC.veillee.second_du_jour);
// trois pièces : deux au premier bloc du jour, la troisième née au second bloc (ancrée sur lui)
const pieceA = VEC.veillee.sorties_au_premier[0]!;
const pieceB = VEC.veillee.sorties_au_premier[1]!;
const pieceC = VEC.veillee.sorties_au_second[2]!;
assert.notEqual(refDePiece(pieceA), refDePiece(pieceB));
assert.notEqual(refDePiece(pieceB), refDePiece(pieceC));

function preuve(sorties: SortieBrute[], p: SortieBrute) {
  const pr = preuveReseau(sorties, refDePiece(p));
  if (!pr) throw new Error("preuve absente");
  return serialiser(pr);
}

// deux coffres = deux maîtres ; le coffre A ancre la pièce A, le coffre B les pièces B et C
const arbreA = construireArbre(graineArbre("coffre-a", jour.idBloc, pieceA));
const arbreB = construireArbre(graineArbre("coffre-b", jour.idBloc, pieceB));
const arbreC = construireArbre(graineArbre("coffre-b", jour.idBloc, pieceC));
const arbreLibre = construireArbre(graineArbre("coffre-a", jour.idBloc, null));

function ouvrir(arbre: ArbreFeuilles, piece: SortieBrute, sorties: SortieBrute[], teteAncre?: TeteReseau): Veillee {
  const v = ouvrirVeillee(arbre, jour, veille, { piece, preuve: preuve(sorties, piece), teteAncre });
  if ("erreur" in v) throw new Error(v.erreur);
  return v;
}

function franchir(v: Veillee, arbre: ArbreFeuilles, n: number): Veillee {
  let x = v;
  for (let k = 0; k < n; k++) {
    const r = signerGeste(x, arbre, { g: "franchir", arg: 0, mot: 1000 + k });
    if ("erreur" in r) throw new Error(r.erreur);
    x = r;
  }
  return x;
}

function geste(v: Veillee, arbre: ArbreFeuilles, g: "parler" | "ouvrir" | "prendre", arg: number): Veillee {
  const r = signerGeste(v, arbre, { g, arg });
  if ("erreur" in r) throw new Error(r.erreur);
  return r;
}

// A : un mot à Thalie, puis 26 fois « monter » — sommet, 27 × 64 + 1
const vA = franchir(geste(ouvrir(arbreA, pieceA, VEC.veillee.sorties_au_premier), arbreA, "parler", 0), arbreA, FRANCHIR_AU_SOMMET);
// B : une seule salle franchie, puis s'effacer — 2 × 64, une feuille brûlée
const vB = arreterVeillee(franchir(ouvrir(arbreB, pieceB, VEC.veillee.sorties_au_premier), arbreB, 1), "abandon");
// C : creuser soixante-quatre fois sans jamais franchir — épuisé à la porte de la ville, 1 × 64 + 64
let vC = ouvrir(arbreC, pieceC, VEC.veillee.sorties_au_second, second);
for (let k = 0; k < FEUILLES; k++) vC = geste(vC, arbreC, "ouvrir", k);
// A′ : la même pièce, le même arbre, un autre run (deux appareils) — cinq salles, puis s'effacer
const vA2 = arreterVeillee(franchir(ouvrir(arbreA, pieceA, VEC.veillee.sorties_au_premier), arbreA, 5), "abandon");
// une trace altérée : un mot changé sur le geste 1
const vAlt: Veillee = { ...vA, gestes: vA.gestes.map((g, k) => (k === 1 ? { ...g, mot: g.mot + 1 } : g)) };
// une veillée libre : aucune pièce
const vLibre = (() => {
  const v = ouvrirVeillee(arbreLibre, jour, veille, null);
  if ("erreur" in v) throw new Error(v.erreur);
  return arreterVeillee(franchir(v, arbreLibre, 2), "abandon");
})();
// la pièce A sous un rang replié : u32(0,5) = u32(2³²) = u32(0), même feuille UTXO, même preuve Merkle
function repliee(rang: number): Veillee {
  const piece = { ...pieceA, rang };
  const arbre = construireArbre(graineArbre("coffre-a", jour.idBloc, piece));
  const v = ouvrirVeillee(arbre, jour, veille, { piece, preuve: preuve(VEC.veillee.sorties_au_premier, pieceA) });
  if ("erreur" in v) throw new Error(v.erreur);
  return arreterVeillee(franchir(v, arbre, 3), "abandon");
}
const vDemi = repliee(0.5);
const vDeux32 = repliee(2 ** 32);

assert.equal(vA.fin, "sommet");
assert.equal(vC.fin, "epuise");

describe("classer : jugées dans le navigateur, triées, numérotées", () => {
  it("trois pièces, trois coffres-jours : score décroissant, puis moins de feuilles brûlées", () => {
    const { classees, refusees } = classer([vC, vB, vA], fed);
    assert.equal(refusees.length, 0);
    assert.deepEqual(
      classees.map((c) => [c.rang, c.piece, c.score, c.feuilles, c.fin]),
      [
        [1, refDePiece(pieceA), ETAPES * FEUILLES + 1, FRANCHIR_AU_SOMMET + 1, "sommet"],
        [2, refDePiece(pieceB), 2 * FEUILLES, 1, "abandon"],
        [3, refDePiece(pieceC), FEUILLES + FEUILLES, FEUILLES, "epuise"],
      ],
    );
    // à score égal (128 = 2 salles + 0 butin = 1 salle + 64 butin), la feuille comptée d'abord
    assert.equal(classees[1]!.score, classees[2]!.score);
    const a = classees[0]!;
    assert.equal(a.jour, VEC.veillee.jour);
    assert.equal(a.salles, ETAPES);
    assert.equal(a.butin, 1);
    assert.equal(a.hauteurBloc, jour.hauteur);
    assert.equal(a.etapes.length, ETAPES);
    assert.equal(a.etageFinal, a.etapes[ETAPES - 1]!.e);
    assert.ok(a.etageFinal >= 226, "dernière salle dans la bande d'Uranie");
    assert.deepEqual(a.gestes.slice(0, 2), ["parler", "franchir"]);
    // l'épithète : la fin du run sur le nom de sa dernière salle, sans écho par défaut (même hauteur)
    assert.equal(a.fantome.tournure, "revenu");
    assert.equal(a.fantome.nom, `L'${nomDeSalle(a.etageFinal, "fr")} revenue`);
    assert.equal(classees[1]!.fantome.tournure, "efface");
    assert.equal(classees[2]!.fantome.tournure, "dernier");
    assert.equal(classees[2]!.etageFinal, 0);
    // la hauteur courante et la langue passent en option : un bloc de Satya lu depuis Kali est un écho, en anglais
    const en = classer([vA], fed, { hauteurCourante: 2_000_000, langue: "en" }).classees[0]!;
    assert.equal(en.fantome.tournure, "echo");
    assert.equal(en.fantome.nom, `Echo of the ${nomDeSalle(a.etageFinal, "en")}`);
  });

  it("l'ordre est total : score, feuilles, pièce, jour", () => {
    const x = { score: 5, feuilles: 1, piece: "bb:0", jour: 1 };
    assert.ok(comparer(x, { ...x, score: 6 }) > 0, "le plus haut score d'abord");
    assert.ok(comparer(x, { ...x, feuilles: 2 }) < 0, "moins de feuilles d'abord");
    assert.ok(comparer(x, { ...x, piece: "aa:0" }) > 0, "puis la pièce");
    assert.ok(comparer(x, { ...x, jour: 0 }) > 0, "puis le jour");
    assert.equal(comparer(x, { ...x }), 0);
  });

  it("doublon : deux preuves valides sur la même pièce et le même jour, la première reçue est classée", () => {
    const d1 = classer([vA2, vA, vB], fed);
    assert.deepEqual(d1.classees.map((c) => c.piece), [refDePiece(pieceA), refDePiece(pieceB)]);
    assert.equal(d1.classees[0]!.score, 6 * FEUILLES, "A′ reçue avant A : c'est elle");
    assert.equal(d1.refusees.length, 1);
    assert.equal(d1.refusees[0]!.n, 1);
    assert.match(d1.refusees[0]!.motif, /doublon/);
    const d2 = classer([vA, vA2, vB], fed);
    assert.equal(d2.classees[0]!.score, ETAPES * FEUILLES + 1, "A reçue avant A′ : c'est elle");
    assert.equal(d2.refusees[0]!.n, 1);
    // la première VALIDE : une A altérée devant ne prend pas la place d'A′
    const d3 = classer([vAlt, vA2, vB], fed);
    assert.equal(d3.classees[0]!.score, 6 * FEUILLES);
    assert.equal(d3.refusees.length, 1);
    assert.equal(d3.refusees[0]!.n, 0);
    assert.match(d3.refusees[0]!.motif, /chaîne/);
  });

  it("refusées : trace altérée dans refusees avec son motif, pas classée ; libre, refusée", () => {
    const r = classer([vAlt, vLibre, vB], fed);
    assert.deepEqual(r.classees.map((c) => c.piece), [refDePiece(pieceB)]);
    assert.equal(r.classees[0]!.rang, 1);
    assert.equal(r.refusees.length, 2);
    assert.equal(r.refusees[0]!.n, 0);
    assert.equal(r.refusees[0]!.piece, refDePiece(pieceA));
    assert.match(r.refusees[0]!.motif, /chaîne/);
    assert.equal(r.refusees[1]!.n, 1);
    assert.equal(r.refusees[1]!.piece, null);
    assert.match(r.refusees[1]!.motif, /libre/);
    // rien reçu, rien classé
    assert.deepEqual(classer([], fed), { classees: [], refusees: [] });
  });

  it("une pièce, une veillée par jour, même sous un rang replié : le juge accepte 0,5 et 2³² (u32), le classement les refuse", () => {
    for (const [v, rang] of [
      [vDemi, "0.5"],
      [vDeux32, "4294967296"],
    ] as const) {
      assert.ok(jugerVeillee(v, fed).ok, `le juge voit la feuille du rang 0 sous le rang ${rang}`);
      assert.equal(refDePiece(v.ancre!.piece), `${pieceA.txid}:${rang}`, "une autre référence pour la même feuille");
      const r = classer([vA, v], fed);
      assert.deepEqual(r.classees.map((c) => c.piece), [refDePiece(pieceA)], "A une fois, pas deux");
      assert.equal(r.refusees.length, 1);
      assert.equal(r.refusees[0]!.n, 1);
      assert.equal(r.refusees[0]!.piece, `${pieceA.txid}:${rang}`);
      assert.match(r.refusees[0]!.motif, new RegExp(`rang ${rang.replace(".", "\\.")}`));
      // seule, elle n'est pas classée non plus : refusée avant d'être jugée
      assert.deepEqual(classer([v], fed).classees, []);
      // et son nom de fichier sort de la convention
      assert.equal(nomDeFichier(v), `${VEC.veillee.jour}-${pieceA.txid.slice(0, 8)}-${rang}.json`);
    }
    // un txid qui n'est pas en hexadécimales minuscules : refusé, pas normalisé
    const maj: Veillee = { ...vA, ancre: { ...vA.ancre!, piece: { ...vA.ancre!.piece, txid: pieceA.txid.toUpperCase() } } };
    const rm = classer([maj], fed);
    assert.deepEqual(rm.classees, []);
    assert.match(rm.refusees[0]!.motif, /txid/);
  });
});

describe("fantômes de salle : ceux qui sont passés par l'étage, avec les feuilles qu'ils avaient encore", () => {
  it("l'étage 0 : tous, à 64 feuilles ; la salle suivante : A et B, à 62 et 63 ; un étage jamais atteint : personne", () => {
    const { classees } = classer([vA, vB, vC], fed);
    const h = jour.hauteur;
    const porte = fantomesDeSalle(classees, 0, h, "fr");
    assert.deepEqual(porte.map((f) => [f.rang, f.etape, f.feuilles]), [[1, 0, FEUILLES], [2, 0, FEUILLES], [3, 0, FEUILLES]]);
    assert.equal(porte[0]!.fantome.nom, classees[0]!.fantome.nom);
    // A et B ont fait le même premier choix avec le même objet : même deuxième salle
    const e1 = classees[0]!.etapes[1]!.e;
    assert.equal(classees[1]!.etapes[1]!.e, e1);
    const suivante = fantomesDeSalle(classees, e1, h, "fr");
    assert.deepEqual(suivante.map((f) => [f.piece, f.etape, f.feuilles]), [
      [refDePiece(pieceA), 1, FEUILLES - 2],
      [refDePiece(pieceB), 1, FEUILLES - 1],
    ]);
    // un étage où aucun parcours ne passe
    const vus = new Set(classees.flatMap((c) => c.etapes.map((e) => e.e)));
    let jamais = 1;
    while (vus.has(jamais)) jamais += 1;
    assert.deepEqual(fantomesDeSalle(classees, jamais, h, "fr"), []);
    // la hauteur et la langue relisent l'épithète sans rejuger
    const echo = fantomesDeSalle(classees, 0, 2_000_000, "en");
    assert.ok(echo.every((f) => f.fantome.tournure === "echo" && f.fantome.nom.startsWith("Echo of the ")));
    // les feuilles à l'étape, recomptées depuis les gestes
    assert.equal(feuillesALEtape(["parler", "franchir", "ouvrir", "franchir"], 2), FEUILLES - 4);
    assert.equal(feuillesALEtape(["parler", "franchir"], 2), null);
  });
});

describe("lire le dépôt : index.json puis chaque fichier, dans l'ordre", () => {
  const nomA = nomDeFichier(vA)!;
  const nomB = nomDeFichier(vB)!;
  const nomC = nomDeFichier(vC)!;
  const corps = new Map<string, unknown>([
    [nomA, JSON.parse(serialiserVeillee(vA))],
    [nomB, JSON.parse(serialiserVeillee(vB))],
    [nomC, JSON.parse(serialiserVeillee(vC))],
    ["20331-deadbeef-0.json", JSON.parse(serialiserVeillee(vA))],
    ["20331-11111111-0.json", {}],
    ["20331-22222222-0.json", JSON.parse(serialiserVeillee(vLibre))],
    [`20331-${pieceA.txid.slice(0, 8)}-0.5.json`, JSON.parse(serialiserVeillee(vDemi))],
  ]);
  const TRONQUE = "20331-33333333-0.json";
  const COUPE = "20331-44444444-0.json";
  const base = "https://exemple.invalid/veillees/";
  const fetchSim = (index: unknown) => async (url: string) => {
    assert.ok(url.startsWith(base), url);
    const f = url.slice(base.length);
    if (f === INDEX_VEILLEES) return { ok: true, json: async () => index };
    if (f === TRONQUE) {
      return {
        ok: true,
        json: async () => {
          throw new Error("JSON tronqué");
        },
      };
    }
    if (f === COUPE) throw new Error("connexion coupée");
    const c = corps.get(f);
    if (c === undefined) return { ok: false, status: 404, json: async () => ({}) };
    return { ok: true, json: async () => c };
  };

  it("le nom d'une preuve : <jour>-<txid 8 hex>-<rang>.json ; une libre n'en a pas", () => {
    assert.equal(nomA, `${VEC.veillee.jour}-${pieceA.txid.slice(0, 8)}-${pieceA.rang}.json`);
    assert.equal(nomDeFichier(vLibre), null);
  });

  it("les preuves lues dans l'ordre de l'index ; refusées avec leur motif : nom, 404, illisible, libre, nom ≠ preuve", async () => {
    const demi = `20331-${pieceA.txid.slice(0, 8)}-0.5.json`;
    const index = [
      nomA,
      "../etat.json",
      nomB,
      "20331-00000000-1.json",
      "20331-11111111-0.json",
      "20331-22222222-0.json",
      nomC,
      "20331-deadbeef-0.json",
      7,
      TRONQUE,
      COUPE,
      demi,
    ];
    const l = await lireVeillees(fetchSim(index), base);
    assert.ok("preuves" in l, "erreur" in l ? l.erreur : "");
    if (!("preuves" in l)) return;
    assert.deepEqual(l.preuves.map((v) => refDePiece(v.ancre!.piece)), [refDePiece(pieceA), refDePiece(pieceB), refDePiece(pieceC)]);
    assert.deepEqual(
      l.refus.map((r) => r.fichier),
      ["../etat.json", "20331-00000000-1.json", "20331-11111111-0.json", "20331-22222222-0.json", "20331-deadbeef-0.json", "7", TRONQUE, COUPE, demi],
    );
    assert.match(l.refus[0]!.motif, /nom refusé/);
    assert.match(l.refus[1]!.motif, /404/);
    assert.match(l.refus[2]!.motif, /eidos-veillee/);
    assert.match(l.refus[3]!.motif, /libre/);
    assert.match(l.refus[4]!.motif, new RegExp(`${nomA} attendu`));
    assert.match(l.refus[5]!.motif, /nom refusé/);
    // un fichier dont le JSON ne se lit pas, un fichier que le réseau coupe : refusés seuls, les autres lus
    assert.match(l.refus[6]!.motif, /illisible : JSON tronqué/);
    assert.match(l.refus[7]!.motif, /illisible : connexion coupée/);
    // le rang replié (0,5) ne peut pas même être nommé : hors convention
    assert.match(l.refus[8]!.motif, /nom refusé/);
    // ce qui est lu se classe tel quel
    const { classees, refusees } = classer(l.preuves, fed);
    assert.deepEqual(classees.map((c) => [c.rang, c.piece]), [[1, refDePiece(pieceA)], [2, refDePiece(pieceB)], [3, refDePiece(pieceC)]]);
    assert.equal(refusees.length, 0);
    // un index vide : rien, sans erreur
    const vide = await lireVeillees(fetchSim([]), base);
    assert.deepEqual(vide, { preuves: [], refus: [] });
  });

  it("index injoignable, réseau mort, index qui n'est pas un tableau : une erreur, pas un classement", async () => {
    const ko = await lireVeillees(async () => ({ ok: false, status: 404, json: async () => ({}) }), base);
    assert.match((ko as { erreur: string }).erreur, /index injoignable \(404\)/);
    const mort = await lireVeillees(async () => {
      throw new Error("hors ligne");
    }, base);
    assert.match((mort as { erreur: string }).erreur, /injoignable.*hors ligne/);
    const objet = await lireVeillees(fetchSim({ fichiers: [nomA] }), base);
    assert.match((objet as { erreur: string }).erreur, /tableau/);
  });
});

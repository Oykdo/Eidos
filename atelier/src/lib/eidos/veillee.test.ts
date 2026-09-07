import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { fromHex, hexOf } from "./hash.ts";
import { preuveReseau, serialiser } from "./merkle.ts";
import { CHOIX, ETAPES, run } from "./pendule.ts";
import { parserFederation, parserTeteReseau } from "./temoin.ts";
import {
  FEUILLES,
  FRANCHIR_AU_SOMMET,
  HAUTEUR_VEILLEE,
  arreterVeillee,
  construireArbre,
  estPremierDuJour,
  exporterVeillee,
  feuillesRestantes,
  graineArbre,
  graineDuJour,
  jourDe,
  jugerVeillee,
  ouvrirVeillee,
  parcoursDe,
  parserVeillee,
  scoreVeillee,
  serialiserVeillee,
  signerFeuille,
  signerGeste,
  type Veillee,
} from "./veillee.ts";
import { verifierMss } from "./xmss.ts";

type TeteBrute = Record<string, unknown>;
const VEC = JSON.parse(readFileSync(new URL("../../../../vecteurs.json", import.meta.url), "utf8")) as {
  xmss: {
    graine: string;
    hauteur: number;
    graine_publique: string;
    racine: string;
    feuille_0: string;
    message: string;
    signature: { indice: number; wots: string; chemin: string[] };
  };
  veillee: {
    federation: { hauteur_mss: number; racines: string[]; graines_publiques: string[] };
    minuit: number;
    jour: number;
    veille: TeteBrute;
    premier_du_jour: TeteBrute;
    second_du_jour: TeteBrute;
    sorties_au_premier: { txid: string; rang: number; adresse: string; montant: number }[];
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
const piece = VEC.veillee.sorties_au_premier[0]!;
// la pièce est prouvée contre la racine UTXO du premier bloc du jour : le carnet
// publié au second bloc contient aussi la coinbase du second — on prouve avec
// les sorties du premier (vecteur), donc sans elle
const preuveJour = (() => {
  const p = preuveReseau(VEC.veillee.sorties_au_premier, `${piece.txid}:${piece.rang}`);
  if (!p) throw new Error("preuve absente");
  return serialiser(p);
})();

const MAITRE = "coffre-de-test";
const arbre = construireArbre(graineArbre(MAITRE, jour.idBloc, piece));

function ouvrir(): Veillee {
  const v = ouvrirVeillee(arbre, jour, veille, piece, preuveJour);
  if ("erreur" in v) throw new Error(v.erreur);
  return v;
}

function franchir(v: Veillee, n: number, choix = 0): Veillee {
  let x = v;
  for (let k = 0; k < n; k++) {
    const r = signerGeste(x, arbre, { g: "franchir", arg: choix, mot: 1000 + k });
    if ("erreur" in r) throw new Error(r.erreur);
    x = r;
  }
  return x;
}

describe("l'arbre de feuilles = federation.CleValidateur, à l'octet", () => {
  it("racine, feuille 0 et signature du vecteur xmss (hauteur 4) retrouvées", () => {
    const a = construireArbre(fromHex(VEC.xmss.graine), VEC.xmss.hauteur);
    assert.equal(hexOf(a.grainePub), VEC.xmss.graine_publique);
    assert.equal(hexOf(a.racine), VEC.xmss.racine);
    assert.equal(hexOf(a.niveaux[0]![0]!), VEC.xmss.feuille_0);
    const s = signerFeuille(a, 0, fromHex(VEC.xmss.message));
    assert.equal(hexOf(s.wots), VEC.xmss.signature.wots);
    assert.deepEqual(s.chemin.map(hexOf), VEC.xmss.signature.chemin);
    assert.equal(s.indice, VEC.xmss.signature.indice);
  });

  it("toute feuille signe et se vérifie contre la racine ; une autre feuille, non", () => {
    const m = fromHex(VEC.xmss.message);
    for (const i of [0, 1, 37, FEUILLES - 1]) {
      const s = signerFeuille(arbre, i, m);
      assert.equal(verifierMss(arbre.racine, arbre.grainePub, HAUTEUR_VEILLEE, m, s), true, `feuille ${i}`);
      assert.equal(verifierMss(arbre.racine, arbre.grainePub, HAUTEUR_VEILLEE, m, { ...s, indice: (i + 1) % FEUILLES }), false);
    }
    assert.throws(() => signerFeuille(arbre, FEUILLES, m));
    assert.equal(arbre.niveaux.length, HAUTEUR_VEILLEE + 1);
  });
});

describe("le jour : le premier bloc, prouvé par deux têtes", () => {
  it("la veille puis le premier bloc du jour : oui ; le second bloc du jour : non", () => {
    assert.equal(jourDe(VEC.veillee.minuit), VEC.veillee.jour);
    assert.equal(jourDe(VEC.veillee.minuit - 1), VEC.veillee.jour - 1);
    const j = estPremierDuJour(jour, veille);
    assert.ok(j.ok && j.jour === VEC.veillee.jour);
    const s = estPremierDuJour(second, jour);
    assert.ok(!s.ok && /premier bloc/.test(s.motif));
    assert.ok(!estPremierDuJour(second, veille).ok, "pas consécutifs");
    // la graine du parcours ne dépend que du bloc : même jour pour tous
    assert.equal(hexOf(graineDuJour(jour.idBloc)), hexOf(graineDuJour(jour.idBloc)));
    assert.notEqual(hexOf(graineDuJour(jour.idBloc)), hexOf(graineDuJour(second.idBloc)));
    // la graine de l'arbre dépend du coffre : deux coffres, deux arbres
    assert.notEqual(hexOf(graineArbre("a", jour.idBloc, piece)), hexOf(graineArbre("b", jour.idBloc, piece)));
    assert.notEqual(hexOf(graineArbre("a", jour.idBloc, piece)), hexOf(graineArbre("a", jour.idBloc, { ...piece, rang: 1 })));
  });

  it("ouvrir refuse le second bloc, une preuve étrangère, un arbre d'une autre hauteur", () => {
    assert.match((ouvrirVeillee(arbre, second, jour, piece, preuveJour) as { erreur: string }).erreur, /premier bloc/);
    assert.match((ouvrirVeillee(arbre, jour, veille, piece, { ...preuveJour, racine: "00".repeat(32) }) as { erreur: string }).erreur, /rompu|étrangère/);
    const petit = construireArbre(fromHex(VEC.xmss.graine), 4);
    assert.match((ouvrirVeillee(petit, jour, veille, piece, preuveJour) as { erreur: string }).erreur, /hauteur/);
    const v = ouvrir();
    assert.equal(v.jour, VEC.veillee.jour);
    assert.equal(feuillesRestantes(v), FEUILLES);
    assert.equal(parcoursDe(v).etage, 0);
  });
});

describe("la clé comme vie : une feuille par geste, l'arbre vide est la fin", () => {
  it("26 fins de salle = sommet, exporté, relu, jugé sans rejouer ; le parcours est celui du pendule", () => {
    let v = ouvrir();
    v = signerGeste(v, arbre, { g: "parler", arg: 0 }) as Veillee;
    v = franchir(v, FRANCHIR_AU_SOMMET);
    assert.equal(v.fin, "sommet");
    assert.equal(v.gestes.length, FRANCHIR_AU_SOMMET + 1);
    const ex = exporterVeillee(v);
    assert.ok(!("erreur" in ex));
    const relue = parserVeillee(serialiserVeillee(v));
    assert.ok(!("erreur" in relue), "erreur" in relue ? relue.erreur : "");
    const j = jugerVeillee(relue, fed);
    assert.ok(j.ok, j.ok ? "" : j.motif);
    if (j.ok) {
      assert.equal(j.salles, ETAPES);
      assert.equal(j.butin, 1);
      assert.equal(j.feuilles, FRANCHIR_AU_SOMMET + 1);
      assert.equal(scoreVeillee(j), ETAPES * FEUILLES + 1);
      const attendu = run(graineDuJour(jour.idBloc), () => CHOIX[0]!, (i) => 1000 + i);
      assert.deepEqual(j.etapes, attendu);
      assert.ok(j.etapes[ETAPES - 1]!.e >= 226, "dernière salle dans la bande d'Uranie");
    }
    assert.equal((signerGeste(v, arbre, { g: "parler", arg: 0 }) as { erreur: string }).erreur, "finie");
  });

  it("64 gestes sans le sommet = épuisé ; la dernière feuille est la mort, la preuve reste", () => {
    let v = ouvrir();
    v = franchir(v, 10);
    for (let k = 0; k < FEUILLES - 10; k++) {
      const r = signerGeste(v, arbre, { g: k % 2 ? "ouvrir" : "prendre", arg: k });
      assert.ok(!("erreur" in r), `geste ${k}`);
      v = r;
    }
    assert.equal(v.fin, "epuise");
    assert.equal(feuillesRestantes(v), 0);
    assert.equal((signerGeste(v, arbre, { g: "franchir", arg: 0 }) as { erreur: string }).erreur, "finie");
    const j = jugerVeillee(v, fed);
    assert.ok(j.ok, j.ok ? "" : j.motif);
    if (j.ok) {
      assert.equal(j.salles, 11);
      assert.equal(j.butin, FEUILLES - 10);
      assert.equal(j.fin, "epuise");
    }
  });

  it("porte et abandon arrêtent ; en cours ne se juge pas", () => {
    const v = franchir(ouvrir(), 3);
    assert.match((jugerVeillee(v, fed) as { motif: string }).motif, /en cours/);
    assert.ok("erreur" in exporterVeillee(v));
    const porte = arreterVeillee(v, "porte");
    const j = jugerVeillee(porte, fed);
    assert.ok(j.ok && j.fin === "porte" && j.salles === 4);
    assert.equal(arreterVeillee(porte, "abandon").fin, "porte");
  });

  it("refuse : feuille réutilisée, geste hors ordre, message altéré, étage déclaré faux, fin mensongère, tête d'un autre jour", () => {
    const v = arreterVeillee(franchir(signerGeste(ouvrir(), arbre, { g: "ouvrir", arg: 5 }) as Veillee, 2), "abandon");
    const base = jugerVeillee(v, fed);
    assert.ok(base.ok, base.ok ? "" : base.motif);

    // la même feuille deux fois : deux appareils, ou un rejeu
    const g1 = v.gestes[1]!;
    const reuse = { ...v, gestes: [v.gestes[0]!, g1, { ...v.gestes[2]!, sig: { ...v.gestes[2]!.sig, indice: 1 } }] };
    assert.match((jugerVeillee(reuse, fed) as { motif: string }).motif, /indice/);
    // gestes permutés : la chaîne se rompt
    const perm = { ...v, gestes: [v.gestes[1]!, v.gestes[0]!, v.gestes[2]!] };
    assert.match((jugerVeillee(perm, fed) as { motif: string }).motif, /indice|chaîne/);
    // un octet du message
    const alt = { ...v, gestes: v.gestes.map((g, k) => (k === 1 ? { ...g, mot: g.mot + 1 } : g)) };
    assert.match((jugerVeillee(alt, fed) as { motif: string }).motif, /chaîne/);
    // étage déclaré ailleurs que là où le pendule est
    const faux = { ...v, gestes: v.gestes.map((g, k) => (k === 2 ? { ...g, etage: g.etage + 1 } : g)) };
    assert.match((jugerVeillee(faux, fed) as { motif: string }).motif, /parcours/);
    // sommet déclaré sans les 26 franchir
    assert.match((jugerVeillee({ ...v, fin: "sommet" }, fed) as { motif: string }).motif, /sommet/);
    // épuisé déclaré avec des feuilles restantes
    assert.match((jugerVeillee({ ...v, fin: "epuise" }, fed) as { motif: string }).motif, /épuisé/);
    // ancrée sur le second bloc du jour
    const autre = { ...v, tete: second, veille: jour };
    assert.match((jugerVeillee(autre, fed) as { motif: string }).motif, /premier bloc|étrangère/);
    // une signature d'un autre arbre
    const autreArbre = construireArbre(graineArbre("autre", jour.idBloc, piece));
    const vol = { ...v, racine: hexOf(autreArbre.racine), grainePub: hexOf(autreArbre.grainePub) };
    assert.match((jugerVeillee(vol, fed) as { motif: string }).motif, /chaîne|signature/);
    // signer avec un arbre qui n'est pas celui de la veillée
    assert.equal((signerGeste(ouvrir(), autreArbre, { g: "parler", arg: 0 }) as { erreur: string }).erreur, "arbre");
    assert.equal((signerGeste(ouvrir(), arbre, { g: "franchir", arg: 3 }) as { erreur: string }).erreur, "choix");
    assert.ok("erreur" in parserVeillee("{}"));
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { xorshift } from "./pendule-phase0.ts";
import { FEUILLES, FRANCHIR_AU_SOMMET, jourDe, type Fin } from "./veillee.ts";
import { SAC_PLACES, ouvrirVeilleeDansCoffre, reserverEnSession } from "./veillee-tour.ts";
import { coffreAtelier } from "./wallet.ts";
import {
  BUTIN_MAX,
  FINS,
  POLITIQUES,
  SEUILS,
  graineDePolitique,
  jouerVeillee,
  jourDuVecteur,
  mesuresDe,
  simuler,
  verdictDe,
  type Politique,
  type Run,
} from "./veillee-bot.ts";

// Douze runs (2,5 à 4 s chacun, l'arbre rebâti à chaque ouverture) : le rapport gelé, calculé une fois pour toute la suite.
const GRAINE = 7;
const RUNS = 4;
const rapport = simuler(RUNS, GRAINE);
const tous: Run[] = POLITIQUES.flatMap((p) => rapport.detail[p]);

/** La table gelée : fin, feuilles brûlées, butin — par politique, run par run. Toute retouche
 *  du bot, du pendule, d'un acte de la Tour ou du sac (veillee-tour.ts, 27 places) la régénère
 *  sciemment : `node --experimental-strip-types src/lib/eidos/veillee-bot.ts 4` imprime les runs. */
const GELE: Record<Politique, [Fin, number, number][]> = {
  avare: [
    ["sommet", 26, 0],
    ["sommet", 26, 0],
    ["sommet", 26, 0],
    ["sommet", 26, 0],
  ],
  gourmand: [
    ["sommet", 46, 20],
    ["sommet", 47, 21],
    ["sommet", 46, 20],
    ["sommet", 48, 22],
  ],
  mesure: [
    ["sommet", 45, 19],
    ["sommet", 42, 16],
    ["sommet", 30, 4],
    ["sommet", 35, 9],
  ],
};
const P_MESURE = ["0.6813", "0.6102", "0.1750", "0.3903"];
// un seul « parler » par run : Thalie (demande « rien ») ; Uranie, « rien » aussi, vient quand le sac est plein
const GOURMAND_PARLER_OUVRIR: [number, number][] = [
  [1, 19],
  [1, 20],
  [1, 19],
  [1, 21],
];
// refus sans feuille : demandes insatisfaites, puis le sac plein
const GOURMAND_REFUS = [18, 10, 16, 13];

describe("le bot de la veillée : la falsification de §2.4, mesurée", () => {
  it("graine 7, 4 runs par politique : le rapport est gelé — mêmes chiffres à chaque exécution", () => {
    assert.equal(rapport.runs, RUNS);
    assert.equal(rapport.graineBot, GRAINE);
    const jour = jourDuVecteur();
    assert.equal(rapport.hauteur, jour.tete.hauteur);
    assert.equal(rapport.idBloc, jour.tete.idBloc);
    assert.equal(rapport.jour, jourDe(jour.tete.ts));
    for (const p of POLITIQUES) {
      assert.deepEqual(
        rapport.detail[p].map((r) => [r.fin, r.feuilles, r.butin]),
        GELE[p],
        `politique ${p}`,
      );
    }
    assert.deepEqual(rapport.detail.mesure.map((r) => r.p.toFixed(4)), P_MESURE);
    assert.deepEqual(rapport.detail.gourmand.map((r) => [r.gestes.parler, r.gestes.ouvrir]), GOURMAND_PARLER_OUVRIR);
    assert.deepEqual(rapport.detail.gourmand.map((r) => r.refus), GOURMAND_REFUS);
    assert.equal(rapport.politiques.gourmand.feuillesMoyennes, 46.75);
    assert.equal(rapport.politiques.gourmand.feuillesMax, 48);
    assert.equal(rapport.politiques.mesure.butinMoyen, 12);
    // aucun sommet à 38, aucun run à 64 feuilles : le sac plafonne le butin, le budget ne mord pas
    for (const p of POLITIQUES) {
      assert.equal(rapport.politiques[p].partSommets38, 0);
      assert.ok(rapport.politiques[p].feuillesMax < FEUILLES);
    }
    assert.equal(rapport.budgetMordu, false);
    assert.deepEqual(rapport.verdict, { dilemmeAbsent: false, budgetTropCourt: false, ok: true });
    // les graines des trois flux sont distinctes et dérivées du tag
    assert.equal(new Set(POLITIQUES.map((p) => graineDePolitique(GRAINE, p))).size, 3);
    assert.notEqual(graineDePolitique(GRAINE, "avare"), graineDePolitique(GRAINE + 1, "avare"));
  });

  it("invariants : feuilles ≤ 64, sommet ⇔ 26 franchir, salles = franchir + 1, score = salles × 64 + butin, butin ≤ sac", () => {
    assert.equal(tous.length, RUNS * POLITIQUES.length);
    for (const r of tous) {
      assert.ok(r.feuilles <= FEUILLES, `${r.feuilles} feuilles`);
      assert.ok(r.franchir <= FRANCHIR_AU_SOMMET);
      assert.equal(r.fin === "sommet", r.franchir === FRANCHIR_AU_SOMMET, `${r.politique} : ${r.fin} avec ${r.franchir} franchir`);
      assert.equal(r.fin === "epuise", r.feuilles === FEUILLES && r.franchir < FRANCHIR_AU_SOMMET);
      assert.equal(r.salles, r.franchir + 1);
      assert.equal(r.butin, r.feuilles - r.franchir);
      assert.ok(r.butin <= BUTIN_MAX);
      // chaque geste de butin de ce bot met un objet au sac : le sac plein borne le butin
      assert.ok(r.butin <= SAC_PLACES, `${r.butin} de butin pour ${SAC_PLACES} places`);
      assert.equal(r.score, r.salles * FEUILLES + r.butin);
      assert.ok(FINS.includes(r.fin));
      // chaque feuille brûlée est un geste signé, d'une des quatre sortes ; le bot ne prend jamais
      assert.equal(r.gestes.franchir + r.gestes.parler + r.gestes.ouvrir + r.gestes.prendre, r.feuilles);
      assert.equal(r.gestes.franchir, r.franchir);
      assert.equal(r.gestes.prendre, 0);
    }
    for (const p of POLITIQUES) {
      const m = rapport.politiques[p];
      assert.equal(FINS.reduce((s, f) => s + m.fins[f], 0), m.runs);
      assert.equal(m.sommets, m.fins.sommet);
      assert.equal(m.tauxSommet, m.sommets / m.runs);
      assert.equal(m.feuillesMax, Math.max(...rapport.detail[p].map((r) => r.feuilles)));
    }
  });

  it("l'avare touche toujours le sommet avec 26 feuilles et 0 butin ; le gourmand creuse chaque arrivée jusqu'au sac plein ; le mesuré tire p dans ]0, 1[", () => {
    for (const r of rapport.detail.avare) {
      assert.equal(r.fin, "sommet");
      assert.equal(r.feuilles, FRANCHIR_AU_SOMMET);
      assert.equal(r.butin, 0);
      assert.equal(r.p, 0);
      assert.equal(r.refus, 0);
    }
    assert.equal(rapport.politiques.avare.tauxSommet, 1);
    assert.equal(rapport.politiques.avare.feuillesMoyennes, FRANCHIR_AU_SOMMET);
    for (const r of rapport.detail.gourmand) {
      assert.equal(r.p, 1);
      // chaque salle tente la case d'arrivée : creusée, ou refusée sans feuille (sac plein)
      assert.ok(r.gestes.ouvrir + r.refus >= r.franchir, `${r.gestes.ouvrir} ouvrir + ${r.refus} refus pour ${r.franchir} franchir`);
      assert.ok(r.butin > 0);
      assert.ok(r.refus > 0, "le sac plein refuse, sans rien brûler");
      assert.ok(r.feuilles < FEUILLES, "le gourmand ne vide jamais l'arbre sur ce coffre");
    }
    for (const r of rapport.detail.mesure) {
      assert.ok(r.p > 0 && r.p < 1);
      assert.ok(r.butin <= rapport.politiques.gourmand.feuillesMax);
    }
  });

  it("le mesuré à p = 0 rejoue l'avare, à p = 1 le gourmand, sur le même flux ; un run ne dépend pas du nombre de runs", () => {
    const jour = jourDuVecteur();
    const m0 = jouerVeillee("mesure", xorshift(graineDePolitique(GRAINE, "avare")), jour, 0);
    assert.deepEqual({ ...m0, politique: "avare" }, rapport.detail.avare[0]);
    const m1 = jouerVeillee("mesure", xorshift(graineDePolitique(GRAINE, "gourmand")), jour, 1);
    assert.deepEqual({ ...m1, politique: "gourmand" }, rapport.detail.gourmand[0]);
    const seul = jouerVeillee("mesure", xorshift(graineDePolitique(GRAINE, "mesure")), jour);
    assert.deepEqual(seul, rapport.detail.mesure[0]);
  });

  it("le bot réserve ses indices pour lui seul : le registre de session de veillee-tour ne voit rien", () => {
    // quinze runs ont signé les feuilles 0… de l'arbre du coffre d'atelier ; la session, elle, en est encore à 0
    const jour = jourDuVecteur();
    const o = ouvrirVeilleeDansCoffre(coffreAtelier("vide"), jour.tete, jour.veille, null);
    assert.ok(o.ok);
    assert.equal(reserverEnSession(o.v.racine, 0), true);
  });

  it("le verdict lit les seuils de §2.4 : > 80 % des sommets à 38 = dilemme absent ; < 30 % de sommets = budget trop court ; 64 feuilles = budget mordu", () => {
    assert.equal(BUTIN_MAX, 38);
    const gabarit = tous[0]!;
    const fabrique = (fin: Fin, butin: number): Run => {
      const franchir = fin === "sommet" ? FRANCHIR_AU_SOMMET : fin === "epuise" ? FEUILLES - butin : 10;
      return { ...gabarit, fin, franchir, butin, feuilles: franchir + butin, salles: franchir + 1 };
    };
    // cinq runs : quatre sommets à 38, un à 37 → 80 % exactement, pas au-dessus : le dilemme tient
    const juste = mesuresDe([fabrique("sommet", 38), fabrique("sommet", 38), fabrique("sommet", 38), fabrique("sommet", 38), fabrique("sommet", 37)]);
    assert.equal(juste.partSommets38, 0.8);
    assert.equal(juste.feuillesMax, FEUILLES);
    assert.equal(verdictDe(juste).dilemmeAbsent, false);
    // cinq sommets à 38 → 100 % : dilemme absent
    const tout = mesuresDe(Array.from({ length: 5 }, () => fabrique("sommet", 38)));
    assert.equal(tout.partSommets38, 1);
    assert.deepEqual(verdictDe(tout), { dilemmeAbsent: true, budgetTropCourt: false, ok: false });
    // un sommet sur dix : budget trop court ; les épuisés (64 feuilles, 40 de butin) ne comptent pas comme sommets
    const court = mesuresDe([fabrique("sommet", 38), ...Array.from({ length: 9 }, () => fabrique("epuise", 40))]);
    assert.equal(court.tauxSommet, 0.1);
    assert.equal(court.partSommets38, 1);
    assert.equal(court.feuillesMax, FEUILLES);
    assert.deepEqual(court.fins, { sommet: 1, epuise: 9, porte: 0, abandon: 0 });
    assert.deepEqual(verdictDe(court), { dilemmeAbsent: true, budgetTropCourt: true, ok: false });
    // sans aucun sommet : budget trop court, mais pas de dilemme à déclarer absent ; 13 feuilles au plus, rien de mordu
    const aucun = mesuresDe([fabrique("porte", 3), fabrique("abandon", 0)]);
    assert.equal(aucun.partSommets38, 0);
    assert.equal(aucun.feuillesMax, 13);
    assert.deepEqual(verdictDe(aucun), { dilemmeAbsent: false, budgetTropCourt: true, ok: false });
    assert.equal(verdictDe({ sommets: 3, partSommets38: 0, tauxSommet: SEUILS.tauxSommetMin }).budgetTropCourt, false);
    assert.deepEqual(mesuresDe([]), {
      runs: 0,
      sommets: 0,
      tauxSommet: 0,
      feuillesMoyennes: 0,
      feuillesMax: 0,
      butinMoyen: 0,
      partSommets38: 0,
      fins: { sommet: 0, epuise: 0, porte: 0, abandon: 0 },
    });
  });

  it("refus : zéro run, une probabilité hors de [0, 1]", () => {
    assert.throws(() => simuler(0), /au moins un run/);
    assert.throws(() => simuler(1.5), /au moins un run/);
    const jour = jourDuVecteur();
    assert.throws(() => jouerVeillee("mesure", xorshift(1), jour, 1.5), /probabilité/);
    assert.throws(() => jouerVeillee("mesure", xorshift(1), jour, -0.1), /probabilité/);
    assert.throws(() => jouerVeillee("mesure", xorshift(1), jour, Number.NaN), /probabilité/);
  });
});

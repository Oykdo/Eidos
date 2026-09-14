/**
 * Animation : les événements se lisent dans le moteur, les poses en découlent
 * sans horloge. Chaque refus a son contrôle qui le viole.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DUREES, evenementsDe, ligneDeTemps, posesA, type Evenement } from "./animation.ts";
import { finDePhase, jouer, ouvrirBataille, rejouer, traceBataille } from "./bataille.ts";
import { chemin } from "./grille.ts";
import { MULT_TENUE, TENUE_BASE } from "./unite.ts";
import {
  PA_PAR_TOUR,
  RejetTactique,
  type Acte,
  type Camp,
  type Case,
  type EtatBataille,
  type Unite,
} from "./types.ts";

/** L'étage du banc : sa rangée y = 1 est libre de x = 0 à 8. */
const ETAGE = 198;
const RANG = (x: number): Case => ({ x, y: 1 });

function brute(
  id: number,
  camp: Camp,
  pos: Case,
  axes: { lame: number; ecu: number; eperon: number; arc: number },
): Unite {
  return {
    id,
    camp,
    mot: 2064595364,
    archetype: "mars",
    age: "Satya",
    classe: "arme",
    axes: { ...axes, somme: 64, pointe: "lame" },
    pos,
    precedente: null,
    elan: 0,
    tenue: TENUE_BASE + MULT_TENUE * axes.ecu,
    pa: PA_PAR_TOUR,
  };
}

/**
 * Un coffre lent et lourd en 1, un Indéchiffré vif en 4 ; deux pas les séparent
 * du contact. `frele` : le même Indéchiffré sans tenue, que le coup couche.
 */
function duel(ecu = 20): EtatBataille {
  return ouvrirBataille(
    ETAGE,
    [brute(0, "coffre", RANG(1), { lame: 40, ecu: 20, eperon: 0, arc: 4 })],
    [brute(1, "indechiffre", RANG(4), { lame: 8, ecu, eperon: 40, arc: 16 })],
    8,
  );
}
const frele = () => duel(0);

const genres = (evs: readonly Evenement[]) => evs.map((e) => e.genre);

describe("animation — les événements", () => {
  it("un pas : le parcours entier, de la case quittée à la case d'arrivée, une case à la fois", () => {
    const e = duel();
    const acte: Acte = { geste: "deplacer", unite: 0, vers: RANG(3) };
    const evs = evenementsDe(e, [acte]);
    assert.equal(evs.length, 1);
    const ev = evs[0]!;
    assert.equal(ev.genre, "pas");
    if (ev.genre !== "pas") return;
    assert.deepEqual(ev.parcours[0], RANG(1));
    assert.deepEqual(ev.parcours[ev.parcours.length - 1], RANG(3));
    assert.deepEqual(ev.parcours.slice(1), chemin(e.obstacles, e.unites, e.unites[0]!, RANG(3), 2));
    for (let i = 1; i < ev.parcours.length; i++) {
      const a: Case = ev.parcours[i - 1]!;
      const b: Case = ev.parcours[i]!;
      assert.equal(Math.abs(a.x - b.x) + Math.abs(a.y - b.y), 1, "deux cases du parcours ne sont pas voisines");
    }
  });

  it("un coup contré : le coup puis le contre, lus dans le journal ; un coup qui couche : le coup puis la chute", () => {
    // Le coffre avance au contact puis frappe : l'Indéchiffré (éperon 40 contre 0)
    // rend le coup s'il tient encore ; sans tenue, il tombe et ne rend rien.
    const actes: Acte[] = [
      { geste: "deplacer", unite: 0, vers: RANG(3) },
      { geste: "frapper", unite: 0, cible: 1 },
    ];
    const contre = evenementsDe(duel(), actes);
    assert.deepEqual(genres(contre), ["pas", "coup", "coup"]);
    assert.equal(rejouer(duel(), actes).journal.length, 2, "le journal n'a pas deux coups");
    const rendu = contre[2]!;
    assert.ok(rendu.genre === "coup" && rendu.coup.riposte, "le second coup n'est pas le contre");
    assert.ok(rendu.genre === "coup" && rendu.coup.attaquant === 1 && rendu.coup.cible === 0);

    const couche = evenementsDe(frele(), actes);
    assert.deepEqual(genres(couche), ["pas", "coup", "chute"]);
    assert.equal(rejouer(frele(), actes).journal.length, 1, "un mot tombé a rendu un coup");
    assert.equal(couche[2]!.genre === "chute" && couche[2]!.unite, 1);
  });

  it("le contre qui abat l'attaquant : coup, contre, chute de l'attaquant", () => {
    // Un coffre à un point de tenue frappe un Indéchiffré plus vif et bien tenu.
    const e = ouvrirBataille(
      ETAGE,
      [{ ...brute(0, "coffre", RANG(3), { lame: 4, ecu: 0, eperon: 0, arc: 60 }), tenue: 1 }],
      [brute(1, "indechiffre", RANG(4), { lame: 4, ecu: 40, eperon: 20, arc: 0 })],
      8,
    );
    const evs = evenementsDe(e, [{ geste: "frapper", unite: 0, cible: 1 }]);
    assert.deepEqual(genres(evs), ["coup", "coup", "chute"]);
    const contre = evs[1]!;
    assert.ok(contre.genre === "coup" && contre.coup.riposte, "le second coup n'est pas le contre");
    assert.equal(evs[2]!.genre === "chute" && evs[2]!.unite, 0);
  });

  it("passer : un événement sans durée ; un acte que le moteur refuse lève, rien n'est inventé", () => {
    const e = duel();
    assert.deepEqual(genres(evenementsDe(e, [{ geste: "passer", unite: 0 }])), ["passer"]);
    assert.throws(
      () => evenementsDe(e, [{ geste: "deplacer", unite: 0, vers: RANG(8) }]),
      RejetTactique,
      "un pas hors d'atteinte a produit un événement",
    );
    assert.throws(() => evenementsDe(e, [{ geste: "deplacer", unite: 9, vers: RANG(1) }]), RejetTactique);
  });

  it("les actes tracés d'une phase adverse rejouent l'état à l'octet", () => {
    // `evenementsDe` rejoue avec `jouer` : la trace de l'état d'arrivée est
    // celle de `rejouer`, quelle que soit la suite.
    const e = finDePhase(duel());
    const actes: Acte[] = [
      { geste: "deplacer", unite: 1, vers: RANG(2) },
      { geste: "frapper", unite: 1, cible: 0 },
    ];
    evenementsDe(e, actes);
    assert.equal(traceBataille(rejouer(e, actes)), traceBataille(jouer(jouer(e, actes[0]!), actes[1]!)));
  });
});

describe("animation — la ligne de temps et les poses", () => {
  it("durées plates : parCase par case parcourue, coup, chute, rien pour passer ; bout à bout", () => {
    const e = duel();
    const evs = evenementsDe(e, [
      { geste: "deplacer", unite: 0, vers: RANG(3) },
      { geste: "passer", unite: 0 },
    ]);
    const ligne = ligneDeTemps(evs);
    assert.equal(ligne.etapes.length, 2);
    assert.equal(ligne.etapes[0]!.debut, 0);
    assert.equal(ligne.etapes[0]!.fin, 2 * DUREES.parCase);
    assert.equal(ligne.etapes[1]!.debut, 2 * DUREES.parCase);
    assert.equal(ligne.etapes[1]!.fin, 2 * DUREES.parCase);
    assert.equal(ligne.duree, 2 * DUREES.parCase);
    assert.equal(ligneDeTemps([]).duree, 0);
    const coup = ligneDeTemps(
      evenementsDe(rejouer(frele(), [{ geste: "deplacer", unite: 0, vers: RANG(3) }]), [
        { geste: "frapper", unite: 0, cible: 1 },
      ]),
    );
    assert.deepEqual(
      coup.etapes.map((x) => [x.evenement.genre, x.debut, x.fin]),
      [
        ["coup", 0, DUREES.coup],
        ["chute", DUREES.coup, DUREES.coup + DUREES.chute],
      ],
    );
    assert.equal(coup.duree, DUREES.coup + DUREES.chute);
  });

  it("un pas se lit à mi-chemin : position fractionnaire entre deux cases voisines, puis l'arrivée", () => {
    const e = duel();
    const ligne = ligneDeTemps(evenementsDe(e, [{ geste: "deplacer", unite: 0, vers: RANG(3) }]));
    const pose = (t: number) => posesA(e, ligne, t).find((p) => p.unite === 0)!;
    assert.deepEqual([pose(-1).x, pose(-1).y], [1, 1], "avant le début, l'échiquier d'avant");
    assert.deepEqual([pose(0).x, pose(0).y], [1, 1]);
    assert.equal(pose(DUREES.parCase / 2).x, 1.5);
    assert.equal(pose(DUREES.parCase).x, 2);
    assert.equal(pose(DUREES.parCase * 1.5).x, 2.5);
    assert.equal(pose(ligne.duree).x, 3);
    assert.equal(pose(ligne.duree + 1000).x, 3, "après la fin, l'échiquier d'après");
    // L'autre unité ne bouge pas d'un pouce.
    const autre = posesA(e, ligne, DUREES.parCase / 2).find((p) => p.unite === 1)!;
    assert.deepEqual([autre.x, autre.y, autre.frappe, autre.encaisse, autre.chute], [4, 1, 0, 0, 0]);
  });

  it("un coup : pulsation de l'attaquant et recul de la cible à 1 au milieu, tenue entamée à l'impact ; le contre pulse à son tour", () => {
    const e = rejouer(duel(), [{ geste: "deplacer", unite: 0, vers: RANG(3) }]);
    const evs = evenementsDe(e, [{ geste: "frapper", unite: 0, cible: 1 }]);
    const ligne = ligneDeTemps(evs);
    const coup = evs[0]!;
    if (coup.genre !== "coup") throw new Error("premier événement autre qu'un coup");
    const tenueAvant = e.unites[1]!.tenue;
    const a = (t: number, id: number) => posesA(e, ligne, t).find((p) => p.unite === id)!;
    assert.equal(a(0, 0).frappe, 0);
    assert.equal(a(DUREES.coup / 2, 0).frappe, 1);
    assert.equal(a(DUREES.coup / 2, 1).encaisse, 1);
    assert.equal(a(DUREES.coup / 4, 1).tenue, tenueAvant, "la tenue a baissé avant l'impact");
    assert.equal(a(DUREES.coup / 2, 1).tenue, coup.coup.tenueApres);
    assert.equal(a(DUREES.coup, 0).frappe, 0, "la pulsation ne s'éteint pas");
    // Le contre : l'Indéchiffré pulse, le coffre recule et perd sa tenue.
    const contre = evs[1]!;
    if (contre.genre !== "coup") throw new Error("second événement autre qu'un coup");
    const milieu = DUREES.coup * 1.5;
    assert.equal(a(milieu, 1).frappe, 1);
    assert.equal(a(milieu, 0).encaisse, 1);
    assert.equal(a(milieu, 0).tenue, contre.coup.tenueApres);
    assert.equal(a(ligne.duree, 1).tenue, coup.coup.tenueApres);
  });

  it("une chute : 0 à son début, 1 à sa fin, tenue à zéro, et l'abattue reste dans les poses", () => {
    const e = rejouer(frele(), [{ geste: "deplacer", unite: 0, vers: RANG(3) }]);
    const ligne = ligneDeTemps(evenementsDe(e, [{ geste: "frapper", unite: 0, cible: 1 }]));
    const chute = ligne.etapes.find((x) => x.evenement.genre === "chute")!;
    const a = (t: number) => posesA(e, ligne, t).find((p) => p.unite === 1)!;
    assert.equal(a(chute.debut).chute, 0);
    assert.equal(a((chute.debut + chute.fin) / 2).chute, 0.5);
    assert.equal(a(chute.fin).chute, 1);
    assert.equal(a(chute.fin).tenue, 0);
    assert.ok(posesA(e, ligne, ligne.duree + 1).some((p) => p.unite === 1), "l'abattue a disparu des poses");
  });

  it("déterminisme : deux lectures du même instant sont identiques à l'octet", () => {
    const e = duel();
    const actes: Acte[] = [
      { geste: "deplacer", unite: 0, vers: RANG(3) },
      { geste: "frapper", unite: 0, cible: 1 },
    ];
    const ligne = ligneDeTemps(evenementsDe(e, actes));
    for (const t of [0, 37, 140, 281, 350, ligne.duree]) {
      assert.deepEqual(posesA(e, ligne, t), posesA(e, ligneDeTemps(evenementsDe(e, actes)), t));
    }
  });
});

/**
 * Traits : la télégraphie dessinée suit les intentions, case à case, sans
 * rien jouer.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { finDePhase, ouvrirBataille } from "./bataille.ts";
import { annoncer } from "./ia.ts";
import { traitsDe } from "./traits.ts";
import { MULT_TENUE, TENUE_BASE } from "./unite.ts";
import { PA_PAR_TOUR, type Camp, type Case, type Unite } from "./types.ts";

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

const voisines = (a: Case, b: Case) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;

describe("traits — la télégraphie dessinée", () => {
  it("sans intention, aucun trait ; l'annonce posée, un trait par case de pas et un par coup", () => {
    const nu = ouvrirBataille(
      ETAGE,
      [brute(0, "coffre", RANG(1), { lame: 16, ecu: 40, eperon: 0, arc: 8 })],
      [brute(1, "indechiffre", RANG(6), { lame: 40, ecu: 8, eperon: 16, arc: 0 })],
      8,
    );
    assert.deepEqual(traitsDe(nu), []);
    const annonce = annoncer(nu);
    const traits = traitsDe(annonce);
    const intention = annonce.intentions.find((i) => i.unite === 1)!;
    const pasAnnonces = intention.actes.filter((a) => a.geste === "deplacer").length;
    const coupsAnnonces = intention.actes.filter((a) => a.geste === "frapper").length;
    assert.equal(traits.filter((t) => t.genre === "coup").length, coupsAnnonces);
    assert.ok(pasAnnonces > 0, "l'Indéchiffré n'annonce aucun pas à cinq cases");
    // Les pas se suivent case à case depuis la case de l'unité.
    const pas = traits.filter((t) => t.genre === "pas");
    assert.ok(pas.length > 0);
    assert.deepEqual(pas[0]!.de, RANG(6));
    for (const t of pas) assert.ok(voisines(t.de, t.a), `un trait de pas saute de ${t.de.x},${t.de.y} à ${t.a.x},${t.a.y}`);
    for (let i = 1; i < pas.length; i++) assert.deepEqual(pas[i]!.de, pas[i - 1]!.a, "les traits de pas ne se suivent pas");
    // Un coup part de la dernière case atteinte et vise la case de la cible.
    for (const t of traits.filter((x) => x.genre === "coup")) {
      assert.deepEqual(t.de, pas.length > 0 ? pas[pas.length - 1]!.a : RANG(6));
      assert.deepEqual(t.a, RANG(1));
      assert.equal(t.unite, 1);
    }
  });

  it("au contact, un coup sans pas : un seul trait, de l'unité à sa cible", () => {
    const e = annoncer(
      ouvrirBataille(
        ETAGE,
        [brute(0, "coffre", RANG(3), { lame: 16, ecu: 40, eperon: 0, arc: 8 })],
        [brute(1, "indechiffre", RANG(4), { lame: 40, ecu: 8, eperon: 16, arc: 0 })],
        8,
      ),
    );
    const traits = traitsDe(e);
    assert.ok(traits.length >= 1);
    assert.ok(traits.every((t) => t.unite === 1));
    const coups = traits.filter((t) => t.genre === "coup");
    assert.ok(coups.length >= 1, "aucun coup annoncé au contact");
    assert.deepEqual(coups[0]!.a, RANG(3));
  });

  it("une intention dont l'unité est tombée ou dont la cible a disparu ne trace rien", () => {
    const e = annoncer(
      ouvrirBataille(
        ETAGE,
        [brute(0, "coffre", RANG(3), { lame: 16, ecu: 40, eperon: 0, arc: 8 })],
        [brute(1, "indechiffre", RANG(4), { lame: 40, ecu: 8, eperon: 16, arc: 0 })],
        8,
      ),
    );
    const sansUnite = { ...e, unites: e.unites.map((u) => (u.id === 1 ? { ...u, tenue: 0 } : u)) };
    assert.deepEqual(traitsDe(sansUnite), []);
    const sansCible = { ...e, unites: e.unites.map((u) => (u.id === 0 ? { ...u, tenue: 0 } : u)) };
    assert.deepEqual(traitsDe(sansCible).filter((t) => t.genre === "coup"), []);
    // Les intentions survivent au passage de main (`finDePhase` ne les touche
    // pas) : c'est `annoncer` qui les refait, et la partie l'appelle à chaque
    // retour de main. Ici, l'annonce périmée trace encore — une figure.
    assert.ok(traitsDe(finDePhase(e)).length >= 1);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ESPECES,
  FIOLES,
  boireDansCoffre,
  elixirDansCoffre,
  especeActive,
  especeDe,
  etageDominant,
  eteindreSoufre,
  objetElixir,
} from "./elixirs.ts";
import { sha256d, utf8 } from "./hash.ts";
import { glypheDe } from "./lecture.ts";
import { objetDepuisGraine } from "./objets.ts";
import { TRIA_PRIMA } from "./signatures.ts";
import { coffreAtelier } from "./wallet.ts";

const GRAINE = sha256d(utf8("elixir-test"));

describe("élixirs — la tria prima, un étage", () => {
  it("espèce = étage dominant du glyphe : sel ○, mercure ☽, soufre ✚", () => {
    assert.deepEqual([...ESPECES], ["sel", "mercure", "soufre"]);
    assert.deepEqual(
      TRIA_PRIMA.map((t) => t.id),
      ["sel", "mercure", "soufre"],
    );
    assert.equal(etageDominant([1, 0, 0]), 0);
    assert.equal(etageDominant([0, 3, 3]), 1);
    assert.equal(etageDominant([2, 2, 3]), 2);
    assert.equal(etageDominant([0, 0, 0]), 0);
    for (let i = 0; i < 40; i++) {
      const o = objetDepuisGraine(sha256d(utf8(`e${i}`)), "Kali");
      const g = glypheDe(o);
      assert.equal(especeDe(o), TRIA_PRIMA[etageDominant(g)].id);
    }
    for (const espece of ESPECES) {
      const o = objetElixir(GRAINE, "Treta", espece, "lune");
      assert.equal(especeDe(o), espece);
      assert.equal(o.archetype, "lune");
      assert.deepEqual(objetElixir(GRAINE, "Treta", espece, "lune"), o);
      assert.equal([...FIOLES[espece]].length, 3);
    }
  });

  it("effet borné à un étage : bu à 5, rien à 6", () => {
    const c0 = coffreAtelier("vide");
    const fiole = elixirDansCoffre(c0, GRAINE, "Kali", "sel");
    assert.equal(fiole.genre, "elixir");
    assert.equal(fiole.nom, "sel");
    const c = { ...c0, objets: [fiole] };
    const r = boireDansCoffre(c, 0, 5);
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.espece, "sel");
    assert.equal(especeActive(r.coffre, 5, "sel"), true);
    assert.equal(especeActive(r.coffre, 6, "sel"), false);
    assert.equal(especeActive(r.coffre, 5, "mercure"), false);
    assert.equal(especeActive(r.coffre, 5 + 255, "sel"), true);
  });

  it("élixir bu : retiré de la jauge, mot noté, jamais rebu", () => {
    const c0 = coffreAtelier("vide");
    const fiole = elixirDansCoffre(c0, GRAINE, "Kali", "mercure");
    const c = { ...c0, objets: [fiole, fiole] };
    const r = boireDansCoffre(c, 0, 9);
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.coffre.objets.length, 1);
    assert.deepEqual(r.coffre.tour.bus, [fiole.mot >>> 0]);
    assert.deepEqual(r.coffre.tour.elixirs, [
      { etage: 9, mot: fiole.mot >>> 0, espece: "mercure" },
    ]);
    const encore = boireDansCoffre(r.coffre, 0, 10);
    assert.equal(encore.ok, false);
    if (!encore.ok) assert.equal(encore.code, "deja");
    assert.deepEqual(boireDansCoffre(c0, 0, 1), { ok: false, code: "objet" });
    const pas = { ...c0, objets: [{ ...fiole, genre: "gemme" as const }] };
    assert.deepEqual(boireDansCoffre(pas, 0, 1), { ok: false, code: "genre" });
  });

  it("le mot n'est jamais réécrit ; le soufre s'éteint quand la pièce a tourné", () => {
    const c0 = coffreAtelier("vide");
    const fiole = elixirDansCoffre(c0, GRAINE, "Satya", "soufre", "mars");
    const c = { ...c0, objets: [fiole] };
    const r = boireDansCoffre(c, 0, 3);
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.coffre.tour.elixirs[0]!.mot, fiole.mot >>> 0);
    assert.equal(especeActive(r.coffre, 3, "soufre"), true);
    const apres = eteindreSoufre(r.coffre, 3);
    assert.equal(especeActive(apres, 3, "soufre"), false);
    assert.deepEqual(apres.tour.bus, [fiole.mot >>> 0]);
    assert.deepEqual(eteindreSoufre(apres, 3), apres);
    // l'objet élixir lui-même : mot, archétype, âge intacts après habillage
    assert.equal(fiole.archetype, "mars");
    assert.equal(fiole.age, "Satya");
    assert.equal(fiole.affixe, null);
    assert.equal(fiole.sockets, 0);
  });
});

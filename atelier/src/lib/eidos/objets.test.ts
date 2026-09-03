import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { encoderGlyphes } from "./glyphs.ts";
import { hexOf, sha256d, utf8 } from "./hash.ts";
import {
  canoniserMot,
  composer,
  conjuguer,
  deconstruireMot,
  depaqueter,
  distanceMot,
  feuilleObjet,
  graineTirage,
  isqrt,
  objetDepuisGraine,
  paqueter,
  racineObjets,
  sceauObjet,
  tirerObjet,
} from "./objets.ts";

const GRAINE = sha256d(utf8("eidos-objet-genese"));

const GELE = {
  mot: 4030905633,
  archetype: "saturne",
  age: "Satya",
  feuille: "2c7b6850a771625658e3a78c304a94df30f2998de0efe59205f6eac169b3faa3",
  q: [260, -337, -223, 541],
} as const;

describe("objets", () => {
  it("isqrt entier, pas Math.sqrt", () => {
    assert.equal(isqrt(0n), 0n);
    assert.equal(isqrt(1n), 1n);
    assert.equal(isqrt(724n * 724n), 724n);
    assert.equal(isqrt(724n * 724n - 1n), 723n);
  });

  it("déterminisme : même graine → même objet", () => {
    const a = objetDepuisGraine(GRAINE, "Satya");
    const b = objetDepuisGraine(GRAINE, "Satya");
    assert.deepEqual(a, b);
    assert.equal(a.mot, canoniserMot(a.mot));
  });

  it("stabilité : vecteur gelé", () => {
    const o = objetDepuisGraine(GRAINE, "Satya");
    assert.equal(o.mot, GELE.mot);
    assert.equal(o.archetype, GELE.archetype);
    assert.equal(o.age, GELE.age);
    assert.equal(hexOf(feuilleObjet(o)), GELE.feuille);
    assert.deepEqual(depaqueter(o.mot), GELE.q);
  });

  it("q et −q : même mot (revêtement double)", () => {
    const o = objetDepuisGraine(GRAINE, "Satya");
    const q = depaqueter(o.mot);
    const oppose = paqueter([-q[0], -q[1], -q[2], -q[3]]);
    assert.equal(canoniserMot(oppose), o.mot);
  });

  it("âge dans la feuille, pas dans le mot", () => {
    const a = objetDepuisGraine(GRAINE, "Satya");
    const b = objetDepuisGraine(GRAINE, "Kali");
    assert.equal(a.mot, b.mot);
    assert.equal(a.archetype, b.archetype);
    assert.notEqual(hexOf(feuilleObjet(a)), hexOf(feuilleObjet(b)));
  });

  it("craft : non commutatif, conjugué involutif", () => {
    const a = objetDepuisGraine(GRAINE, "Satya").mot;
    const b = objetDepuisGraine(sha256d(utf8("autre")), "Treta").mot;
    assert.notEqual(composer(a, b), composer(b, a));
    assert.equal(conjuguer(conjuguer(a)), a);
  });

  it("racine Merkle : recopie impaire, rejouable", () => {
    const a = objetDepuisGraine(GRAINE, "Satya");
    const b = objetDepuisGraine(sha256d(utf8("autre")), "Treta");
    const r1 = racineObjets([a]);
    const r2 = racineObjets([a, b]);
    assert.equal(r1.length, 64);
    assert.notEqual(r1, r2);
    assert.equal(racineObjets([a, b]), r2);
  });

  it("tirage : sig ‖ bloc, reproductible", () => {
    const sig = new Uint8Array(64).fill(7);
    const bloc = new Uint8Array(32).fill(1);
    const t = tirerObjet(sig, bloc, "Kali");
    assert.equal(t.mot, 2714434257);
    assert.equal(t.archetype, "venus");
    assert.equal(t.age, "Kali");
    assert.deepEqual(t, tirerObjet(sig, bloc, "Kali"));
    const g = graineTirage(sig, bloc);
    assert.equal(g.length, 32);
  });

  it("sceau : encode la feuille, n'est pas une graine", () => {
    const o = objetDepuisGraine(GRAINE, "Satya");
    const s = sceauObjet(o);
    assert.equal(s, encoderGlyphes(feuilleObjet(o)));
    assert.notEqual(s.replace(/\s+/g, ""), GELE.feuille);
  });

  it("distance : bornée, zéro sur soi", () => {
    const a = objetDepuisGraine(GRAINE, "Satya").mot;
    assert.equal(distanceMot(a, a), 0);
    const { omise } = deconstruireMot(a);
    assert.ok(omise >= 0 && omise <= 3);
  });
});

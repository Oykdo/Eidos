import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sha256d, utf8 } from "./hash.ts";
import { objetDepuisGraine } from "./objets.ts";
import { SIGNATURES } from "./signatures.ts";
import { paireDe, polariteDe, qDeMot, resonanceDe } from "./resonance.ts";

const GRAINE = sha256d(utf8("eidos-objet-genese"));

describe("résonance", () => {
  it("même classe : destructif, même si alignés", () => {
    assert.equal(polariteDe(100n, 10n, 10n, true), "destructif");
  });

  it("cos² ≥ 1/2 : constructif hors classe", () => {
    assert.equal(polariteDe(8n, 8n, 8n, false), "constructif");
    assert.equal(polariteDe(0n, 8n, 8n, false), "neutre");
  });

  it("qDeMot : entier, pas un flottant", () => {
    const o = objetDepuisGraine(GRAINE, "Satya");
    const q = qDeMot(o.mot);
    for (const x of q) assert.equal(typeof x, "bigint");
  });

  it("neuf familles : même mot, classes distinctes → pas destructif entre elles", () => {
    const base = objetDepuisGraine(GRAINE, "Satya");
    const membres = SIGNATURES.map((s) => ({
      q: qDeMot(base.mot),
      classe: s.id,
    }));
    const lec = resonanceDe(membres);
    assert.equal(lec.nDestructif, 0);
    assert.ok(lec.nConstructif > 0);
  });

  it("deux copies de la même classe : une paire destructive", () => {
    const o = objetDepuisGraine(GRAINE, "Satya");
    const q = qDeMot(o.mot);
    const lec = resonanceDe([
      { q, classe: "mars" },
      { q, classe: "mars" },
    ]);
    assert.equal(lec.paires.length, 1);
    assert.equal(lec.paires[0]!.polarite, "destructif");
    assert.ok(lec.tenue < 0n);
  });

  it("paireDe : indices stables", () => {
    const o = objetDepuisGraine(GRAINE, "Satya");
    const a = { q: qDeMot(o.mot), classe: "mars" };
    const b = { q: qDeMot(o.mot), classe: "venus" };
    const p = paireDe(a, b, 2, 5);
    assert.equal(p.i, 2);
    assert.equal(p.j, 5);
    assert.equal(p.polarite, "constructif");
  });
});

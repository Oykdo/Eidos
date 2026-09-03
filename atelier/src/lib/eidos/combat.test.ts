import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { combatDe, COMBAT_AXES, COMBAT_BUDGET } from "./combat.ts";
import { sha256d, utf8 } from "./hash.ts";
import { depaqueter, objetDepuisGraine, paqueter } from "./objets.ts";
import { SIGNATURES } from "./signatures.ts";

const GRAINE = sha256d(utf8("eidos-objet-genese"));

describe("combat", () => {
  it("stabilité : vecteur gelé (saturne d'essai)", () => {
    const c = combatDe(objetDepuisGraine(GRAINE, "Satya"));
    assert.deepEqual(c, {
      fer: 11,
      cuirasse: 12,
      flux: 25,
      souffle: 16,
      somme: 64,
      pointe: "flux",
    });
  });

  it("somme constante, q et −q identiques, âge sans effet", () => {
    const a = objetDepuisGraine(GRAINE, "Satya");
    const k = objetDepuisGraine(GRAINE, "Kali");
    assert.equal(combatDe(a).somme, COMBAT_BUDGET);
    assert.deepEqual(combatDe(a), combatDe(k));
    const q = depaqueter(a.mot);
    const oppose = { ...a, mot: paqueter([-q[0], -q[1], -q[2], -q[3]]) };
    assert.deepEqual(combatDe(oppose), combatDe(a));
  });

  it("neuf familles : même budget, pointes distinctes possibles", () => {
    const base = objetDepuisGraine(GRAINE, "Satya");
    const pointes = new Set<string>();
    for (const s of SIGNATURES) {
      const c = combatDe({ ...base, archetype: s.id });
      assert.equal(c.somme, COMBAT_BUDGET);
      assert.equal(c.fer + c.cuirasse + c.flux + c.souffle, COMBAT_BUDGET);
      assert.ok(COMBAT_AXES.includes(c.pointe));
      pointes.add(`${c.fer}:${c.cuirasse}:${c.flux}:${c.souffle}`);
    }
    assert.equal(pointes.size, 9);
  });
});

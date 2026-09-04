import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parserEtat } from "./etat-reseau.ts";

describe("état publié — lecture", () => {
  it("sorties « txid:rang », artefacts, trésor ; le reste par défaut", () => {
    const e = parserEtat({
      hauteur: 71,
      age: "Satya",
      a_courant: 40,
      recompense_courante_atomes: 100,
      tresor_adresse: "ab".repeat(20),
      sorties: {
        [`${"aa".repeat(32)}:1`]: { adresse: "11".repeat(20), montant: 5 },
        "pas-un-txid:0": { adresse: "22".repeat(20), montant: 7 },
        [`${"bb".repeat(32)}:0`]: { adresse: "33".repeat(20) },
      },
      artefacts: [{ id: "lune", code: 42, txid: "cc".repeat(32), adresse: "44".repeat(20) }, { id: 3 }],
    });
    assert.equal(e.hauteur, 71);
    assert.equal(e.tresor_adresse, "ab".repeat(20));
    assert.deepEqual(e.sorties, [
      { adresse: "11".repeat(20), montant: 5, txid: "aa".repeat(32), rang: 1 },
      { adresse: "22".repeat(20), montant: 7, txid: undefined, rang: 0 },
    ]);
    assert.equal(e.artefacts.length, 1);
    assert.equal(e.artefacts[0]!.id, "lune");
  });

  it("entrée vide : valeurs par défaut, jamais d'exception", () => {
    const e = parserEtat(null);
    assert.equal(e.hauteur, 0);
    assert.equal(e.age, "Satya");
    assert.equal(e.tresor_adresse, null);
    assert.deepEqual(e.sorties, []);
    assert.deepEqual(parserEtat({ sorties: 3, artefacts: "x" }).artefacts, []);
  });
});

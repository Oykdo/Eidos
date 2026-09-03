import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { jourCivil, minesDuJour, peutMiner, posteDe, POSTE_JOUR } from "./poste.ts";
import type { Coffre, HistoriqueTx } from "./types.ts";

function h(kind: HistoriqueTx["kind"], at: number): HistoriqueTx {
  return {
    txid: `t/${at}`,
    at,
    montant: 0,
    entrees: 0,
    rendu: 0,
    frais: 0,
    poussiere: false,
    kind,
    note: "",
  };
}

function coffre(nature: Coffre["nature"], histo: HistoriqueTx[]): Coffre {
  return {
    maitre: "x",
    n: 0,
    sorties: [],
    historique: histo,
    scenario: "vide",
    nature,
    clesUsees: [],
    derniereSig: null,
    chaine: [],
    reliques: [],
    objets: [],
    philosophale: null,
  };
}

describe("poste du jour", () => {
  it("π tronqué : trois blocs", () => {
    assert.equal(POSTE_JOUR, 3);
  });

  it("personnel : le quatrième mine est refusé, l'atelier non", () => {
    const now = Date.parse("2026-09-03T19:00:00+02:00");
    const mines = [0, 1, 2].map((i) => h("mine", now - i * 60_000));
    const p = coffre("personnel", mines);
    assert.equal(minesDuJour(p, now), 3);
    assert.equal(posteDe(p, now).restant, 0);
    assert.equal(peutMiner(p, now), false);
    assert.equal(peutMiner(coffre("atelier", mines), now), true);
  });

  it("un autre jour remet le compteur", () => {
    const hier = Date.parse("2026-09-02T18:00:00+02:00");
    const now = Date.parse("2026-09-03T10:00:00+02:00");
    const p = coffre("personnel", [h("mine", hier), h("robinet", now)]);
    assert.notEqual(jourCivil(hier), jourCivil(now));
    assert.equal(minesDuJour(p, now), 0);
    assert.equal(peutMiner(p, now), true);
  });
});

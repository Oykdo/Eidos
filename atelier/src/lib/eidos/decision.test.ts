import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ATOMES, POUSSIERE_ATOMES } from "./constantes.ts";
import { cheminDecision } from "./decision.ts";
import { MSG_FRAGMENTE } from "./coinselect.ts";
import type { Sortie } from "./types.ts";

function S(montants: number[]): Sortie[] {
  return montants.map((montant, i) => ({
    ref: `t${i}:0`,
    txid: `t${i}`,
    rang: 0,
    adresse: `a${i}`,
    indice: i,
    montant,
  }));
}

describe("chemin de décision", () => {
  it("montant invalide", () => {
    const c = cheminDecision(S([ATOMES]), null);
    assert.equal(c.feuille.id, "invalide");
    assert.equal(c.questions[0]?.reponse, "non");
  });

  it("insuffisant s'arrête à solde", () => {
    const c = cheminDecision(S([ATOMES]), 2 * ATOMES);
    assert.equal(c.feuille.id, "insuffisant");
    assert.equal(c.questions.at(-1)?.id, "solde");
    assert.equal(c.questions.at(-1)?.reponse, "non");
  });

  it("premier trou : fragmenté", () => {
    const c = cheminDecision(
      S(Array.from({ length: 10 }, () => 15_000_000)),
      60_000_000,
    );
    assert.equal(c.feuille.id, "fragmente");
    assert.equal(c.feuille.aide, MSG_FRAGMENTE);
    assert.equal(c.questions.find((q) => q.id === "couverture")?.reponse, "non");
  });

  it("deuxième trou : poussière", () => {
    const c = cheminDecision(S([ATOMES + 5_000]), ATOMES);
    assert.equal(c.feuille.id, "poussiere");
    assert.equal(c.questions.find((q) => q.id === "poussiere")?.reponse, "oui");
    assert.ok(5_000 < POUSSIERE_ATOMES);
  });

  it("rendu créé au-delà du seuil", () => {
    const c = cheminDecision(S([ATOMES + POUSSIERE_ATOMES]), ATOMES);
    assert.equal(c.feuille.id, "rendu");
    assert.equal(c.questions.find((q) => q.id === "poussiere")?.reponse, "non");
  });
});

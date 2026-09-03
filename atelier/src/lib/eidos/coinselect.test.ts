import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MSG_FRAGMENTE, parserMontant, selectionner } from "./coinselect.ts";
import { ATOMES, MAX_ENTREES, POUSSIERE_ATOMES } from "./constantes.ts";
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

describe("sélection des sorties", () => {
  it("refuse un montant non entier ou nul", () => {
    const r = selectionner(S([ATOMES]), 0);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.code, "montant");
  });

  it("signale un coffre vide", () => {
    const r = selectionner([], ATOMES);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.code, "vide");
  });

  it("solde insuffisant", () => {
    const r = selectionner(S([ATOMES]), 2 * ATOMES);
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.code, "insuffisant");
      assert.equal(r.message, "Solde insuffisant.");
    }
  });

  it("une pièce, montant exact : pas de rendu, pas de frais", () => {
    const r = selectionner(S([ATOMES]), ATOMES);
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.entrees.length, 1);
    assert.equal(r.rendu, 0);
    assert.equal(r.frais, 0);
    assert.equal(r.poussiere, false);
  });

  it("une pièce trop grande : rendu créé", () => {
    const r = selectionner(S([2 * ATOMES]), ATOMES);
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.rendu, ATOMES);
    assert.equal(r.frais, 0);
    assert.equal(r.poussiere, false);
  });

  it("poussière : rendu < 10 000 atomes → pas de sortie, l'écart devient frais", () => {
    const r = selectionner(S([ATOMES + 5_000]), ATOMES);
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.poussiere, true);
    assert.equal(r.rendu, 0);
    assert.equal(r.frais, 5_000);
  });

  it("seuil de poussière exclusif : 10 000 atomes restent un rendu", () => {
    const r = selectionner(S([ATOMES + POUSSIERE_ATOMES]), ATOMES);
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.poussiere, false);
    assert.equal(r.rendu, POUSSIERE_ATOMES);
    assert.equal(r.frais, 0);
  });

  it("deux petites valent mieux qu'une grosse", () => {
    const r = selectionner(S([30_000_000, 50_000_000, 120_000_000]), 70_000_000);
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.entrees.length, 2);
    assert.deepEqual(
      r.entrees.map((e) => e.montant).sort((a, b) => a - b),
      [30_000_000, 50_000_000],
    );
    assert.equal(r.rendu, 10_000_000);
  });

  it("prend la plus petite unique qui atteint", () => {
    const r = selectionner(S([30_000_000, 50_000_000, 120_000_000]), 40_000_000);
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.entrees.length, 1);
    assert.equal(r.entrees[0]?.montant, 50_000_000);
  });

  it("trois entrées au plus", () => {
    const r = selectionner(S([40_000_000, 40_000_000, 40_000_000]), 100_000_000);
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.entrees.length, 3);
    assert.ok(r.entrees.length <= MAX_ENTREES);
  });

  it("premier trou : solde suffisant mais fragmenté — regrouper d'abord", () => {
    const r = selectionner(
      S(Array.from({ length: 10 }, () => 15_000_000)),
      60_000_000,
    );
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.code, "fragmente");
      assert.equal(r.message, MSG_FRAGMENTE);
      assert.equal(r.solde, 150_000_000);
      assert.equal(r.couvertureMax, 45_000_000);
    }
  });

  it("ne dit plus « aucune sortie assez garnie »", () => {
    const r = selectionner(S([20_000_000, 20_000_000, 20_000_000, 20_000_000]), 70_000_000);
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.message, MSG_FRAGMENTE);
      assert.equal(r.message.includes("assez garnie"), false);
    }
  });

  it("préfère une pièce propre à une pièce poussiéreuse", () => {
    const r = selectionner(S([ATOMES + 5_000, 150_000_000]), ATOMES);
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.entrees.length, 1);
    assert.equal(r.entrees[0]?.montant, 150_000_000);
    assert.equal(r.poussiere, false);
  });

  it("n'émet jamais plus de trois entrées", () => {
    const r = selectionner(
      S([10, 20, 30, 40, 50, 60].map((x) => x * 1_000_000)),
      100_000_000,
    );
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.ok(r.entrees.length <= 3);
  });

  it("parse un montant en eidôla vers atomes", () => {
    assert.equal(parserMontant("1"), ATOMES);
    assert.equal(parserMontant("1,000090"), 100_009_000);
    assert.equal(parserMontant("0.5"), 50_000_000);
    assert.equal(parserMontant(""), null);
    assert.equal(parserMontant("abc"), null);
  });
});

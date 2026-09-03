import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  COFFRE_AVANT,
  COFFRE_FOND,
  PALETTE_AVANT,
  PALETTE_FOND,
  cartesiens,
  gaussienne,
  integraleGaussienne,
  teinte,
} from "./coffres.ts";

describe("coffres 3D — audit", () => {
  it("chaque coffre a une palette de 8 teintes", () => {
    assert.equal(PALETTE_FOND.length, 8);
    assert.equal(PALETTE_AVANT.length, 8);
    assert.equal(COFFRE_FOND.palette, PALETTE_FOND);
    assert.equal(COFFRE_AVANT.palette, PALETTE_AVANT);
  });

  it("le coffre de fond est plus petit et plus haut", () => {
    assert.ok(COFFRE_FOND.scale < COFFRE_AVANT.scale);
    assert.ok(COFFRE_FOND.position[1] > COFFRE_AVANT.position[1]);
    assert.ok(COFFRE_FOND.position[2] < COFFRE_AVANT.position[2]);
  });

  it("la gaussienne vaut 1 à l'origine et s'éloigne", () => {
    assert.equal(gaussienne(0, 0), 1);
    assert.ok(gaussienne(1, 0) < 0.4);
    assert.ok(gaussienne(3, 3) < 1e-7);
  });

  it("l'intégrale polaire se tient près de π", () => {
    const s = integraleGaussienne();
    assert.ok(Math.abs(s - Math.PI) < 1e-4, `écart ${s - Math.PI}`);
  });

  it("les coordonnées sphériques recouvrent l'axe z", () => {
    const p = cartesiens(2, 0, 0);
    assert.ok(Math.abs(p.x) < 1e-12);
    assert.ok(Math.abs(p.y) < 1e-12);
    assert.equal(p.z, 2);
  });

  it("teinte boucle sur 8 indices", () => {
    assert.equal(teinte(PALETTE_FOND, 0), "#FFFFFF");
    assert.equal(teinte(PALETTE_FOND, 7), "#062A5A");
    assert.equal(teinte(PALETTE_FOND, 8), "#FFFFFF");
  });
});

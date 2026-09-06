import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { coffreNeuf } from "./wallet.ts";
import { fromHex, hexOf } from "./hash.ts";
import {
  CELLULES,
  SIGNS_PART,
  TROUS,
  VIDES,
  assembler,
  carteDe,
  gfMul,
  lirePart,
  papiersDe,
  partDe,
  reconstruire,
  TRIA,
} from "./papier.ts";

describe("papier — 2-of-3", () => {
  it("GF(256) : xtime et identité", () => {
    assert.equal(gfMul(2, 0x80), 0x1b);
    assert.equal(gfMul(1, 0x53), 0x53);
    assert.equal(gfMul(0, 7), 0);
    assert.equal(gfMul(3, 1), 3);
  });

  it("trous gelés, 43 cases utiles", () => {
    for (const p of TRIA) {
      assert.equal(TROUS[p.id].length, VIDES);
      assert.equal(new Set(TROUS[p.id]).size, VIDES);
      assert.ok(TROUS[p.id].every((i) => i >= 0 && i < CELLULES));
      const carte = carteDe(new Uint8Array(32).fill(1), p);
      const vides = carte.cellules.filter((c) => c.code === null);
      assert.equal(vides.length, VIDES);
      assert.equal(carte.cellules.filter((c) => c.code !== null).length, SIGNS_PART);
      assert.equal(carte.controle.length, 4);
    }
  });

  it("deux cartons reconstruisent, un seul ne suffit pas", () => {
    const s = fromHex(coffreNeuf("vide").maitre);
    const cartes = papiersDe(s);
    assert.equal(cartes.length, 3);
    for (const [i, j] of [
      [0, 1],
      [0, 2],
      [1, 2],
    ] as const) {
      const r = reconstruire(cartes[i]!, cartes[j]!);
      assert.equal(hexOf(r), hexOf(s));
    }
  });

  it("un signe de contrôle altéré se voit", () => {
    const s = new Uint8Array(32);
    s[0] = 7;
    const c = carteDe(s, TRIA[0]!);
    const faux = { ...c, controle: c.controle.map((n, i) => (i === 0 ? (n + 1) & 63 : n)) };
    assert.throws(() => lirePart(faux), /contrôle/);
  });

  it("parts distinctes, Shamir brut", () => {
    const s = new Uint8Array(32);
    for (let i = 0; i < 32; i++) s[i] = i * 3 + 1;
    const a = partDe(s, 1);
    const b = partDe(s, 2);
    const c = partDe(s, 3);
    assert.notEqual(hexOf(a), hexOf(b));
    assert.equal(hexOf(assembler([{ x: 1, y: a }, { x: 3, y: c }])), hexOf(s));
  });
});

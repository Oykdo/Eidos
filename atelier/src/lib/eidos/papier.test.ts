import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { coffreNeuf } from "./wallet.ts";
import { fromHex, hexOf } from "./hash.ts";
import {
  N_GRILLES,
  assembler,
  carteDe,
  gfMul,
  grilleDeOctet,
  lirePart,
  octetDeGrille,
  papiersDe,
  partDe,
  reconstruire,
  TRIA,
} from "./papier.ts";

describe("papier — 32 grilles × 64 signes", () => {
  it("GF(256) : xtime et identité", () => {
    assert.equal(gfMul(2, 0x80), 0x1b);
    assert.equal(gfMul(1, 0x53), 0x53);
    assert.equal(gfMul(0, 7), 0);
    assert.equal(gfMul(3, 1), 3);
  });

  it("un octet ↔ une grille 2×2, les 256 valeurs", () => {
    for (let b = 0; b < 256; b++) {
      const g = grilleDeOctet(b);
      assert.equal(g.pos, (b >> 6) & 3);
      assert.equal(g.code, b & 63);
      assert.equal(octetDeGrille(g), b);
    }
  });

  it("32 grilles par carton, 3 vides par grille", () => {
    const c = carteDe(new Uint8Array(32).fill(0xaa), TRIA[1]!);
    assert.equal(c.grilles.length, N_GRILLES);
    assert.equal(c.controle.length, 4);
    assert.ok(c.grilles.every((g) => g.pos >= 0 && g.pos <= 3 && g.code >= 0 && g.code < 64));
  });

  it("deux cartons reconstruisent", () => {
    const s = fromHex(coffreNeuf("vide").maitre);
    const cartes = papiersDe(s);
    assert.equal(cartes.length, 3);
    for (const [i, j] of [
      [0, 1],
      [0, 2],
      [1, 2],
    ] as const) {
      assert.equal(hexOf(reconstruire(cartes[i]!, cartes[j]!)), hexOf(s));
    }
  });

  it("un signe de contrôle altéré se voit", () => {
    const s = new Uint8Array(32);
    s[0] = 7;
    const c = carteDe(s, TRIA[0]!);
    const faux = { ...c, controle: c.controle.map((n, i) => (i === 0 ? (n + 1) & 63 : n)) };
    assert.throws(() => lirePart(faux), /contrôle/);
  });

  it("une case déplacée change l'octet", () => {
    const g = grilleDeOctet(0b10_010101);
    assert.equal(g.pos, 2);
    assert.equal(g.code, 0b010101);
    assert.notEqual(octetDeGrille({ ...g, pos: 0 }), 0b10_010101);
  });

  it("parts distinctes, Shamir brut", () => {
    const s = new Uint8Array(32);
    for (let i = 0; i < 32; i++) s[i] = i * 3 + 1;
    const a = partDe(s, 1);
    const c = partDe(s, 3);
    assert.equal(hexOf(assembler([{ x: 1, y: a }, { x: 3, y: c }])), hexOf(s));
  });
});

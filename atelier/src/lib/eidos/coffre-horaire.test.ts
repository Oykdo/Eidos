import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hexOf } from "./hash.ts";
import {
  GENRES_COFFRE,
  PROBA_TIER,
  SAC_COFFRE,
  TIERS,
  cleClaim,
  coffreDe,
  graineCoffre,
  reclamer,
  tierDe,
} from "./coffre-horaire.ts";

const BLOC = "31a68674bf8b3ed90bcf4e110fdab1f7273b66a486817fd26683b220af9c51bc";
const PIECE = { txid: "17b5470bfe2f0c3aec87f5a5c5d21b5da558194100d1e7a3955053cbe4bef847", rang: 0 };

describe("coffre horaire — le tirage, jamais le juge", () => {
  it("le tier compte les zéros de tête du premier octet, borné 1..9", () => {
    const g = (b: number) => Uint8Array.from([b, ...new Array<number>(31).fill(0)]);
    assert.deepEqual(
      [255, 128, 127, 64, 1, 0].map((b) => tierDe(g(b))),
      [1, 1, 2, 2, 8, 9],
    );
    for (let b = 0; b < 256; b++) {
      const t = tierDe(g(b));
      assert.ok(t >= 1 && t <= TIERS, `octet ${b} : tier ${t}`);
    }
  });

  it("les probabilités somment à 1 et se lisent sur les 256 octets", () => {
    assert.ok(Math.abs(PROBA_TIER.reduce((s, p) => s + p, 0) - 1) < 1e-15);
    const g = (b: number) => Uint8Array.from([b, ...new Array<number>(31).fill(0)]);
    for (let t = 1; t <= TIERS; t++) {
      const part =
        Array.from({ length: 256 }, (_, b) => tierDe(g(b))).filter((x) => x === t).length / 256;
      assert.equal(part, PROBA_TIER[t - 1]);
    }
  });

  it("un coffre est déterministe : même bloc, même pièce, même coffre", () => {
    const a = coffreDe(BLOC, PIECE);
    const b = coffreDe(BLOC, { ...PIECE });
    assert.deepEqual(a, b);
    assert.equal(a.graine, hexOf(graineCoffre(BLOC, PIECE)));
    assert.equal(a.objets.length, a.tier);
    for (const o of a.objets) assert.ok(GENRES_COFFRE.includes(o.genre));
    assert.notEqual(coffreDe(BLOC, { ...PIECE, rang: 1 }).graine, a.graine);
  });

  it("une pièce, un bloc, un coffre ; le sac borne le reste", () => {
    const deja = new Set([cleClaim(BLOC, PIECE)]);
    const refus = reclamer(BLOC, PIECE, 0, deja);
    assert.ok("erreur" in refus);
    const ok = reclamer(BLOC, PIECE, 0, new Set());
    assert.ok(!("erreur" in ok));
    if ("erreur" in ok) return;
    assert.equal(ok.pris.length, ok.coffre.objets.length);
    assert.equal(ok.perdus, 0);
    const plein = reclamer(BLOC, PIECE, SAC_COFFRE, new Set());
    assert.ok(!("erreur" in plein));
    if ("erreur" in plein) return;
    assert.equal(plein.pris.length, 0);
    assert.equal(plein.perdus, plein.coffre.objets.length);
  });
});

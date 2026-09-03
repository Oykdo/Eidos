import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FIGURES } from "./constantes.ts";
import { SIGNATURES, TRIA_PRIMA, artefactDeGoutte, codeDe, figuresDe } from "./signatures.ts";

describe("signatures planétaires", () => {
  it("neuf lectures, pas un 5ᵉ glyphe", () => {
    assert.equal(FIGURES.length, 4);
    assert.equal(SIGNATURES.length, 9);
    assert.equal(TRIA_PRIMA.length, 3);
    for (const s of SIGNATURES) {
      assert.equal(s.etages.length, 3);
      for (const k of s.etages) {
        assert.ok(k >= 0 && k <= 3);
      }
      const fig = figuresDe(s);
      assert.equal([...fig].length, 3);
      for (const ch of fig) {
        assert.ok((FIGURES as readonly string[]).includes(ch));
      }
      assert.ok(codeDe(s) >= 0 && codeDe(s) <= 63);
    }
  });

  it("empilements distincts — une lecture n'en recouvre pas une autre", () => {
    const codes = new Set(SIGNATURES.map(codeDe));
    assert.equal(codes.size, 9);
  });

  it("la lune est déjà dans l'alphabet : croissant", () => {
    const lune = SIGNATURES.find((s) => s.id === "lune")!;
    assert.deepEqual(lune.etages, [2, 2, 2]);
    assert.equal(figuresDe(lune), FIGURES[2]!.repeat(3));
    assert.equal(lune.astre, "☽");
  });

  it("tria prima : trois étages, figures déjà dans l'alphabet", () => {
    assert.deepEqual(
      TRIA_PRIMA.map((p) => p.figure),
      [1, 2, 3],
    );
    assert.equal(FIGURES[1], "\u25cb");
    assert.equal(FIGURES[2], "\u263d");
    assert.equal(FIGURES[3], "\u271a");
  });

  it("œuf robinet : même tag Python/TS, ~1 goutte sur 7", () => {
    const adresse = "11".repeat(20);
    const lune = artefactDeGoutte("00".repeat(32), adresse);
    assert.equal(lune?.id, "lune");
    assert.equal(lune?.code, 42);
    assert.equal(artefactDeGoutte("00".repeat(31) + "02", adresse), null);
    assert.equal(artefactDeGoutte("ab", adresse), null);
  });
});

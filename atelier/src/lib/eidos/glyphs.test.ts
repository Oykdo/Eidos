import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FIGURES } from "./constantes.ts";
import {
  codeDuGroupe,
  encoderAdresse,
  figuresDuCode,
  groupeDuCode,
  verifierAdresse,
} from "./glyphs.ts";
import { fromHex } from "./hash.ts";

describe("glyphes", () => {
  it("64 empilements distincts, 6 bits, aller-retour", () => {
    const vus = new Set<string>();
    for (let c = 0; c < 64; c++) {
      const e = groupeDuCode(c);
      assert.equal(codeDuGroupe(e), c);
      const fig = figuresDuCode(c);
      assert.equal([...fig].length, 3);
      vus.add(fig);
    }
    assert.equal(vus.size, 64);
  });

  it("les quatre figures portent 2 bits, pas une clé", () => {
    assert.equal(FIGURES.length, 4);
    assert.equal(codeDuGroupe([3, 3, 3]), 63);
    assert.equal(codeDuGroupe([0, 0, 0]), 0);
  });

  it("31 groupes : 27 d'adresse + 4 de somme ; un étage changé rompt", () => {
    const hexa = "1a56415346085a7afc028ccc90426f67762e6d10";
    const texte = encoderAdresse(fromHex(hexa));
    const ok = verifierAdresse(texte);
    assert.equal(ok.hexa, hexa);
    const groupes = texte.split(/\s+/).filter((g) => g !== "|");
    assert.equal(groupes.length, 31);
    const f = [...groupes[0]!];
    f[0] = FIGURES[(FIGURES.indexOf(f[0] as (typeof FIGURES)[number]) + 1) % 4]!;
    groupes[0] = f.join("");
    assert.throws(() => verifierAdresse(groupes.join(" ")));
  });
});

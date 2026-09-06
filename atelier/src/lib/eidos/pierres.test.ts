import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CARACTERES, N_CHYMIE } from "./chymie.ts";
import { codeDuGroupe } from "./glyphs.ts";
import { glypheDe } from "./lecture.ts";
import { objetDepuisGraine } from "./objets.ts";
import { sha256d, utf8 } from "./hash.ts";
import { PIERRES, codePierre, pierreDeCode, pierreDeObjet } from "./pierres.ts";

describe("pierres — 64 signes", () => {
  it("un signe, une pierre, même ordre que la plaque", () => {
    assert.equal(PIERRES.length, N_CHYMIE);
    assert.equal(PIERRES.length, 64);
    assert.equal(PIERRES[0]!.id, "fer");
    assert.equal(PIERRES[51]!.id, "soufre");
    for (let i = 0; i < 64; i++) {
      assert.equal(PIERRES[i]!.code, i);
      assert.equal(PIERRES[i]!.id, CARACTERES[i]!.id);
      assert.equal(pierreDeCode(i).id, CARACTERES[i]!.id);
    }
  });

  it("le code d'un objet est son glyphe, 0..63", () => {
    const o = objetDepuisGraine(sha256d(utf8("pierre-test")), "Kali");
    const c = codePierre(o);
    assert.equal(c, codeDuGroupe(glypheDe(o)));
    assert.ok(c >= 0 && c < 64);
    assert.equal(pierreDeObjet(o).code, c);
  });
});

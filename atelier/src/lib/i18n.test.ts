import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { EN, FR, setLocale, t, type Msg } from "./i18n.ts";

describe("i18n", () => {
  it("FR et EN ont les mêmes clés", () => {
    const a = Object.keys(FR).sort();
    const b = Object.keys(EN).sort();
    assert.deepEqual(a, b);
  });

  it("genèse courte", () => {
    setLocale("fr");
    assert.equal(t("genese.lede"), "Vérifier que tout est en place.");
    assert.equal(t("genese.lancer"), "Vérifier");
    setLocale("en");
    assert.equal(t("genese.lede"), "Check that everything is in place.");
    assert.equal(t("genese.lancer"), "Check");
  });

  it("interpolation et pluriel", () => {
    setLocale("fr");
    assert.equal(t("coffre.sorties", { n: 1 }), "1 pièce");
    assert.equal(t("coffre.sorties", { n: 8 }), "8 pièces");
    setLocale("en");
    assert.equal(t("coffre.sorties", { n: 1 }), "1 coin");
    assert.equal(t("coffre.sorties", { n: 8 }), "8 coins");
  });

  it("aucune valeur vide", () => {
    for (const k of Object.keys(FR) as Msg[]) {
      assert.ok(FR[k].length > 0, k);
      assert.ok(EN[k].length > 0, k);
    }
  });

  it("reliques : libellés gelés", () => {
    assert.equal(
      FR["relique.lede"],
      "Quatre reliques. Un objet par graine. Rien ne se croit, tout se rejoue.",
    );
    assert.equal(
      EN["relique.lede"],
      "Four relics. One object per seed. Nothing is believed; everything is replayed.",
    );
    assert.equal(FR["relique.preuveAide"], "Collez eidos-artefact/1. Même preuve, même relique.");
    assert.equal(EN["relique.preuveAide"], "Paste eidos-artefact/1. Same proof, same relic.");
    assert.equal(
      FR["guide.09p"],
      "Un coffre, une racine. L'objet tient en 32 bits. La puissance ne grandit pas.",
    );
    assert.equal(
      EN["guide.09p"],
      "One vault, one root. The item fits in 32 bits. Power does not grow.",
    );
  });
});

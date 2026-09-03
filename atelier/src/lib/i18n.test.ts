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
    assert.equal(t("genese.lede"), "Rejouer le fichier gelé.");
    assert.equal(t("genese.lancer"), "Lancer la genèse");
    setLocale("en");
    assert.equal(t("genese.lede"), "Replay the frozen file.");
    assert.equal(t("genese.lancer"), "Run genesis");
  });

  it("interpolation et pluriel", () => {
    setLocale("fr");
    assert.equal(t("coffre.sorties", { n: 1, dust: 10000 }), "1 sortie · poussière 10000 atomes");
    assert.equal(t("coffre.sorties", { n: 8, dust: 10000 }), "8 sorties · poussière 10000 atomes");
    setLocale("en");
    assert.equal(t("coffre.sorties", { n: 1, dust: 10000 }), "1 output · dust 10000 atoms");
  });

  it("aucune valeur vide", () => {
    for (const k of Object.keys(FR) as Msg[]) {
      assert.ok(FR[k].length > 0, k);
      assert.ok(EN[k].length > 0, k);
    }
  });
});

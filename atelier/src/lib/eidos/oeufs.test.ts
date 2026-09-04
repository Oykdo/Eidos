import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { codeDuGroupe, groupeDuCode } from "./glyphs.ts";
import {
  CYCLES,
  ERES_PAR_CYCLE,
  INCONNU,
  NOMS_THEME,
  OEUFS,
  RECITS,
  THEMES,
  cycleDe,
  lectureOeuf,
  museDeOeuf,
  museDuCycle,
  oeufDeGroupe,
  oeufDuCode,
  oeufsDuTheme,
} from "./oeufs.ts";
import { SIGNATURES } from "./signatures.ts";

describe("œufs — les 64 de la Chambre de Genèse sur les 64 empilements", () => {
  it("64 œufs, l'œuf i est le glyphe de code i, huit par thème dans l'ordre des cycles", () => {
    assert.equal(OEUFS.length, 64);
    assert.equal(CYCLES * ERES_PAR_CYCLE, 64);
    for (const o of OEUFS) {
      assert.equal(oeufDuCode(o.index), o);
      assert.equal(oeufDeGroupe(groupeDuCode(o.index)), o);
      assert.equal(codeDuGroupe(groupeDuCode(o.index)), o.index);
      assert.equal(o.ere, o.index + 1);
      assert.equal(o.theme, THEMES[cycleDe(o)]);
    }
    for (const th of THEMES) assert.equal(oeufsDuTheme(th).length, ERES_PAR_CYCLE, th);
    assert.equal(oeufDuCode(0).theme, "void", "la pile vide est le Vide primordial");
    assert.equal(oeufDuCode(64), oeufDuCode(0), "le code est pris sur six bits");
  });

  it("les noms d'ère sont uniques et traduits ; thèmes et récits bilingues", () => {
    const fr = new Set(OEUFS.map((o) => o.nomEre.fr));
    const en = new Set(OEUFS.map((o) => o.nomEre.en));
    assert.equal(fr.size, 64);
    assert.equal(en.size, 64);
    for (const o of OEUFS) {
      assert.ok(o.nomEre.fr.startsWith("Ère "), o.nomEre.fr);
      assert.ok(o.nomEre.en.startsWith("Era of "), o.nomEre.en);
      assert.ok(o.forme.length > 0 && o.essence.length > 0);
    }
    for (const th of THEMES) {
      assert.ok(NOMS_THEME[th].fr && NOMS_THEME[th].en, th);
      assert.ok(
        RECITS[th].fr.length > 40 && RECITS[th].en.length > 40 && RECITS[th].fr !== RECITS[th].en,
        th,
      );
      assert.ok(
        RECITS[th].fr.includes(oeufsDuTheme(th)[0]!.nomEre.fr),
        `le récit ${th} cite sa première ère`,
      );
    }
  });

  it("le cycle est une bande de la Tour : huit muses distinctes de Thalie à Polymnie ; L'Inconnu est Uranie", () => {
    const muses = Array.from({ length: CYCLES }, (_, c) => museDuCycle(c));
    assert.equal(new Set(muses).size, 8);
    assert.ok(!muses.includes("uranie"));
    assert.equal(muses[0], "terre", "le Vide est la Terre, Thalie, la porte de la ville");
    assert.equal(muses[7], "saturne", "le Spinoriel est Saturne, Polymnie");
    assert.equal(museDuCycle(CYCLES), "uranie");
    assert.equal(INCONNU.muse, "uranie");
    assert.equal(INCONNU.cycle, CYCLES);
    assert.equal(museDeOeuf(oeufDuCode(63)), "saturne");
    assert.equal(SIGNATURES.length, 9, "neuf œufs primordiaux, neuf muses");
  });

  it("la lecture d'un œuf est une ligne, FR et EN, avec ses figures", () => {
    for (const o of [oeufDuCode(0), oeufDuCode(12), oeufDuCode(63)]) {
      const fr = lectureOeuf(o, "fr");
      const en = lectureOeuf(o, "en");
      assert.ok(fr.startsWith(`Œuf ${o.index}, `) && en.startsWith(`Egg ${o.index}, `));
      assert.ok(fr.includes(o.nomEre.fr) && en.includes(o.nomEre.en));
      assert.ok(fr.includes("figures ") && fr.includes(`(${groupeDuCode(o.index).join(" ")})`));
      assert.notEqual(fr, en);
    }
    assert.ok(lectureOeuf(oeufDuCode(0), "fr").includes("Thalie"));
    assert.ok(lectureOeuf(oeufDuCode(63), "en").includes("Polymnie"));
  });
});

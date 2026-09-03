import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  B_SUR_A,
  AGES_RELIQUE,
  DIVISEUR_PRIX,
  lumens,
  lumenDe,
  echelleRelique,
  prixSontProgressifs,
  prixReliqueAtomes,
} from "./relique.ts";
import { acheterRelique, coffreNeuf, verserRobinet } from "./wallet.ts";

describe("reliques", () => {
  it("b/a = 1/2 pour les quatre âges — le ratio ne grandit pas", () => {
    for (const l of lumens()) {
      assert.equal(l.ratio, B_SUR_A);
      assert.equal(l.b, l.a / 2);
    }
  });

  it("aire = π·a·b, Satya la plus grande, Kali la plus petite", () => {
    const [satya, treta, dvapara, kali] = lumens();
    assert.ok(satya && treta && dvapara && kali);
    assert.ok(Math.abs(satya.aire - Math.PI * 40 * 20) < 1e-9);
    assert.ok(satya.aire > treta.aire);
    assert.ok(treta.aire > dvapara.aire);
    assert.ok(dvapara.aire > kali.aire);
    assert.equal(echelleRelique(kali), 0.25);
    assert.equal(echelleRelique(satya), 1);
  });

  it("époches alignées sur la genèse (2080 au total)", () => {
    assert.equal(
      AGES_RELIQUE.reduce((s, a) => s + a.epoques, 0),
      2080,
    );
    assert.equal(lumenDe(AGES_RELIQUE[0]!).a, 40);
  });

  it("prix abordables, distincts, 16:9:4:1", () => {
    assert.equal(DIVISEUR_PRIX, 1_000_000);
    const [satya, treta, dvapara, kali] = lumens();
    assert.ok(satya && treta && dvapara && kali);
    assert.equal(satya.prix, 33.54624);
    assert.equal(treta.prix, 18.86976);
    assert.equal(dvapara.prix, 8.38656);
    assert.equal(kali.prix, 2.09664);
    assert.ok(prixSontProgressifs());
    assert.equal(kali.prixAtomes, prixReliqueAtomes(AGES_RELIQUE[3]!));
    assert.equal(kali.prixAtomes, 209_664_000);
  });

  it("un robinet ne paie pas Kali ; un coffre mixte si", () => {
    let c = coffreNeuf("vide");
    c = verserRobinet(c);
    const refus = acheterRelique(c, "Kali");
    assert.equal(refus.selection.ok, false);

    c = coffreNeuf("mixte");
    const ok = acheterRelique(c, "Kali");
    assert.equal(ok.selection.ok, true);
    assert.ok(ok.coffre.reliques.includes("Kali"));
    const encore = acheterRelique(ok.coffre, "Kali");
    assert.equal(encore.selection.ok, false);
  });
});

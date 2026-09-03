import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ATOMES } from "./constantes.ts";
import { combatDe, COMBAT_BUDGET } from "./combat.ts";
import {
  CELLULES_DOXA,
  CLASSES,
  NORME,
  REGIMES,
  conjugue,
  norme2,
  palierDe,
  produit,
  quadrupleDepuis,
  type Q,
} from "./cosmos.ts";
import { VECTEUR_EMPREINTES } from "./cosmos-empreintes.ts";
import { dansOrbite, memeOrbite, produitChemin } from "./groupe.ts";
import { sha256d, utf8 } from "./hash.ts";
import { glypheLecture, INTEGRITE, LOIS } from "./integrite.ts";
import { objetDepuisGraine } from "./objets.ts";
import { polariteDe, resonanceDe } from "./resonance.ts";
import { coupeDe, ETAGES, occupantsDe } from "./tour.ts";

const GRAINE = sha256d(utf8("eidos-objet-genese"));

describe("intégrité — six lois", () => {
  it("six lois, dans cet ordre", () => {
    assert.deepEqual([...LOIS], [
      "conservation",
      "groupe",
      "doxa",
      "sceau",
      "epoques",
      "resonance",
    ]);
  });

  it("1 conservation : |q|² = ATOMES, budget 64, 101 normes", () => {
    assert.equal(Number(NORME), ATOMES);
    assert.equal(INTEGRITE.norme, ATOMES);
    assert.equal(INTEGRITE.budget, 64);
    assert.equal(COMBAT_BUDGET, 64);
    assert.equal(VECTEUR_EMPREINTES.length, 101);
    for (const o of VECTEUR_EMPREINTES) {
      const q = o.orientation.map((n) => BigInt(n)) as unknown as Q;
      assert.equal(norme2([q[0]!, q[1]!, q[2]!, q[3]!]), NORME);
    }
    const a = objetDepuisGraine(GRAINE, "Satya");
    const k = objetDepuisGraine(GRAINE, "Kali");
    assert.deepEqual(combatDe(a), combatDe(k));
    assert.equal(combatDe(a).somme, COMBAT_BUDGET);
    assert.equal(palierDe(1).tiragesMilliemes, 2500);
    assert.equal(palierDe(34).tiragesMilliemes, 1500);
  });

  it("2 groupe : A·B ≠ B·A ; l'orbite est l'invariant de recette", () => {
    const a = quadrupleDepuis(utf8("loi-2-a"));
    const b = quadrupleDepuis(utf8("loi-2-b"));
    const g = quadrupleDepuis(utf8("loi-2-g"));
    assert.notDeepEqual([...produit(a, b)], [...produit(b, a)]);
    const cible = produit(a, b);
    assert.equal(dansOrbite([a, b], cible), true);
    assert.equal(memeOrbite(produit(g, produit(cible, conjugue(g))), cible), true);
    assert.equal(dansOrbite([a, b], produit(g, produit(cible, conjugue(g)))), true);
    assert.deepEqual([...produitChemin([a, b])], [...cible]);
  });

  it("3 doxa : 3 × 7 = 21 cellules ; q vit entre les cases", () => {
    assert.equal(CLASSES.length, 3);
    assert.equal(REGIMES.length, 7);
    assert.equal(CELLULES_DOXA, 21);
    assert.equal(INTEGRITE.cellules, 21);
    const cellules = new Set<string>();
    for (const o of VECTEUR_EMPREINTES) {
      if (o.classe === "ancre") continue;
      assert.ok((CLASSES as readonly string[]).includes(o.classe));
      assert.ok((REGIMES as readonly string[]).includes(o.regime));
      cellules.add(`${o.classe}×${o.regime}`);
    }
    assert.ok(cellules.size >= 12);
  });

  it("4 sceau : la lecture se régénère ; Origine est balancée", () => {
    const origine: Q = [5000n, 5000n, -5000n, 5000n];
    assert.equal(glypheLecture(origine), "☽☽☽☽");
    const extra: Q = [9000n, 2000n, 2000n, 2000n];
    const g = glypheLecture(extra);
    assert.equal(g.length, 4);
    assert.notEqual(g, glypheLecture(origine));
  });

  it("5 époques : l'âge et l'étage sont de la géographie", () => {
    assert.equal(ETAGES, 255);
    assert.equal(norme2(coupeDe(0)), norme2(coupeDe(254)));
    assert.equal(norme2(coupeDe(0)), NORME);
    const os = occupantsDe(0);
    assert.ok(os.length >= 1);
    for (const o of os) assert.equal(norme2(o.q), NORME);
  });

  it("6 résonance : pas une table de sets ; même classe destructif", () => {
    assert.equal(polariteDe(100n, 10n, 10n, true), "destructif");
    const q: Q = [5000n, 5000n, -5000n, 5000n];
    const lec = resonanceDe([
      { q, classe: "arme" },
      { q, classe: "arme" },
      { q, classe: "defense" },
    ]);
    assert.equal(lec.nDestructif, 1);
    assert.equal(lec.nConstructif, 2);
    assert.equal("bonus" in lec, false);
  });
});

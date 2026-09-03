import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  alignement,
  conjugue,
  norme2,
  produit,
  quadrupleDepuis,
  type Q,
} from "./cosmos.ts";
import { utf8 } from "./hash.ts";
import {
  COS_ELITE,
  COS_DEN,
  cheminsEquivalents,
  conjuguerPar,
  memeOrbite,
  memeRayon,
  tientAxe,
} from "./groupe.ts";

describe("groupe SU(2)", () => {
  const a = quadrupleDepuis(utf8("chemin-a"));
  const b = quadrupleDepuis(utf8("chemin-b"));
  const c = quadrupleDepuis(utf8("chemin-c"));

  it("q et ḡ(q) : même orbite, pas le même rayon si vecteur ≠ 0", () => {
    const g = conjugue(a);
    assert.equal(memeOrbite(a, g), true);
    assert.equal(a[1] === 0n && a[2] === 0n && a[3] === 0n, false);
    assert.equal(memeRayon(a, g), false);
  });

  it("non commutatif : A·B et B·A, orbites distinctes en général", () => {
    const ab = produit(a, b);
    const ba = produit(b, a);
    assert.notDeepEqual([...ab], [...ba]);
    assert.equal(cheminsEquivalents(a, b, b, a), false);
  });

  it("parade : ḡ(A)·(A·B) est sur le rayon de B", () => {
    const coup = produit(a, b);
    const retour = produit(conjugue(a), coup);
    assert.equal(memeRayon(retour, b), true);
    assert.equal(norme2(retour), norme2(a) * norme2(a) * norme2(b));
  });

  it("conjugaison : g q ḡ reste dans l'orbite de q", () => {
    const p = conjuguerPar(a, b);
    assert.equal(memeOrbite(p, b), true);
    assert.equal(norme2(p), norme2(a) * norme2(a) * norme2(b));
  });

  it("associativité des chemins : (A·B)·C = A·(B·C)", () => {
    const g = produit(produit(a, b), c);
    const d = produit(a, produit(b, c));
    assert.deepEqual([...g], [...d]);
  });

  it("tientAxe : ancre sur elle-même, Elite 87/100", () => {
    assert.equal(tientAxe(a, a, COS_ELITE, COS_DEN), true);
    const loin: Q = [-a[1]!, a[0]!, -a[3]!, a[2]!];
    assert.equal(alignement(a, loin), 0n);
    assert.equal(tientAxe(loin, a, COS_ELITE, COS_DEN), false);
  });

  it("Origine : cos 0, ne décroche pas", () => {
    const loin: Q = [-a[1]!, a[0]!, -a[3]!, a[2]!];
    assert.equal(tientAxe(loin, a, 0n, COS_DEN), true);
  });
});

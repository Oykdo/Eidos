import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  N_AUTORITES,
  N_NOEUDS,
  N_SECTEURS,
  N_TIERS,
  PREMIERS,
  construireArbre,
  noeudsAuPalier,
} from "./modele.ts";

describe("arbre déterministe", () => {
  it("compte exact : 10 paliers, 33 secteurs, 425 nœuds, 4881 autorités", () => {
    assert.equal(N_TIERS, 10);
    assert.equal(N_SECTEURS, 33);
    assert.equal(N_NOEUDS, 425);
    const s = Array.from({ length: 10 }, (_, t) => noeudsAuPalier(t)).reduce(
      (a, b) => a + b,
      0,
    );
    assert.equal(s, 425);
    const a = construireArbre();
    assert.equal(a.noeuds.length, 425);
    assert.equal(a.nAutorites, 4881);
    assert.equal(a.autorites.length, N_AUTORITES);
  });

  it("épine : vingt premiers, sans 21", () => {
    assert.equal(PREMIERS.length, 20);
    assert.ok(!PREMIERS.includes(21 as never));
    for (const p of PREMIERS) {
      for (let d = 2; d * d <= p; d++) assert.notEqual(p % d, 0);
    }
  });

  it("rejeu identique", () => {
    const a = construireArbre();
    const b = construireArbre();
    assert.equal(a.noeuds[0]!.x, b.noeuds[0]!.x);
    assert.equal(a.noeuds[200]!.secteur, b.noeuds[200]!.secteur);
    assert.equal(a.autorites[1000]!.y, b.autorites[1000]!.y);
  });

  it("chaque nœud hors D0 a un parent au palier supérieur", () => {
    const a = construireArbre();
    for (const n of a.noeuds) {
      if (n.palier === 0) assert.equal(n.parent, null);
      else {
        assert.notEqual(n.parent, null);
        assert.equal(a.noeuds[n.parent!]!.palier, n.palier - 1);
      }
    }
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { construireArbre, rayonDuPalier } from "./modele.ts";
import {
  R_HORIZON,
  R_PHOTON,
  calculerChamp,
  palierLePlusProche,
  potentiel,
} from "./champ.ts";

describe("champ discret", () => {
  const a = construireArbre();
  const cone = calculerChamp(a, "cone");
  const puits = calculerChamp(a, "puits");

  it("Φ décroît le long de la descendance", () => {
    for (const n of a.noeuds) {
      if (n.parent == null) {
        assert.equal(potentiel(n), 9);
        continue;
      }
      const p = a.noeuds[n.parent]!;
      assert.equal(potentiel(p), potentiel(n) + 1);
    }
  });

  it("∇·v se conserve : somme nulle, sources en D0, puits en D9", () => {
    assert.equal(cone.sommeDiv, 0);
    assert.equal(puits.sommeDiv, 0);
    for (const n of a.noeuds) {
      const c = cone.noeuds[n.id]!;
      if (n.palier === 0) assert.ok(c.div >= 1);
      if (n.palier === 9) assert.equal(c.div, -1);
    }
  });

  it("forêt : aucun cycle, rotationnel combinatoire nul", () => {
    assert.equal(cone.foret, true);
    assert.equal(puits.foret, true);
    for (const n of a.noeuds) {
      const vus = new Set<number>();
      let cur: number | null = n.id;
      while (cur != null) {
        assert.equal(vus.has(cur), false);
        vus.add(cur);
        cur = a.noeuds[cur]!.parent;
      }
    }
  });

  it("fuite azimutale du plongement, pas un tourbillon", () => {
    assert.ok(cone.curlMoyen < 0.4, `curl cone ${cone.curlMoyen}`);
    assert.ok(puits.curlMoyen < 0.4, `curl puits ${puits.curlMoyen}`);
  });

  it("∇²Φ = k − 1_parent (branchement)", () => {
    for (const c of cone.noeuds) {
      assert.equal(c.laplacien, c.div);
    }
  });

  it("photon / horizon = 3/2, et 1.5 rs ne tombe sur aucun palier", () => {
    assert.equal(R_HORIZON, rayonDuPalier(0));
    assert.equal(R_PHOTON / R_HORIZON, 1.5);
    const t = palierLePlusProche(R_PHOTON);
    assert.ok(Math.abs(rayonDuPalier(t) - R_PHOTON) > 0.05);
  });
});

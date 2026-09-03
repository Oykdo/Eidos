import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { NORME, norme2 } from "./cosmos.ts";
import {
  DALLE_N,
  ETAGES,
  biomeDe,
  coupeDe,
  dalleDe,
  occupantsDe,
  resonanceEtage,
} from "./tour.ts";

describe("tour — 255 coupes", () => {
  it("255 étages, terre au sol, uranie au faîte", () => {
    assert.equal(ETAGES, 255);
    assert.equal(biomeDe(0).id, "terre");
    assert.equal(biomeDe(254).id, "uranie");
    assert.equal(biomeDe(255).id, "terre");
  });

  it("coupe : norme ATOMES, pas un palier", () => {
    for (const e of [0, 1, 28, 127, 254]) {
      assert.equal(norme2(coupeDe(e)), NORME);
    }
  });

  it("occupants 1–3, même classe que le biome", () => {
    for (let e = 0; e < 36; e++) {
      const os = occupantsDe(e);
      assert.ok(os.length >= 1 && os.length <= 3);
      const id = biomeDe(e).id;
      for (const o of os) {
        assert.equal(o.classe, id);
        assert.equal(norme2(o.q), NORME);
      }
    }
  });

  it("même classe : résonance destructive sur l'étage", () => {
    let vu = false;
    for (let e = 0; e < 40; e++) {
      const os = occupantsDe(e);
      if (os.length < 2) continue;
      const lec = resonanceEtage(e);
      assert.equal(lec.nDestructif, (os.length * (os.length - 1)) / 2);
      assert.equal(lec.nConstructif, 0);
      vu = true;
    }
    assert.equal(vu, true);
  });

  it("dalle 9×9, bits du hache", () => {
    const d = dalleDe(0);
    assert.equal(d.length, DALLE_N);
    assert.equal(d[0]!.length, DALLE_N);
    assert.notDeepEqual(dalleDe(0), dalleDe(1));
  });

  it("étage 0 gelé", () => {
    const q = coupeDe(0);
    assert.deepEqual(
      q.map((x) => x.toString()),
      ["5064", "2312", "3336", "7608"],
    );
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SIGNATURES } from "./signatures.ts";
import { REPLIQUES_VEILLEE } from "./veillee-lexique.ts";

describe("lexique de la veillée : une phrase par muse, deux langues", () => {
  it("neuf muses, FR et EN non vides, une phrase chacune, toutes distinctes", () => {
    const vues = new Set<string>();
    for (const s of SIGNATURES) {
      const r = REPLIQUES_VEILLEE[s.id];
      assert.ok(r, s.id);
      for (const langue of ["fr", "en"] as const) {
        assert.ok(r[langue].length > 10, `${s.id} ${langue}`);
        assert.ok(/[.!]$/.test(r[langue]), `${s.id} ${langue} : une phrase finie`);
        assert.ok(!vues.has(r[langue]), `${s.id} ${langue} : doublon`);
        vues.add(r[langue]);
      }
    }
    assert.equal(Object.keys(REPLIQUES_VEILLEE).length, SIGNATURES.length);
  });
});

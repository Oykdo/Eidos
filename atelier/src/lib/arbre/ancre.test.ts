import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { N_NOEUDS, N_SECTEURS } from "./modele.ts";
import { ancreDe, etiquetteAncre } from "./ancre.ts";

describe("ancre coffre → nœud", () => {
  it("rejeu identique", () => {
    const a = ancreDe("adresse-demo");
    const b = ancreDe("adresse-demo");
    assert.deepEqual(a, b);
    assert.ok(a.noeud >= 0 && a.noeud < N_NOEUDS);
    assert.ok(a.secteur >= 0 && a.secteur < N_SECTEURS);
  });

  it("deux clés distinctes ne collapsent pas toujours", () => {
    const s = new Set(
      Array.from({ length: 40 }, (_, i) => ancreDe(`a${i}`).noeud),
    );
    assert.ok(s.size > 10);
  });

  it("étiquette : palier et secteur nommés", () => {
    const a = ancreDe("adresse-demo");
    const e = etiquetteAncre(a);
    assert.ok(e.startsWith(`D${a.palier} · `));
    assert.ok(e.length > 6);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { NOM_CARNET } from "./carnet.ts";
import { fichierCarnet } from "./sauver.ts";

describe("sauver carnet", () => {
  it("le fichier porte le nom gelé et le JSON", () => {
    const raw = '{"v":1,"kind":"eidos-carnet/1"}';
    const f = fichierCarnet(raw);
    assert.equal(f.name, NOM_CARNET);
    assert.equal(f.name, "eidos.carnet");
    assert.equal(f.type, "application/json");
    assert.equal(f.size, raw.length);
  });
});

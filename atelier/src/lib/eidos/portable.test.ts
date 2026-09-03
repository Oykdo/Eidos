import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { coffreNeuf } from "./wallet.ts";
import { exporterCoffre, parserCoffrePortable, estPsnx } from "./portable.ts";
import { spinorDepuisOctets } from "./spinor.ts";
import { fromHex } from "./hash.ts";

describe("portable téléphone", () => {
  it("aller-retour .eidos", () => {
    const c = coffreNeuf("vide");
    const raw = exporterCoffre(c);
    const lu = parserCoffrePortable(raw);
    assert.ok(!("erreur" in lu));
    if ("erreur" in lu) return;
    assert.equal(lu.coffre.maitre, c.maitre);
    assert.equal(lu.coffre.nature, "personnel");
  });

  it("un JSON quelconque n'est pas un coffre", () => {
    const lu = parserCoffrePortable('{"hello":1}');
    assert.ok("erreur" in lu);
  });

  it("le spinor d'un .psnx n'est pas la graine", () => {
    const c = coffreNeuf("vide");
    const faux = new TextEncoder().encode("psnx-binaire-de-test");
    const s = spinorDepuisOctets(faux);
    assert.equal(s.phases.length, 7);
    assert.equal(s.digest.length, 64);
    assert.notEqual(s.digest, c.maitre);
    assert.ok(estPsnx("vault.psnx", faux));
    assert.ok(!estPsnx("coffre.eidos.json", fromHex("7b7d")));
  });
});

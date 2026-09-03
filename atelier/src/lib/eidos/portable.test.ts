import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { coffreNeuf } from "./wallet.ts";
import {
  empreintePsnx,
  estPsnxEtranger,
  exporterPsnx,
  parserPsnx,
} from "./portable.ts";
import { spinorDepuisOctets } from "./spinor.ts";
import { fromHex } from "./hash.ts";

describe("portable psnx", () => {
  it("aller-retour .psnx : graine, pièces, reliques", () => {
    const c = coffreNeuf("mixte");
    c.reliques = ["Kali"];
    const raw = exporterPsnx(c);
    const lu = parserPsnx(raw);
    assert.ok(!("erreur" in lu));
    if ("erreur" in lu) return;
    assert.equal(lu.kind, "eidos-psnx/1");
    assert.equal(lu.coffre.maitre, c.maitre);
    assert.equal(lu.coffre.sorties.length, c.sorties.length);
    assert.deepEqual(lu.coffre.reliques, ["Kali"]);
    assert.equal(lu.empreinte, empreintePsnx(c));
  });

  it("une virgule de trop rompt l'empreinte", () => {
    const c = coffreNeuf("vide");
    const j = JSON.parse(exporterPsnx(c)) as { empreinte: string };
    j.empreinte = "00".repeat(32);
    const lu = parserPsnx(JSON.stringify(j));
    assert.ok("erreur" in lu);
    if ("erreur" in lu) assert.match(lu.erreur, /empreinte/);
  });

  it("l'ancien JSON eidos-coffre s'ouvre encore", () => {
    const c = coffreNeuf("une-piece");
    const ancien = JSON.stringify({ v: 1, kind: "eidos-coffre", coffre: c });
    const lu = parserPsnx(ancien);
    assert.ok(!("erreur" in lu));
    if ("erreur" in lu) return;
    assert.equal(lu.coffre.maitre, c.maitre);
  });

  it("le spinor d'un .psnx Eidolon n'est pas la graine", () => {
    const c = coffreNeuf("vide");
    const faux = new TextEncoder().encode("psnx-binaire-de-test");
    const s = spinorDepuisOctets(faux);
    assert.equal(s.phases.length, 7);
    assert.equal(s.digest.length, 64);
    assert.notEqual(s.digest, c.maitre);
    assert.ok(estPsnxEtranger("vault.psnx", faux));
    assert.ok(!estPsnxEtranger("coffre.psnx", fromHex("7b7d")));
  });
});

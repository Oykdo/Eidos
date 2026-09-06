import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { coffreNeuf } from "./wallet.ts";
import { empreinteCarnet, exporterCarnet, ouvrirFichier } from "./carnet.ts";
import {
  CARACTERES,
  CHYMIE_UNICODE,
  N_CHYMIE,
  caracteresDe,
  decoderChymie,
  encoderChymie,
} from "./chymie.ts";
import { fromHex } from "./hash.ts";

describe("caractères chymiques", () => {
  it("soixante-quatre signes, ids uniques, plaque gelée", () => {
    assert.equal(CARACTERES.length, N_CHYMIE);
    assert.equal(new Set(CARACTERES.map((c) => c.id)).size, N_CHYMIE);
    assert.equal(CARACTERES[0]!.fr, "Fer, ou Mars");
    assert.equal(CARACTERES[8]!.fr, "Argent, ou Lune");
    assert.equal(CARACTERES[37]!.fr, "Or");
    assert.equal(CARACTERES[51]!.fr, "Soufre");
    assert.ok(CARACTERES.every((c) => c.uni.length > 0));
    assert.equal(CARACTERES[0]!.uni, "♂");
    assert.equal(CARACTERES[37]!.uni, "☉");
    const extra = new Set(CHYMIE_UNICODE.map((c) => c.id));
    assert.equal(extra.size, CHYMIE_UNICODE.length);
    assert.ok(CHYMIE_UNICODE.every((c) => c.uni.length > 0));
    const clash = CHYMIE_UNICODE.filter((c) => CARACTERES.some((a) => a.id === c.id));
    assert.deepEqual(clash, []);
  });

  it("l'empreinte du carnet se lit et se reprend", () => {
    const c = coffreNeuf("une-piece");
    const emp = empreinteCarnet(c);
    const codes = encoderChymie(fromHex(emp));
    assert.equal(codes.length, 43);
    assert.ok(codes.every((k) => k >= 0 && k < 64));
    const ret = decoderChymie(codes, 32);
    assert.equal(Buffer.from(ret).toString("hex"), emp);
    assert.equal(caracteresDe(emp).length, 43);
  });

  it("un octet changé change au moins un signe", () => {
    const a = encoderChymie(new Uint8Array(32));
    const b = encoderChymie(new Uint8Array([1, ...new Uint8Array(31)]));
    assert.notDeepEqual(a, b);
  });

  it("ouvrir carnet.eidos donne la même ligne chymique", () => {
    const c = coffreNeuf("mixte");
    const lu = ouvrirFichier("carnet.eidos", exporterCarnet(c));
    assert.ok(!("erreur" in lu));
    if ("erreur" in lu) return;
    assert.deepEqual(caracteresDe(empreinteCarnet(c)).map((x) => x.id), caracteresDe(lu.empreinte).map((x) => x.id));
  });
});

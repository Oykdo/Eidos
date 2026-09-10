import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { coffreNeuf } from "./wallet.ts";
import { empreinteCarnet, exporterCarnet, ouvrirFichier } from "./carnet.ts";
import {
  CARACTERES,
  CHYMIE_UNICODE,
  N_CHYMIE,
  caractereDe,
  caracteresDe,
  codeDuCaractere,
  decoderChymie,
  encoderChymie,
  signeChymique,
  uniDe,
} from "./chymie.ts";
import { codeDuGroupe, groupeDuCode } from "./glyphs.ts";
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

describe("la plaque et l'alphabet des glyphes — six bits des deux côtés", () => {
  it("bijection sur 64 : un code de glyphe est un caractère chymique", () => {
    for (let c = 0; c < N_CHYMIE; c++) {
      const etages = groupeDuCode(c);
      assert.equal(codeDuGroupe(etages), c, `groupe ${etages} ne rend pas ${c}`);
      assert.ok(etages.every((e) => e >= 0 && e <= 3), `étage hors 0..3 pour ${c}`);
      const signe = caractereDe(c);
      assert.equal(signe, CARACTERES[c]);
      assert.equal(codeDuCaractere(signe.id), c, `${signe.id} ne revient pas à ${c}`);
    }
    // 64 codes, 64 groupes de trois figures, 64 ids : aucune collision
    assert.equal(new Set(Array.from({ length: 64 }, (_, c) => groupeDuCode(c).join(""))).size, 64);
    assert.equal(new Set(CARACTERES.map((s) => s.id)).size, 64);
  });

  it("doit échouer : un signe hors des 64 n'a pas de code de glyphe", () => {
    // « marcassite » existe dans la chymie, mais hors de la plaque du carnet
    assert.equal(signeChymique("marcasite")?.fr, "Marcassite");
    assert.equal(uniDe("marcasite"), String.fromCodePoint(0x1f738));
    assert.throws(() => codeDuCaractere("marcasite"), /hors des 64/);
    assert.throws(() => codeDuCaractere("lumen"), /hors des 64/);
    assert.throws(() => uniDe("lumen"), /absent/);
    assert.equal(signeChymique("lumen"), undefined);
    // le lumen ne collisionne avec aucun des 107 signes de la chymie
    const tous = [...CARACTERES, ...CHYMIE_UNICODE];
    assert.equal(tous.length, 107);
    assert.equal(tous.filter((s) => s.id === "lumen").length, 0);
  });
});

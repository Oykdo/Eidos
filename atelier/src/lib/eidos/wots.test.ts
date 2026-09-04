import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hexOf, sha256, utf8 } from "./hash.ts";
import {
  LEN,
  OCTETS_SIG,
  OCTETS_TEMOIN,
  adresse,
  adresseDeGraine,
  baseW,
  empreinte,
  empreinteDeGraine,
  racine,
  signer,
  verifier,
} from "./wots.ts";

describe("WOTS+ = wots.py", () => {
  const graine = sha256(utf8("alice/0"));
  const m = sha256(utf8("message"));

  it("base w : 64 quartets + 3 chiffres de somme de contrôle", () => {
    const zeros = baseW(new Uint8Array(32));
    assert.equal(zeros.length, LEN);
    // Σ(15 − 0) = 960, << 4 = 15360 = 0x3c00 → 3, 12, 0
    assert.deepEqual(zeros.slice(64), [3, 12, 0]);
    const uns = baseW(new Uint8Array(32).fill(0xff));
    assert.deepEqual(uns.slice(64), [0, 0, 0]);
  });

  it("signe et vérifie, tailles mesurées", () => {
    const r = racine(graine);
    const a = adresse(r.grainePub, r.racine);
    const temoin = signer(graine, m);
    assert.equal(temoin.sig.length, OCTETS_SIG);
    assert.equal(temoin.grainePub.length + temoin.sig.length, OCTETS_TEMOIN);
    assert.equal(OCTETS_TEMOIN, 2176);
    assert.equal(verifier(a, m, temoin), true);
    assert.equal(hexOf(adresseDeGraine(graine)), hexOf(a));
    assert.equal(hexOf(empreinteDeGraine(graine)), hexOf(empreinte(r.grainePub, r.racine)));
    assert.equal(hexOf(a), hexOf(empreinte(r.grainePub, r.racine)).slice(0, 40));
  });

  it("refuse un octet altéré, un message autre, une graine publique autre", () => {
    const a = adresseDeGraine(graine);
    const temoin = signer(graine, m);
    const faux = new Uint8Array(temoin.sig);
    faux[100] ^= 1;
    assert.equal(verifier(a, m, { grainePub: temoin.grainePub, sig: faux }), false);
    assert.equal(verifier(a, m, { grainePub: temoin.grainePub, sig: temoin.sig.subarray(1) }), false);
    assert.equal(verifier(a, sha256(utf8("autre")), temoin), false);
    assert.equal(verifier(a, m, { grainePub: sha256(utf8("x")), sig: temoin.sig }), false);
  });

  it("deux graines, deux adresses, deux empreintes", () => {
    const g2 = sha256(utf8("alice/1"));
    assert.notEqual(hexOf(adresseDeGraine(g2)), hexOf(adresseDeGraine(graine)));
    assert.notEqual(hexOf(empreinteDeGraine(g2)), hexOf(empreinteDeGraine(graine)));
  });
});

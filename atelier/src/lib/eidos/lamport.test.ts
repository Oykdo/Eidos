import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sha256, hexOf, utf8, equalBytes } from "./hash.ts";
import {
  adresseDe,
  analyserGraine,
  auditerCoffre,
  bitsDifferents,
  demonstrerReemploi,
  graineDe,
  lamportPublic,
  lamportSecret,
  lamportSign,
  lamportVerify,
  addressOf,
} from "./lamport.ts";
import { coffreAtelier, coffreNeuf, appliquerEnvoi } from "./wallet.ts";
import { readFileSync } from "node:fs";

// vecteurs.json, à la racine du dépôt : écrit par vecteurs.py, lu ici
const VECTEURS = JSON.parse(
  readFileSync(new URL("../../../../vecteurs.json", import.meta.url), "utf8"),
) as { wots: { adresse: string } };

describe("SHA-256", () => {
  it("vecteurs NIST", () => {
    assert.equal(
      hexOf(sha256(utf8(""))),
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
    assert.equal(
      hexOf(sha256(utf8("abc"))),
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });
});

describe("Lamport = utxo.py", () => {
  const seed = graineDe("eidos-atelier-reseau-essai-v1", 0);

  it("graine SHA-256(nom/indice)", () => {
    assert.equal(
      hexOf(seed),
      "235dc8bf8859de8f3aa59627a69a1332fef9cb448b7a8c29b09ed7180c14f1b3",
    );
    assert.equal(
      hexOf(graineDe("portefeuille", 0)),
      "ec10fa75d5b8138590d4bee5cf8cd404951581d660aac3410f3d411542d01ae4",
    );
  });

  it("paires secrètes et clé publique", () => {
    const sk = lamportSecret(seed);
    const pk = lamportPublic(sk);
    assert.equal(sk.length, 16384);
    assert.equal(pk.length, 16384);
    assert.equal(
      hexOf(sk.subarray(0, 32)),
      "9012d21933f6e23e645aa0eee23ba89e0b105da0863e2f4ffa149c2233963aef",
    );
    assert.equal(
      hexOf(sk.subarray(32, 64)),
      "1842eb6aabb11d18acbce4064706cf4800da567c2c778bf246062e181b0f736f",
    );
    assert.equal(
      hexOf(sha256(pk)),
      "5a9c197589db292b6675d3218bccf94dae3cc313e74f5cd3c932c85d3cbadd40",
    );
    assert.equal(hexOf(addressOf(pk)), "5a9c197589db292b6675d3218bccf94dae3cc313");
    // l'adresse du coffre, elle, est WOTS+ : même graine, dérivation du nœud
    assert.equal(adresseDe("eidos-atelier-reseau-essai-v1", 0), VECTEURS.wots.adresse);
  });

  it("signe et vérifie, refuse un autre message", () => {
    const sk = lamportSecret(seed);
    const pk = lamportPublic(sk);
    const m = sha256(utf8("message"));
    const sig = lamportSign(sk, m);
    assert.equal(sig.length, 8192);
    assert.equal(
      hexOf(sha256(sig)),
      "b65f281b1ecebd0b86c290572a4d21afcfb329406895f95e97300c4f4bf611bb",
    );
    assert.equal(lamportVerify(pk, m, sig), true);
    assert.equal(lamportVerify(pk, sha256(utf8("autre")), sig), false);
    const faux = new Uint8Array(sig);
    faux[0] ^= 1;
    assert.equal(lamportVerify(pk, m, faux), false);
  });
});

describe("sécurité des clés", () => {
  it("détecte une graine nominale publique", () => {
    const g = analyserGraine("portefeuille");
    assert.equal(g.forme, "nom");
    assert.equal(g.publique, true);
  });

  it("accepte 32 octets hex comme 256 bits", () => {
    const g = analyserGraine("ab".repeat(32));
    assert.equal(g.forme, "hex256");
    assert.equal(g.bits, 256);
  });

  it("l'atelier est reproductible et marqué public", () => {
    const c = coffreAtelier("une-piece");
    assert.equal(c.nature, "atelier");
    assert.equal(c.sorties[0]?.adresse, VECTEURS.wots.adresse);
    const a = auditerCoffre(c);
    const entropie = a.find((x) => x.id === "entropie");
    assert.equal(entropie?.etat, "attention");
    const adr = a.find((x) => x.id === "adresse");
    assert.equal(adr?.etat, "ok");
  });

  it("un coffre personnel a 256 bits et des adresses reproductibles", () => {
    const c = coffreNeuf("une-piece");
    assert.equal(c.nature, "personnel");
    assert.match(c.maitre, /^[0-9a-f]{64}$/);
    assert.notEqual(c.maitre, c.sorties[0]?.adresse);
    const a = auditerCoffre(c);
    assert.equal(a.find((x) => x.id === "entropie")?.etat, "ok");
    assert.equal(a.find((x) => x.id === "adresse")?.etat, "ok");
  });

  it("deux signatures forgent un troisième message", () => {
    const d = demonstrerReemploi();
    assert.equal(d.verifie1, true);
    assert.equal(d.verifie2, true);
    assert.equal(d.verifieForge, true);
    assert.ok(d.bits > 0);
    assert.notEqual(d.msg1, d.msg3);
    const m1 = sha256(utf8("premier"));
    const m2 = sha256(utf8("second"));
    assert.equal(d.bits, bitsDifferents(m1, m2));
  });

  it("un envoi publie l'empreinte et refuse le réemploi", () => {
    const c = coffreAtelier("une-piece");
    const { coffre, selection } = appliquerEnvoi(c, 100_000_000, "00".repeat(20));
    assert.equal(selection.ok, true);
    assert.equal(coffre.derniereSig?.ok, true);
    assert.equal(coffre.clesUsees.length, 1);
    const encore = appliquerEnvoi(
      { ...coffre, sorties: c.sorties, clesUsees: coffre.clesUsees },
      100_000_000,
      "00".repeat(20),
    );
    assert.equal(encore.selection.ok, false);
    if (!encore.selection.ok) assert.equal(encore.selection.code, "cle");
  });

  it("compare par octets, pas par référence", () => {
    const a = utf8("abc");
    const b = utf8("abc");
    assert.equal(equalBytes(a, b), true);
    assert.equal(equalBytes(a, utf8("abd")), false);
  });
});

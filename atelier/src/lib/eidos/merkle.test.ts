import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { hexOf as hexOfV } from "./hash.ts";
import { preuveReseau, utxoRoot, verifierPreuve as verifierPreuveV } from "./merkle.ts";

const VEC = JSON.parse(
  readFileSync(new URL("../../../../vecteurs.json", import.meta.url), "utf8"),
) as {
  carnet: {
    sorties: { txid: string; rang: number; adresse: string; montant: number }[];
    feuilles: string[];
    utxo_root: string;
  };
};
import { hexOf } from "./hash.ts";
import {
  etapesDe,
  feuilleSortie,
  merkleDuCarnet,
  merkleRoot,
  parserPreuve,
  preuveDe,
  preuvePourSortie,
  serialiser,
  verifierPreuve,
} from "./merkle.ts";
import { coffreAtelier } from "./wallet.ts";

function vec(start: number): Uint8Array {
  const b = new Uint8Array(32);
  for (let i = 0; i < 32; i++) b[i] = (start + i) & 255;
  return b;
}

describe("merkle_root = utxo.py", () => {
  const a = vec(0);
  const b = vec(32);
  const c = vec(64);

  it("vide → 32 zéros", () => {
    assert.equal(hexOf(merkleRoot([])), "00".repeat(32));
  });

  it("une feuille : la feuille, sans re-hachage", () => {
    assert.equal(hexOf(merkleRoot([a])), hexOf(a));
  });

  it("deux feuilles : SHA-256d(a‖b)", () => {
    assert.equal(
      hexOf(merkleRoot([a, b])),
      "01c9f464780a1b6af4eb400fe2f2896cfb2169f5a65701439e4c2c4e213903ef",
    );
  });

  it("trois feuilles : dernière recopiée", () => {
    assert.equal(
      hexOf(merkleRoot([a, b, c])),
      "0f6b9b5e8830cbc1c43ff4237038db1d5d710b68c4776758dccbb43917e390e5",
    );
  });

  it("paire identique", () => {
    assert.equal(
      hexOf(merkleRoot([a, a])),
      "94b4244b8ffaf7d006b3c43722a2ce391998e44eea9ceecbcdbaf53d0addad98",
    );
  });
});

describe("preuve d'inclusion", () => {
  it("chaque feuille du Mixte se vérifie, étapes = racine", () => {
    const c = coffreAtelier("mixte");
    const { feuilles, niveaux } = merkleDuCarnet(c.sorties);
    assert.equal(c.sorties.length, 8);
    for (let i = 0; i < feuilles.length; i++) {
      const p = preuveDe(feuilles, i, c.sorties[i]!.ref);
      assert.ok(p);
      assert.equal(p.racine, niveaux.racine);
      assert.equal(verifierPreuve(p), true);
      const et = etapesDe(p);
      assert.equal(et[0]!.hash, p.feuille);
      assert.equal(et[et.length - 1]!.hash, p.racine);
      assert.equal(et[et.length - 1]!.role, "racine");
    }
  });

  it("dix sorties fragmentées, y compris après padding interne", () => {
    const c = coffreAtelier("fragmente");
    assert.equal(c.sorties.length, 10);
    for (const s of c.sorties) {
      const p = preuvePourSortie(c.sorties, s.ref);
      assert.ok(p);
      assert.equal(verifierPreuve(p), true);
    }
  });

  it("une seule feuille : la preuve est la feuille = racine", () => {
    const c = coffreAtelier("poussiere");
    const p = preuvePourSortie(c.sorties, c.sorties[0]!.ref);
    assert.ok(p);
    assert.equal(p.freres.length, 0);
    assert.equal(p.feuille, p.racine);
    assert.equal(verifierPreuve(p), true);
  });

  it("une feuille altérée échoue", () => {
    const c = coffreAtelier("mixte");
    const p = preuvePourSortie(c.sorties, c.sorties[0]!.ref)!;
    p.feuille = hexOf(vec(1));
    assert.equal(verifierPreuve(p), false);
  });

  it("un frère altéré échoue", () => {
    const c = coffreAtelier("mixte");
    const p = preuvePourSortie(c.sorties, c.sorties[3]!.ref)!;
    assert.ok(p.freres.length > 0);
    p.freres[0] = { ...p.freres[0]!, hash: hexOf(vec(9)) };
    assert.equal(verifierPreuve(p), false);
  });

  it("preuve portable : aller-retour JSON", () => {
    const c = coffreAtelier("mixte");
    const p = preuvePourSortie(c.sorties, c.sorties[2]!.ref)!;
    const lu = parserPreuve(JSON.stringify(serialiser(p)));
    assert.ok(!("erreur" in lu));
    assert.equal(verifierPreuve(lu), true);
    assert.equal(lu.racine, p.racine);
  });

  it("parser refuse un JSON tronqué", () => {
    const lu = parserPreuve("{");
    assert.ok("erreur" in lu);
  });

  it("feuilleSortie change si le montant change", () => {
    const c = coffreAtelier("une-piece");
    const s = c.sorties[0]!;
    const a = feuilleSortie(s);
    const b = feuilleSortie({ ...s, montant: s.montant + 1 });
    assert.notEqual(hexOf(a), hexOf(b));
  });
});

describe("racine UTXO = utxo.utxo_root", () => {
  it("ordre canonique (txid, rang), même racine quel que soit l'ordre d'entrée", () => {
    const s = VEC.carnet.sorties;
    assert.equal(hexOfV(utxoRoot(s)), VEC.carnet.utxo_root);
    assert.equal(hexOfV(utxoRoot(s.slice().reverse())), VEC.carnet.utxo_root);
    assert.equal(hexOfV(utxoRoot([])), "00".repeat(32));
    for (const ref of s.map((x) => `${x.txid}:${x.rang}`)) {
      const p = preuveReseau(s.slice().reverse(), ref);
      assert.ok(p);
      assert.equal(p.racine, VEC.carnet.utxo_root);
      assert.ok(verifierPreuveV(p));
    }
    assert.equal(preuveReseau(s, "ff".repeat(32) + ":0"), null);
  });
});

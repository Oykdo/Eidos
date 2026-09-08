import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { fromHex, hexOf, sha256 } from "./hash.ts";
import { graineDe, adresseDe, signerEntrees, sighash } from "./lamport.ts";
import { serTx } from "./envoi.ts";
import { encoderAdresse, encoderGlyphes, verifierAdresse } from "./glyphs.ts";
import { SAC_COFFRE, SPEC_COFFRE, TIERS, coffreDe } from "./coffre-horaire.ts";
import {
  TYPE_LTREE,
  TYPE_OTS,
  adresse,
  adrs,
  arbreL,
  cleDepuisSignature,
  empreinte,
  grainePublique,
  racine,
  signer,
  verifier,
} from "./wots.ts";
import type { Sortie } from "./types.ts";

type Vecteurs = {
  parametres: { octets_signature: number; octets_temoin: number; version_tx: number };
  wots: {
    maitre: string;
    indice: number;
    graine: string;
    graine_publique: string;
    racine_l: string;
    adresse: string;
    empreinte: string;
    message: string;
    signature: string;
    adresse_indice_1: string;
  };
  tx: {
    entrees: { txid: string; vout: number }[];
    sorties: { adresse: string; atomes: number }[];
    core: string;
    txid: string;
    sighash_0: string;
    temoin_0: { graine_publique: string; signature: string };
    ser_tx_longueur: number;
    ser_tx_sha256: string;
  };
  coffre: {
    tag: string;
    sac_places: number;
    tiers: number;
    claims: {
      id_bloc: string;
      txid: string;
      rang: number;
      graine: string;
      tier: number;
      objets: { graine: string; age: string }[];
    }[];
  };
  glyphes: {
    adresse: string;
    encodee: string;
    condensat: string;
    condensat_encode: string;
    bourrage_refuse: string;
  };
  xmss: {
    graine: string;
    hauteur: number;
    graine_publique: string;
    feuille_0: string;
    message: string;
    signature: { indice: number; wots: string; chemin: string[] };
  };
};

// vecteurs.json à la racine du dépôt, écrit par vecteurs.py --generer
const V = JSON.parse(
  readFileSync(new URL("../../../../vecteurs.json", import.meta.url), "utf8"),
) as Vecteurs;

describe("vecteurs.json = vecteurs.py", () => {
  it("clé WOTS+ : graine, graine publique, racine L, adresse, empreinte, signature", () => {
    const g = graineDe(V.wots.maitre, V.wots.indice);
    assert.equal(hexOf(g), V.wots.graine);
    assert.equal(hexOf(grainePublique(g)), V.wots.graine_publique);
    const r = racine(g);
    assert.equal(hexOf(r.racine), V.wots.racine_l);
    assert.equal(hexOf(adresse(r.grainePub, r.racine)), V.wots.adresse);
    assert.equal(hexOf(empreinte(r.grainePub, r.racine)), V.wots.empreinte);
    const m = fromHex(V.wots.message);
    const t = signer(g, m);
    assert.equal(hexOf(t.sig), V.wots.signature);
    assert.equal(t.sig.length, V.parametres.octets_signature);
    assert.equal(verifier(fromHex(V.wots.adresse), m, t), true);
    assert.equal(adresseDe(V.wots.maitre, 1), V.wots.adresse_indice_1);
  });

  it("transaction : core, txid, sighash, témoin, ser_tx", () => {
    const e = V.tx.entrees[0]!;
    const entree: Sortie = {
      ref: `${e.txid}:${e.vout}`,
      txid: e.txid,
      rang: e.vout,
      adresse: V.wots.adresse,
      indice: V.wots.indice,
      montant: 1234,
    };
    const dest = fromHex(V.tx.sorties[0]!.adresse);
    const sig = signerEntrees(V.wots.maitre, [entree], dest, V.tx.sorties[0]!.atomes, V.tx.sorties[1]!.atomes, 1);
    assert.ok(sig.ok, sig.erreur ?? "");
    assert.equal(hexOf(sig.core), V.tx.core);
    assert.equal(sig.txid, V.tx.txid);
    assert.equal(hexOf(sighash(fromHex(V.tx.txid), 0)), V.tx.sighash_0);
    assert.equal(hexOf(sig.temoins[0]!.grainePub), V.tx.temoin_0.graine_publique);
    assert.equal(hexOf(sig.temoins[0]!.sig), V.tx.temoin_0.signature);
    const ser = serTx({ core: sig.core, temoins: sig.temoins });
    assert.equal(ser.length, V.tx.ser_tx_longueur);
    assert.equal(hexOf(sha256(ser)), V.tx.ser_tx_sha256);
    assert.equal(sig.adresseRendu, V.tx.sorties[1]!.adresse);
  });

  it("glyphes : adresse 27 + 4, condensat 43, bourrage refusé — mêmes figures que eonis.py", () => {
    const g = V.glyphes;
    assert.equal(encoderAdresse(fromHex(g.adresse)), g.encodee);
    assert.equal(hexOf(verifierAdresse(g.encodee).a20), g.adresse);
    assert.equal(encoderGlyphes(fromHex(g.condensat)), g.condensat_encode);
    assert.equal(g.condensat_encode.split(" ").length, 43);
    assert.throws(() => verifierAdresse(g.bourrage_refuse));
  });

  it("XMSS : la feuille 0 se reconstruit depuis la signature de bloc", () => {
    const gp = fromHex(V.xmss.graine_publique);
    const s = V.xmss.signature;
    assert.equal(s.indice, 0);
    assert.equal(s.chemin.length, V.xmss.hauteur);
    const pk = cleDepuisSignature(fromHex(s.wots), gp, adrs(TYPE_OTS, { a: s.indice }), fromHex(V.xmss.message));
    assert.ok(pk);
    const feuille = arbreL(pk, gp, adrs(TYPE_LTREE, { a: s.indice }));
    assert.equal(hexOf(feuille), V.xmss.feuille_0);
  });

  it("coffre horaire : graine, tier et contenu identiques à labo/coffre_horaire.py", () => {
    const c = V.coffre;
    assert.equal(c.tag, SPEC_COFFRE);
    assert.equal(c.sac_places, SAC_COFFRE);
    assert.equal(c.tiers, TIERS);
    assert.ok(c.claims.length >= 3);
    for (const cl of c.claims) {
      const mien = coffreDe(cl.id_bloc, { txid: cl.txid, rang: cl.rang });
      assert.equal(mien.graine, cl.graine);
      assert.equal(mien.tier, cl.tier);
      // les objets sont des ObjetPorte dérivés ici ; le labo n'en donne que la graine et l'âge
      assert.equal(mien.objets.length, cl.objets.length);
      assert.deepEqual(mien.objets.map((o) => o.age as string), cl.objets.map((o) => o.age));
    }
  });
});

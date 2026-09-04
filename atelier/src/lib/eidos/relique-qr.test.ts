import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { fromHex, hexOf, sha256, utf8 } from "./hash.ts";
import { deserTx, desencapsuler } from "./envoi.ts";
import { sighash } from "./lamport.ts";
import { verifier } from "./wots.ts";
import {
  BASE_URL_RELIQUE,
  chargeUtile,
  depuisBase64url,
  idRelique,
  parserRelique,
  preparerRecuperation,
  statutRelique,
  versBase64url,
} from "./relique-qr.ts";

const V = JSON.parse(
  readFileSync(new URL("../../../../vecteurs.json", import.meta.url), "utf8"),
) as { relique: { graine: string; adresse: string; id: string; base64url: string; charge_utile: string } };

describe("relique QR = relique.py", () => {
  const graine = sha256(utf8("relique/test"));

  it("base64url sans bourrage, charge utile, adresse et id du vecteur", () => {
    assert.equal(hexOf(graine), V.relique.graine);
    assert.equal(versBase64url(graine), V.relique.base64url);
    assert.deepEqual(depuisBase64url(V.relique.base64url), graine);
    for (const n of [0, 1, 2, 3, 31, 32, 33]) {
      const b = new Uint8Array(n).map((_, i) => (i * 53 + 7) & 255);
      assert.deepEqual(depuisBase64url(versBase64url(b)), b);
    }
    assert.equal(chargeUtile(graine), V.relique.charge_utile);
    assert.ok(chargeUtile(graine).startsWith(BASE_URL_RELIQUE + "#r=1."));
    assert.equal(idRelique(V.relique.adresse), V.relique.id);
  });

  it("lit l'URL, la forme eidos:, le fragment nu ; refuse version, base64 et longueur", () => {
    for (const t of [
      V.relique.charge_utile,
      `eidos:relique/1/${V.relique.base64url}`,
      `r=1.${V.relique.base64url}`,
      `  1.${V.relique.base64url}\n`,
    ]) {
      const r = parserRelique(t);
      assert.ok(!("erreur" in r), t);
      assert.equal(r.adresse, V.relique.adresse);
      assert.equal(r.id, V.relique.id);
      assert.deepEqual(r.graine, graine);
    }
    assert.match((parserRelique(`eidos:relique/2/${V.relique.base64url}`) as { erreur: string }).erreur, /version 2/);
    assert.match((parserRelique("r=1.abc!") as { erreur: string }).erreur, /aucune|illisible/);
    assert.match((parserRelique("r=1.AAAA") as { erreur: string }).erreur, /3 octets/);
    assert.match((parserRelique("bonjour") as { erreur: string }).erreur, /aucune/);
  });

  it("statut : hors-liste, attente, intacte (pièce présente), récupérée", () => {
    const a = V.relique.adresse;
    assert.equal(statutRelique({}, a).etat, "hors-liste");
    assert.equal(statutRelique({ reliques: [{ id: V.relique.id, adresse: a, etat: "attente" }] }, a).etat, "attente");
    const intacte = statutRelique(
      { reliques: [{ id: V.relique.id, adresse: a, etat: "intacte" }], sorties: { ["aa".repeat(32) + ":1"]: { adresse: a, montant: 100_000_000 } } },
      a,
    );
    assert.equal(intacte.etat, "intacte");
    if (intacte.etat === "intacte") assert.deepEqual(intacte.sortie, { txid: "aa".repeat(32), rang: 1, montant: 100_000_000 });
    // présente mais non déclarée : récupérable quand même
    assert.equal(statutRelique({ sorties: { ["aa".repeat(32) + ":0"]: { adresse: a, montant: 5 } } }, a).etat, "intacte");
    const rec = statutRelique({ reliques: [{ id: V.relique.id, adresse: a, etat: "recuperee", bloc: 7, txid: "bb".repeat(32), vers: "cc".repeat(20) }] }, a);
    assert.equal(rec.etat, "recuperee");
    if (rec.etat === "recuperee") assert.equal(rec.entree.bloc, 7);
  });

  it("récupération : dépense signée au format du nœud, témoin vérifiable, issue prête", () => {
    const sortie = { txid: "aa".repeat(32), rang: 1, montant: 100_000_000 };
    const r = preparerRecuperation(graine, sortie, "22".repeat(20));
    assert.ok(!("erreur" in r), "erreur" in r ? r.erreur : "");
    const tx = deserTx(desencapsuler(r.texte));
    assert.equal(hexOf(tx.txid), r.txid);
    assert.equal(hexOf(tx.inputs[0]!.txid), sortie.txid);
    assert.equal(tx.inputs[0]!.vout, 1);
    assert.equal(hexOf(tx.outputs[0]!.adresse), "22".repeat(20));
    assert.equal(tx.outputs[0]!.atomes, 100_000_000);
    const t = tx.temoins[0]!;
    assert.ok(t);
    assert.equal(verifier(fromHex(V.relique.adresse), sighash(tx.txid, 0), t), true);
    assert.ok(r.url.includes("issues/new") && r.url.includes(encodeURIComponent("envoi")));
    assert.ok(r.transmissible.issue);
    assert.match((preparerRecuperation(graine, sortie, "22") as { erreur: string }).erreur, /destination/);
    assert.match((preparerRecuperation(graine, { ...sortie, montant: 0 }, "22".repeat(20)) as { erreur: string }).erreur, /montant/);
  });
});

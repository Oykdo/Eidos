import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { coffreNeuf } from "./wallet.ts";
import { exporterPsnx } from "./portable.ts";
import { adresseDe } from "./lamport.ts";
import {
  ALG_CARNET,
  KIND_CARNET,
  NOM_CARNET,
  SIG_CARNET,
  empreinteCarnet,
  exporterCarnet,
  ouvrirFichier,
  parserCarnet,
} from "./carnet.ts";

describe("carnet unique Lamport-SHA256", () => {
  it("aller-retour : graine, indice, adresse, reliques", () => {
    const c = coffreNeuf("mixte");
    c.reliques = ["Kali"];
    const raw = exporterCarnet(c);
    const lu = parserCarnet(raw);
    assert.ok(!("erreur" in lu));
    if ("erreur" in lu) return;
    assert.equal(lu.kind, KIND_CARNET);
    assert.equal(lu.alg, ALG_CARNET);
    assert.equal(lu.sig, SIG_CARNET);
    assert.equal(lu.feuillet.maitre, c.maitre);
    assert.equal(lu.feuillet.n, c.n);
    assert.equal(lu.adresse, adresseDe(c.maitre, c.n));
    assert.deepEqual(lu.feuillet.reliques, ["Kali"]);
    assert.equal(lu.feuillet.sorties.length, c.sorties.length);
    assert.equal(lu.empreinte, empreinteCarnet(c));
  });

  it("ouvrirFichier lit le carnet et l'ancien coffre Eidos", () => {
    const c = coffreNeuf("une-piece");
    const a = ouvrirFichier(NOM_CARNET, exporterCarnet(c));
    assert.ok(!("erreur" in a));
    if ("erreur" in a) return;
    assert.equal(a.source, "carnet");
    assert.equal(a.adresse, adresseDe(c.maitre, c.n));

    const b = ouvrirFichier("coffre.psnx", exporterPsnx(c));
    assert.ok(!("erreur" in b));
    if ("erreur" in b) return;
    assert.equal(b.source, "psnx");
    assert.equal(b.coffre.maitre, c.maitre);
  });

  it("une empreinte fausse est refusée", () => {
    const c = coffreNeuf("vide");
    const j = JSON.parse(exporterCarnet(c)) as { empreinte: string };
    j.empreinte = "00".repeat(32);
    const lu = ouvrirFichier(NOM_CARNET, JSON.stringify(j));
    assert.ok("erreur" in lu);
    if ("erreur" in lu) assert.match(lu.erreur, /empreinte/);
  });

  it("une adresse Lamport substituée est refusée", () => {
    const c = coffreNeuf("vide");
    const j = JSON.parse(exporterCarnet(c)) as { adresse: string };
    j.adresse = "aa".repeat(20);
    const lu = parserCarnet(JSON.stringify(j));
    assert.ok("erreur" in lu);
    if ("erreur" in lu) assert.match(lu.erreur, /Lamport/);
  });

  it("un schéma courbe est refusé", () => {
    const c = coffreNeuf("vide");
    const j = JSON.parse(exporterCarnet(c)) as { sig: string };
    j.sig = "ecdsa-secp256k1";
    const lu = parserCarnet(JSON.stringify(j));
    assert.ok("erreur" in lu);
    if ("erreur" in lu) assert.match(lu.erreur, /Lamport/);
  });

  it("un .psnx binaire Eidolon n'ouvre pas les clés", () => {
    const lu = ouvrirFichier("vault.psnx", new TextEncoder().encode("psnx-binaire"));
    assert.ok("erreur" in lu);
    if ("erreur" in lu) assert.match(lu.erreur, /Eidolon/);
  });

  it("le nom du fichier est unique", () => {
    assert.equal(NOM_CARNET, "eidos.carnet");
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fromHex, hexOf, sha256 } from "./hash.ts";
import { adresseDe, signerEntrees } from "./lamport.ts";
import {
  DEBUT,
  FIN,
  MAX_CARACTERES_ISSUE,
  depuisBase64,
  desencapsuler,
  deserTx,
  encapsuler,
  lireEtat,
  parserEtatTestnet,
  serTx,
  signerEnvoi,
  sortiesDuCoffre,
  versBase64,
} from "./envoi.ts";
import { appliquerEnvoi, chargerTestnet, coffreAtelier, MAITRE_ATELIER } from "./wallet.ts";
import type { Sortie } from "./types.ts";
import { readFileSync } from "node:fs";

// vecteurs.json (racine du dépôt), écrit par vecteurs.py : même tx, mêmes octets.
const V = JSON.parse(
  readFileSync(new URL("../../../../vecteurs.json", import.meta.url), "utf8"),
) as {
  wots: { adresse: string; adresse_indice_1: string };
  tx: { txid: string; ser_tx_sha256: string; ser_tx_longueur: number };
};
const ADR0 = V.wots.adresse;
const ADR1 = V.wots.adresse_indice_1;
const TXID = V.tx.txid;
const SHA_SER = V.tx.ser_tx_sha256;
const LEN_SER = V.tx.ser_tx_longueur;

const entree: Sortie = {
  ref: "11".repeat(32) + ":0",
  txid: "11".repeat(32),
  rang: 0,
  adresse: ADR0,
  indice: 0,
  montant: 1234,
};

describe("ser_tx = noeud.py", () => {
  it("mêmes octets que le nœud, aller-retour à l'octet près, refus des altérations", () => {
    assert.equal(adresseDe(MAITRE_ATELIER, 0), ADR0);
    assert.equal(adresseDe(MAITRE_ATELIER, 1), ADR1);
    const sig = signerEntrees(MAITRE_ATELIER, [entree], fromHex("22".repeat(20)), 1000, 234, 1);
    assert.ok(sig.ok);
    assert.equal(sig.txid, TXID);
    assert.equal(sig.temoins.length, 1);

    const octets = serTx({ core: sig.core, temoins: sig.temoins });
    assert.equal(octets.length, LEN_SER);
    assert.equal(hexOf(octets.subarray(0, 16)), "00000064000000020001111111111111");
    assert.equal(hexOf(sha256(octets)), SHA_SER);

    const lue = deserTx(octets);
    assert.equal(hexOf(lue.txid), TXID);
    assert.equal(lue.inputs.length, 1);
    assert.equal(lue.outputs.length, 2);
    assert.equal(lue.outputs[1]!.atomes, 234);
    assert.equal(hexOf(lue.outputs[1]!.adresse), ADR1);
    assert.deepEqual(serTx(lue), octets);

    // un octet de trop, un de moins, un core non canonique : refus
    assert.throws(() => deserTx(octets.subarray(0, octets.length - 1)), /tronquée/);
    const trop = new Uint8Array(octets.length + 1);
    trop.set(octets);
    assert.throws(() => deserTx(trop), /longueur incohérente/);
    const tordu = new Uint8Array(octets);
    tordu[3] = 0x63; // len_core 99 : le core ne se retrouve plus
    assert.throws(() => deserTx(tordu), /non canonique/);
    const version = new Uint8Array(octets);
    version[7] = 3;
    assert.throws(() => deserTx(version), /version 3/);
  });
});

describe("encapsulation = robinet.extraire_transaction", () => {
  it("base64 sans Buffer, marqueurs, lignes entières, taille d'issue", () => {
    for (const n of [0, 1, 2, 3, 4, 5, 300]) {
      const b = new Uint8Array(n);
      for (let i = 0; i < n; i++) b[i] = (i * 37 + 11) & 255;
      assert.deepEqual(depuisBase64(versBase64(b)), b);
    }
    assert.equal(versBase64(new TextEncoder().encode("Eidos")), "RWlkb3M=");
    assert.throws(() => depuisBase64("abc"), /base64/);
    assert.throws(() => depuisBase64("ab!d"), /base64/);

    const envoi = signerEnvoi(MAITRE_ATELIER, [entree], fromHex("22".repeat(20)), 1000, 234, 1);
    assert.ok(!("erreur" in envoi));
    const lignes = envoi.texte.split("\n");
    assert.equal(lignes[0], DEBUT);
    assert.equal(lignes[lignes.length - 2], FIN);
    assert.equal(lignes[lignes.length - 1], "");
    for (const l of lignes.slice(1, -2)) {
      assert.ok(l.length <= 76 && /^[A-Za-z0-9+/=]+$/.test(l), l);
    }
    assert.deepEqual(desencapsuler(envoi.texte), envoi.octets);
    assert.equal(envoi.transmissible.entrees, 1);
    assert.ok(envoi.transmissible.issue && envoi.transmissible.robinet);
    assert.ok(envoi.texte.length < MAX_CARACTERES_ISSUE);

    // lignes étrangères entre les marqueurs : ignorées ; sans marqueurs : refus
    const pollue = envoi.texte.replace(DEBUT + "\n", DEBUT + "\nbonjour à tous\n");
    assert.deepEqual(desencapsuler(pollue), envoi.octets);
    assert.throws(() => desencapsuler("rien ici"), /marqueurs/);

    // deux entrées tiennent désormais dans une issue GitHub (témoins WOTS+)
    const deux = signerEnvoi(
      MAITRE_ATELIER,
      [entree, { ...entree, txid: "33".repeat(32), ref: "33".repeat(32) + ":0", adresse: ADR1, indice: 1 }],
      fromHex("22".repeat(20)),
      2000,
      0,
      null,
    );
    assert.ok(!("erreur" in deux));
    assert.equal(deux.transmissible.issue, true);
    assert.equal(deux.transmissible.entrees, 2);
    assert.equal(encapsuler(new Uint8Array(0)), DEBUT + "\n" + FIN + "\n");
  });
});

describe("etat.json du réseau d'essai", () => {
  const txA = "aa".repeat(32);
  const txB = "bb".repeat(32);
  const fixe = {
    spec: "eidos-etat/1",
    hauteur: 100,
    tete: "54085927e4a4f0ff" + "00".repeat(24),
    maj_unix: 1_757_000_000,
    invariant: true,
    sorties: {
      [txB + ":1"]: { adresse: ADR1, montant: 5 },
      [txA + ":0"]: { adresse: ADR0, montant: 100_000_000 },
      [txA + ":1"]: { adresse: "ff".repeat(20), montant: 7 },
      "pas-un-txid:0": { adresse: ADR0, montant: 9 },
      [txB + ":0"]: { adresse: ADR0, montant: 0 },
    },
    soldes: { [ADR0]: 100_000_000, [ADR1]: 5, ["ff".repeat(20)]: 7 },
  };

  it("lecture figée, pièces du coffre, envoi signé depuis le testnet", async () => {
    const etat = parserEtatTestnet(fixe);
    assert.equal(etat.hauteur, 100);
    assert.equal(etat.invariant, true);
    assert.equal(etat.sorties.length, 3);
    assert.deepEqual(
      etat.sorties.map((s) => `${s.txid.slice(0, 2)}:${s.rang}`),
      ["aa:0", "aa:1", "bb:1"],
    );
    assert.equal(etat.soldes[ADR0], 100_000_000);

    const lu = await lireEtat("https://exemple.invalid/etat.json", async () => ({
      ok: true,
      json: async () => fixe,
    }));
    assert.deepEqual(lu, etat);
    await assert.rejects(
      lireEtat("x", async () => ({ ok: false, status: 404, json: async () => null })),
      /404/,
    );

    // le coffre d'atelier (n = 0) retrouve l'indice 0 et l'indice 1 (marge robinet)
    const pieces = sortiesDuCoffre(etat, MAITRE_ATELIER, 0);
    assert.deepEqual(
      pieces.map((p) => [p.indice, p.montant, p.ref]),
      [[0, 100_000_000, txA + ":0"], [1, 5, txB + ":1"]],
    );

    const coffre = chargerTestnet(coffreAtelier("vide"), etat);
    assert.equal(coffre.sorties.length, 2);
    assert.equal(coffre.n, 2);

    // une dépense sur ces pièces sort au format du nœud, avec son témoin
    const { coffre: apres, selection, envoi } = appliquerEnvoi(coffre, 60_000_000, "22".repeat(20));
    assert.ok(selection.ok);
    assert.ok(envoi);
    const tx = deserTx(desencapsuler(envoi.texte));
    assert.equal(hexOf(tx.txid), envoi.txid);
    assert.equal(tx.inputs.length, selection.entrees.length);
    assert.equal(tx.temoins.filter((t) => t !== null).length, tx.inputs.length);
    assert.equal(hexOf(tx.inputs[0]!.txid), txA);
    assert.equal(hexOf(tx.outputs[0]!.adresse), "22".repeat(20));
    assert.equal(tx.outputs[0]!.atomes, 60_000_000);
    assert.ok(apres.clesUsees.length >= 1);
  });
});

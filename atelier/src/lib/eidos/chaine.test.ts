import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  blocGenese,
  chaineSaine,
  hashReproduit,
  merkleCarnet,
  verifierChaine,
} from "./chaine.ts";
import { genesis } from "./genesis-data.ts";
import { preuvePourSortie, verifierPreuve } from "./merkle.ts";
import { appliquerEnvoi, coffreAtelier, minerCoffre } from "./wallet.ts";
import { rewardAt } from "./eonis.ts";

describe("chaîne locale", () => {
  it("atelier Mixte : genèse + un bloc carnet", () => {
    const c = coffreAtelier("mixte");
    assert.equal(c.chaine.length, 2);
    assert.equal(c.chaine[0]!.hash, genesis.bloc_genese.hash);
    assert.equal(c.chaine[0]!.bits, 18);
    assert.equal(c.chaine[1]!.bits, 0);
    assert.equal(c.chaine[1]!.prev, c.chaine[0]!.hash);
    assert.equal(c.chaine[1]!.merkle, merkleCarnet(c.sorties));
    assert.equal(c.chaine[1]!.motif, "atelier");
    assert.equal(hashReproduit(c.chaine[1]!), true);
    assert.equal(chaineSaine(c), true);
  });

  it("bloc 0 n'est pas le Merkle du carnet", () => {
    const c = coffreAtelier("mixte");
    assert.notEqual(c.chaine[0]!.merkle, merkleCarnet(c.sorties));
    assert.equal(c.chaine[0]!.merkle, genesis.bloc_genese.merkle_root);
  });

  it("un envoi ajoute un bloc dont prev = tête précédente", () => {
    const avant = coffreAtelier("une-piece");
    const tete = avant.chaine[avant.chaine.length - 1]!.hash;
    const { coffre, selection } = appliquerEnvoi(avant, 100_000_000, "00".repeat(20));
    assert.equal(selection.ok, true);
    assert.equal(coffre.chaine.length, avant.chaine.length + 1);
    const tip = coffre.chaine[coffre.chaine.length - 1]!;
    assert.equal(tip.prev, tete);
    assert.equal(tip.motif, "envoi");
    assert.equal(tip.merkle, merkleCarnet(coffre.sorties));
    assert.equal(chaineSaine(coffre), true);
  });

  it("altérer prev rompt le chainage", () => {
    const c = coffreAtelier("mixte");
    const brise = {
      ...c,
      chaine: c.chaine.map((b, i) =>
        i === 1 ? { ...b, prev: "00".repeat(32) } : b,
      ),
    };
    const r = verifierChaine(brise);
    assert.equal(r.find((x) => x.id === "chainage")!.ok, false);
    assert.equal(chaineSaine(brise), false);
  });

  it("la preuve d'inclusion s'ancre sur la tête, pas sur le bloc 0", () => {
    const c = coffreAtelier("mixte");
    const p = preuvePourSortie(c.sorties, c.sorties[0]!.ref)!;
    assert.equal(verifierPreuve(p), true);
    assert.equal(p.racine, c.chaine[1]!.merkle);
    assert.notEqual(p.racine, c.chaine[0]!.merkle);
  });

  it("genèse : hash du bloc 0 gelé", () => {
    const g = blocGenese();
    assert.equal(g.hash, genesis.bloc_genese.hash);
    assert.equal(g.hauteur, 0);
  });

  it("miner un bloc : nonce, bits, R(h) sur une sortie neuve", () => {
    const avant = coffreAtelier("vide");
    const c = minerCoffre(avant, 10, 1_756_540_680);
    const tip = c.chaine[c.chaine.length - 1]!;
    assert.equal(tip.motif, "mine");
    assert.equal(tip.bits, 10);
    assert.ok(tip.nonce >= 0);
    assert.equal(hashReproduit(tip), true);
    assert.equal(tip.prev, avant.chaine[avant.chaine.length - 1]!.hash);
    assert.equal(c.sorties[c.sorties.length - 1]!.montant, rewardAt(tip.hauteur));
    assert.equal(chaineSaine(c), true);
  });
});

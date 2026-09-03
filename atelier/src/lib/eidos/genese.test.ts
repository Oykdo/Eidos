import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hexOf, sha256, utf8 } from "./hash.ts";
import {
  buildEpochTable,
  canonTable,
  hashBloc0,
  rewardAt,
  T,
} from "./eonis.ts";
import {
  lancerGenese,
  lancerPrealables,
  verifierBloc0,
  verifierParametres,
} from "./genese.ts";
import { coffreAtelier } from "./wallet.ts";
import { ATOMES } from "./constantes.ts";
import { genesis } from "./genesis-data.ts";

describe("bloc 0", () => {
  it("reproduit merkle, hash, PoW", () => {
    const b = genesis.bloc_genese;
    const rec = hashBloc0(b.message, b.horodatage_unix, b.nonce);
    assert.equal(hexOf(rec.merkle), b.merkle_root);
    assert.equal(hexOf(rec.hash), b.hash);
    assert.equal(hexOf(sha256(utf8(b.message))), b.merkle_root);
  });
});

describe("table d'émission", () => {
  it("total d'époque exact et récompense du bloc 0", () => {
    const W = buildEpochTable(40);
    assert.equal(W.length, T + 1);
    assert.equal(W[T], 40 * T * ATOMES);
    assert.equal(rewardAt(0), genesis.bloc_genese.recompense_atomes);
    const h = hexOf(sha256(canonTable(W)));
    assert.equal(h, genesis.ages[0]!.table_sha256);
  });
});

describe("lancer la genèse", () => {
  it("paramètres et bloc 0 passent", () => {
    assert.ok(verifierParametres().every((c) => c.ok));
    assert.ok(verifierBloc0().every((c) => c.ok));
  });

  it("rapport genèse : tables incluses", () => {
    const r = lancerGenese();
    assert.equal(r.echecs, 0, r.controles.filter((c) => !c.ok).map((c) => c.label).join("; "));
    assert.ok(r.passes >= 16);
  });

  it("portefeuille en place et échanges possibles", () => {
    const coffre = coffreAtelier("mixte");
    const r = lancerPrealables(coffre);
    const fails = r.controles.filter((c) => !c.ok);
    assert.equal(fails.length, 0, fails.map((c) => c.label).join("; "));
    const essai = r.controles.find((c) => c.id === "essai");
    assert.equal(essai?.ok, true);
    const live = r.controles.find((c) => c.id === "ce-coffre");
    assert.equal(live?.ok, true);
  });
});

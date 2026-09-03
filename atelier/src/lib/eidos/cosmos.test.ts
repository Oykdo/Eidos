import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { concat, utf8 } from "./hash.ts";
import {
  CYCLE_FEDERATION,
  GRAINE_COSMOS,
  NORME,
  REGIMES,
  alignementTient,
  ascendant,
  canoniser,
  composer,
  coupsParTour,
  empreinteNoyau,
  graineGrind,
  norme2,
  orientationGrind,
  parer,
  produit,
  quadrupleDepuis,
  troisCarres,
} from "./cosmos.ts";

describe("eidos-objets/1 cosmos", () => {
  it("ascendant = V[(3·s) mod 7]", () => {
    const cycle = [0, 1, 2, 3, 4, 5, 6].map(ascendant);
    assert.deepEqual(cycle, [...CYCLE_FEDERATION]);
    assert.equal(ascendant(0), 0);
  });

  it("l'ascendant double le déphasage annoncé", () => {
    assert.equal(coupsParTour("Pulsar", "Eclipse"), 2);
    assert.equal(coupsParTour("Eclipse", "Pulsar"), 1);
    assert.equal(coupsParTour("Vide", "Vide"), 2);
  });

  it("troisCarres : même ordre, d entier", () => {
    const r = NORME - 9945n * 9945n;
    const reps = troisCarres(r);
    assert.ok(reps.length > 0);
    for (const [b, c, d] of reps) {
      assert.equal(b * b + c * c + d * d, r);
    }
  });

  it("quadruple : norme exacte, q = −q", () => {
    const q = quadrupleDepuis(concat(GRAINE_COSMOS, utf8("orient"), new Uint8Array(4)));
    assert.equal(norme2(q), NORME);
    assert.deepEqual(canoniser([-q[0], -q[1], -q[2], -q[3]] as const), q);
  });

  it("composition exacte, non commutative, parade à l'atome", () => {
    const p = quadrupleDepuis(utf8("p"));
    const r = quadrupleDepuis(utf8("r"));
    const pr = composer(p, r);
    const rp = composer(r, p);
    assert.equal(norme2(pr), NORME * NORME);
    assert.notDeepEqual(pr, rp);
    assert.deepEqual(
      parer(p, pr),
      [r[0] * NORME, r[1] * NORME, r[2] * NORME, r[3] * NORME],
    );
  });

  it("Origine du catalogue : orientation et empreinte", () => {
    const ori: [bigint, bigint, bigint, bigint] = [5000n, 5000n, -5000n, 5000n];
    assert.equal(norme2(ori), NORME);
    assert.equal(
      empreinteNoyau(0, "Vide", "ancre", ori),
      "601a0eed1c01903a9c8401a08818200bceffd3cd2c092170385765f39ebd4967",
    );
    assert.ok(alignementTient(ori, ori, 0n));
  });

  it("grind : rolls distincts, joueurs non plafonnés", () => {
    const sigA = utf8("lamport-A");
    const sigB = utf8("lamport-B");
    const bloc = utf8("bloc-hash-32-octets-minimum!!!!");
    const a0 = orientationGrind(sigA, bloc, 0);
    const a1 = orientationGrind(sigA, bloc, 1);
    const b0 = orientationGrind(sigB, bloc, 0);
    assert.equal(norme2(a0), NORME);
    assert.equal(norme2(a1), NORME);
    assert.notDeepEqual(a0, a1);
    assert.notDeepEqual(a0, b0);
    assert.notDeepEqual(graineGrind(sigA, bloc, 0), graineGrind(sigA, bloc, 1));
  });

  it("produit de facteurs 2 et 5 reste entier", () => {
    const q = produit([1n, 1n, 0n, 0n], [2n, 1n, 0n, 0n]);
    assert.equal(norme2(q), 2n * 5n);
  });

  it("sept régimes", () => {
    assert.equal(REGIMES.length, 7);
  });
});

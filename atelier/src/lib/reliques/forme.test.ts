import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ARTEFACTS_CHAINES, artefactEssai } from "./catalogue.ts";
import {
  echantillonForme,
  sdSphere,
  sdTorus,
  smin,
  sdfRelique,
  valeursUniforms,
} from "./forme.ts";
import { genomeAvecAge, genomeDeArtefact, genomeDeGraine } from "./genome.ts";

const LUNE_SDF = [0.1074721955943127, 0.2268616586130895, -0.01842280241422898, 0.25769332565908065];

describe("forme", () => {
  it("primitives bornées", () => {
    assert.equal(sdSphere([0, 0, 0], 1), -1);
    assert.ok(Math.abs(sdTorus([1, 0, 0], 1, 0.2) + 0.2) < 1e-9);
    assert.ok(smin(0.1, 0.2, 0.05) <= 0.1);
  });

  it("déterminisme : même génome, même distance", () => {
    const g = genomeDeArtefact(artefactEssai());
    const a = echantillonForme(g, 0);
    const b = echantillonForme(g, 0);
    assert.deepEqual(a, b);
  });

  it("stabilité : échantillons gelés (lune d'essai, phase 0)", () => {
    const g = genomeDeArtefact(artefactEssai());
    const e = echantillonForme(g, 0);
    assert.equal(e.length, LUNE_SDF.length);
    for (let i = 0; i < e.length; i++) {
      assert.ok(Math.abs(e[i]! - LUNE_SDF[i]!) < 1e-12);
    }
  });

  it("familles distinctes : les trois artefacts de la chaîne ne coïncident pas", () => {
    const echs = ARTEFACTS_CHAINES.map((a) => echantillonForme(genomeDeArtefact(a), 0));
    for (let i = 0; i < echs.length; i++) {
      for (let j = i + 1; j < echs.length; j++) {
        let dist = 0;
        for (let k = 0; k < echs[i]!.length; k++) {
          const d = echs[i]![k]! - echs[j]![k]!;
          dist += d * d;
        }
        assert.ok(dist > 0.01, `${ARTEFACTS_CHAINES[i]!.id} ~ ${ARTEFACTS_CHAINES[j]!.id}`);
      }
    }
  });

  it("souffle : la phase déplace la surface, sans la casser", () => {
    const g = genomeDeGraine("aa".repeat(32), "Satya");
    const p: [number, number, number] = [0.25, 0.12, 0.08];
    const a = sdfRelique(p, g, 0);
    const b = sdfRelique(p, g, Math.PI);
    assert.notEqual(a, b);
    assert.ok(Number.isFinite(a) && Number.isFinite(b));
  });

  it("âge : Kali plus petite que Satya au même point", () => {
    const g = genomeDeArtefact(artefactEssai());
    const satya = sdfRelique([0.8, 0, 0], g, 0);
    const kali = sdfRelique([0.8, 0, 0], genomeAvecAge(g, "Kali"), 0);
    assert.ok(kali > satya);
  });

  it("uniforms : famille entière 0..8, vecteurs finis", () => {
    const u = valeursUniforms(genomeDeArtefact(artefactEssai()));
    assert.equal(u.famille, 7);
    for (const v of [...u.metal, ...u.p0, ...u.p1, ...u.p2, ...u.p3, ...u.p4]) {
      assert.ok(Number.isFinite(v));
    }
  });
});

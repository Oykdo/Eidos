import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sha256d, utf8 } from "../../lib/eidos/hash.ts";
import { objetDepuisGraine } from "../../lib/eidos/objets.ts";
import { objetDePorte } from "../../lib/eidos/inventaire.ts";
import { voxelsDe } from "../../lib/eidos/voxels.ts";
import type { ObjetPorte } from "../../lib/eidos/types.ts";
import {
  BAYER4,
  CLARTE_OCCLUSION,
  clarteCellule,
  cleCellule,
  palierOcclusion,
  seuilBayer,
  visibles,
  voisinage,
} from "./texel.ts";

const GRAINE = sha256d(utf8("eidos-objet-genese"));

function cube3(): Set<number> {
  const occ = new Set<number>();
  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      for (let z = -1; z <= 1; z++) occ.add(cleCellule(x, y, z));
    }
  }
  return occ;
}

describe("texel", () => {
  it("seuilBayer : sur tout plan x, y ou z constant, tout bloc 4×4 porte les 16 seuils une fois", () => {
    const fixes = [-3, 0, 5];
    const origines = [-9, -4, -1, 0, 3, 7];
    const plans: readonly [string, (f: number, u: number, v: number) => number][] = [
      ["y", (f, u, v) => seuilBayer(u, f, v)],
      ["x", (f, u, v) => seuilBayer(f, u, v)],
      ["z", (f, u, v) => seuilBayer(u, v, f)],
    ];
    for (const [axe, lire] of plans) {
      for (const f of fixes) {
        for (const ou of origines) {
          for (const ov of [-6, -1, 0, 2, 5]) {
            const vus = new Set<number>();
            for (let u = ou; u < ou + 4; u++) {
              for (let v = ov; v < ov + 4; v++) vus.add(lire(f, u, v));
            }
            assert.equal(vus.size, 16, `plan ${axe}=${f} origine (${ou},${ov})`);
            for (let s = 0; s < 16; s++) assert.ok(vus.has(s));
          }
        }
      }
    }
    // À y = 0 le motif est celui de BAYER4 tel quel : cellules.seuilFace (coffre) s'y appuie.
    for (let x = 0; x < 4; x++) {
      for (let z = 0; z < 4; z++) assert.equal(seuilBayer(x, 0, z), BAYER4[x * 4 + z]);
    }
  });

  it("voisinage : cube 3×3×3 plein — centre, coin, arête, face", () => {
    const occ = cube3();
    assert.deepEqual(voisinage(occ, 0, 0, 0), { n6: 6, n26: 26 });
    assert.deepEqual(voisinage(occ, 1, 1, 1), { n6: 3, n26: 7 });
    assert.deepEqual(voisinage(occ, 1, 1, 0), { n6: 4, n26: 11 });
    assert.deepEqual(voisinage(occ, 1, 0, 0), { n6: 5, n26: 17 });
  });

  it("palierOcclusion : monotone sur 0..26, bornes 0 et 3", () => {
    assert.equal(palierOcclusion(0), 0);
    assert.equal(palierOcclusion(26), 3);
    for (let n = 1; n <= 26; n++) assert.ok(palierOcclusion(n) >= palierOcclusion(n - 1), `n=${n}`);
  });

  it("clarteCellule : toujours une des quatre clartés, la trame ne descend jamais sous 0", () => {
    const occ = cube3();
    const clartes = new Set<number>(CLARTE_OCCLUSION);
    for (let x = -2; x <= 2; x++) {
      for (let y = -2; y <= 2; y++) {
        for (let z = -2; z <= 2; z++) {
          assert.ok(clartes.has(clarteCellule(occ, x, y, z)), `(${x},${y},${z})`);
        }
      }
    }
    // Une cellule isolée (n26 = 0) : palier 0, jamais remontée par la trame.
    assert.equal(clarteCellule(new Set([cleCellule(0, 0, 0)]), 0, 0, 0), 1.0);
  });

  it("visibles : vecteur gelé de voxels.test.ts — déterministe, encloses retirées, occupance intacte", () => {
    const o = objetDepuisGraine(GRAINE, "Satya");
    const p: ObjetPorte = {
      ...o,
      nonce: 0,
      hauteur: 0,
      genre: "trouve",
      emplacement: null,
      affixe: null,
      sockets: 0,
      gemmes: [],
      nom: "",
      palierLair: null,
    };
    const vs = voxelsDe(objetDePorte(p));
    assert.equal(vs.length, 216);
    assert.deepEqual(vs[0], { x: 1, y: 5, z: 3 });
    const copie = vs.map((v) => ({ ...v }));
    const a = visibles(vs);
    const b = visibles(vs);
    assert.equal(a.vus.length, b.vus.length);
    assert.ok(a.vus.length > 0 && a.vus.length < 216, `${a.vus.length} cellules visibles`);
    assert.equal(a.occ.size, 216);
    assert.deepEqual(vs, copie);
    assert.deepEqual(voxelsDe(objetDePorte(p)), vs);
    for (const v of a.vus) assert.ok(a.occ.has(cleCellule(v.x, v.y, v.z)));
    console.log(`texel : ${a.vus.length} cellules visibles sur 216 (vecteur gelé Satya)`);
  });
});

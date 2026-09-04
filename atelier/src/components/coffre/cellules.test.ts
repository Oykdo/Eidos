import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ornementsDe,
  voxelsCouronne,
  voxelsFerrures,
  voxelsTasCouvercle,
} from "../../lib/eidos/coffres.ts";
import { cleCellule } from "../canvas/texel.ts";
import { cellulesCoque, indiceCoque } from "./cellules.ts";

const PALIERS = [0, 1, 2, 3] as const;

/** Indice brut recalculé ici, par les mêmes règles que la scène, ferrures comprises. */
function base(x: number, y: number, z: number, ferrures: boolean): number {
  if (ferrures && Math.abs(x) === 4 && Math.abs(z) === 3) return 1;
  return indiceCoque(x, y, z);
}

/** Cellules de coque sous un ornement posé (mêmes règles : tas ×0,8, couronne, 3 × 3 sous la cage). */
function sousOrnement(palier: 0 | 1 | 2 | 3): Set<number> {
  const orn = ornementsDe(palier);
  const s = new Set<number>();
  if (orn.includes("tas"))
    for (const c of voxelsTasCouvercle())
      s.add(cleCellule(Math.round(c.x * 0.8), 3, Math.round(c.z * 0.8)));
  if (orn.includes("couronne")) for (const c of voxelsCouronne()) s.add(cleCellule(c.x, 3, c.z));
  if (orn.includes("cage"))
    for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) s.add(cleCellule(x, y, 3));
  return s;
}

describe("coffre — cellules de la coque", () => {
  it("266 cellules pour tout palier, aucun doublon, tous les indices dans 1..7", () => {
    for (const p of PALIERS) {
      const cs = cellulesCoque(ornementsDe(p));
      assert.equal(cs.length, 266, `palier ${p}`);
      assert.equal(
        new Set(cs.map((c) => cleCellule(c.x, c.y, c.z))).size,
        266,
        `palier ${p} : doublon`,
      );
      for (const c of cs) {
        assert.ok(
          Number.isInteger(c.i) && c.i >= 1 && c.i <= 7,
          `palier ${p} : (${c.x},${c.y},${c.z}) i=${c.i}`,
        );
        assert.ok(
          Math.abs(c.x) === 4 || Math.abs(c.y) === 3 || Math.abs(c.z) === 3,
          `palier ${p} : cellule hors coque`,
        );
      }
    }
  });

  it("la serrure reste la plus sombre : exactement deux cellules à 7, en (0,0,±3) ; jamais 0", () => {
    for (const p of PALIERS) {
      const cs = cellulesCoque(ornementsDe(p));
      const sept = cs
        .filter((c) => c.i === 7)
        .map((c) => `${c.x},${c.y},${c.z}`)
        .sort();
      assert.deepEqual(sept, ["0,0,-3", "0,0,3"], `palier ${p}`);
      assert.ok(
        cs.every((c) => c.i !== 0),
        `palier ${p} : indice 0 produit`,
      );
    }
  });

  it("sans ferrures, i = 1 vaut la poignée (12) plus les cellules 2→1 de la trame", () => {
    const cs = cellulesCoque(ornementsDe(0));
    const poignee = cs.filter((c) => indiceCoque(c.x, c.y, c.z) === 1);
    assert.equal(poignee.length, 12);
    assert.ok(poignee.every((c) => c.i === 1));
    const uns = cs.filter((c) => c.i === 1);
    const tramees = uns.filter((c) => indiceCoque(c.x, c.y, c.z) === 2);
    assert.equal(uns.length, 12 + tramees.length);
    assert.ok(tramees.length > 0, "la trame n'a remonté aucune cellule du couvercle");
  });

  it("avec ferrures, les 28 cellules x = ±4, z = ±3 sont à 1 et ne doublent rien", () => {
    for (const p of [2, 3] as const) {
      const cs = cellulesCoque(ornementsDe(p));
      const parCle = new Map(cs.map((c) => [cleCellule(c.x, c.y, c.z), c]));
      const fer = voxelsFerrures();
      assert.equal(fer.length, 28);
      for (const f of fer) {
        const c = parCle.get(cleCellule(f.x, f.y, f.z));
        assert.ok(c, `palier ${p} : ferrure (${f.x},${f.y},${f.z}) absente de la coque`);
        assert.equal(c.i, 1, `palier ${p} : ferrure (${f.x},${f.y},${f.z}) i=${c.i}`);
      }
      assert.equal(cs.filter((c) => Math.abs(c.x) === 4 && Math.abs(c.z) === 3).length, 28);
    }
  });

  it("chaque cellule reste à ±1 de son indice brut ; +1 seulement sous un ornement", () => {
    for (const p of PALIERS) {
      const fer = ornementsDe(p).includes("ferrures");
      const sous = sousOrnement(p);
      for (const c of cellulesCoque(ornementsDe(p))) {
        const b = base(c.x, c.y, c.z, fer);
        const k = cleCellule(c.x, c.y, c.z);
        assert.ok(
          Math.abs(c.i - b) <= 1,
          `palier ${p} : (${c.x},${c.y},${c.z}) i=${c.i} base=${b}`,
        );
        if (c.i === b + 1) {
          assert.ok(sous.has(k), `palier ${p} : (${c.x},${c.y},${c.z}) monté sans ornement`);
          assert.ok(b === 2 || b === 4, `palier ${p} : contact depuis ${b}`);
        }
        if (b === 1 || b === 7) assert.equal(c.i, b, `palier ${p} : poignée/serrure déplacée`);
        if (sous.has(k) && (b === 2 || b === 4)) assert.equal(c.i, b + 1);
        if (sous.has(k) && b === 6) assert.equal(c.i, 6, "jamais 6→7");
      }
    }
  });

  it("sans ornement, la trame remonte un quart des cellules paires (25 % ± 5)", () => {
    const cs = cellulesCoque(ornementsDe(0));
    const paires = cs.filter((c) => [2, 4, 6].includes(indiceCoque(c.x, c.y, c.z)));
    const remontees = paires.filter((c) => c.i === indiceCoque(c.x, c.y, c.z) - 1);
    const part = remontees.length / paires.length;
    assert.ok(
      Math.abs(part - 0.25) <= 0.05,
      `part ${(part * 100).toFixed(1)} % sur ${paires.length}`,
    );
    assert.ok(paires.every((c) => c.i % 2 === 1 || c.i === indiceCoque(c.x, c.y, c.z)));
    console.log(
      `cellules : ${remontees.length} / ${paires.length} cellules paires remontées par la trame (${(part * 100).toFixed(1)} %)`,
    );
  });
});

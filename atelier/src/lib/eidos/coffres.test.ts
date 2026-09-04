import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ATOMES } from "./constantes.ts";
import {
  CLARTES,
  ORNEMENTS_PAR_PALIER,
  PALETTES,
  PALIERS_BUTIN,
  SEUILS_BUTIN,
  SERRURE_LOCALE,
  SPHERE_P,
  SPHERE_R,
  TEINTES_PALIER,
  amplitudeDuSolde,
  cartesiens,
  gaussienne,
  hslVersHex,
  integraleGaussienne,
  ornementsDe,
  palierButin,
  paletteDePalier,
  scoreButin,
  soldeAtomes,
  teinte,
  teinteDeHex,
  voxelsCouronne,
  voxelsFerrures,
  voxelsOrnementSpherique,
  voxelsTasCouvercle,
} from "./coffres.ts";
import type { ObjetPorte } from "./types.ts";

function objet(p: Partial<ObjetPorte> = {}): ObjetPorte {
  return {
    mot: 1, archetype: "lune", age: "Kali", nonce: 0, hauteur: 0, genre: "trouve",
    emplacement: null, affixe: null, sockets: 0, gemmes: [], nom: "x", palierLair: null, ...p,
  };
}

describe("coffre 3D — audit", () => {
  it("quatre paliers, quatre palettes isochromatiques de huit clartés décroissantes", () => {
    assert.equal(PALIERS_BUTIN.length, 4);
    assert.equal(PALETTES.length, 4);
    for (let p = 0; p < 4; p++) {
      const pal = PALETTES[p]!;
      assert.equal(pal.length, 8);
      assert.deepEqual(pal, paletteDePalier(p as 0));
      assert.equal(new Set(pal).size, 8);
      const attendu = TEINTES_PALIER[p]!.h;
      for (const hex of pal) {
        const h = teinteDeHex(hex);
        const ecart = Math.min(Math.abs(h - attendu), 360 - Math.abs(h - attendu));
        // résolution de la teinte sur 8 bits : 60° / (max − min des canaux)
        const canaux = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
        const d = Math.max(...canaux) - Math.min(...canaux);
        assert.ok(d > 0, `palier ${p} : ${hex} est gris`);
        assert.ok(ecart <= 60 / d + 0.5, `palier ${p} : ${hex} teinte ${h} ≠ ${attendu} (±${(60 / d).toFixed(1)})`);
      }
    }
    assert.deepEqual([...CLARTES], [94, 84, 72, 60, 48, 36, 24, 12]);
    assert.equal(hslVersHex(0, 0, 100), "#FFFFFF");
    assert.equal(hslVersHex(0, 0, 0), "#000000");
    assert.equal(hslVersHex(0, 100, 50), "#FF0000");
    assert.equal(hslVersHex(120, 100, 50), "#00FF00");
  });

  it("le score du butin est entier et déterministe ; les seuils font les paliers", () => {
    assert.equal(scoreButin({ objets: [], philosophale: null }), 0);
    assert.equal(palierButin({ objets: [], philosophale: null }), 0);
    assert.equal(scoreButin({ objets: [objet()], philosophale: null }), 1);
    assert.equal(palierButin({ objets: [objet()], philosophale: null }), 1);
    const orne = { objets: [objet({ affixe: "T3" }), objet({ gemmes: ["S1"] })], philosophale: null };
    assert.equal(scoreButin(orne), 1 + 2 + 1 + 2);
    assert.equal(palierButin(orne), 2);
    assert.equal(palierButin({ objets: [], philosophale: "Lance" }, ["Satya", "Kali"]), 3);
    assert.equal(palierButin({ objets: [], philosophale: null }, ["Kali"]), 1);
    assert.deepEqual([...SEUILS_BUTIN], [1, 4, 9]);
  });

  it("les ornements s'ajoutent avec le palier ; cellules entières", () => {
    assert.deepEqual(ornementsDe(0), []);
    assert.deepEqual(ornementsDe(1), ["tas"]);
    assert.deepEqual(ornementsDe(3), ["tas", "ferrures", "cage", "couronne"]);
    for (let p = 1; p < 4; p++) {
      for (const o of ORNEMENTS_PAR_PALIER[p - 1]!) assert.ok(ORNEMENTS_PAR_PALIER[p]!.includes(o));
    }
    assert.equal(voxelsTasCouvercle().length, 10);
    assert.equal(voxelsFerrures().length, 28);
    assert.equal(voxelsCouronne().length, 8);
    for (const c of [...voxelsTasCouvercle(), ...voxelsFerrures(), ...voxelsCouronne()]) {
      assert.ok(Number.isInteger(c.x) && Number.isInteger(c.y) && Number.isInteger(c.z));
    }
    assert.ok(voxelsCouronne().every((c) => c.y === 4 && Math.abs(c.x) + Math.abs(c.z) === 2));
  });

  it("la gaussienne vaut 1 à l'origine et s'éloigne ; l'intégrale polaire se tient près de π", () => {
    assert.equal(gaussienne(0, 0), 1);
    assert.ok(gaussienne(1, 0) < 0.4);
    assert.ok(gaussienne(3, 3) < 1e-7);
    const s = integraleGaussienne();
    assert.ok(Math.abs(s - Math.PI) < 1e-3, `écart ${s - Math.PI}`);
  });

  it("les coordonnées sphériques recouvrent l'axe z ; teinte boucle sur 8", () => {
    const p = cartesiens(2, 0, 0);
    assert.ok(Math.abs(p.x) < 1e-12 && Math.abs(p.y) < 1e-12);
    assert.equal(p.z, 2);
    assert.equal(teinte(PALETTES[0]!, 8), PALETTES[0]![0]);
    assert.equal(teinte(PALETTES[0]!, -1), PALETTES[0]![7]);
  });

  it("le solde somme les sorties ; l'amplitude suit le solde sans être nulle", () => {
    assert.equal(soldeAtomes([]), 0);
    assert.equal(soldeAtomes([{ montant: ATOMES }, { montant: 50 }]), ATOMES + 50);
    const vide = amplitudeDuSolde(0);
    const un = amplitudeDuSolde(ATOMES);
    assert.ok(vide >= 0.28 && vide < un && un < amplitudeDuSolde(10 * ATOMES));
    assert.ok(amplitudeDuSolde(1e18) <= 1.85);
  });

  it("ornement sphérique : P sur la sphère, 265 voxels ; serrure sur la face avant", () => {
    assert.equal(SPHERE_P[0] ** 2 + SPHERE_P[1] ** 2 + SPHERE_P[2] ** 2, SPHERE_R * SPHERE_R);
    const vs = voxelsOrnementSpherique();
    assert.equal(vs.length, 265);
    assert.ok(vs.some((v) => v.kind === "rayon"));
    assert.ok(vs.some((v) => v.x === SPHERE_P[0] && v.y === SPHERE_P[1] && v.z === SPHERE_P[2] && v.kind === "point"));
    assert.equal(SERRURE_LOCALE[2], 0.6);
  });
});

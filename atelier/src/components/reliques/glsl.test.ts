/**
 * Filet statique sur les shaders de la relique — GLSL ES 1.00 strict, parité
 * des uniforms avec ReliqueCanvas.tsx, ordre des déclarations.
 * Ce n'est pas un compilateur : la console du navigateur reste le juge.
 * Aucune dépendance : lecture brute des fichiers voisins.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const frag = readFileSync(new URL("./relique.frag.glsl", import.meta.url), "utf8");
const vert = readFileSync(new URL("./relique.vert.glsl", import.meta.url), "utf8");
const tsx = readFileSync(new URL("./ReliqueCanvas.tsx", import.meta.url), "utf8");

/** Code sans commentaires ni littéraux de ligne : les motifs interdits ne se cachent pas dans un texte. */
function code(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, "");
}

const SHADERS: readonly [string, string][] = [
  ["frag", code(frag)],
  ["vert", code(vert)],
];

/** Motifs qui n'existent pas en ES 1.00 ou que three n'injecte pas dans un ShaderMaterial. */
const INTERDITS: readonly [string, RegExp][] = [
  ["#version", /#version/],
  ["texture()", /\btexture\s*\(/],
  ["layout", /\blayout\b/],
  ["dérivées", /\bdFdx\b|\bdFdy\b|\bfwidth\b/],
  ["qualificatif in", /\bin\s+(vec[234]|float|int)\b/],
  ["et binaire", /[^&]&[^&]/],
  ["ou binaire", /[^|]\|[^|]/],
  ["ou exclusif", /\^/],
  ["décalage", /<<|>>/],
  ["modulo entier", /%/],
  ["dithering() (chunk réservé aux matériaux intégrés)", /\bdithering\s*\(/],
  ["saturate (macro de tonemapping_pars)", /\bsaturate\b/],
];

describe("glsl relique", () => {
  for (const [nom, src] of SHADERS) {
    it(`${nom} : aucun motif hors ES 1.00 ni fonction non injectée`, () => {
      for (const [libelle, re] of INTERDITS) {
        assert.equal(re.test(src), false, `${nom} : ${libelle}`);
      }
      const outs = src.match(/\bout\s+[^;)]*/g) ?? [];
      for (const o of outs) assert.equal(o.trim(), "out float tHit", `${nom} : ${o}`);
    });

    it(`${nom} : tout smoothstep à littéraux a des bornes croissantes`, () => {
      const re = /smoothstep\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*,/g;
      for (const m of src.matchAll(re)) {
        const a = Number(m[1]);
        const b = Number(m[2]);
        assert.ok(a < b, `${nom} : ${m[0]} (${a} >= ${b})`);
      }
    });
  }

  it("frag : la constante FOND est intacte (#12151a en linéaire)", () => {
    assert.ok(frag.includes("const vec3 FOND = vec3(0.0706, 0.0824, 0.1020);"));
  });

  it("frag : chaque uniform du shader est une clé de fabriquerUniforms() et réciproquement", () => {
    const duFrag = new Set<string>();
    for (const m of code(frag).matchAll(/^\s*uniform\s+\w+\s+(\w+)\s*;/gm)) duFrag.add(m[1]!);
    const duTsx = new Set<string>();
    for (const m of tsx.matchAll(/^\s+(u\w+): \{ value:/gm)) duTsx.add(m[1]!);
    assert.ok(duFrag.size > 0);
    assert.deepEqual([...duFrag].sort(), [...duTsx].sort());
  });

  it("frag : envi, finir, bayer2, bayer4 (quand présents) précèdent shade, trace et main", () => {
    const src = code(frag);
    const ancres = ["vec3 shade(", "vec3 trace(", "void main("].map((a) => {
      const i = src.indexOf(a);
      assert.ok(i >= 0, a);
      return i;
    });
    const borne = Math.min(...ancres);
    for (const f of ["vec3 envi(", "vec3 finir(", "float bayer2(", "float bayer4("]) {
      const i = src.indexOf(f);
      if (i < 0) continue;
      assert.ok(i < borne, `${f} déclarée après shade/trace/main`);
    }
  });
});

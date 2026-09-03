import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { LOI_GLYPHES } from "./constantes.ts";
import { asciiEllipse, asciiGlyphe, asciiTrouvaille } from "./trouvaille.ts";
import { lumens } from "./relique.ts";

describe("loi des glyphes — gelée", () => {
  it("2 bits, 31 groupes, 160 bits utiles, 24 de somme", () => {
    const L = LOI_GLYPHES;
    assert.equal(L.bitsParFigure * L.etages, 6);
    assert.equal(L.payload + L.controle, L.adresse);
    assert.equal(L.payload * 6 - L.bourrageBits, L.octetsAdresse * 8);
    assert.equal(L.controle * 6, L.octetsControle * 8);
  });
});

describe("trouvaille ASCII", () => {
  it("l'ellipse Satya est deux fois plus large que haute (a/b = 2)", () => {
    const fig = asciiEllipse(40, 20, 0);
    const lignes = fig.split("\n");
    const largeurs = lignes.map((l) => {
      const a = l.indexOf("\u00b7");
      const b = l.lastIndexOf("\u00b7");
      return a < 0 ? 0 : b - a + 1;
    });
    const hautes = largeurs.filter((w) => w > 0).length;
    const maxW = Math.max(...largeurs);
    assert.ok(maxW > hautes * 1.4, `largeur ${maxW} vs hauteur ${hautes}`);
  });

  it("la croix est sur le bord (phase 0 → extrémité a)", () => {
    const fig = asciiEllipse(40, 20, 0);
    const lignes = fig.split("\n");
    const mid = lignes[Math.floor(lignes.length / 2)]!;
    assert.ok(mid.includes("\u271a"));
    assert.match(asciiGlyphe([1, 2, 3]), /○[\s\S]*☽[\s\S]*✚/);
  });

  it("la légende porte a et b de l'âge", () => {
    const t = asciiTrouvaille(lumens()[0]!, 0);
    assert.match(t, /Satya/);
    assert.match(t, /a=40/);
    assert.match(t, /b=20/);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { fromHex } from "./hash.ts";
import { verifierMss, type SignatureXmss } from "./xmss.ts";

const V = JSON.parse(
  readFileSync(new URL("../../../../vecteurs.json", import.meta.url), "utf8"),
) as {
  xmss: {
    hauteur: number;
    graine_publique: string;
    racine: string;
    message: string;
    signature: { indice: number; wots: string; chemin: string[] };
  };
};

function sigDe(x = V.xmss.signature): SignatureXmss {
  return { indice: x.indice, wots: fromHex(x.wots), chemin: x.chemin.map(fromHex) };
}

describe("XMSS = federation.verifier_mss", () => {
  const racine = fromHex(V.xmss.racine);
  const gp = fromHex(V.xmss.graine_publique);
  const m = fromHex(V.xmss.message);

  it("vérifie la signature de bloc du vecteur", () => {
    assert.equal(verifierMss(racine, gp, V.xmss.hauteur, m, sigDe()), true);
  });

  it("refuse un chemin altéré, un message autre, une racine autre", () => {
    const s = sigDe();
    s.chemin[1] = new Uint8Array(32);
    assert.equal(verifierMss(racine, gp, V.xmss.hauteur, m, s), false);
    const autre = new Uint8Array(m);
    autre[0] ^= 1;
    assert.equal(verifierMss(racine, gp, V.xmss.hauteur, autre, sigDe()), false);
    assert.equal(verifierMss(new Uint8Array(32), gp, V.xmss.hauteur, m, sigDe()), false);
    const w = sigDe();
    w.wots[5] ^= 1;
    assert.equal(verifierMss(racine, gp, V.xmss.hauteur, m, w), false);
  });

  it("refuse un indice hors borne ou changé, un chemin trop court", () => {
    const s = sigDe();
    s.indice = 16;
    assert.equal(verifierMss(racine, gp, V.xmss.hauteur, m, s), false);
    const t = sigDe();
    t.indice = 1;
    assert.equal(verifierMss(racine, gp, V.xmss.hauteur, m, t), false);
    const c = sigDe();
    c.chemin = c.chemin.slice(1);
    assert.equal(verifierMss(racine, gp, V.xmss.hauteur, m, c), false);
    assert.equal(verifierMss(racine, gp, 3, m, sigDe()), false);
  });
});

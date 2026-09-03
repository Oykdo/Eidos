import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { artefactDeGoutte } from "../eidos/signatures.ts";
import { ARTEFACTS_CHAINES, artefactEssai } from "./catalogue.ts";
import {
  distanceParams,
  genomeAvecAge,
  genomeDeAge,
  genomeDeArtefact,
  genomeDeGraine,
  genomeEstBorne,
  vecteurGele,
} from "./genome.ts";

/** Vecteur gelé — artefact lune de signatures.test.ts, âge Satya. */
const LUNE_GELEE = {
  graine: "6afd9f600977771f3b2c6ff6269c3ebcdf18b370690672eea64d34837301f47a",
  famille: "lune",
  etages: [2, 2, 2],
  age: "Satya",
  params: {
    twist: 0.19813839932860303,
    graisse: 0.30643167772945756,
    coupe: 0.41086442359044784,
    nids: 0.7559472037842374,
    grain: 0.09011978332188907,
    orbite: 0.9214923323414969,
    fuseau: 0.3843747615777829,
    facette: 0.9777981231403067,
    halo: 0.19085984588387883,
    strie: 0.55385671778439,
    azimuth: 0.5040817883573663,
    lean: 0.8147859922178988,
    creux: 0.2614175631342031,
    anneau: 0.3846494239719234,
    pic: 0.78120088502327,
    usure: 0.12034790569924468,
    echelle: 1,
    densite: 0,
    metalR: 0.788235294117647,
    metalG: 0.6352941176470588,
    metalB: 0.15294117647058825,
    sel: 0.6666666666666666,
    mercure: 0.6666666666666666,
    soufre: 0.6666666666666666,
    famille: 0.875,
  },
} as const;

describe("genome", () => {
  it("déterminisme : même graine → même génome", () => {
    const a = genomeDeGraine("ab".repeat(32), "Kali");
    const b = genomeDeGraine("AB".repeat(32), "Kali");
    assert.deepEqual(vecteurGele(a), vecteurGele(b));
    const l1 = genomeDeArtefact(artefactEssai());
    const l2 = genomeDeArtefact(artefactEssai());
    assert.deepEqual(vecteurGele(l1), vecteurGele(l2));
  });

  it("dispersion : deux digests voisins donnent des génomes distants", () => {
    const a = genomeDeGraine("00".repeat(32), "Satya");
    const b = genomeDeGraine("00".repeat(31) + "01", "Satya");
    assert.ok(distanceParams(a, b) > 0.8);
  });

  it("bornes : tout paramètre dans [0, 1]", () => {
    const graines = [
      "00".repeat(32),
      "ff".repeat(32),
      "0123456789abcdef".repeat(4),
      artefactEssai().digest,
      ...ARTEFACTS_CHAINES.map((a) => a.digest),
    ];
    for (const h of graines) {
      for (const age of ["Satya", "Treta", "Dvapara", "Kali"] as const) {
        assert.equal(genomeEstBorne(genomeDeGraine(h, age)), true);
      }
    }
    assert.equal(genomeEstBorne(genomeDeAge("Kali")), true);
  });

  it("stabilité : vecteur de génome gelé (lune d'essai)", () => {
    const g = genomeDeArtefact(artefactEssai());
    assert.deepEqual(vecteurGele(g), LUNE_GELEE);
  });

  it("âge change l'échelle et le métal, pas la famille", () => {
    const g = genomeDeArtefact(artefactEssai());
    const k = genomeAvecAge(g, "Kali");
    assert.equal(k.famille, "lune");
    assert.deepEqual(k.etages, [2, 2, 2]);
    assert.equal(k.params.echelle, 0.25);
    assert.equal(k.params.densite, 1);
    assert.equal(k.params.twist, g.params.twist);
    assert.notEqual(k.params.metalR, g.params.metalR);
  });

  it("artefacts de la chaîne : digest rejoué, familles distinctes", () => {
    const ids = new Set<string>();
    for (const a of ARTEFACTS_CHAINES) {
      const live = artefactDeGoutte(a.txid, a.adresse);
      assert.ok(live);
      assert.equal(live.digest, a.digest);
      assert.equal(live.id, a.id);
      assert.equal(genomeDeArtefact(a).famille, a.id);
      ids.add(a.id);
    }
    assert.deepEqual([...ids].sort(), ["lune", "soleil", "terre"]);
  });
});

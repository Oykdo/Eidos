import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { N_NOEUDS } from "./modele.ts";
import { ancreDe } from "./ancre.ts";
import { ancreTresor, chargesDesSorties, parserEtat, sceneDepuisEtat } from "./etat.ts";

describe("état réseau → champ d'arbre", () => {
  const brut = {
    hauteur: 71,
    age: "Satya",
    a_courant: 40,
    recompense_courante_atomes: 100,
    tresor_adresse: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    sorties: {
      "tx:0": { adresse: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", montant: 100 },
      "tx:1": { adresse: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", montant: 50 },
    },
  };

  it("parser : sorties aplaties, trésor 40 hex", () => {
    const e = parserEtat(brut);
    assert.equal(e.hauteur, 71);
    assert.equal(e.sorties.length, 2);
    assert.equal(e.tresor_adresse?.length, 40);
    assert.equal(e.artefacts.length, 0);
  });

  it("charges : somme = circulation, même pont FNV que les punaises", () => {
    const e = parserEtat(brut);
    const c = chargesDesSorties(e.sorties);
    let s = 0;
    for (const v of c.values()) s += v;
    assert.equal(s, 150);
    const nA = ancreDe("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa").noeud;
    assert.equal(c.get(nA), 100);
    assert.ok(nA >= 0 && nA < N_NOEUDS);
  });

  it("secteur chaud = ancre du trésor, pas (h·41 mod 425)", () => {
    const e = parserEtat(brut);
    const a = ancreTresor(e)!;
    assert.equal(a.noeud, ancreDe(e.tresor_adresse!).noeud);
    const scene = sceneDepuisEtat(e);
    assert.equal(scene.chaudNoeud, a.noeud);
    assert.equal(scene.chaudSecteur, a.secteur);
    assert.equal(scene.lumen.h, 71);
  });

  it("sans tresor_adresse : on prend la sortie égale à la récompense", () => {
    const e = parserEtat({
      hauteur: 3,
      recompense_courante_atomes: 7,
      sorties: {
        "x:0": { adresse: "cccccccccccccccccccccccccccccccccccccccc", montant: 7 },
      },
    });
    assert.equal(e.tresor_adresse, null);
    const a = ancreTresor(e)!;
    assert.equal(a.noeud, ancreDe("cccccccccccccccccccccccccccccccccccccccc").noeud);
  });
});

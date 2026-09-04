import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PORTES,
  QUARTIERS,
  ageDePorte,
  agesScelles,
  miseSceau,
  porteDe,
  quartierDe,
  sceauxDuCoffre,
} from "./sceaux.ts";
import { arriverDansCoffre } from "./secrets.ts";
import { coffreAtelier, coffreNeuf } from "./wallet.ts";

describe("sceaux d'âge — mise, portes, trophée", () => {
  it("quatre quartiers, trois portes, mise = noeud.mise_sceau", () => {
    assert.deepEqual(PORTES, [64, 128, 192]);
    assert.equal(QUARTIERS.at(-1)!.a, 254);
    assert.equal(quartierDe(0), "Kali");
    assert.equal(quartierDe(63), "Kali");
    assert.equal(quartierDe(64), "Dvapara");
    assert.equal(quartierDe(254), "Satya");
    assert.equal(ageDePorte(128), "Treta");
    assert.equal(ageDePorte(129), null);
    assert.equal(ageDePorte(0), null);
    // mêmes valeurs que noeud._test_reliques
    assert.deepEqual(
      (["Satya", "Treta", "Dvapara", "Kali"] as const).map(miseSceau),
      [3_354_624_000, 1_886_976_000, 838_656_000, 209_664_000],
    );
  });

  it("porte fermée sans sceau, ouverte avec ; le coffre d'atelier passe partout", () => {
    const perso = coffreNeuf("vide");
    assert.deepEqual(porteDe(64, [], perso), { ouverte: false, age: "Dvapara" });
    assert.deepEqual(porteDe(64, ["Dvapara"], perso), { ouverte: true, age: "Dvapara" });
    assert.deepEqual(porteDe(65, [], perso), { ouverte: true, age: null });
    assert.deepEqual(porteDe(192, ["Kali", "Treta"], perso), { ouverte: false, age: "Satya" });
    const atelier = coffreAtelier("vide");
    assert.deepEqual(porteDe(192, [], atelier), { ouverte: true, age: "Satya" });
  });

  it("l'âge exact, pas un autre : un sceau d'âge supérieur n'ouvre pas la porte d'en dessous", () => {
    const perso = coffreNeuf("vide");
    assert.deepEqual(porteDe(64, ["Satya", "Treta"], perso), { ouverte: false, age: "Dvapara" });
    assert.deepEqual(porteDe(128, ["Satya"], perso), { ouverte: false, age: "Treta" });
    assert.deepEqual(porteDe(128, ["Treta"], perso), { ouverte: true, age: "Treta" });
    // la jauge note l'âge de la porte passée en montant, une fois
    const bas = arriverDansCoffre(perso, 63).coffre;
    assert.deepEqual(bas.tour.portes, []);
    const haut = arriverDansCoffre(bas, 64).coffre;
    assert.deepEqual(haut.tour.portes, ["Dvapara"]);
    const encore = arriverDansCoffre(arriverDansCoffre(haut, 63).coffre, 64).coffre;
    assert.deepEqual(encore.tour.portes, ["Dvapara"]);
  });

  it("les sceaux du coffre sont les reliques récupérées vers une de ses adresses", () => {
    const coffre = coffreAtelier("une-piece");
    const mienne = coffre.sorties[0]!.adresse;
    const monde = [
      { id: "a", adresse: "11".repeat(20), age: "Treta", etat: "recuperee", vers: mienne },
      { id: "b", adresse: "22".repeat(20), age: "Satya", etat: "recuperee", vers: "ff".repeat(20) },
      { id: "c", adresse: "33".repeat(20), age: "Kali", etat: "intacte", montant: 5 },
      { id: "d", adresse: "44".repeat(20), age: "n'importe", etat: "recuperee", vers: mienne },
    ];
    const s = sceauxDuCoffre(monde, coffre);
    assert.deepEqual(s.map((x) => [x.id, x.age]), [["a", "Treta"], ["d", "Kali"]]);
    assert.deepEqual(agesScelles(s, { nature: "personnel", reliques: ["Satya"] }), ["Treta", "Kali"]);
    // en atelier, les reliques simulées comptent aussi
    assert.deepEqual(agesScelles(s, { nature: "atelier", reliques: ["Satya"] }), ["Satya", "Treta", "Kali"]);
    assert.deepEqual(sceauxDuCoffre(null, coffre), []);
  });
});

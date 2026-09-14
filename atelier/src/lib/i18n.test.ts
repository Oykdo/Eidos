import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { compteParRegle, manquementsDe, type Regle } from "./ecriture.ts";
import { EN, FR, setLocale, t, type Msg } from "./i18n.ts";

/**
 * Le cliquet de la règle d'écriture (`ecriture.ts` ; décision d'auteur du
 * 2026-09-14, chantier « langue » en trois PR) : ces comptes ne remontent
 * jamais, ils descendent PR après PR jusqu'à zéro. Mesurés à l'ouverture
 * (PR A) sur 866 clés : 24 / 15 / 41 / 53 ; abaissé par la PR B (Vérifier et Lire à zéro). `node --experimental-strip-types scripts/langue.ts`
 * liste ce qui reste, page par page.
 */
const CLIQUET: Record<Regle, number> = { lexique: 16, chapeau: 13, phrase: 39, tutoiement: 33 };

describe("i18n", () => {
  it("FR et EN ont les mêmes clés", () => {
    const a = Object.keys(FR).sort();
    const b = Object.keys(EN).sort();
    assert.deepEqual(a, b);
  });

  it("genèse courte", () => {
    setLocale("fr");
    assert.equal(t("genese.lede"), "Vérifier que tout est en place.");
    assert.equal(t("genese.lancer"), "Vérifier");
    setLocale("en");
    assert.equal(t("genese.lede"), "Check that everything is in place.");
    assert.equal(t("genese.lancer"), "Check");
  });

  it("interpolation et pluriel", () => {
    setLocale("fr");
    assert.equal(t("inv.n", { n: 1 }), "1 objet");
    assert.equal(t("inv.n", { n: 8 }), "8 objets");
    setLocale("en");
    assert.equal(t("inv.n", { n: 1 }), "1 item");
    assert.equal(t("inv.n", { n: 8 }), "8 items");
  });

  it("aucune valeur vide", () => {
    for (const k of Object.keys(FR) as Msg[]) {
      assert.ok(FR[k].length > 0, k);
      assert.ok(EN[k].length > 0, k);
    }
  });

  it("aucun époque ni aeon dans l'UI", () => {
    const re = /époque|epoch|aeon/i;
    for (const k of Object.keys(FR) as Msg[]) {
      assert.equal(re.test(FR[k]), false, `FR ${k}`);
      assert.equal(re.test(EN[k]), false, `EN ${k}`);
    }
  });

  it("la règle d'écriture : le cliquet ne remonte jamais", () => {
    const c = compteParRegle(manquementsDe(FR, EN));
    for (const regle of Object.keys(CLIQUET) as Regle[])
      assert.ok(
        c[regle] <= CLIQUET[regle],
        `${regle} : ${c[regle]} manquements au lieu de ${CLIQUET[regle]} au plus — scripts/langue.ts les liste`,
      );
  });

  it("reliques : libellés gelés", () => {
    assert.equal(
      FR["relique.lede"],
      "Un sceau se trouve, il ne s'achète pas.",
    );
    assert.equal(
      EN["relique.lede"],
      "A seal is found, never bought.",
    );
    assert.equal(FR["relique.preuveAide"], "Collez eidos-artefact/1. Même preuve, même relique.");
    assert.equal(EN["relique.preuveAide"], "Paste eidos-artefact/1. Same proof, same relic.");
    assert.equal(
      FR["guide.09p"],
      "Un coffre, une racine. Chaque objet tient en 32 bits. Il ne grandit pas : la puissance ne s'accumule pas.",
    );
    assert.equal(
      EN["guide.09p"],
      "One vault, one root. Each item fits in 32 bits. It does not grow: power does not pile up.",
    );
  });
});

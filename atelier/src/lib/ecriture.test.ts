/**
 * La règle d'écriture : chaque règle a le texte qui la viole, et un texte
 * propre ne déroge à rien.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BANNIS,
  CHAPEAU_MAX,
  PHRASE_MAX,
  compteParRegle,
  estChapeau,
  manquements,
  manquementsDe,
  phrases,
} from "./ecriture.ts";

const regles = (cle: string, fr: string, en = "ok.") => manquements(cle, fr, en).map((m) => m.regle);

describe("ecriture — la règle", () => {
  it("un texte propre ne déroge à rien, en FR comme en EN", () => {
    assert.deepEqual(manquements("tour.lede", "Tu montes. Chaque étage a sa dalle.", "You climb. Each floor has its slab."), []);
  });

  it("lexique : un mot de la chaîne est refusé, mot entier, sans égard à la casse, dans chaque langue", () => {
    assert.deepEqual(regles("x", "La racine de l'arbre."), ["lexique"]);
    assert.deepEqual(regles("x", "Une preuve merkle."), ["lexique"]);
    assert.deepEqual(regles("x", "ok.", "One vault, one root."), ["lexique"]);
    assert.deepEqual(regles("x", "ok.", "the txid"), ["lexique"]);
    // Mot entier : « hashtag » n'est pas « hash », « enraciné » n'est pas « racine ».
    assert.deepEqual(regles("x", "Un mot enraciné.", "a hashtag"), []);
    assert.ok(BANNIS.communs.includes("UTXO") && BANNIS.fr.includes("racine") && BANNIS.en.includes("root"));
  });

  it("chapeau : un texte d'entrée de page tient en 140 caractères, un autre texte peut être long", () => {
    // Un seul mot très long : seule la longueur déroge, pas la phrase.
    const long = "a".repeat(CHAPEAU_MAX) + ".";
    assert.ok(long.length > CHAPEAU_MAX);
    assert.ok(estChapeau("tour.lede") && estChapeau("sous.tour") && estChapeau("eco.tour"));
    assert.ok(!estChapeau("tour.aide") && !estChapeau("guide.01p"));
    assert.deepEqual(regles("tour.lede", long), ["chapeau"]);
    assert.deepEqual(regles("tour.aide", long), []);
  });

  it("phrase : plus de 25 mots dans une phrase est refusé ; les phrases se coupent sur . ! ? …", () => {
    const vingtSix = Array.from({ length: PHRASE_MAX + 1 }, (_, i) => `m${i}`).join(" ") + ".";
    assert.deepEqual(regles("x", vingtSix), ["phrase"]);
    const deuxCourtes = Array.from({ length: PHRASE_MAX }, (_, i) => `m${i}`).join(" ") + ". Et une autre !";
    assert.deepEqual(regles("x", deuxCourtes), []);
    assert.deepEqual(phrases("Un. Deux ! Trois ? Quatre… "), ["Un", "Deux", "Trois", "Quatre"]);
  });

  it("tutoiement : « vous », « votre », « vos » et l'impératif en -ez en tête de phrase sont refusés, en FR seulement", () => {
    assert.deepEqual(regles("x", "Votre coffre est vide."), ["tutoiement"]);
    assert.deepEqual(regles("x", "Si vous voulez."), ["tutoiement"]);
    assert.deepEqual(regles("x", "Collez la preuve ici."), ["tutoiement"]);
    assert.deepEqual(regles("x", "Une pièce. Vérifiez-la."), ["tutoiement"]);
    assert.deepEqual(regles("x", "Ton coffre est vide. Colle la preuve ici."), []);
    // « chez », « assez » ne sont pas des impératifs ; « nous » n'est pas « vous ».
    assert.deepEqual(regles("x", "Chez toi. Assez parlé, nous montons."), []);
    assert.deepEqual(regles("x", "ok.", "Paste your proof. Verify it."), []);
  });

  it("un texte cumule ses manquements, et le compte par règle les additionne", () => {
    const liste = manquementsDe(
      { "a.lede": "Vous verrez la racine.", "b": "ok." },
      { "a.lede": "You will see the root.", "b": "fine." },
    );
    assert.deepEqual(
      liste.map((m) => `${m.langue}:${m.regle}`),
      ["fr:lexique", "en:lexique", "fr:tutoiement"],
    );
    assert.deepEqual(compteParRegle(liste), { lexique: 2, chapeau: 0, phrase: 0, tutoiement: 1 });
  });
});

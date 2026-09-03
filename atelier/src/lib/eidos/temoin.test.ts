import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  adopterTete,
  avancer,
  encoderJson,
  juger,
  parserTete,
  parserTeteLien,
  serialiserTete,
  temoinVide,
} from "./temoin.ts";
import { preuvePourSortie, serialiser } from "./merkle.ts";
import { appliquerEnvoi, coffreAtelier } from "./wallet.ts";

describe("témoin — second carnet", () => {
  it("sans tête : aveugle", () => {
    const c = coffreAtelier("mixte");
    const p = serialiser(preuvePourSortie(c.sorties, c.sorties[0]!.ref)!);
    const { vue } = juger(temoinVide(), p);
    assert.equal(vue.code, "aveugle");
  });

  it("après suivre : une preuve du carnet est incluse", () => {
    const c = coffreAtelier("mixte");
    const { temoin } = avancer(temoinVide(), c.chaine);
    const p = serialiser(preuvePourSortie(c.sorties, c.sorties[0]!.ref)!);
    const { vue } = juger(temoin, p);
    assert.equal(vue.code, "incluse");
    assert.equal(p.racine, temoin.tete!.merkle);
  });

  it("un envoi sans suivre : racine étrangère", () => {
    const avant = coffreAtelier("une-piece");
    const { temoin } = avancer(temoinVide(), avant.chaine);
    const { coffre } = appliquerEnvoi(avant, 100_000_000, "00".repeat(20));
    assert.ok(coffre.derniereSig?.ok);
    const p = serialiser(preuvePourSortie(coffre.sorties, coffre.sorties[0]!.ref)!);
    const { vue } = juger(temoin, p);
    assert.equal(vue.code, "etrangere");
  });

  it("suivre après l'envoi : la nouvelle preuve passe", () => {
    const avant = coffreAtelier("une-piece");
    let { temoin } = avancer(temoinVide(), avant.chaine);
    const { coffre } = appliquerEnvoi(avant, 100_000_000, "00".repeat(20));
    const suite = avancer(temoin, coffre.chaine);
    assert.equal(suite.ok, true);
    temoin = suite.temoin;
    const p = serialiser(preuvePourSortie(coffre.sorties, coffre.sorties[0]!.ref)!);
    const { vue } = juger(temoin, p);
    assert.equal(vue.code, "incluse");
  });

  it("fourche si le journal est recréé sans la tête", () => {
    const a = coffreAtelier("mixte");
    const { coffre } = appliquerEnvoi(a, 50_000_000, "00".repeat(20));
    const { temoin } = avancer(temoinVide(), coffre.chaine);
    const neuf = coffreAtelier("mixte");
    const r = avancer(temoin, neuf.chaine);
    assert.equal(r.ok, false);
    assert.match(r.message, /fourche/);
  });

  it("feuille altérée : chemin rompu, même racine", () => {
    const c = coffreAtelier("mixte");
    const { temoin } = avancer(temoinVide(), c.chaine);
    const p = serialiser(preuvePourSortie(c.sorties, c.sorties[0]!.ref)!);
    p.feuille = (p.feuille.startsWith("00") ? "01" : "00") + p.feuille.slice(2);
    const { vue } = juger(temoin, p);
    assert.equal(vue.code, "rompue");
  });

  it("tête portable : aller-retour et lien", () => {
    const c = coffreAtelier("mixte");
    const t = c.chaine[c.chaine.length - 1]!;
    const port = serialiserTete({
      hauteur: t.hauteur,
      hash: t.hash,
      merkle: t.merkle,
      prev: t.prev,
    });
    const lu = parserTete(JSON.stringify(port));
    assert.ok(!("erreur" in lu));
    const via = parserTeteLien(encoderJson(port));
    assert.ok(!("erreur" in via));
    const temoin = adopterTete(temoinVide(), via);
    const p = serialiser(preuvePourSortie(c.sorties, c.sorties[0]!.ref)!);
    const { vue } = juger(temoin, p);
    assert.equal(vue.code, "incluse");
  });
});

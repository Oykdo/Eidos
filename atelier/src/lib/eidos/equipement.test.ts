import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sha256d, utf8 } from "./hash.ts";
import { objetDepuisGraine, composer } from "./objets.ts";
import {
  AFFIXES,
  COFFRES_PHILO,
  EMPLACEMENTS_ARMURE,
  GENRES,
  GENRES_TOUR,
  NOMS_ARME,
  SOCKETS_MAX,
  affixeDe,
  craftDansCoffre,
  estPrefixe,
  generateurDe,
  genreDeRoll,
  habille,
  motEffectif,
  peutPhilosopher,
  tourner,
} from "./equipement.ts";
import { coffreNeuf } from "./wallet.ts";
import { normaliserObjets, tirerDansCoffre } from "./inventaire.ts";
import type { ObjetPorte } from "./types.ts";

const GRAINE = sha256d(utf8("eidos-objet-genese"));

function piece(over: Partial<ObjetPorte> = {}): ObjetPorte {
  const o = objetDepuisGraine(GRAINE, "Satya");
  return habille(
    { mot: o.mot, archetype: o.archetype, age: "Satya", nonce: 1, hauteur: 1 },
    8,
    { genre: "arme", emplacement: "arme", sockets: 2, nom: "Lame", ...over },
  );
}

describe("équipement", () => {
  it("dix genres (trois donnés par la Tour), neuf emplacements d'armure, sept armes, six affixes", () => {
    assert.deepEqual([...GENRES], [
      "trouve",
      "pierre",
      "arme",
      "armure",
      "gemme",
      "philosophale",
      "lair",
      "elixir",
      "capsule",
      "capture",
    ]);
    assert.deepEqual([...GENRES_TOUR], ["elixir", "capsule", "capture"]);
    // la ville ne tire jamais un genre de la Tour
    for (let r = 0; r < 64; r++) assert.ok(!(GENRES_TOUR as readonly string[]).includes(genreDeRoll(r)));
    assert.equal(EMPLACEMENTS_ARMURE.length, 9);
    assert.equal(NOMS_ARME.length, 7);
    assert.equal(AFFIXES.length, 6);
    assert.equal(COFFRES_PHILO, 10);
    assert.equal(SOCKETS_MAX, 2);
  });

  it("T·q ≠ q·S : le préfixe n'est pas le suffixe", () => {
    const m = objetDepuisGraine(GRAINE, "Satya").mot;
    const t = tourner(m, "T1");
    const s = tourner(m, "S1");
    assert.notEqual(t, s);
    assert.equal(estPrefixe("T2"), true);
    assert.equal(estPrefixe("S3"), false);
    const g = generateurDe(1);
    assert.equal(tourner(m, "T1"), composer(g, m));
    assert.equal(tourner(m, "S1"), composer(m, g));
  });

  it("genreDeRoll couvre les six types", () => {
    const vus = new Set(Array.from({ length: 32 }, (_, i) => genreDeRoll(i)));
    assert.ok(vus.has("arme") && vus.has("armure") && vus.has("pierre"));
    assert.ok(vus.has("gemme") && vus.has("lair"));
    assert.equal(affixeDe(0), "T1");
    assert.equal(affixeDe(5), "S3");
  });

  it("gemme : mot inchangé, lecture composée", () => {
    const p = piece({ gemmes: ["T1"] });
    assert.equal(p.mot, objetDepuisGraine(GRAINE, "Satya").mot);
    assert.notEqual(motEffectif(p), p.mot);
  });

  it("pierre : consomme, nouveau mot ; gemme : enchâsse", () => {
    const arme = piece();
    const pierre = habille(
      { mot: arme.mot, archetype: "mars", age: "Satya", nonce: 2, hauteur: 2 },
      12,
      { genre: "pierre", affixe: "T2", emplacement: null, sockets: 0, nom: "T2" },
    );
    const gemme = habille(
      { mot: arme.mot, archetype: "venus", age: "Satya", nonce: 3, hauteur: 3 },
      18,
      { genre: "gemme", affixe: "S1", emplacement: null, sockets: 0, nom: "S1" },
    );
    const c = { objets: [arme, pierre, gemme] };
    const t = craftDansCoffre(c, 0, 1);
    assert.equal(t.ok, true);
    if (t.ok) {
      assert.notEqual(t.objet.mot, arme.mot);
      assert.equal(t.coffre.objets.length, 2);
    }
    const c2 = { objets: [arme, gemme] };
    const g = craftDansCoffre(c2, 0, 1);
    assert.equal(g.ok, true);
    if (g.ok) {
      assert.equal(g.objet.mot, arme.mot);
      assert.deepEqual(g.objet.gemmes, ["S1"]);
    }
  });

  it("philosophale : personnel n=1..10, une fois", () => {
    const base = { nature: "personnel" as const, n: 1, philosophale: null as string | null };
    assert.equal(peutPhilosopher(base), true);
    assert.equal(peutPhilosopher({ ...base, n: 11 }), false);
    assert.equal(peutPhilosopher({ ...base, nature: "atelier" }), false);
    assert.equal(peutPhilosopher({ ...base, philosophale: "Lame" }), false);
  });

  it("objet nu : mot intact, genre trouve, jauge stable", () => {
    const nu = {
      mot: objetDepuisGraine(GRAINE, "Satya").mot,
      archetype: "saturne",
      age: "Satya" as const,
      nonce: 1,
      hauteur: 4,
    };
    const a = normaliserObjets([nu])[0]!;
    const b = normaliserObjets([nu])[0]!;
    assert.equal(a.mot, nu.mot);
    assert.equal(a.genre, "trouve");
    assert.deepEqual(a, b);
    const arme = normaliserObjets([{ ...a, genre: "arme" }])[0]!;
    assert.equal(arme.genre, "arme");
    assert.equal(arme.mot, nu.mot);
  });

  it("deux maîtres, même bloc : deux objets ; le roll pose une pierre", () => {
    const a = coffreNeuf("vide");
    const b = { ...a, maitre: `${a.maitre}-autre`, n: a.n + 1 };
    const ta = tirerDansCoffre(a);
    const tb = tirerDansCoffre(b);
    assert.equal(ta.ok, true);
    assert.equal(tb.ok, true);
    if (!ta.ok || !tb.ok) return;
    assert.notEqual(ta.objet.mot, tb.objet.mot);
    assert.ok(ta.coffre.objets.some((o) => o.genre === "pierre" && o.affixe));
    assert.ok(tb.coffre.objets.some((o) => o.genre === "pierre" && o.affixe));
    assert.equal(tirerDansCoffre(ta.coffre).ok, false);
  });
});

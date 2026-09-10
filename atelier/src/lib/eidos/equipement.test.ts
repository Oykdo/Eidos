import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sha256d, utf8 } from "./hash.ts";
import { objetDepuisGraine, composer, depaqueter, paqueter, type Objet } from "./objets.ts";
import { isqrt, norme2, produit } from "./cosmos.ts";
import { COMBAT_BUDGET, combatDe } from "./combat.ts";
import { uniDe } from "./chymie.ts";
import { qDeMot } from "./resonance.ts";
import {
  AFFIXES,
  ANGLES_PIERRE,
  AXES_PIERRE,
  GENERATEURS_GELES,
  N_LEVIERS,
  PIERRES,
  estPierreRef,
  generateurPierre,
  litPierre,
  multipleAxe,
  pierreDe,
  pierreDeRoll,
  pierreDepuisGraine,
  rangAffixe,
  refCanonique,
  type AnglePierreId,
  type AxePierreId,
  type PierreId,
  type PierreRef,
  EMPLACEMENTS_SERTIS,
  accepteSertissure,
  peutEnchasser,
  sertir,
  socketsDe,
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
import type { Affixe, ObjetPorte } from "./types.ts";

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

describe("équipement — la gemme sertit, la pierre tourne", () => {
  /**
   * Le plafond d'orbite est un **angle**, pas une longueur : `|q₀| / ‖q‖`,
   * en millièmes. C'est la quantité que `memeOrbite` compare (`groupe.ts`),
   * et la seule qui ait un sens ici — `depaqueter` ne rend pas toujours la
   * même norme, et `motDeQ` renormalise.
   */
  function plafond(mot: number): bigint {
    const q = qDeMot(mot);
    const a = q[0] < 0n ? -q[0] : q[0];
    const n = isqrt(norme2(q));
    return n === 0n ? 0n : (a * 1000n) / n;
  }

  const MOTS = (() => {
    const out: number[] = [];
    let g = GRAINE;
    for (let i = 0; i < 300; i++) {
      g = sha256d(g);
      out.push(objetDepuisGraine(g, "Satya").mot);
    }
    return out;
  })();

  it("une gemme ne déplace jamais le plafond d'orbite", () => {
    let pire = 0n;
    for (const mot of MOTS) {
      for (const a of AFFIXES) {
        const avant = plafond(mot);
        const apres = plafond(sertir(mot, a));
        const ecart = avant > apres ? avant - apres : apres - avant;
        if (ecart > pire) pire = ecart;
      }
    }
    // Trois millièmes au plus : l'arrondi de `motDeQ`, jamais l'orbite.
    assert.ok(pire <= 3n, `plafond déplacé de ${pire}‰ au lieu de 3‰ au plus`);
  });

  it("la pierre, elle, déplace le plafond — c'est sa raison d'être", () => {
    let bouges = 0;
    for (const mot of MOTS) {
      for (const a of AFFIXES) {
        const ecart = plafond(tourner(mot, a)) - plafond(mot);
        if (ecart > 20n || ecart < -20n) bouges += 1;
      }
    }
    const total = MOTS.length * AFFIXES.length;
    assert.ok(bouges > total / 4, `${bouges} déplacements sur ${total} : la pierre ne tourne plus`);
  });

  it("sertir deux fois reste sous le même plafond", () => {
    for (const mot of MOTS.slice(0, 60)) {
      const deux = sertir(sertir(mot, "T1"), "S3");
      const ecart = plafond(deux) - plafond(mot);
      assert.ok(ecart <= 6n && ecart >= -6n, `deux gemmes ont bougé le plafond de ${ecart}‰`);
    }
  });

  it("six emplacements sertissables, et pas un de plus", () => {
    assert.deepEqual([...EMPLACEMENTS_SERTIS], [
      "arme",
      "casque",
      "plastron",
      "amulette",
      "anneau1",
      "anneau2",
    ]);
    for (const e of EMPLACEMENTS_ARMURE) {
      const attendu = (EMPLACEMENTS_SERTIS as readonly string[]).includes(e);
      assert.equal(accepteSertissure("armure", e), attendu, `armure/${e}`);
    }
    assert.equal(accepteSertissure("arme", "arme"), true);
    assert.equal(accepteSertissure("pierre", "arme"), false);
    assert.equal(accepteSertissure("armure", null), false);
  });

  it("doit échouer : une pièce hors sertissure n'a pas de socket et refuse la gemme", () => {
    for (const e of ["gants", "bottes", "epaulieres", "accessoire"] as const) {
      for (let roll = 0; roll < 16; roll++) {
        assert.equal(socketsDe("armure", roll, e), 0, `${e} a reçu un socket`);
      }
      const bottes = piece({ genre: "armure", emplacement: e, sockets: 2, nom: e });
      assert.equal(peutEnchasser(bottes), false, `${e} accepte une gemme`);
    }
    const casque = piece({ genre: "armure", emplacement: "casque", sockets: 1, nom: "casque" });
    assert.equal(peutEnchasser(casque), true);
  });
});

describe("équipement — le catalogue des pierres : treize axes, trois angles", () => {
  function plafondQ(q: readonly [bigint, bigint, bigint, bigint]): bigint {
    const a = q[0] < 0n ? -q[0] : q[0];
    const n = isqrt(norme2(q));
    return n === 0n ? 0n : (a * 1000n) / n;
  }
  function plafondMot(mot: number): bigint {
    return plafondQ(qDeMot(mot));
  }

  const MOTS_CAT = (() => {
    const out: Objet[] = [];
    let g = GRAINE;
    for (let i = 0; i < 1400; i++) {
      g = sha256d(g);
      out.push(objetDepuisGraine(g, "Satya"));
    }
    return out;
  })();

  it("treize axes, trois angles : 39 pierres, 78 affixes, 39 leviers", () => {
    assert.equal(AXES_PIERRE.length, 13);
    assert.equal(ANGLES_PIERRE.length, 3);
    assert.equal(PIERRES.length, 78);
    assert.equal(N_LEVIERS, 39);
    assert.equal(new Set(PIERRES.map((p) => p.id)).size, 78);
    // les 78 affixes ne portent que 39 générateurs : le côté n'en ajoute pas
    assert.equal(new Set(PIERRES.map((p) => p.mot)).size, 39);
    assert.equal(PIERRES.filter((p) => p.cote === "T").length, 39);
    assert.equal(PIERRES.filter((p) => p.cote === "S").length, 39);
    const sortes = AXES_PIERRE.map((a) => a.sorte);
    assert.equal(sortes.filter((s) => s === "pur").length, 3);
    assert.equal(sortes.filter((s) => s === "arete").length, 6);
    assert.equal(sortes.filter((s) => s === "diagonale").length, 4);
    // chaque axe a sa première composante non nulle positive : l'écriture canonique
    for (const a of AXES_PIERRE) {
      const premiere = a.u.find((x) => x !== 0);
      assert.equal(premiere, 1, `l'axe ${a.id} commence par ${premiere}`);
      assert.ok(a.u.every((x) => x >= -1 && x <= 1), `l'axe ${a.id} n'est pas unitaire`);
    }
    // les angles montent, la torsion descend : l'angle d'une pierre est sa dureté
    assert.deepEqual(ANGLES_PIERRE.map((g) => g.v), [80, 160, 320]);
    assert.deepEqual(ANGLES_PIERRE.map((g) => g.torsionMille), [994, 976, 897]);
    assert.deepEqual(ANGLES_PIERRE.map((g) => g.mohsCentiemes), [100, 550, 625]);
    // le nom d'un angle est un signe de la chymie
    for (const g of ANGLES_PIERRE) assert.ok(uniDe(g.signe).length > 0, g.signe);
  });

  it("les composantes entières exactes des 39 générateurs, et leur norme", () => {
    const attendu: Record<string, Record<string, readonly number[]>> = {
      talc: { pur: [719, 80], arete: [719, 57], diagonale: [719, 46] },
      aimant: { pur: [706, 160], arete: [706, 113], diagonale: [706, 92] },
      marcassite: { pur: [649, 320], arete: [649, 226], diagonale: [649, 185] },
    };
    let deficitMin = Infinity;
    let deficitMax = -Infinity;
    for (const p of PIERRES.filter((x) => x.cote === "T")) {
      const [w, t] = attendu[p.angle]![p.sorte]! as [number, number];
      const u = AXES_PIERRE.find((a) => a.id === p.axe)!.u;
      assert.deepEqual(
        [...p.q],
        [w, t * u[0], t * u[1], t * u[2]],
        `${p.id} : ${p.q.join(",")}`,
      );
      // aucun flottant : chaque composante est un entier
      assert.ok(p.q.every((x) => Number.isInteger(x)), `${p.id} n'est pas entier`);
      assert.equal(p.torsionMille, ANGLES_PIERRE.find((g) => g.id === p.angle)!.torsionMille);
      const n2 = p.q[0] ** 2 + p.q[1] ** 2 + p.q[2] ** 2 + p.q[3] ** 2;
      assert.equal(p.deficit, 724 * 724 - n2);
      if (p.deficit < deficitMin) deficitMin = p.deficit;
      if (p.deficit > deficitMax) deficitMax = p.deficit;
      // `w` est bien l'entier que `depaqueter` reconstruira de |v|
      const v2 = p.q[1] ** 2 + p.q[2] ** 2 + p.q[3] ** 2;
      assert.equal(p.q[0], Number(isqrt(BigInt(724 * 724 - v2))));
    }
    // toutes les pierres neuves sont au moins aussi près de la sphère que l'ancienne (815)
    assert.equal(deficitMin, 140);
    assert.equal(deficitMax, 867);
    const ancien = 724 * 724 - (719 * 719 + 80 * 80);
    assert.equal(ancien, 815);
    assert.equal(multipleAxe([1, 1, 0], 80), 57);
    assert.equal(multipleAxe([1, 1, 1], 320), 185);
    assert.equal(multipleAxe([1, 0, 0], 160), 160);
  });

  it("aller-retour exact sur les 39 : la quatrième diagonale s'écrit (1,−1,−1)", () => {
    for (const p of PIERRES.filter((x) => x.cote === "T")) {
      assert.deepEqual(depaqueter(p.mot), [...p.q], `${p.id} n'est pas point fixe`);
      assert.equal(paqueter(depaqueter(p.mot)), p.mot);
    }
    // le piège : `canon3` renverse la part vectorielle et rend la rotation conjuguée
    const renverse = paqueter([719, -46, 46, 46]);
    assert.deepEqual(depaqueter(renverse), [719, 46, -46, -46]);
    assert.notDeepEqual(depaqueter(renverse), [719, -46, 46, 46]);
    // l'écriture retenue, elle, est un point fixe
    const diag = litPierre("T:i-j-k:talc");
    assert.deepEqual([...diag.q], [719, 46, -46, -46]);
    assert.deepEqual(depaqueter(diag.mot), [719, 46, -46, -46]);
    assert.equal(AXES_PIERRE.filter((a) => a.sorte === "diagonale").map((a) => a.id).join(" "),
      "i+j+k i+j-k i-j+k i-j-k");
  });

  it("les six affixes d'hier sont les axes purs à l'angle Talc, à l'octet", () => {
    assert.deepEqual([...AFFIXES], ["T1", "T2", "T3", "S1", "S2", "S3"]);
    assert.deepEqual([...GENERATEURS_GELES[0]!], [719, 80, 0, 0]);
    assert.deepEqual([...GENERATEURS_GELES[1]!], [719, 0, 80, 0]);
    assert.deepEqual([...GENERATEURS_GELES[2]!], [719, 0, 0, 80]);
    for (let r = 1; r <= 3; r++) {
      assert.equal(generateurDe(r as 1 | 2 | 3), paqueter(GENERATEURS_GELES[r - 1]!));
    }
    assert.equal(refCanonique("T1"), "T:i:talc");
    assert.equal(refCanonique("S3"), "S:k:talc");
    assert.equal(refCanonique("T:i+j:aimant"), "T:i+j:aimant");
    assert.equal(estPrefixe("T:i-k:marcassite"), true);
    assert.equal(estPrefixe("S:i-k:marcassite"), false);
    // tourner et sertir rendent exactement ce qu'ils rendaient avec la table gelée
    for (const o of MOTS_CAT.slice(0, 400)) {
      for (const a of AFFIXES) {
        const g = paqueter(GENERATEURS_GELES[rangAffixe(a) - 1]!);
        const attendu = a[0] === "T" ? composer(g, o.mot) : composer(o.mot, g);
        assert.equal(tourner(o.mot, a), attendu, `${a} a changé de sens`);
        assert.equal(tourner(o.mot, a), tourner(o.mot, refCanonique(a)));
        assert.equal(sertir(o.mot, a), sertir(o.mot, refCanonique(a)));
      }
    }
    assert.equal(pierreDe("T2").mot, generateurDe(2));
  });

  it("un coffre à l'ancien format se relit sans perte", () => {
    const base = objetDepuisGraine(GRAINE, "Satya");
    const ancien = {
      mot: base.mot,
      archetype: base.archetype,
      age: "Satya" as const,
      nonce: 7,
      hauteur: 3,
      genre: "arme" as const,
      emplacement: "arme" as const,
      affixe: "T3" as const,
      sockets: 2,
      gemmes: ["T1", "S3"] as Affixe[],
      nom: "Lame",
      palierLair: null,
    };
    // relu d'un localStorage : JSON, puis la normalisation d'inventaire
    const relu = normaliserObjets([JSON.parse(JSON.stringify(ancien))])[0]!;
    assert.equal(relu.mot, ancien.mot);
    assert.equal(relu.affixe, "T3");
    assert.deepEqual(relu.gemmes, ["T1", "S3"]);
    assert.equal(motEffectif(relu), motEffectif(ancien));
    assert.equal(motEffectif(relu), sertir(sertir(ancien.mot, "T1"), "S3"));
    // habille garde les six anciens et les 78 du catalogue, et jette le reste
    const habille78 = habille(
      { mot: base.mot, archetype: base.archetype, age: "Satya", nonce: 1, hauteur: 1 },
      8,
      {
        genre: "arme",
        emplacement: "arme",
        sockets: 2,
        nom: "Lame",
        gemmes: ["T1", "T:i+j:aimant", "XX"] as unknown as Affixe[],
      },
    );
    assert.deepEqual(habille78.gemmes, ["T1", "T:i+j:aimant"] as unknown as Affixe[]);
    assert.equal(estPierreRef("T1"), true);
    assert.equal(estPierreRef("T:i-j-k:marcassite"), true);
    assert.equal(estPierreRef("T4"), false);
    assert.equal(estPierreRef("T:i:cristal"), false);
    // un craft à l'ancien affixe tourne toujours la pièce et la consomme
    const pierre = habille(
      { mot: base.mot, archetype: "mars", age: "Satya", nonce: 2, hauteur: 2 },
      12,
      { genre: "pierre", affixe: "T2", emplacement: null, sockets: 0, nom: "T2" },
    );
    const c = craftDansCoffre({ objets: [relu, pierre] }, 0, 1);
    assert.equal(c.ok, true);
    if (c.ok) assert.equal(c.objet.mot, tourner(relu.mot, "T2"));
  });

  it("0 violation de la somme des axes sur 109 200 produits de forge", () => {
    let produits = 0;
    let violations = 0;
    for (const o of MOTS_CAT) {
      for (const p of PIERRES) {
        const c = combatDe({ ...o, mot: tourner(o.mot, p.id) });
        if (c.lame + c.ecu + c.eperon + c.arc !== COMBAT_BUDGET) violations += 1;
        produits += 1;
      }
    }
    assert.ok(produits >= 100000, `${produits} produits au lieu de 100 000 au moins`);
    assert.equal(violations, 0, `${violations} sommes hors ${COMBAT_BUDGET}`);
  });

  it("T et S : même plafond exact ; ce qui diffère est l'arrondi de paqueter", () => {
    let ecarts = 0;
    let pireMot = 0n;
    for (const o of MOTS_CAT.slice(0, 400)) {
      const q = qDeMot(o.mot);
      for (const p of PIERRES.filter((x) => x.cote === "T")) {
        const g = qDeMot(p.mot);
        const a = produit(g, q);
        const b = produit(q, g);
        // Re(g·q) = Re(q·g) et |g·q| = |q·g| : le plafond ne dépend pas du côté
        if (a[0] !== b[0] || norme2(a) !== norme2(b)) ecarts += 1;
        assert.equal(plafondQ(a), plafondQ(b));
        const s = `S${p.id.slice(1)}` as PierreId;
        const d = plafondMot(tourner(o.mot, p.id)) - plafondMot(tourner(o.mot, s));
        const abs = d < 0n ? -d : d;
        if (abs > pireMot) pireMot = abs;
      }
    }
    assert.equal(ecarts, 0, `${ecarts} produits où Re(g·q) ≠ Re(q·g)`);
    // le mot emballé, lui, diverge : `paqueter` reconstruit w de |v|
    assert.ok(pireMot > 0n, "les deux côtés ne diffèrent plus du tout : paqueter a changé");
    assert.ok(pireMot < 200n, `${pireMot}‰ d'écart au lieu de moins de 200`);
  });

  it("les 78 gemmes ne déplacent pas le plafond ; les 78 pierres, si", () => {
    let pireGemme = 0n;
    let bouges = 0;
    let total = 0;
    for (const o of MOTS_CAT.slice(0, 400)) {
      const avant = plafondMot(o.mot);
      for (const p of PIERRES) {
        const g = plafondMot(sertir(o.mot, p.id));
        const e = avant > g ? avant - g : g - avant;
        if (e > pireGemme) pireGemme = e;
        const d = plafondMot(tourner(o.mot, p.id)) - avant;
        if (d > 20n || d < -20n) bouges += 1;
        total += 1;
      }
    }
    assert.ok(pireGemme <= 3n, `une gemme a déplacé le plafond de ${pireGemme}‰`);
    assert.ok(bouges > total / 4, `${bouges} déplacements sur ${total} : la pierre ne tourne plus`);
  });

  it("pierreDeRoll et pierreDepuisGraine : déterministes, sans dé, sans biais", () => {
    const vus = new Set<string>();
    for (let r = 0; r < 78; r++) {
      const id = pierreDeRoll(r);
      assert.equal(id, PIERRES[r]!.id);
      vus.add(id);
    }
    assert.equal(vus.size, 78);
    assert.equal(pierreDeRoll(-1), pierreDeRoll(77));
    assert.equal(pierreDeRoll(78), pierreDeRoll(0));
    // rejet : le premier octet sous 234 (3 × 78), aucun modulo biaisé
    const g0 = new Uint8Array([250, 240, 12, ...new Uint8Array(29)]);
    assert.equal(pierreDepuisGraine(g0), pierreDeRoll(12));
    const g1 = sha256d(utf8("chy-graine"));
    assert.equal(pierreDepuisGraine(g1), pierreDepuisGraine(g1));
    const couverts = new Set<string>();
    let g = sha256d(utf8("chy-couverture"));
    for (let i = 0; i < 3000; i++) {
      g = sha256d(g);
      couverts.add(pierreDepuisGraine(g));
    }
    assert.equal(couverts.size, 78, `${couverts.size} pierres atteintes sur 78`);
  });

  it("doit échouer : un axe, un angle ou un affixe hors du catalogue", () => {
    assert.throws(() => litPierre("T4" as PierreRef), /au lieu de l'un des 84 affixes/);
    assert.throws(() => litPierre("T:i:cristal" as PierreRef), /au lieu de l'un des 84 affixes/);
    assert.throws(() => litPierre("Z:i:talc" as PierreRef), /au lieu de l'un des 84 affixes/);
    assert.throws(() => tourner(1, "" as PierreRef), /au lieu de l'un des 84 affixes/);
    assert.throws(() => sertir(1, "T:x:talc" as PierreRef), /au lieu de l'un des 84 affixes/);
    // le quatrième angle est écarté par la mesure, pas par oubli
    assert.throws(() => generateurPierre("i", "cristal" as AnglePierreId), /au lieu de l'un des 3/);
    assert.throws(() => generateurPierre("x" as AxePierreId, "talc"), /au lieu de l'un des 13/);
    assert.throws(() => multipleAxe([0, 0, 0], 80), /axe nul/);
    // 480 tiendrait encore ; 800 sortirait de la sphère
    assert.ok(multipleAxe([1, 0, 0], 480) === 480);
  });
});

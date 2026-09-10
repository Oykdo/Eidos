import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { combatDe, COMBAT_BUDGET, type Combat } from "./combat.ts";
import { sha256d, utf8 } from "./hash.ts";
import { depaqueter, objetDepuisGraine, paqueter } from "./objets.ts";
import type { NomAge } from "./relique.ts";
import { SIGNATURES } from "./signatures.ts";
import {
  BORNES_TIER,
  CLES_RARETE,
  CLES_TIER,
  E3_MAX,
  E3_MIN,
  NOMS_RARETE,
  NOMS_TIER,
  PROXIMITE_PLANCHER,
  RAYON_COUVERTURE,
  SEUILS_RARETE,
  TIERS,
  extremite,
  extremiteDeCombat,
  frequenceTheorique,
  indiceRarete,
  nomTier,
  rareteDe,
  rareteDeProximite,
  tierDe,
  tierDeExtremite,
} from "./tiers.ts";

const GRAINE = sha256d(utf8("eidos-objet-genese"));
const AGES: readonly NomAge[] = ["Satya", "Treta", "Dvapara", "Kali"];

/**
 * Le tirage de référence de docs/SPEC_LOOT_TIERS.md §1 :
 * objetDepuisGraine(sha256d("loot-" + i), âge), âges à tour de rôle.
 * Entièrement déterministe : les effectifs ci-dessous sont exacts, pas estimés.
 */
const N = 100_000;

function objetTire(i: number) {
  return objetDepuisGraine(sha256d(utf8("loot-" + i)), AGES[i % 4]!);
}

type Lecture = { tier: number; proximite: number };

let cache: Lecture[] | null = null;

/** L'échantillon, calculé une fois pour toute la suite (~1,6 s). */
function echantillon(): Lecture[] {
  if (cache) return cache;
  const out: Lecture[] = new Array(N);
  for (let i = 0; i < N; i++) {
    const o = objetTire(i);
    out[i] = { tier: tierDe(o), proximite: rareteDe(o).proximite };
  }
  cache = out;
  return out;
}

function effectifsTier(): number[] {
  const n = new Array<number>(TIERS).fill(0);
  for (const l of echantillon()) n[l.tier - 1]! += 1;
  return n;
}

function effectifsRarete(): number[] {
  const n = new Array<number>(NOMS_RARETE.length).fill(0);
  for (const l of echantillon()) n[indiceRarete(l.proximite)]! += 1;
  return n;
}

function combat(lame: number, ecu: number, eperon: number, arc: number): Combat {
  return { lame, ecu, eperon, arc, somme: lame + ecu + eperon + arc, pointe: "lame" };
}

describe("tiers", () => {
  it("vecteur gelé : la lecture d'une graine fixe ne bouge pas", () => {
    const o = objetDepuisGraine(GRAINE, "Satya");
    assert.equal(o.mot >>> 0, 4030905633);
    assert.deepEqual(
      { extremite: extremite(o), tier: tierDe(o), nom: nomTier(tierDe(o)), ...rareteDe(o) },
      { extremite: 122, tier: 1, nom: "diffus", palier: "franc", proximite: 94 },
    );
    // Le premier T12 du tirage de référence, et le premier errant.
    const singulier = objetTire(2099);
    assert.deepEqual(
      { extremite: extremite(singulier), tier: tierDe(singulier), ...rareteDe(singulier) },
      { extremite: 2586, tier: 12, palier: "franc", proximite: 94 },
    );
    const errant = objetTire(72);
    assert.deepEqual(
      { extremite: extremite(errant), tier: tierDe(errant), ...rareteDe(errant) },
      { extremite: 350, tier: 2, palier: "errant", proximite: 82 },
    );
  });

  it("les cinq repères de la spec tombent où elle le dit", () => {
    const repere = (a: number, b: number, c: number, d: number) => {
      const e = extremiteDeCombat(combat(a, b, c, d));
      return [e, tierDeExtremite(e)];
    };
    assert.deepEqual(repere(16, 16, 16, 16), [0, 1]);
    assert.deepEqual(repere(40, 12, 8, 4), [800, 4]);
    assert.deepEqual(repere(32, 32, 0, 0), [1024, 5]);
    assert.deepEqual(repere(55, 3, 3, 3), [2028, 9]);
    assert.deepEqual(repere(64, 0, 0, 0), [E3_MAX, 12]);
    assert.equal(E3_MAX, 3072);
  });

  it("E3 = Σ (axe − 16)², sans archétype, sans âge, sans signe", () => {
    const base = objetDepuisGraine(GRAINE, "Satya");
    const c = combatDe(base);
    const somme = [c.lame, c.ecu, c.eperon, c.arc].reduce((s, a) => s + (a - 16) * (a - 16), 0);
    assert.equal(extremite(base), somme);
    // L'archétype permute les axes : une somme de carrés ne les distingue pas.
    const parArchetype = new Set(SIGNATURES.map((s) => extremite({ ...base, archetype: s.id })));
    assert.deepEqual([...parArchetype], [122]);
    // L'âge est une géographie.
    for (const age of AGES) assert.equal(extremite({ ...base, age }), 122);
    // q et −q sont le même objet.
    const q = depaqueter(base.mot);
    const oppose = { ...base, mot: paqueter([-q[0], -q[1], -q[2], -q[3]]) };
    assert.equal(extremite(oppose), extremite(base));
  });

  it("les onze bornes sont strictement croissantes et tiennent dans le domaine", () => {
    assert.equal(BORNES_TIER.length, TIERS - 1);
    assert.equal(NOMS_TIER.length, TIERS);
    assert.equal(CLES_TIER.length, TIERS);
    assert.equal(new Set(NOMS_TIER).size, TIERS);
    assert.equal(new Set(CLES_TIER).size, TIERS);
    for (let k = 1; k < BORNES_TIER.length; k++) {
      assert.ok(BORNES_TIER[k]! > BORNES_TIER[k - 1]!, `borne ${k} non croissante`);
    }
    assert.ok(BORNES_TIER[0]! > E3_MIN);
    assert.ok(BORNES_TIER[BORNES_TIER.length - 1]! <= E3_MAX);
    // Aucun accent dans les clés : elles servent d'identifiants.
    for (const cle of [...CLES_TIER, ...CLES_RARETE]) assert.match(cle, /^[a-z]+$/);
  });

  it("couvrantes : chacune des 3 073 valeurs d'E3 tombe dans exactement un tier", () => {
    let precedent = 1;
    const vus = new Set<number>();
    for (let e = E3_MIN; e <= E3_MAX; e++) {
      const t = tierDeExtremite(e);
      assert.ok(t >= 1 && t <= TIERS, `tier ${t} hors 1..${TIERS} pour E3 = ${e}`);
      assert.ok(t === precedent || t === precedent + 1, `saut de tier en E3 = ${e}`);
      precedent = t;
      vus.add(t);
    }
    assert.equal(vus.size, TIERS);
    // La borne appartient au tier qu'elle ouvre, jamais au précédent.
    for (let k = 0; k < BORNES_TIER.length; k++) {
      assert.equal(tierDeExtremite(BORNES_TIER[k]!), k + 2);
      assert.equal(tierDeExtremite(BORNES_TIER[k]! - 1), k + 1);
    }
  });

  it("les douze tiers sont peuplés sur 100 000 objets, et la distribution est gelée", () => {
    const n = effectifsTier();
    assert.deepEqual(n, [48412, 27435, 11972, 6081, 3016, 1531, 754, 378, 206, 109, 51, 55]);
    assert.equal(
      n.reduce((s, x) => s + x, 0),
      N,
    );
    for (let t = 1; t <= TIERS; t++) assert.ok(n[t - 1]! > 0, `tier ${t} vide`);
  });

  it("la loi 2⁻ᵗ tient : 12 % de biais systématique plus trois écarts de Poisson", () => {
    const n = effectifsTier();
    for (let t = 1; t <= TIERS; t++) {
      const attendu = N / frequenceTheorique(t).sur;
      // 0,12 = le biais mesuré par la spec sur 2·10⁶ (T2 +10,2 %) ;
      // 3/√attendu = trois σ du bruit de comptage, qui domine dès T9 (n ≈ 200).
      const tolerance = Math.max(0.12, 3 / Math.sqrt(attendu));
      const ecart = n[t - 1]! / attendu - 1;
      assert.ok(
        Math.abs(ecart) <= tolerance,
        `T${t} : ${(ecart * 100).toFixed(1)} % hors de ±${(tolerance * 100).toFixed(1)} %`,
      );
    }
    // La décroissance est stricte de T1 à T11 ; T11 et T12 partagent la queue.
    for (let t = 1; t < TIERS - 1; t++) {
      assert.ok(n[t]! < n[t - 1]!, `T${t + 1} n'est pas plus rare que T${t}`);
    }
  });

  it("frequenceTheorique : dénominateurs entiers, T12 est la queue et non 2⁻¹²", () => {
    let masse = 0;
    for (let t = 1; t <= TIERS; t++) {
      const { sur } = frequenceTheorique(t);
      assert.ok(Number.isInteger(sur), `dénominateur ${sur} non entier`);
      masse += 1 / sur;
    }
    // Douze parts qui somment exactement à 1 : c'est ce qui force T12 = 2⁻¹¹.
    assert.equal(masse, 1);
    assert.deepEqual(frequenceTheorique(1), { sur: 2 });
    assert.deepEqual(frequenceTheorique(11), { sur: 2048 });
    assert.deepEqual(frequenceTheorique(12), { sur: 2048 });
    assert.notDeepEqual(frequenceTheorique(12), { sur: 4096 });
  });

  it("les sept paliers couvrent [0, 100] et décroissent strictement en fréquence", () => {
    assert.equal(SEUILS_RARETE.length, NOMS_RARETE.length);
    assert.equal(CLES_RARETE.length, NOMS_RARETE.length);
    assert.equal(SEUILS_RARETE[SEUILS_RARETE.length - 1], 0, "le dernier palier ne couvre pas");
    for (let k = 1; k < SEUILS_RARETE.length; k++) {
      assert.ok(SEUILS_RARETE[k]! < SEUILS_RARETE[k - 1]!, `seuil ${k} non décroissant`);
    }
    const vus = new Set<string>();
    for (let p = 0; p <= 100; p++) vus.add(rareteDeProximite(p));
    assert.equal(vus.size, NOMS_RARETE.length);
    const n = effectifsRarete();
    assert.deepEqual(n, [46573, 34097, 13056, 4495, 1063, 421, 295]);
    for (let k = 1; k < n.length; k++) {
      assert.ok(n[k]! < n[k - 1]!, `${NOMS_RARETE[k]} n'est pas plus rare que ${NOMS_RARETE[k - 1]}`);
    }
  });

  it("le plancher géométrique : rien sous 78, l'ancien errant (< 60) est vide", () => {
    let min = 100;
    let max = 0;
    let sous60 = 0;
    let entre60et77 = 0;
    for (const l of echantillon()) {
      if (l.proximite < min) min = l.proximite;
      if (l.proximite > max) max = l.proximite;
      if (l.proximite < 60) sous60 += 1;
      else if (l.proximite <= RAYON_COUVERTURE) entre60et77 += 1;
    }
    assert.equal(min, PROXIMITE_PLANCHER);
    assert.equal(max, 100);
    // Les deux paliers d'objets-lexique.ts qu'aucun mot ne peut atteindre :
    // le rayon de couverture des cent formes vaut 77,06 centièmes.
    assert.equal(sous60, 0, "un mot sous 60 : le rayon de couverture serait faux");
    assert.equal(entre60et77, 0, "un mot sous 77 : le rayon de couverture serait faux");
  });

  it("errant (78–83) est peuplé : c'est la bande la plus creuse, pas un trou", () => {
    const n = effectifsRarete();
    const errant = n[NOMS_RARETE.length - 1]!;
    assert.equal(errant, 295);
    assert.equal(Math.round(N / errant), 339);
    // Il n'est donc PAS inatteignable : ce qui l'est, c'est le domaine sous 78.
    assert.ok(errant > 0, "errant vide : l'échelle promettrait un palier impossible");
    for (const l of echantillon()) {
      if (rareteDeProximite(l.proximite) !== "errant") continue;
      assert.ok(l.proximite >= PROXIMITE_PLANCHER && l.proximite <= 83, `errant à ${l.proximite}`);
    }
  });

  it("tier et rareté sont orthogonaux : |r| reste faible", () => {
    // Corrélation en flottant : c'est une mesure de test, pas un chemin rejoué.
    const e = echantillon();
    let sx = 0;
    let sy = 0;
    let sxx = 0;
    let syy = 0;
    let sxy = 0;
    for (const l of e) {
      sx += l.tier;
      sy += l.proximite;
      sxx += l.tier * l.tier;
      syy += l.proximite * l.proximite;
      sxy += l.tier * l.proximite;
    }
    const n = e.length;
    const r = (n * sxy - sx * sy) / Math.sqrt((n * sxx - sx * sx) * (n * syy - sy * sy));
    assert.ok(Math.abs(r) < 0.25, `r(tier, proximité) = ${r.toFixed(4)}`);
    assert.ok(r < 0, `r attendu négatif, mesuré ${r.toFixed(4)}`);
    // Les deux lectures se croisent : un T12 peut être pur, un T1 errant.
    const couples = new Set(e.map((l) => `${l.tier}:${rareteDeProximite(l.proximite)}`));
    assert.ok(couples.size >= 30, `${couples.size} couples (tier, palier) seulement`);
  });

  it("rien ne mute : deux lectures rendent la même chose et l'objet est intact", () => {
    const o = objetTire(7);
    const avant = JSON.stringify(o);
    const a = { extremite: extremite(o), tier: tierDe(o), ...rareteDe(o) };
    const b = { extremite: extremite(o), tier: tierDe(o), ...rareteDe(o) };
    assert.deepEqual(a, b);
    assert.equal(JSON.stringify(o), avant);
    // Un ObjetPorte (mot seul) se lit sans conversion.
    assert.deepEqual(rareteDe({ mot: o.mot }), rareteDe(o));
  });

  it("aucun flottant : extrémité, proximité et dénominateurs sont des entiers", () => {
    for (const l of echantillon().slice(0, 5000)) {
      assert.ok(Number.isInteger(l.proximite));
      assert.ok(l.proximite >= 0 && l.proximite <= 100);
    }
    for (let i = 0; i < 5000; i++) {
      const e = extremite(objetTire(i));
      assert.ok(Number.isInteger(e) && e >= E3_MIN && e <= E3_MAX);
    }
    for (let t = 1; t <= TIERS; t++) assert.ok(Number.isInteger(frequenceTheorique(t).sur));
  });

  it("doit échouer : une répartition d'axes hors budget, négative ou fractionnaire", () => {
    assert.throws(() => extremiteDeCombat(combat(60, 0, 0, 0)), {
      name: "RejetTier",
      message: new RegExp(`somme des axes 60 au lieu de ${COMBAT_BUDGET}`),
    });
    assert.throws(() => extremiteDeCombat(combat(65, 0, 0, 0)), {
      name: "RejetTier",
      message: /somme des axes 65 au lieu de 64/,
    });
    assert.throws(() => extremiteDeCombat(combat(-1, 65, 0, 0)), {
      name: "RejetTier",
      message: /axe -1 au lieu d'un entier de 0 ou plus/,
    });
    assert.throws(() => extremiteDeCombat(combat(16.5, 15.5, 16, 16)), {
      name: "RejetTier",
      message: /axe 16.5 au lieu d'un entier/,
    });
  });

  it("doit échouer : un tier, une extrémité ou une proximité hors domaine", () => {
    for (const t of [0, 13, 1.5, -1]) {
      assert.throws(() => frequenceTheorique(t), { name: "RejetTier" }, `tier ${t} accepté`);
      assert.throws(() => nomTier(t), { name: "RejetTier" }, `nomTier ${t} accepté`);
    }
    assert.throws(() => tierDeExtremite(-1), {
      name: "RejetTier",
      message: /extrémité -1 au lieu d'un entier de 0 à 3072/,
    });
    assert.throws(() => tierDeExtremite(E3_MAX + 1), {
      name: "RejetTier",
      message: /extrémité 3073 au lieu/,
    });
    assert.throws(() => tierDeExtremite(12.5), {
      name: "RejetTier",
      message: /extrémité 12.5 au lieu d'un entier/,
    });
    assert.throws(() => rareteDeProximite(101), {
      name: "RejetTier",
      message: /proximité 101 au lieu d'un entier de 0 à 100/,
    });
    assert.throws(() => rareteDeProximite(-1), { name: "RejetTier" });
    assert.throws(() => rareteDeProximite(94.5), {
      name: "RejetTier",
      message: /proximité 94.5 au lieu d'un entier/,
    });
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { H0, T, ageOf } from "../eidos/eonis.ts";
import { SIGNATURES } from "../eidos/signatures.ts";
import { pages } from "../navigation.ts";
import {
  AMPLITUDE_DANSE,
  FRACTIONS_ORBITES,
  INCLINAISON_MAX,
  ORBITE_MEDIANE,
  PAGE_DE_MUSE,
  POINTS_LIMACON,
  angleInitial,
  astreSous,
  inclinaison,
  limacon,
  modulationDanse,
  periodeOrbite,
  phaseEpoque,
  scene,
  type Astre,
  type Vue,
} from "./orbites.ts";

const VUE: Vue = { largeur: 1200, hauteur: 800 };
const DEMI = 400;
const H = 12345;
const TAU = 2 * Math.PI;
const COINS = [
  { x: 1, y: 1 },
  { x: -1, y: 1 },
  { x: 1, y: -1 },
  { x: -1, y: -1 },
];

function proche(a: number, b: number, eps = 1e-9, quoi = "") {
  assert.ok(Math.abs(a - b) <= eps, `${quoi} ${a} ≠ ${b}`);
}

describe("orbites — le fond de l'accueil lit Eidos", () => {
  it("le limaçon aux quatre points cardinaux : 3a/2, a, a/2, a", () => {
    for (const a of [40, 30, 20, 10]) {
      proche(limacon(a, 0), (3 * a) / 2, 1e-12, `a=${a} θ=0`);
      proche(limacon(a, Math.PI / 2), a, 1e-12, `a=${a} θ=π/2`);
      proche(limacon(a, Math.PI), a / 2, 1e-12, `a=${a} θ=π`);
      proche(limacon(a, (3 * Math.PI) / 2), a, 1e-12, `a=${a} θ=3π/2`);
    }
  });

  it("phaseEpoque : 0 à h₀ et à h₀ + T, π/2 à h₀ + T/4, toujours dans [0, 2π[", () => {
    assert.equal(phaseEpoque(H0), 0);
    assert.equal(phaseEpoque(H0 + T), 0);
    assert.equal(phaseEpoque(H0 + T / 4), Math.PI / 2);
    assert.equal(phaseEpoque(H0 + T / 2), Math.PI);
    // Sous h₀, le modulo en entiers reste positif : la hauteur 0 est à 516 blocs de h₀.
    assert.equal(phaseEpoque(0), TAU * (((0 - H0 + T) % T) / T));
    for (const h of [0, 1, H0 - 1, H0 + T - 1, 2_096_639]) {
      const p = phaseEpoque(h);
      assert.ok(p >= 0 && p < TAU, `hauteur ${h} → ${p}`);
    }
    let prec = -1;
    for (let h = H0; h < H0 + T; h++) {
      const p = phaseEpoque(h);
      assert.ok(p > prec, `croissante à ${h}`);
      prec = p;
    }
    assert.equal(phaseEpoque(H0 + 5.9), phaseEpoque(H0 + 5));
    assert.equal(phaseEpoque(Number.NaN), 0);
    assert.equal(phaseEpoque(Number.POSITIVE_INFINITY), 0);
    // Le modulo se fait en entiers : même au-delà de 2⁵³, où h − h₀ n'est plus
    // exact en flottant, la phase est celle de l'arithmétique entière (BigInt).
    const entier = (h: number) =>
      Number((((BigInt(h) - BigInt(H0)) % BigInt(T)) + BigInt(T)) % BigInt(T));
    for (const h of [-1, -T, -H0 - 1, 2 ** 53, 2 ** 60, -(2 ** 60), 1e300, -1e300, 2_096_640]) {
      assert.equal(phaseEpoque(h), TAU * (entier(h) / T), `hauteur ${h}`);
    }
  });

  it("inclinaison : nulle sans pointeur, bornée à 3° aux quatre coins, dirigée vers le pointeur", () => {
    assert.deepEqual(inclinaison(null), { tx: 0, ty: 0 });
    proche(INCLINAISON_MAX, 0.05236, 1e-5, "3°");
    for (const c of COINS) {
      const { tx, ty } = inclinaison(c);
      proche(Math.abs(tx), INCLINAISON_MAX, 1e-15, `tx ${c.x}`);
      proche(Math.abs(ty), INCLINAISON_MAX, 1e-15, `ty ${c.y}`);
      assert.equal(Math.sign(tx), c.x);
      assert.equal(Math.sign(ty), c.y);
    }
    // Hors de [−1, 1] on borne ; un demi-pointeur incline de moitié.
    assert.deepEqual(inclinaison({ x: 5, y: -7 }), { tx: INCLINAISON_MAX, ty: -INCLINAISON_MAX });
    assert.deepEqual(inclinaison({ x: 0.5, y: 0 }), { tx: INCLINAISON_MAX / 2, ty: 0 });
    assert.deepEqual(inclinaison({ x: Number.NaN, y: 0 }), { tx: 0, ty: 0 });
  });

  it("mouvement réduit : image fixe, comme t = 0 sans pointeur, jamais inclinée", () => {
    const fixe = scene(0, VUE, H, null, true);
    assert.deepEqual(scene(37, VUE, H, { x: 1, y: 1 }, true), fixe);
    assert.deepEqual(scene(0, VUE, H, null, false), fixe);
    assert.deepEqual(fixe.centre, { x: 600, y: 400 });
    for (const a of fixe.astres) proche(a.angle, angleInitial(a.rang), 1e-12, a.id);

    // Sans réduction, le temps meut les astres et le pointeur fait glisser le plan vers lui.
    const mu = scene(37, VUE, H, null, false);
    assert.deepEqual(mu.centre, fixe.centre);
    assert.notDeepEqual(mu.astres, fixe.astres);
    const incline = scene(37, VUE, H, { x: 1, y: 1 }, false);
    proche(incline.centre.x, 600 + Math.sin(INCLINAISON_MAX) * DEMI, 1e-9, "glissement x");
    proche(incline.centre.y, 400 + Math.sin(INCLINAISON_MAX) * DEMI, 1e-9, "glissement y");
    const gauche = scene(37, VUE, H, { x: -1, y: 0 }, false);
    assert.ok(gauche.centre.x < 600 && gauche.centre.y === 400);
  });

  it("scene est pure : aucune trace du pointeur, rien de NaN sur une vue vide ou illisible", () => {
    // Le pointeur traverse scene() : ni gardé (l'appel suivant sans lui rend la même scène), ni touché.
    const sans = scene(37, VUE, H, null, false);
    const p = { x: 0.7, y: -0.2 };
    scene(37, VUE, H, p, false);
    assert.deepEqual(p, { x: 0.7, y: -0.2 });
    assert.deepEqual(scene(37, VUE, H, null, false), sans);
    assert.deepEqual(scene(37, VUE, H, p, false), scene(37, VUE, H, { ...p }, false));

    // Vue vide, illisible ou négative : tout au centre, aucune coordonnée NaN, astreSous répond.
    const vues: Vue[] = [
      { largeur: 0, hauteur: 0 },
      { largeur: Number.NaN, hauteur: 800 },
      { largeur: 1200, hauteur: Number.NEGATIVE_INFINITY },
      { largeur: -5, hauteur: 800 },
    ];
    for (const vue of vues) {
      const s = scene(37, vue, H, { x: 1, y: 1 }, false);
      const nombres = [
        s.centre.x,
        s.centre.y,
        s.reseau.x,
        s.reseau.y,
        s.reseau.phase,
        ...s.orbites.map((o) => o.rayon),
        ...s.limacon.flatMap((q) => [q.x, q.y]),
        ...s.astres.flatMap((a) => [a.x, a.y, a.rayonOrbite, a.angle]),
      ];
      assert.ok(nombres.every(Number.isFinite), `vue ${JSON.stringify(vue)}`);
      for (const a of s.astres) {
        assert.ok(
          a.rayonOrbite === 0 && a.x === s.centre.x && a.y === s.centre.y,
          `${a.id} au centre`,
        );
      }
    }
    const vide = scene(0, vues[0]!, H, null, false);
    assert.deepEqual(vide.centre, { x: 0, y: 0 });
    assert.equal(astreSous(vide.astres, 0, 0)?.id, "terre");
  });

  it("révolution : période PERIODE_DANSE_S × (2 + rang), croissante, un tour ramène l'astre à son angle initial", () => {
    proche(periodeOrbite(0), 22.6, 1e-9, "Thalie");
    proche(periodeOrbite(8), 113, 1e-9, "Uranie");
    for (let rang = 1; rang < 9; rang++) {
      assert.ok(
        periodeOrbite(rang) > periodeOrbite(rang - 1),
        `rang ${rang} plus lent que ${rang - 1}`,
      );
    }
    for (let rang = 0; rang < 9; rang++) {
      const P = periodeOrbite(rang);
      const unTour = scene(P, VUE, H, null, false).astres[rang]!;
      proche(unTour.angle, angleInitial(rang), 1e-9, `rang ${rang} après un tour`);
      const miTour = scene(P / 2, VUE, H, null, false).astres[rang]!;
      proche(miTour.angle, (angleInitial(rang) + Math.PI) % TAU, 1e-9, `rang ${rang} à mi-tour`);
      // Le sens est trigonométrique tel qu'on le voit : au quart de tour de Thalie, elle est en haut.
      if (rang === 0) {
        const quart = scene(P / 4, VUE, H, null, false).astres[0]!;
        proche(quart.angle, Math.PI / 2, 1e-9, "quart de tour");
        assert.ok(quart.y < 400 - 0.9 * quart.rayonOrbite, "Thalie en haut au quart de tour");
      }
    }
  });

  it("neuf astres, neuf rayons distincts croissants de Thalie à Uranie, tous dans la vue", () => {
    const s = scene(0, VUE, H, null, true);
    assert.equal(s.astres.length, 9);
    assert.equal(s.orbites.length, 9);
    assert.equal(s.astres[0]!.id, "terre");
    assert.equal(s.astres[0]!.muse, "Thalie");
    assert.equal(s.astres[0]!.astre, "⊕");
    assert.equal(s.astres[8]!.id, "uranie");
    assert.equal(s.astres[8]!.muse, "Uranie");
    assert.equal(s.astres[8]!.astre, "★");
    for (let rang = 0; rang < 9; rang++) {
      const a = s.astres[rang]!;
      assert.equal(a.rang, rang);
      assert.equal(a.id, SIGNATURES[8 - rang]!.id);
      assert.equal(a.rayonOrbite, FRACTIONS_ORBITES[rang]! * DEMI);
      assert.equal(s.orbites[rang]!.rayon, a.rayonOrbite);
      if (rang > 0) assert.ok(a.rayonOrbite > s.astres[rang - 1]!.rayonOrbite, `rang ${rang}`);
    }
    // À tout instant, sous tout pointeur : dans la vue, et jamais loin de son orbite.
    for (const t of [0, 3, 7.7, 100, 1234.5]) {
      for (const p of [null, ...COINS]) {
        const sc = scene(t, VUE, H, p, false);
        for (const a of sc.astres) {
          assert.ok(
            a.x >= 0 && a.x <= VUE.largeur && a.y >= 0 && a.y <= VUE.hauteur,
            `${a.id} t=${t}`,
          );
          assert.ok(a.angle >= 0 && a.angle < TAU, `${a.id} angle`);
          const d = Math.hypot(a.x - sc.centre.x, a.y - sc.centre.y);
          const tol = AMPLITUDE_DANSE * DEMI + 0.002 * a.rayonOrbite;
          assert.ok(
            Math.abs(d - a.rayonOrbite) <= tol,
            `${a.id} t=${t} à ${d} de son orbite ${a.rayonOrbite}`,
          );
        }
        for (const q of sc.limacon) {
          assert.ok(q.x >= 0 && q.x <= VUE.largeur && q.y >= 0 && q.y <= VUE.hauteur, "limaçon");
        }
      }
    }
  });

  it("le limaçon porte l'astre du réseau à la phase de l'époque — une lecture", () => {
    const s = scene(0, VUE, H, null, true);
    const rMed = s.orbites[ORBITE_MEDIANE]!.rayon;
    assert.ok(POINTS_LIMACON >= 96);
    assert.equal(s.limacon.length, POINTS_LIMACON);
    // θ = 0 à droite (3/2 de l'orbite médiane), π/2 en haut (1), π à gauche (1/2).
    assert.deepEqual(s.limacon[0], { x: 600 + 1.5 * rMed, y: 400 });
    proche(s.limacon[POINTS_LIMACON / 4]!.x, 600, 1e-9);
    proche(s.limacon[POINTS_LIMACON / 4]!.y, 400 - rMed, 1e-9);
    proche(s.limacon[POINTS_LIMACON / 2]!.x, 600 - 0.5 * rMed, 1e-9);
    proche(s.limacon[POINTS_LIMACON / 2]!.y, 400, 1e-9);

    assert.equal(s.reseau.phase, phaseEpoque(H));
    const a = ageOf(H)!.a;
    const d = Math.hypot(s.reseau.x - 600, s.reseau.y - 400);
    proche(d, (limacon(a, s.reseau.phase) / a) * rMed, 1e-9, "réseau sur le limaçon");
    const debut = scene(0, VUE, H0, null, true);
    assert.deepEqual(debut.reseau, { x: 600 + 1.5 * rMed, y: 400, phase: 0 });
    const creux = scene(0, VUE, H0 + T / 2, null, true);
    proche(creux.reseau.x, 600 - 0.5 * rMed, 1e-9, "creux de l'époque");

    // En unités de a : même figure aux quatre âges (limite assumée), a change seulement d'unité.
    assert.notEqual(ageOf(0)!.a, ageOf(2_000_000)!.a);
    assert.deepEqual(
      scene(0, VUE, 2_000_000, null, true).limacon,
      scene(0, VUE, 0, null, true).limacon,
    );

    // Après le dernier bloc (ageOf = null) a vaut celui de Kali : même figure, phase lue quand même ;
    // une hauteur illisible se lit comme h₀ ; une fractionnaire est tronquée.
    assert.equal(ageOf(2_096_640), null);
    const apres = scene(0, VUE, 2_096_640, null, true);
    assert.deepEqual(apres.limacon, debut.limacon);
    assert.equal(apres.reseau.phase, phaseEpoque(2_096_640));
    assert.deepEqual(scene(0, VUE, Number.NaN, null, true), debut);
    assert.deepEqual(scene(0, VUE, Number.NEGATIVE_INFINITY, null, true), debut);
    assert.deepEqual(scene(0, VUE, H0 + 0.75, null, true), debut);
  });

  it("chaque muse danse : identité à phase 0, portée bornée, neuf figures distinctes", () => {
    for (let fam = 0; fam < 9; fam++) {
      assert.deepEqual(modulationDanse(fam, 0), { x: 0, y: 0 }, `famille ${fam}`);
      let portee = 0;
      for (let i = 0; i < 1000; i++) {
        const m = modulationDanse(fam, (TAU * i) / 1000);
        portee = Math.max(portee, Math.hypot(m.x, m.y));
      }
      assert.ok(portee > 0.99 && portee < 1.01, `famille ${fam} : portée ${portee}`);
    }
    const vus: { x: number; y: number }[] = [];
    for (let fam = 0; fam < 9; fam++) {
      const m = modulationDanse(fam, 1);
      assert.ok(Math.hypot(m.x, m.y) > 1e-3, `famille ${fam} immobile`);
      for (const v of vus)
        assert.ok(Math.hypot(m.x - v.x, m.y - v.y) > 1e-3, `famille ${fam} imite une autre`);
      vus.push(m);
    }
    const s0 = scene(0, VUE, H, null, false);
    const s3 = scene(3, VUE, H, null, false);
    for (let i = 0; i < 9; i++) {
      const d = Math.hypot(s3.astres[i]!.x - s0.astres[i]!.x, s3.astres[i]!.y - s0.astres[i]!.y);
      assert.ok(d > 1, `${s0.astres[i]!.id} n'a pas bougé en trois secondes`);
    }
  });

  it("astreSous : l'astre à moins de 18 px, null au-delà, le plus proche à égalité de portée", () => {
    const { astres } = scene(0, VUE, H, null, true);
    const a = astres[3]!;
    assert.equal(astreSous(astres, a.x + 17, a.y)?.id, a.id);
    assert.equal(astreSous(astres, a.x, a.y - 18)?.id, a.id);
    assert.equal(astreSous(astres, a.x + 19, a.y), null);
    assert.equal(astreSous(astres, a.x + 25, a.y, 30)?.id, a.id);
    assert.equal(astreSous(astres, -50, -50), null);
    assert.equal(astreSous([], a.x, a.y), null);
    const deux: Astre[] = [
      { ...a, id: "lune", x: 100, y: 100 },
      { ...a, id: "mars", x: 110, y: 100 },
    ];
    assert.equal(astreSous(deux, 107, 100)?.id, "mars");
    assert.equal(astreSous(deux, 104, 100)?.id, "lune");
  });

  it("PAGE_DE_MUSE : neuf chemins distincts, tous des pages de navigation.ts", () => {
    const ids = Object.keys(PAGE_DE_MUSE).sort();
    assert.deepEqual(ids, SIGNATURES.map((s) => s.id).sort());
    const chemins = Object.values(PAGE_DE_MUSE);
    assert.equal(chemins.length, 9);
    assert.equal(new Set(chemins).size, 9);
    const connus = new Set(pages().map((p) => p.to));
    for (const c of chemins) assert.ok(connus.has(c), c);
    assert.equal(PAGE_DE_MUSE.terre, "/tour");
    assert.equal(PAGE_DE_MUSE.uranie, "/temoin");
    assert.equal(PAGE_DE_MUSE.mars, "/");
  });
});

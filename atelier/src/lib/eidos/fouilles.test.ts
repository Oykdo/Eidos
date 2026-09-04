import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { commencerDansCoffre } from "./ascension.ts";
import {
  BECHES_PAR_ETAGE,
  aUneTrouvaille,
  bechesRestantes,
  caseOccupant,
  fouillerCaseDansCoffre,
  fouillesFaites,
  spawnIci,
  trouvailleDe,
  trouvaillesDe,
} from "./fouilles.ts";
import { normaliserTour, tourDe } from "./jauge.ts";
import { DALLE_N, ETAGES, dalleDe } from "./tour.ts";
import type { Coffre } from "./types.ts";
import { coffreAtelier, coffreNeuf } from "./wallet.ts";

describe("fouilles — la dalle se creuse, case par case", () => {
  it("les trouvailles sont fixes, sur des cases pleines, une sur huit environ", () => {
    let pleines = 0;
    let trouvailles = 0;
    let sans = 0;
    let max = 0;
    for (let e = 0; e < ETAGES; e++) {
      const d = dalleDe(e);
      const tr = trouvaillesDe(e);
      for (const { x, y } of tr) assert.ok(d[y]![x], `étage ${e} : (${x}, ${y}) est un trou`);
      pleines += d.flat().filter(Boolean).length;
      trouvailles += tr.length;
      if (tr.length === 0) sans += 1;
      max = Math.max(max, tr.length);
    }
    const part = trouvailles / pleines;
    assert.ok(part > 0.09 && part < 0.16, `part des cases pleines : ${part.toFixed(3)}`);
    assert.equal(sans, 0, `${sans} étage(s) sans trouvaille`);
    assert.ok(max <= 12, `au plus douze par étage : ${max}`);
    const moyenne = trouvailles / ETAGES;
    assert.ok(moyenne > 4 && moyenne < 6, `cinq en moyenne : ${moyenne.toFixed(2)}`);
    assert.deepEqual(trouvaillesDe(7), trouvaillesDe(7));
    console.log(
      `# fouilles : ${trouvailles} trouvailles sur ${pleines} cases pleines, ${sans} étage(s) sans`,
    );
  });

  it("trois coups de bêche par étage et par coffre ; une case ne se creuse qu'une fois", () => {
    let c = coffreAtelier("vide");
    const e = 5;
    const pleines: [number, number][] = [];
    const d = dalleDe(e);
    for (let y = 0; y < DALLE_N && pleines.length < 4; y++)
      for (let x = 0; x < DALLE_N && pleines.length < 4; x++) if (d[y]![x]) pleines.push([x, y]);
    const trou = d.flatMap((row, y) => row.map((b, x) => (b ? null : [x, y]))).find((v) => v) as [
      number,
      number,
    ];
    assert.equal((fouillerCaseDansCoffre(c, e, trou[0], trou[1]) as { code: string }).code, "hors");
    assert.equal((fouillerCaseDansCoffre(c, e, 9, 0) as { code: string }).code, "hors");
    for (let i = 0; i < BECHES_PAR_ETAGE; i++) {
      const r = fouillerCaseDansCoffre(c, e, pleines[i]![0], pleines[i]![1]);
      assert.ok(r.ok);
      assert.equal(r.restantes, BECHES_PAR_ETAGE - 1 - i);
      c = r.coffre;
    }
    assert.equal(bechesRestantes(tourDe(c), e), 0);
    assert.equal(fouillesFaites(tourDe(c), e).length, 3);
    assert.equal(
      (fouillerCaseDansCoffre(c, e, pleines[0]![0], pleines[0]![1]) as { code: string }).code,
      "dejaCase",
    );
    assert.equal(
      (fouillerCaseDansCoffre(c, e, pleines[3]![0], pleines[3]![1]) as { code: string }).code,
      "epuise",
    );
    assert.equal(
      bechesRestantes(tourDe(c), e + 1),
      BECHES_PAR_ETAGE,
      "un autre étage a ses trois coups",
    );
    const relu = normaliserTour({
      fouilles: [
        [e, 0, 0],
        [e, 0, 1],
        [e, 0, 1],
        [e, 0, 2],
        [e, 0, 3],
        [e + 1, 4, 4],
        [999, 0, 0],
      ],
    });
    assert.deepEqual(
      relu.fouilles,
      [
        [e, 0, 0],
        [e, 0, 1],
        [e, 0, 2],
        [e + 1, 4, 4],
      ],
      "la relecture tient trois coups par étage, sans doublon ni étage hors Tour",
    );
  });

  it("la trouvaille entre au coffre là où il y en a une, et nulle part ailleurs", () => {
    const c = coffreAtelier("vide");
    const e = 3;
    const oui = trouvaillesDe(e)[0]!;
    const r = fouillerCaseDansCoffre(c, e, oui.x, oui.y);
    assert.ok(r.ok && r.trouvaille !== null);
    assert.equal(r.coffre.objets!.length, (c.objets?.length ?? 0) + 1);
    assert.ok(["trouve", "pierre"].includes(r.trouvaille!.genre));
    const d = dalleDe(e);
    let non: [number, number] | null = null;
    for (let y = 0; y < DALLE_N && !non; y++)
      for (let x = 0; x < DALLE_N && !non; x++)
        if (d[y]![x] && !aUneTrouvaille(e, x, y)) non = [x, y];
    const r2 = fouillerCaseDansCoffre(c, e, non![0], non![1]);
    assert.ok(r2.ok && r2.trouvaille === null);
    assert.equal(r2.coffre.objets?.length ?? 0, c.objets?.length ?? 0);
    assert.equal(fouillesFaites(tourDe(r2.coffre), e).length, 1, "le coup est noté même à vide");
  });

  it("les cases sont à tous, le contenu est à chacun", () => {
    const e = 11;
    const { x, y } = trouvaillesDe(e)[0]!;
    const a = trouvailleDe(e, x, y, coffreAtelier("vide"));
    const b = trouvailleDe(e, x, y, coffreAtelier("vide"));
    const autre = trouvailleDe(e, x, y, coffreNeuf("vide"));
    assert.deepEqual(a, b);
    assert.notEqual(a.mot, autre.mot);
  });

  it("pendant une ascension, la case d'arrivée donne, même sur un trou", () => {
    const c = commencerDansCoffre(coffreAtelier("vide"), null);
    const s = spawnIci(c, 0);
    assert.ok(s !== null);
    const r = fouillerCaseDansCoffre(c, 0, s!.x, s!.y);
    assert.ok(r.ok && r.trouvaille !== null, "la case d'arrivée donne");
    assert.equal(r.restantes, BECHES_PAR_ETAGE - 1, "le coup s'y compte comme les autres");
    // le pendule ne regarde pas la dalle : une arrivée sur deux tombe sur un trou
    let trou: Coffre | null = null;
    for (let i = 0; i < 64 && trou === null; i++) {
      const n = commencerDansCoffre(coffreNeuf("vide"), null);
      const sp = spawnIci(n, 0)!;
      if (!dalleDe(0)[sp.y]![sp.x]) trou = n;
    }
    assert.ok(trou !== null, "aucune arrivée sur un trou en 64 coffres");
    const sp = spawnIci(trou!, 0)!;
    assert.equal(
      (fouillerCaseDansCoffre(coffreAtelier("vide"), 0, sp.x, sp.y) as { code: string }).code,
      "hors",
      "hors ascension, le trou reste un trou",
    );
    const rt = fouillerCaseDansCoffre(trou!, 0, sp.x, sp.y);
    assert.ok(rt.ok && rt.trouvaille !== null, "la case d'arrivée donne même sur un trou");
    assert.equal(
      (fouillerCaseDansCoffre(rt.coffre, 0, sp.x, sp.y) as { code: string }).code,
      "dejaCase",
      "une fois, comme toute case",
    );
    assert.equal(
      spawnIci(coffreAtelier("vide"), 0),
      null,
      "hors ascension : pas de case d'arrivée",
    );
    assert.equal(spawnIci(c, 1), null, "un autre étage : pas la case d'arrivée");
  });

  it("les occupants ont chacun leur case, dans la dalle", () => {
    const cases = [0, 1, 2].map(caseOccupant);
    for (const k of cases) assert.ok(k.x >= 0 && k.x < DALLE_N && k.y >= 0 && k.y < DALLE_N);
    assert.equal(new Set(cases.map((k) => `${k.x},${k.y}`)).size, 3);
  });
});

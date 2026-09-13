/**
 * La partie : ce qui entre en bataille, la main du joueur, la lecture.
 *
 * Aucun tirage : les coffres viennent d'une graine nominale, les Indéchiffrés
 * des occupants de l'étage. Chaque refus a son contrôle qui le viole.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { captureDe } from "../capsules.ts";
import { caseOccupant } from "../fouilles.ts";
import { dalleDe, occupantsDe } from "../tour.ts";
import type { Coffre } from "../types.ts";
import { FEUILLES } from "../veillee.ts";
import { coffreNeuf } from "../wallet.ts";
import { rejouer, traceBataille } from "./bataille.ts";
import { distance, memeCase, voisines } from "./grille.ts";
import {
  FEUILLES_LIBRES,
  JOURNAL_VISIBLE,
  MAX_COFFRE,
  RANGEE_COFFRE,
  acteDeCase,
  armeeDuCoffre,
  caseLibre,
  choisir,
  coffreAJoue,
  combattants,
  indechiffresDe,
  jouerActe,
  lire,
  ouvrirPartie,
  passerLaMain,
  posesDuCoffre,
  prochaineAJouer,
  type Partie,
} from "./partie.ts";
import { GRILLE_N, PA_PAR_TOUR, RejetTactique, type Case } from "./types.ts";

const GRAINE = "eidos-partie-test-v1";

/** Un coffre à trois objets pris à l'étage 40 (captures), un élixir et une capsule au milieu. */
function coffreDeTest(): Coffre {
  const c = coffreNeuf("vide", GRAINE);
  const occ = occupantsDe(40);
  const objets = [
    captureDe(occ[0]!, 40, 1),
    { ...captureDe(occ[0]!, 41, 1), genre: "elixir" as const },
    captureDe(occupantsDe(41)[0]!, 41, 1),
    { ...captureDe(occ[0]!, 42, 1), genre: "capsule" as const },
    captureDe(occupantsDe(42)[0]!, 42, 1),
    captureDe(occupantsDe(43)[0]!, 43, 1),
  ];
  return { ...c, objets };
}

/** Avance le coffre vers l'ennemi jusqu'à ce qu'une frappe soit permise, ou renonce. */
function jusquAuContact(p: Partie, bornes = 40): Partie {
  for (let i = 0; i < bornes; i++) {
    const l = lire(p);
    if (l.fin !== null) return p;
    if (l.actes.some((a) => a.geste === "frapper")) return p;
    if (l.aJoue || l.selection === null) {
      p = passerLaMain(p);
      continue;
    }
    const ennemis = l.unites.filter((u) => u.camp === "indechiffre" && u.vivante);
    const elue = l.unites.find((u) => u.id === l.selection)!;
    const pas = l.actes.filter((a) => a.geste === "deplacer");
    if (pas.length === 0) {
      p = jouerActe(p, { geste: "passer", unite: elue.id });
      continue;
    }
    const plusProche = (c: Case) => Math.min(...ennemis.map((e) => distance(c, e.pos)));
    let meilleur = pas[0]!;
    for (const a of pas) {
      if (
        a.geste === "deplacer" &&
        meilleur.geste === "deplacer" &&
        plusProche(a.vers) < plusProche(meilleur.vers)
      )
        meilleur = a;
    }
    if (meilleur.geste === "deplacer" && plusProche(meilleur.vers) >= plusProche(elue.pos)) {
      p = jouerActe(p, { geste: "passer", unite: elue.id });
      continue;
    }
    p = jouerActe(p, meilleur);
  }
  return p;
}

describe("partie : ce qui entre en bataille", () => {
  it("combattants : tout ce qui porte un mot, hors élixirs et capsules, indices du coffre gardés", () => {
    const c = coffreDeTest();
    const cs = combattants(c);
    assert.deepEqual(
      cs.map((x) => x.indice),
      [0, 2, 4, 5],
    );
    assert.equal(cs[1]!.objet, c.objets[2]);
    assert.deepEqual(combattants({ objets: [] }), []);
    assert.deepEqual(combattants({} as Pick<Coffre, "objets">), []);
  });

  it("caseLibre : la voulue si elle est libre, sinon la plus proche, y puis x à égalité", () => {
    const vide = Array.from({ length: GRILLE_N }, () => Array<boolean>(GRILLE_N).fill(false));
    assert.deepEqual(caseLibre(vide, [], { x: 4, y: 4 }), { x: 4, y: 4 });
    // (4,4) prise : à distance 1, (4,3) précède (3,4), (5,4), (4,5).
    assert.deepEqual(caseLibre(vide, [{ x: 4, y: 4 }], { x: 4, y: 4 }), { x: 4, y: 3 });
    const plein = vide.map((r) => r.map(() => true));
    plein[8]![0] = false;
    assert.deepEqual(caseLibre(plein, [], { x: 0, y: 0 }), { x: 0, y: 8 });
    assert.throws(() => caseLibre(plein, [{ x: 0, y: 8 }], { x: 0, y: 0 }), RejetTactique);
    assert.throws(() => caseLibre(vide, [], { x: 9, y: 0 }), RejetTactique);
  });

  it("posesDuCoffre : la rangée du bas, du centre vers les bords", () => {
    assert.deepEqual(posesDuCoffre(3), [
      { x: 4, y: RANGEE_COFFRE },
      { x: 3, y: RANGEE_COFFRE },
      { x: 5, y: RANGEE_COFFRE },
    ]);
    assert.deepEqual(
      posesDuCoffre(9).map((c) => c.x),
      [4, 3, 5, 2, 6, 1, 7, 0, 8],
    );
    assert.deepEqual(posesDuCoffre(0), []);
  });

  it("armeeDuCoffre : les objets choisis, dans l'ordre, sur des cases libres du bas", () => {
    const c = coffreDeTest();
    const etage = 7;
    const a = armeeDuCoffre(c, etage, [5, 0, 2]);
    assert.equal(a.length, 3);
    assert.deepEqual(
      a.map((u) => u.id),
      [0, 1, 2],
    );
    assert.equal(a[0]!.mot, c.objets[5]!.mot >>> 0);
    assert.equal(a[1]!.mot, c.objets[0]!.mot >>> 0);
    assert.ok(a.every((u) => u.camp === "coffre" && u.pa === PA_PAR_TOUR && u.tenue > 0));
    const dalle = dalleDe(etage);
    for (const u of a) assert.equal(dalle[u.pos.y]![u.pos.x], false, "jamais sur une case pleine");
    const cles = new Set(a.map((u) => `${u.pos.x},${u.pos.y}`));
    assert.equal(cles.size, 3, "trois cases distinctes");
    // Même appel, même armée : rien n'est tiré.
    assert.deepEqual(armeeDuCoffre(c, etage, [5, 0, 2]), a);
  });

  it("armeeDuCoffre : refuse vide, trop, doublon, élixir", () => {
    const c = coffreDeTest();
    assert.throws(() => armeeDuCoffre(c, 7, []), /0 unité/);
    assert.throws(() => armeeDuCoffre(c, 7, [0, 2, 4, 5]), new RegExp(`${MAX_COFFRE} au plus`));
    assert.throws(() => armeeDuCoffre(c, 7, [0, 0]), /deux fois/);
    assert.throws(() => armeeDuCoffre(c, 7, [1]), /combattant/);
    assert.throws(() => armeeDuCoffre(c, 7, [9]), /combattant/);
  });

  it("indechiffresDe : un par occupant restant, à sa case d'occupant ou la libre la plus proche", () => {
    const c = coffreDeTest();
    for (const etage of [0, 7, 40, 128, 254]) {
      const ind = indechiffresDe(c, etage);
      const occ = occupantsDe(etage);
      assert.equal(ind.length, occ.length);
      const dalle = dalleDe(etage);
      ind.forEach((u, k) => {
        assert.equal(u.camp, "indechiffre");
        assert.equal(u.id, k);
        assert.equal(dalle[u.pos.y]![u.pos.x], false);
        const voulue = caseOccupant(occ[k]!.k);
        if (!dalle[voulue.y]![voulue.x] && !ind.slice(0, k).some((v) => memeCase(v.pos, voulue)))
          assert.deepEqual(u.pos, voulue);
      });
      assert.equal(new Set(ind.map((u) => `${u.pos.x},${u.pos.y}`)).size, ind.length);
    }
    // Les cases réservées ne sont pas prises.
    const reservee = caseOccupant(0);
    const dalle = dalleDe(7);
    if (!dalle[reservee.y]![reservee.x]) {
      const ind = indechiffresDe(c, 7, [reservee]);
      assert.ok(ind.every((u) => !memeCase(u.pos, reservee)));
    }
  });

  it("indechiffresDe : un occupant pris ne se bat plus", () => {
    const c = coffreDeTest();
    const occ = occupantsDe(40);
    const pris: Coffre = {
      ...c,
      tour: { ...c.tour, captures: occ.map((o) => [40, o.k] as [number, number]) },
    };
    assert.equal(indechiffresDe(pris, 40).length, 0);
    assert.throws(() => ouvrirPartie(pris, 40, [0]), /sans occupant/);
  });
});

describe("partie : ouvrir, choisir, jouer, passer", () => {
  it("ouvrirPartie : coffre à la main, tour 1, arbre entier, télégraphie posée, première unité désignée", () => {
    const c = coffreDeTest();
    const p = ouvrirPartie(c, 7, [0, 2]);
    assert.equal(p.etage, 7);
    assert.equal(p.etat.phase, "coffre");
    assert.equal(p.etat.tour, 1);
    assert.equal(p.etat.feuilles, FEUILLES_LIBRES);
    assert.equal(FEUILLES_LIBRES, FEUILLES);
    assert.equal(p.etat.intentions.length, occupantsDe(7).length, "une intention par Indéchiffré");
    assert.equal(p.actes.length, 0);
    assert.equal(p.phases, 0);
    assert.equal(p.trace, traceBataille(p.etat));
    assert.notEqual(p.selection, null);
    const elue = p.etat.unites.find((u) => u.id === p.selection)!;
    assert.equal(elue.camp, "coffre");
    // Une ouverture n'a pas de passé : deux ouvertures, même trace.
    assert.equal(ouvrirPartie(c, 7, [0, 2]).trace, p.trace);
    // Feuilles à zéro : ouvert, mais on ne frappe plus.
    const sans = ouvrirPartie(c, 7, [0], 0);
    assert.equal(sans.etat.feuilles, 0);
    assert.ok(lire(sans).actes.every((a) => a.geste !== "frapper"));
  });

  it("choisir : une unité du coffre vivante, sinon aucune", () => {
    const p = ouvrirPartie(coffreDeTest(), 7, [0, 2]);
    assert.equal(choisir(p, 1).selection, 1);
    assert.equal(choisir(p, null).selection, null);
    const ennemi = p.etat.unites.find((u) => u.camp === "indechiffre")!;
    assert.equal(choisir(p, ennemi.id).selection, null);
    assert.equal(choisir(p, 99).selection, null);
  });

  it("jouerActe : un pas coûte un point d'action, s'enregistre, et la sélection suit les points d'action", () => {
    let p = ouvrirPartie(coffreDeTest(), 7, [0, 2]);
    const l = lire(p);
    const pas = l.actes.find((a) => a.geste === "deplacer");
    assert.ok(pas !== undefined, "au moins un pas possible à l'ouverture");
    const avant = p.etat.unites.find((u) => u.id === l.selection)!;
    p = jouerActe(p, pas);
    const apres = p.etat.unites.find((u) => u.id === avant.id)!;
    assert.ok(pas.geste === "deplacer" && memeCase(apres.pos, pas.vers));
    assert.equal(apres.pa, PA_PAR_TOUR - 1);
    assert.deepEqual(p.actes, [pas]);
    assert.equal(p.selection, avant.id, "un PA reste : la sélection ne bouge pas");
    assert.equal(p.trace, traceBataille(p.etat));
    // passer vide les PA : la sélection passe à la suivante qui en a.
    p = jouerActe(p, { geste: "passer", unite: avant.id });
    assert.notEqual(p.selection, avant.id);
    assert.equal(p.selection, prochaineAJouer(p.etat));
    // Le rejeu des actes du coffre redonne l'échiquier, à l'octet.
    const initial = ouvrirPartie(coffreDeTest(), 7, [0, 2]).etat;
    assert.equal(traceBataille(rejouer(initial, p.actes)), p.trace);
  });

  it("jouerActe : refus du moteur laissés tels quels, et refus hors phase", () => {
    let p = ouvrirPartie(coffreDeTest(), 7, [0]);
    assert.throws(
      () => jouerActe(p, { geste: "deplacer", unite: 0, vers: { x: 0, y: 0 } }),
      RejetTactique,
    );
    const ennemi = p.etat.unites.find((u) => u.camp === "indechiffre")!;
    assert.throws(() => jouerActe(p, { geste: "passer", unite: ennemi.id }), RejetTactique);
    p = { ...p, etat: { ...p.etat, phase: "indechiffre" } };
    assert.throws(
      () => jouerActe(p, { geste: "passer", unite: 0 }),
      /phase indechiffre au lieu de coffre/,
    );
    assert.throws(() => passerLaMain(p), /phase indechiffre au lieu de coffre/);
  });

  it("passerLaMain : les Indéchiffrés jouent d'un trait, la main revient, le tour avance, l'annonce se refait", () => {
    let p = ouvrirPartie(coffreDeTest(), 7, [0, 2]);
    for (const u of p.etat.unites.filter((u) => u.camp === "coffre"))
      p = jouerActe(p, { geste: "passer", unite: u.id });
    assert.ok(coffreAJoue(p.etat) && lire(p).aJoue);
    const avant = p;
    p = passerLaMain(p);
    if (p.etat.fin === null) {
      assert.equal(p.etat.phase, "coffre");
      assert.equal(p.etat.tour, 2);
      assert.equal(p.phases, 2);
      assert.equal(
        p.etat.intentions.length,
        p.etat.unites.filter((u) => u.camp === "indechiffre" && u.tenue > 0).length,
      );
      assert.ok(
        p.etat.unites.filter((u) => u.camp === "coffre").every((u) => u.pa === PA_PAR_TOUR),
      );
      assert.equal(p.selection, prochaineAJouer(p.etat));
    } else {
      assert.equal(p.phases, 1);
    }
    assert.equal(p.actes, avant.actes, "les actes des Indéchiffrés ne sont pas ceux du coffre");
    assert.equal(p.trace, traceBataille(p.etat));
    // Finie, une partie ne passe plus la main : le même objet ressort.
    const finie: Partie = {
      ...p,
      etat: { ...p.etat, fin: { issue: "epuise", tour: p.etat.tour } },
    };
    assert.equal(passerLaMain(finie), finie);
    assert.equal(prochaineAJouer(finie.etat), undefined);
  });

  it("une bataille se joue jusqu'au contact : frappe, feuille, journal, riposte lue d'avance", () => {
    let trouvee = false;
    for (const etage of [3, 7, 11, 19, 40, 77, 128, 200]) {
      let p = jusquAuContact(ouvrirPartie(coffreDeTest(), etage, [0, 2, 4]));
      const l = lire(p);
      const frappe = l.actes.find((a) => a.geste === "frapper");
      if (frappe === undefined || frappe.geste !== "frapper") continue;
      trouvee = true;
      const cibleLue = l.unites.find((u) => u.id === frappe.cible)!;
      assert.ok(cibleLue.coup !== null, "la lecture annonce le coup avant qu'il porte");
      const feuilles = p.etat.feuilles;
      p = jouerActe(p, frappe);
      assert.equal(p.etat.feuilles, feuilles - 1, "frapper signe : une feuille");
      const porte = p.etat.journal.find(
        (c) => c.attaquant === frappe.unite && c.cible === frappe.cible && !c.riposte,
      )!;
      assert.equal(porte.porte, cibleLue.coup.porte, "le coup porté est celui qui était lu");
      const riposte = p.etat.journal.find((c) => c.riposte && c.attaquant === frappe.cible);
      assert.equal(
        riposte === undefined ? null : riposte.porte,
        cibleLue.riposte === null ? null : cibleLue.riposte.porte,
      );
      assert.deepEqual(lire(p).journal, [...p.etat.journal].reverse().slice(0, JOURNAL_VISIBLE));
      break;
    }
    assert.ok(trouvee, "aucun étage de la liste ne mène au contact");
  });
});

describe("partie : la lecture", () => {
  it("cases : 9×9, pleines = dalle, coûts depuis l'élue, chemin, contrôle, menace", () => {
    const c = coffreDeTest();
    const p = ouvrirPartie(c, 7, [0, 2]);
    const l = lire(p);
    assert.equal(l.cases.length, GRILLE_N);
    const dalle = dalleDe(7);
    for (let y = 0; y < GRILLE_N; y++) {
      assert.equal(l.cases[y]!.length, GRILLE_N);
      for (let x = 0; x < GRILLE_N; x++) {
        const lc = l.cases[y]![x]!;
        assert.equal(lc.pleine, dalle[y]![x]);
        if (lc.pleine) assert.equal(lc.cout, null);
        assert.equal(lc.x, x);
        assert.equal(lc.y, y);
      }
    }
    const elue = l.unites.find((u) => u.elue)!;
    assert.equal(
      l.cases[elue.pos.y]![elue.pos.x]!.cout,
      null,
      "sa propre case ne coûte rien et n'est pas un pas",
    );
    const atteignables = l.cases.flat().filter((x) => x.cout !== null);
    assert.ok(atteignables.length > 0);
    assert.ok(atteignables.every((x) => x.cout! >= 1 && x.cout! <= elue.pas));
    assert.equal(
      atteignables.length,
      l.actes.filter((a) => a.geste === "deplacer").length,
      "une case atteignable = un acte deplacer",
    );
    // Contrôle : les orthogonales des Indéchiffrés vivants, et rien d'autre.
    const attendu = new Set<string>();
    for (const u of p.etat.unites.filter((u) => u.camp === "indechiffre" && u.tenue > 0))
      for (const v of voisines(u.pos)) attendu.add(`${v.x},${v.y}`);
    const lu = new Set(
      l.cases
        .flat()
        .filter((x) => x.controle)
        .map((x) => `${x.x},${x.y}`),
    );
    assert.deepEqual(lu, attendu);
    // Menace : l'union des menaces annoncées.
    const menace = new Set(p.etat.intentions.flatMap((i) => i.menace.map((m) => `${m.x},${m.y}`)));
    assert.deepEqual(
      new Set(
        l.cases
          .flat()
          .filter((x) => x.menace)
          .map((x) => `${x.x},${x.y}`),
      ),
      menace,
    );
    // Chemin : vers une case atteignable, la case d'arrivée en fait partie ; ailleurs, rien.
    const vers = atteignables[atteignables.length - 1]!;
    const avec = lire(p, { x: vers.x, y: vers.y });
    assert.equal(avec.cases[vers.y]![vers.x]!.chemin, true);
    assert.ok(avec.cases.flat().filter((x) => x.chemin).length >= 1);
    assert.equal(
      lire(p, { x: 99, y: 0 })
        .cases.flat()
        .some((x) => x.chemin),
      false,
    );
    assert.equal(
      lire({ ...p, selection: null })
        .cases.flat()
        .some((x) => x.cout !== null),
      false,
    );
  });

  it("unités : tenue, pas, portée, élue, et un coup lu seulement sur une cible à portée", () => {
    const p = ouvrirPartie(coffreDeTest(), 7, [0, 2]);
    const l = lire(p);
    assert.equal(l.unites.length, p.etat.unites.length);
    assert.equal(l.unites.filter((u) => u.elue).length, 1);
    for (const u of l.unites) {
      assert.equal(u.tenue <= u.tenueMax, true);
      assert.ok(u.pas >= 2 && u.pas <= 4 && u.portee >= 1 && u.portee <= 7);
      assert.equal(u.vivante, u.tenue > 0);
      if (u.camp === "coffre") assert.equal(u.coup, null, "on ne frappe pas les siens");
    }
    const elue = l.unites.find((u) => u.elue)!;
    for (const u of l.unites.filter((u) => u.camp === "indechiffre")) {
      const aPortee = distance(elue.pos, u.pos) <= elue.portee;
      assert.equal(u.coup !== null, aPortee);
      if (u.coup !== null) {
        assert.equal(u.coup.attaquant, elue.id);
        assert.equal(u.coup.cible, u.id);
        if (u.riposte !== null) assert.equal(u.riposte.riposte, true);
      } else assert.equal(u.riposte, null);
    }
    assert.equal(l.feuilles, p.etat.feuilles);
    assert.equal(l.tour, 1);
    assert.equal(l.phase, "coffre");
    assert.equal(l.fin, null);
  });

  it("acteDeCase : un pas sur une case atteignable, une frappe sur une cible, rien ailleurs", () => {
    const p = ouvrirPartie(coffreDeTest(), 7, [0, 2]);
    const l = lire(p);
    const libre = l.cases.flat().find((x) => x.cout !== null)!;
    assert.deepEqual(acteDeCase(l, libre), {
      geste: "deplacer",
      unite: l.selection!,
      vers: { x: libre.x, y: libre.y },
    });
    const pleine = l.cases.flat().find((x) => x.pleine)!;
    assert.equal(acteDeCase(l, pleine), null);
    const elue = l.unites.find((u) => u.elue)!;
    assert.equal(acteDeCase(l, elue.pos), null, "sa propre case");
    assert.equal(acteDeCase(l, { x: 9, y: 9 }), null);
    assert.equal(acteDeCase(lire({ ...p, selection: null }), libre), null);
    const cible = l.unites.find((u) => u.coup !== null);
    if (cible !== undefined)
      assert.deepEqual(acteDeCase(l, cible.pos), {
        geste: "frapper",
        unite: l.selection!,
        cible: cible.id,
      });
    // Hors de portée, un Indéchiffré n'est ni un pas ni une frappe.
    const loin = l.unites.find((u) => u.camp === "indechiffre" && u.coup === null);
    if (loin !== undefined) assert.equal(acteDeCase(l, loin.pos), null);
  });

  it("une partie entière tenue par la main du test finit ou s'épuise, jamais ne bloque", () => {
    let p = ouvrirPartie(coffreDeTest(), 19, [0, 2, 4]);
    for (let i = 0; i < 400 && p.etat.fin === null; i++) {
      const l = lire(p);
      if (l.aJoue || l.selection === null) {
        p = passerLaMain(p);
        continue;
      }
      const frappe = l.actes.find((a) => a.geste === "frapper");
      if (frappe !== undefined) {
        p = jouerActe(p, frappe);
        continue;
      }
      p = jusquAuContact(p, 4);
      if (
        lire(p).aJoue === false &&
        lire(p).selection !== null &&
        lire(p).actes.every((a) => a.geste !== "frapper")
      ) {
        const l2 = lire(p);
        if (l2.selection !== null) p = jouerActe(p, { geste: "passer", unite: l2.selection });
      }
    }
    assert.ok(p.etat.fin !== null || p.etat.tour > 1, "la partie avance");
    if (p.etat.fin !== null)
      assert.ok(["victoire", "defaite", "epuise"].includes(p.etat.fin.issue));
    assert.deepEqual(lire(p).actes, p.etat.fin !== null ? [] : lire(p).actes);
  });
});

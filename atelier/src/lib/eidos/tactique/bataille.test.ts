import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { combatDe } from "../combat.ts";
import { sha256d, utf8 } from "../hash.ts";
import { objetDepuisGraine } from "../objets.ts";
import { paireDe, qDeMot } from "../resonance.ts";
import { dalleDe, ETAGES } from "../tour.ts";
import {
  actesPossibles,
  finDePhase,
  jouer,
  ordreDePhase,
  ouvrirBataille,
  rejouer,
  resoudreCoup,
  riposteDe,
  traceBataille,
} from "./bataille.ts";
import {
  accessibles,
  casesDe,
  cible as cibleDe,
  cle,
  distance,
  memeCase,
  voisines,
} from "./grille.ts";
import {
  deplacer,
  MULT_TENUE,
  pas,
  portee,
  TENUE_BASE,
  tenueMax,
  vivante,
} from "./unite.ts";
import {
  CHARGE_PAR_CASE,
  COUP_BASE,
  COUP_MIN,
  DIV_ACCORD,
  DIV_ALLONGE,
  DIV_DOS,
  DIV_REPRISE,
  GRILLE_N,
  RejetTactique,
  type Acte,
  type Case,
  type Classe,
  type Combat,
  type EtatBataille,
  type Unite,
} from "./types.ts";

// ---------------------------------------------------------------------------
// Terrain — la dalle la plus dégagée des 255, pour que les scénarios tiennent
// ---------------------------------------------------------------------------

function nLibres(d: readonly (readonly boolean[])[]): number {
  let n = 0;
  for (const ligne of d) for (const plein of ligne) if (!plein) n += 1;
  return n;
}

const ETAGE = (() => {
  let choix = 0;
  let meilleur = -1;
  for (let e = 0; e < ETAGES; e++) {
    const k = nLibres(dalleDe(e));
    if (k > meilleur) {
      meilleur = k;
      choix = e;
    }
  }
  return choix;
})();

const DALLE = dalleDe(ETAGE);

function libre(c: Case): boolean {
  return c.x >= 0 && c.x < GRILLE_N && c.y >= 0 && c.y < GRILLE_N && !DALLE[c.y]![c.x]!;
}

/** Quatre cases libres alignées : le décor du dos et des portées. */
const RANG: readonly Case[] = (() => {
  for (let y = 0; y < GRILLE_N; y++)
    for (let x = 0; x + 3 < GRILLE_N; x++) {
      const suite = [0, 1, 2, 3].map((k) => ({ x: x + k, y }));
      if (suite.every(libre)) return suite;
    }
  for (let x = 0; x < GRILLE_N; x++)
    for (let y = 0; y + 3 < GRILLE_N; y++) {
      const suite = [0, 1, 2, 3].map((k) => ({ x, y: y + k }));
      if (suite.every(libre)) return suite;
    }
  throw new Error("aucune file de quatre cases libres");
})();

const TRIO = { ouest: RANG[0]!, centre: RANG[1]!, est: RANG[2]! };

/** Deux cases libres aussi éloignées que la dalle le permet. */
const LOIN = (() => {
  const cases: Case[] = [];
  for (let y = 0; y < GRILLE_N; y++)
    for (let x = 0; x < GRILLE_N; x++) if (libre({ x, y })) cases.push({ x, y });
  let a = cases[0]!;
  let b = cases[0]!;
  let d = -1;
  for (const p of cases)
    for (const q of cases) {
      const k = distance(p, q);
      if (k > d) {
        d = k;
        a = p;
        b = q;
      }
    }
  return { a, b, d };
})();

/** Deux cases libres voisines, à l'écart du rang : le manège des pas. */
const MANEGE = (() => {
  for (let y = 0; y < GRILLE_N; y++)
    for (let x = 0; x + 1 < GRILLE_N; x++) {
      const g = { x, y };
      const dr = { x: x + 1, y };
      if (libre(g) && libre(dr) && distance(g, TRIO.centre) > 3) return { g, dr };
    }
  throw new Error("aucun manège libre à l'écart");
})();

// ---------------------------------------------------------------------------
// Fabrique d'unités — le contrat est public, on le remplit à la main
// ---------------------------------------------------------------------------

function div(n: number, d: number): number {
  return Math.trunc(n / d);
}

const GRAINE = sha256d(utf8("eidos-tactique-essai"));
const MOTS: number[] = (() => {
  const out: number[] = [];
  let g = GRAINE;
  for (let k = 0; k < 48; k++) {
    out.push(objetDepuisGraine(g, "Satya").mot);
    g = sha256d(g);
  }
  return out;
})();

function polariteDeux(a: number, ca: Classe, b: number, cb: Classe): string {
  return paireDe({ q: qDeMot(a), classe: ca }, { q: qDeMot(b), classe: cb }, 0, 1).polarite;
}

/** Un couple de mots dont la polarité est celle qu'on veut, classes distinctes. */
function couple(voulue: string): { a: number; b: number } {
  for (const a of MOTS)
    for (const b of MOTS)
      if (polariteDeux(a, "arme", b, "defense") === voulue) return { a, b };
  throw new Error(`aucun couple ${voulue}`);
}

const CONSTRUCTIF = couple("constructif");
const NEUTRE = couple("neutre");

function axesDe(lame: number, ecu: number, eperon: number, arc: number): Combat {
  const table = { lame, ecu, eperon, arc } as const;
  let pointe: keyof typeof table = "lame";
  for (const axe of ["lame", "ecu", "eperon", "arc"] as const)
    if (table[axe] > table[pointe]) pointe = axe;
  return { lame, ecu, eperon, arc, somme: lame + ecu + eperon + arc, pointe };
}

type Brute = {
  pos: Case;
  elan?: number;
  lame?: number;
  ecu?: number;
  eperon?: number;
  arc?: number;
  mot?: number;
  classe?: Classe;
  tenue?: number;
};

/** `id` et `camp` sont réattribués par `ouvrirBataille` : ils ne comptent pas ici. */
function brute(b: Brute): Unite {
  const lame = b.lame ?? 16;
  const ecu = b.ecu ?? 16;
  const eperon = b.eperon ?? 16;
  const arc = b.arc ?? 64 - lame - ecu - eperon;
  return {
    id: 0,
    camp: "coffre",
    elan: b.elan ?? 0,
    mot: b.mot ?? MOTS[0]!,
    archetype: "mars",
    age: "Satya",
    classe: b.classe ?? "arme",
    axes: axesDe(lame, ecu, eperon, arc),
    pos: b.pos,
    precedente: null,
    tenue: b.tenue ?? TENUE_BASE + MULT_TENUE * ecu,
    aFrappe: false,
    aDeplace: false,
  };
}

function poser(
  coffre: readonly Unite[],
  indechiffres: readonly Unite[],
  feuilles = 12,
): EtatBataille {
  return ouvrirBataille(ETAGE, coffre, indechiffres, feuilles);
}

function copie(e: EtatBataille): EtatBataille {
  return structuredClone(e) as EtatBataille;
}

function nCoups(tenue: number, porte: number): number {
  let reste = tenue;
  let n = 0;
  while (reste > 0 && n < 999) {
    reste -= porte;
    n += 1;
  }
  return n;
}

function mediane(xs: readonly number[]): number {
  const t = [...xs].sort((a, b) => a - b);
  return t[Math.floor(t.length / 2)]!;
}

/** Centile entier, borne basse. Pas de flottant : un rang, pas une moyenne. */
function centile(xs: readonly number[], p: number): number {
  const t = [...xs].sort((a, b) => a - b);
  return t[Math.min(t.length - 1, Math.floor((p * t.length) / 100))]!;
}

// ---------------------------------------------------------------------------

describe("bataille — ouverture", () => {
  it("pose les deux camps : ids en ordre, camps forcés, drapeaux à faux, télégraphie prête", () => {
    const etat = poser(
      [brute({ pos: TRIO.ouest }), brute({ pos: MANEGE.g })],
      [brute({ pos: TRIO.est })],
    );
    assert.equal(etat.etage, ETAGE);
    assert.deepEqual(
      etat.unites.map((u) => u.id),
      [0, 1, 2],
    );
    assert.deepEqual(
      etat.unites.map((u) => u.camp),
      ["coffre", "coffre", "indechiffre"],
    );
    assert.ok(etat.unites.every((u) => !u.aFrappe && !u.aDeplace && u.precedente === null));
    assert.equal(etat.tour, 1);
    assert.equal(etat.phase, "coffre");
    assert.equal(etat.feuilles, 12);
    assert.equal(etat.journal.length, 0);
    assert.equal(etat.fin, null);
    assert.equal(etat.intentions.length, 1);
    assert.equal(etat.intentions[0]!.unite, 2);
  });

  it("doit échouer — ouvrir : feuilles négatives, case hors dalle, case pleine, case déjà tenue", () => {
    assert.throws(
      () => poser([brute({ pos: TRIO.ouest })], [brute({ pos: TRIO.est })], -1),
      RejetTactique,
    );
    assert.throws(
      () => poser([brute({ pos: { x: GRILLE_N, y: 0 } })], [brute({ pos: TRIO.est })]),
      RejetTactique,
    );
    const casePleine = (() => {
      for (let y = 0; y < GRILLE_N; y++)
        for (let x = 0; x < GRILLE_N; x++) if (!libre({ x, y })) return { x, y };
      throw new Error("dalle sans obstacle");
    })();
    assert.throws(
      () => poser([brute({ pos: casePleine })], [brute({ pos: TRIO.est })]),
      RejetTactique,
    );
    assert.throws(
      () => poser([brute({ pos: TRIO.ouest })], [brute({ pos: TRIO.ouest })]),
      RejetTactique,
    );
  });
});

describe("bataille — résolution", () => {
  it("l'accord se lit sur les quaternions : constructif > neutre > destructif", () => {
    const bon = poser(
      [brute({ pos: TRIO.ouest, mot: CONSTRUCTIF.a, classe: "arme" })],
      [brute({ pos: TRIO.centre, mot: CONSTRUCTIF.b, classe: "defense" })],
    );
    const plat = poser(
      [brute({ pos: TRIO.ouest, mot: NEUTRE.a, classe: "arme" })],
      [brute({ pos: TRIO.centre, mot: NEUTRE.b, classe: "defense" })],
    );
    const contre = poser(
      [brute({ pos: TRIO.ouest, mot: CONSTRUCTIF.a, classe: "arme" })],
      [brute({ pos: TRIO.centre, mot: CONSTRUCTIF.b, classe: "arme" })],
    );
    const c1 = resoudreCoup(bon, 0, 1);
    const c2 = resoudreCoup(plat, 0, 1);
    const c3 = resoudreCoup(contre, 0, 1);
    const base = COUP_BASE + 16;
    assert.equal(c2.base, base, "la base est COUP_BASE + lame, jamais lame seule");
    assert.equal(c1.accord, div(base, DIV_ACCORD));
    assert.equal(c2.accord, 0);
    assert.equal(c3.accord, -div(base, DIV_ACCORD));
    assert.ok(c1.porte > c2.porte);
    assert.ok(c2.porte > c3.porte);
    assert.equal(c2.dos, 0);
    assert.equal(c2.allonge, 0);
    assert.equal(c2.riposte, false);
    // La ecu du défenseur n'entre pas : elle paie la tenue, une seule fois.
    assert.equal(c2.porte, base, "la ecu du défenseur a réduit le coup");
  });

  it("le dos ajoute exactement lame/DIV_DOS à qui frappe dans l'axe de la marche", () => {
    // Le défenseur regarde la case qu'il vient de quitter : son dos est devant lui.
    const derriere = brute({ pos: RANG[0]! });
    const devant = brute({ pos: RANG[3]!, arc: 16 });
    const cible = brute({ pos: RANG[2]!, lame: 10, ecu: 12, eperon: 10, arc: 32 });
    const etat = finDePhase(poser([derriere, devant], [cible]));
    assert.equal(etat.phase, "indechiffre");
    const marche = jouer(etat, { geste: "deplacer", unite: 2, vers: RANG[1]! });
    assert.deepEqual(marche.unites[2]!.precedente, RANG[2]);
    const deDos = resoudreCoup(marche, 0, 2);
    const deFace = resoudreCoup(marche, 1, 2);
    assert.equal(deFace.dos, 0);
    assert.equal(deDos.dos, div(COUP_BASE + 16, DIV_DOS));
    assert.equal(deDos.allonge, 0, "portée 3 : personne ne frappe hors de riposte");
    assert.equal(deFace.allonge, 0);
    assert.equal(deDos.porte - deFace.porte, div(COUP_BASE + 16, DIV_DOS));
    // Avant le pas, aucune unité n'a de dos : elle regarde partout.
    assert.equal(resoudreCoup(etat, 0, 2).dos, 0);
  });

  it("l'arc a un prix : la portée l'emporte sur le lame et la ecu réunis", () => {
    const tour = brute({
      pos: TRIO.ouest,
      lame: 30,
      ecu: 30,
      eperon: 3,
      arc: 1,
      mot: NEUTRE.a,
      classe: "arme",
    });
    const archer = brute({
      pos: TRIO.centre,
      lame: 16,
      ecu: 0,
      eperon: 0,
      arc: 48,
      mot: NEUTRE.b,
      classe: "defense",
    });
    const socle = poser([tour], [archer], 12);
    // Dalle bâtie pour la démonstration : deux meurtrières, tout le reste plein.
    // Ce que le contrôle prouve est la règle de résolution, pas le tirage de l'étage.
    const guet = { x: 4, y: 4 };
    const meurtriere = { x: 4, y: 1 };
    const mur: boolean[][] = [];
    for (let y = 0; y < GRILLE_N; y++) {
      const ligne: boolean[] = [];
      for (let x = 0; x < GRILLE_N; x++)
        ligne.push(!((x === guet.x && y === guet.y) || (x === meurtriere.x && y === meurtriere.y)));
      mur.push(ligne);
    }
    let duel: EtatBataille = {
      ...socle,
      obstacles: mur,
      unites: [
        { ...socle.unites[0]!, pos: guet },
        { ...socle.unites[1]!, pos: meurtriere },
      ],
    };
    assert.equal(portee(duel.unites[0]!), 1);
    assert.equal(portee(duel.unites[1]!), 4);
    assert.equal(distance(guet, meurtriere), 3);
    assert.deepEqual(
      actesPossibles(duel, 0).map((a) => a.geste),
      ["passer"],
      "60 points de lame et de ecu, et rien à faire",
    );
    const coup = resoudreCoup(duel, 1, 0);
    const base = COUP_BASE + 16;
    assert.equal(coup.allonge, div(base, DIV_ALLONGE));
    assert.equal(coup.accord, 0);
    assert.equal(coup.porte, base + div(base, DIV_ALLONGE));
    // L'allonge et la riposte s'excluent : la tour est plus vive (3 contre 0)
    // et ne rend pourtant rien, parce qu'elle n'atteint pas la meurtrière.
    assert.equal(riposteDe(duel, coup), null);
    const tenueArcher = duel.unites[1]!.tenue;
    let garde = 0;
    while (duel.fin === null && garde < 12) {
      garde += 1;
      duel = finDePhase(jouer(duel, { geste: "passer", unite: 0 }));
      if (duel.fin !== null) break;
      duel = finDePhase(jouer(duel, { geste: "frapper", unite: 1, cible: 0 }));
    }
    assert.deepEqual(duel.fin?.issue, "defaite");
    assert.equal(duel.unites[1]!.tenue, tenueArcher, "l'archer n'a pas été touché une fois");
    assert.equal(duel.journal.length, nCoups(TENUE_BASE + MULT_TENUE * 30, coup.porte));
  });

  it("aucun coup à zéro : le plancher est un garde-fou, jamais un réglage", () => {
    // Le pire coup possible est une base nue amputée de l'accord destructif.
    const pire = COUP_BASE - div(COUP_BASE, DIV_ACCORD);
    assert.ok(pire > COUP_MIN, `plancher ${COUP_MIN} au lieu d'un garde-fou sous ${pire}`);
    let plancher = Number.MAX_SAFE_INTEGER;
    for (let k = 0; k < 200; k++) {
      const g = sha256d(utf8(`eidos-tactique-plancher/${k}`));
      const a = combatDe(objetDepuisGraine(g, "Satya"));
      const d = combatDe(objetDepuisGraine(sha256d(g), "Satya"));
      const etat = poser(
        [brute({ pos: TRIO.ouest, lame: a.lame, ecu: a.ecu, eperon: a.eperon, arc: a.arc })],
        [brute({ pos: TRIO.centre, lame: d.lame, ecu: d.ecu, eperon: d.eperon, arc: d.arc })],
      );
      const c = resoudreCoup(etat, 0, 1);
      assert.equal(c.base, COUP_BASE + a.lame);
      assert.ok(c.porte > 0, `un coup porte ${c.porte} au lieu de 1 au moins`);
      plancher = Math.min(plancher, c.porte);
    }
    assert.ok(
      plancher >= pire,
      `un coup est tombé à ${plancher} au lieu de ${pire} au moins : le plancher a mordu`,
    );
  });

  it("resoudreCoup refuse une unité inconnue et le coup sur soi-même", () => {
    const etat = poser([brute({ pos: TRIO.ouest })], [brute({ pos: TRIO.centre })]);
    assert.throws(() => resoudreCoup(etat, 0, 0), RejetTactique);
    assert.throws(() => resoudreCoup(etat, 0, 7), RejetTactique);
  });
});

describe("bataille — les sept refus", () => {
  it("doit échouer — jouer : l'unité n'est pas du camp dont c'est la phase", () => {
    const etat = poser([brute({ pos: TRIO.ouest })], [brute({ pos: TRIO.centre })]);
    assert.throws(
      () => jouer(etat, { geste: "passer", unite: 1 }),
      (e: unknown) =>
        e instanceof RejetTactique && e.message === "phase coffre au lieu de indechiffre",
    );
  });

  it("doit échouer — jouer : une unité à terre n'agit plus", () => {
    const etat = poser(
      [brute({ pos: TRIO.ouest, tenue: 0 }), brute({ pos: MANEGE.g })],
      [brute({ pos: TRIO.centre })],
    );
    assert.equal(etat.fin, null, "le camp tient encore : ce n'est pas la fin qui refuse");
    assert.throws(
      () => jouer(etat, { geste: "passer", unite: 0 }),
      (e: unknown) => e instanceof RejetTactique && /tenue 0 au lieu de/.test(e.message),
    );
  });

  it("doit échouer — jouer : la case visée n'est pas accessible, ni sa propre case", () => {
    const etat = poser([brute({ pos: LOIN.a })], [brute({ pos: TRIO.centre })]);
    assert.ok(pas(etat.unites[0]!) < LOIN.d, "la diagonale doit dépasser le pas");
    assert.throws(
      () => jouer(etat, { geste: "deplacer", unite: 0, vers: LOIN.b }),
      RejetTactique,
    );
    assert.throws(
      () => jouer(etat, { geste: "deplacer", unite: 0, vers: LOIN.a }),
      RejetTactique,
    );
  });

  it("doit échouer — jouer : deux déplacements dans le même tour", () => {
    const etat = poser([brute({ pos: MANEGE.g })], [brute({ pos: TRIO.centre })]);
    const un = jouer(etat, { geste: "deplacer", unite: 0, vers: MANEGE.dr });
    assert.ok(un.unites[0]!.aDeplace);
    assert.deepEqual(un.unites[0]!.precedente, MANEGE.g);
    assert.throws(
      () => jouer(un, { geste: "deplacer", unite: 0, vers: MANEGE.g }),
      (e: unknown) => e instanceof RejetTactique && /déjà déplacée/.test(e.message),
    );
  });

  it("doit échouer — jouer : la cible est hors de portée, puis deux frappes dans le tour", () => {
    const loin = poser([brute({ pos: LOIN.a })], [brute({ pos: LOIN.b })]);
    assert.ok(portee(loin.unites[0]!) < LOIN.d, "la portée doit rester sous la diagonale");
    assert.throws(() => jouer(loin, { geste: "frapper", unite: 0, cible: 1 }), RejetTactique);
    const pres = poser([brute({ pos: TRIO.ouest })], [brute({ pos: TRIO.centre })]);
    const un = jouer(pres, { geste: "frapper", unite: 0, cible: 1 });
    assert.ok(un.unites[0]!.aFrappe);
    assert.throws(
      () => jouer(un, { geste: "frapper", unite: 0, cible: 1 }),
      (e: unknown) => e instanceof RejetTactique && /déjà frappé/.test(e.message),
    );
  });

  it("doit échouer — jouer : plus une feuille, plus une frappe (état forgé)", () => {
    const etat = poser([brute({ pos: TRIO.ouest })], [brute({ pos: TRIO.centre })]);
    // Un client peut soumettre un état sans feuille et sans fin : le moteur refuse quand même.
    const vide: EtatBataille = { ...etat, feuilles: 0, fin: null };
    assert.throws(
      () => jouer(vide, { geste: "frapper", unite: 0, cible: 1 }),
      (e: unknown) => e instanceof RejetTactique && e.message === "0 feuille au lieu de 1",
    );
    assert.ok(!actesPossibles(vide, 0).some((a) => a.geste === "frapper"));
    assert.ok(actesPossibles(vide, 0).some((a) => a.geste === "passer"));
  });

  it("doit échouer — jouer : une bataille finie refuse tout acte", () => {
    const etat = poser([brute({ pos: TRIO.ouest })], [brute({ pos: TRIO.centre, tenue: 1 })]);
    const fini = jouer(etat, { geste: "frapper", unite: 0, cible: 1 });
    assert.equal(fini.fin?.issue, "victoire");
    assert.throws(
      () => jouer(fini, { geste: "passer", unite: 0 }),
      (e: unknown) => e instanceof RejetTactique && /bataille finie/.test(e.message),
    );
    assert.deepEqual(actesPossibles(fini, 0), []);
  });

  it("une unité à zéro reste au journal, ne bloque plus la dalle et n'est plus visée", () => {
    const etat = poser(
      [brute({ pos: TRIO.ouest }), brute({ pos: MANEGE.g })],
      [brute({ pos: TRIO.centre, tenue: 1 }), brute({ pos: MANEGE.dr })],
    );
    const apres = jouer(etat, { geste: "frapper", unite: 0, cible: 2 });
    assert.equal(apres.unites.length, 4);
    assert.equal(apres.unites[2]!.tenue, 0);
    assert.ok(!vivante(apres.unites[2]!));
    assert.equal(apres.journal.length, 1);
    assert.equal(apres.journal[0]!.retiree, true);
    assert.ok(
      !actesPossibles(apres, 0).some((a) => a.geste === "frapper" && a.cible === 2),
      "on ne frappe pas un mort",
    );
    assert.ok(
      actesPossibles(apres, 0).some(
        (a) =>
          a.geste === "deplacer" && a.vers.x === TRIO.centre.x && a.vers.y === TRIO.centre.y,
      ),
      "la case du mort ne bloque plus",
    );
  });
});

describe("bataille — la feuille", () => {
  it("cinq frappes coûtent cinq feuilles, dix déplacements n'en coûtent aucune", () => {
    let etat = poser(
      [brute({ pos: TRIO.ouest })],
      [brute({ pos: TRIO.centre, lame: 1, ecu: 61, eperon: 1, arc: 1 })],
      12,
    );
    assert.ok(etat.unites[1]!.tenue > 5 * resoudreCoup(etat, 0, 1).porte, "la cible tient");
    for (let k = 0; k < 5; k++) {
      etat = jouer(etat, { geste: "frapper", unite: 0, cible: 1 });
      etat = finDePhase(finDePhase(etat));
    }
    assert.equal(etat.feuilles, 7);
    assert.equal(etat.journal.length, 5);
    assert.equal(etat.fin, null);

    let bal = poser([brute({ pos: MANEGE.g })], [brute({ pos: TRIO.centre })], 12);
    for (let k = 0; k < 10; k++) {
      const vers = k % 2 === 0 ? MANEGE.dr : MANEGE.g;
      bal = jouer(bal, { geste: "deplacer", unite: 0, vers });
      bal = finDePhase(finDePhase(bal));
    }
    assert.equal(bal.feuilles, 12);
    assert.equal(bal.journal.length, 0);
    assert.deepEqual(bal.unites[0]!.pos, MANEGE.g, "dix pas : l'unité est revenue au départ");
    assert.deepEqual(bal.unites[0]!.precedente, MANEGE.dr);
  });

  it("passer ne coûte rien et clôt le tour de l'unité", () => {
    const etat = poser([brute({ pos: TRIO.ouest })], [brute({ pos: TRIO.centre })]);
    const apres = jouer(etat, { geste: "passer", unite: 0 });
    assert.equal(apres.feuilles, etat.feuilles);
    assert.ok(apres.unites[0]!.aFrappe && apres.unites[0]!.aDeplace);
    assert.deepEqual(
      actesPossibles(apres, 0).map((a) => a.geste),
      ["passer"],
    );
  });
});

describe("bataille — les trois issues", () => {
  it("victoire : plus un Indéchiffré debout", () => {
    const etat = poser([brute({ pos: TRIO.ouest })], [brute({ pos: TRIO.centre, tenue: 1 })]);
    const fin = jouer(etat, { geste: "frapper", unite: 0, cible: 1 }).fin;
    assert.deepEqual(fin, { issue: "victoire", tour: 1 });
  });

  it("defaite : plus une unité du coffre debout", () => {
    const etat = poser(
      [brute({ pos: TRIO.ouest, tenue: 1, lame: 20, ecu: 20, eperon: 20, arc: 4 })],
      [brute({ pos: TRIO.centre })],
    );
    const main = finDePhase(etat);
    assert.equal(main.phase, "indechiffre");
    assert.equal(main.unites[0]!.tenue, 1, "arc 4 : aucune reprise");
    const fin = jouer(main, { geste: "frapper", unite: 1, cible: 0 }).fin;
    assert.deepEqual(fin, { issue: "defaite", tour: 1 });
  });

  it("epuise : l'arbre est vide et les deux camps tiennent encore", () => {
    const etat = poser(
      [brute({ pos: TRIO.ouest })],
      [brute({ pos: TRIO.centre, lame: 1, ecu: 61, eperon: 1, arc: 1 })],
      1,
    );
    assert.ok(etat.unites[1]!.tenue > resoudreCoup(etat, 0, 1).porte, "la cible survit au coup");
    const apres = jouer(etat, { geste: "frapper", unite: 0, cible: 1 });
    assert.equal(apres.feuilles, 0);
    assert.deepEqual(apres.fin, { issue: "epuise", tour: 1 });
    assert.deepEqual(apres.intentions, []);
  });
});

describe("bataille — phases et télégraphie", () => {
  it("les Indéchiffrés agissent par eperon décroissant, à égalité par id croissant", () => {
    const etat = poser(
      [brute({ pos: MANEGE.g })],
      [
        brute({ pos: TRIO.ouest, lame: 20, ecu: 20, eperon: 20, arc: 4 }),
        brute({ pos: TRIO.est, lame: 10, ecu: 10, eperon: 40, arc: 4 }),
        brute({ pos: TRIO.centre, lame: 20, ecu: 20, eperon: 20, arc: 4 }),
      ],
    );
    assert.deepEqual(ordreDePhase(etat, "indechiffre"), [2, 1, 3]);
    assert.deepEqual(ordreDePhase(etat, "coffre"), [0]);
  });

  it("finDePhase : reprise pour qui n'a rien fait, drapeaux rendus au camp entrant, tour au retour", () => {
    const oisif = brute({ pos: MANEGE.g, lame: 20, ecu: 20, eperon: 4, arc: 20 });
    const etat = poser(
      [{ ...oisif, tenue: oisif.tenue - 2 }, brute({ pos: TRIO.ouest })],
      [brute({ pos: TRIO.centre })],
    );
    const tenueAvant = etat.unites[0]!.tenue;
    assert.equal(tenueAvant, tenueMax(etat.unites[0]!) - 2);
    const joue = jouer(etat, { geste: "passer", unite: 1 });
    const adverse = finDePhase(joue);
    assert.equal(adverse.phase, "indechiffre");
    assert.equal(adverse.tour, 1);
    assert.equal(adverse.unites[0]!.tenue, tenueAvant + div(20, DIV_REPRISE));
    assert.equal(adverse.unites[1]!.tenue, joue.unites[1]!.tenue, "qui a agi ne reprend rien");
    assert.ok(adverse.unites[1]!.aFrappe, "qui a passé garde ses drapeaux jusqu'à sa phase");
    const retour = finDePhase(adverse);
    assert.equal(retour.phase, "coffre");
    assert.equal(retour.tour, 2);
    assert.ok(!retour.unites[1]!.aFrappe && !retour.unites[1]!.aDeplace);
  });

  it("l'intention est une figure : annoncée, puis rendue fausse quand la cible s'écarte", () => {
    const etat = poser(
      [brute({ pos: TRIO.ouest, lame: 8, ecu: 8, eperon: 40, arc: 8 })],
      [brute({ pos: TRIO.centre, lame: 20, ecu: 20, eperon: 20, arc: 4 })],
    );
    assert.equal(etat.intentions.length, 1);
    const annonce = etat.intentions[0]!;
    assert.equal(annonce.unite, 1);
    assert.deepEqual(annonce.acte, { geste: "frapper", unite: 1, cible: 0 });
    assert.deepEqual(annonce.menace, [TRIO.ouest]);
    const fuite = actesPossibles(etat, 0)
      .filter((a): a is Extract<Acte, { geste: "deplacer" }> => a.geste === "deplacer")
      .sort((p, q) => distance(q.vers, TRIO.centre) - distance(p.vers, TRIO.centre))[0]!;
    assert.ok(
      distance(fuite.vers, TRIO.centre) > portee(etat.unites[1]!),
      "la fuite doit sortir de la portée adverse",
    );
    const apres = finDePhase(finDePhase(jouer(etat, fuite)));
    assert.equal(apres.phase, "coffre");
    assert.notDeepEqual(apres.intentions[0]!.acte, annonce.acte);
    assert.equal(apres.intentions[0]!.acte.geste, "deplacer");
    assert.ok(apres.intentions[0]!.menace.length > 0);
  });
});

describe("bataille — rejeu, trace, conservation", () => {
  it("déterminisme : vingt rejeux de la même suite rendent la même trace", () => {
    const depart = poser(
      [brute({ pos: TRIO.ouest }), brute({ pos: TRIO.est })],
      [brute({ pos: TRIO.centre, ecu: 40 })],
    );
    const actes: Acte[] = [
      { geste: "frapper", unite: 0, cible: 2 },
      { geste: "frapper", unite: 1, cible: 2 },
      { geste: "passer", unite: 0 },
    ];
    const attendue = traceBataille(rejouer(depart, actes));
    for (let k = 0; k < 20; k++) assert.equal(traceBataille(rejouer(depart, actes)), attendue);
    assert.equal(attendue.length, 64);
    const fin = rejouer(depart, actes);
    assert.equal(fin.fin, null);
    assert.equal(fin.feuilles, depart.feuilles - 2);
    assert.equal(fin.journal.length, 2);
  });

  it("la trace change au moindre octet : feuille, tour, phase, tenue, case quittée", () => {
    const etat = poser([brute({ pos: TRIO.ouest })], [brute({ pos: TRIO.centre })]);
    const t = traceBataille(etat);
    assert.notEqual(t, traceBataille({ ...etat, feuilles: etat.feuilles - 1 }));
    assert.notEqual(t, traceBataille({ ...etat, tour: 2 }));
    assert.notEqual(t, traceBataille({ ...etat, phase: "indechiffre" }));
    assert.notEqual(
      t,
      traceBataille({
        ...etat,
        unites: etat.unites.map((u) => (u.id === 1 ? { ...u, tenue: u.tenue - 1 } : u)),
      }),
    );
    assert.notEqual(
      t,
      traceBataille({
        ...etat,
        unites: etat.unites.map((u) => (u.id === 1 ? { ...u, precedente: TRIO.est } : u)),
      }),
    );
    assert.equal(t, traceBataille({ ...etat, journal: [], intentions: [] }));
  });

  it("immuabilité : jouer et finDePhase ne touchent pas l'état reçu", () => {
    const etat = poser(
      [brute({ pos: TRIO.ouest }), brute({ pos: MANEGE.g })],
      [brute({ pos: TRIO.centre, ecu: 40 })],
    );
    const temoin = copie(etat);
    jouer(etat, { geste: "frapper", unite: 0, cible: 2 });
    jouer(etat, { geste: "deplacer", unite: 1, vers: MANEGE.dr });
    jouer(etat, { geste: "passer", unite: 0 });
    finDePhase(etat);
    assert.deepEqual(copie(etat), temoin);
    assert.equal(traceBataille(etat), traceBataille(temoin));
  });

  it("le mot ne bouge jamais : une bataille entière ne change aucune identité", () => {
    let etat = poser(
      [brute({ pos: TRIO.ouest, mot: MOTS[3]! }), brute({ pos: TRIO.est, mot: MOTS[5]! })],
      [brute({ pos: TRIO.centre, mot: MOTS[7]! })],
      12,
    );
    const identite = (u: Unite) => ({
      id: u.id,
      mot: u.mot,
      archetype: u.archetype,
      age: u.age,
      classe: u.classe,
      axes: u.axes,
    });
    const avant = etat.unites.map(identite);
    let garde = 0;
    while (etat.fin === null && garde < 40) {
      garde += 1;
      for (const id of ordreDePhase(etat)) {
        if (etat.fin !== null) break;
        const possibles = actesPossibles(etat, id);
        const frappe = possibles.find((a) => a.geste === "frapper");
        etat = jouer(etat, frappe ?? { geste: "passer", unite: id });
      }
      if (etat.fin === null) etat = finDePhase(etat);
    }
    assert.notEqual(etat.fin, null);
    assert.deepEqual(etat.unites.map(identite), avant);
  });
});

describe("bataille — calibration", () => {
  it("calibration : une bataille dure ce qu'elle doit durer", () => {
    const deFace: number[] = [];
    const deDos: number[] = [];
    let porteMin = Number.MAX_SAFE_INTEGER;
    for (let k = 0; k < 2000; k++) {
      const g = sha256d(utf8(`eidos-tactique-calibration/${k}`));
      const axesA = combatDe(objetDepuisGraine(g, "Satya"));
      const axesD = combatDe(objetDepuisGraine(sha256d(g), "Satya"));
      const base = COUP_BASE + axesA.lame;
      const tenue = TENUE_BASE + MULT_TENUE * axesD.ecu;
      const plat = Math.max(COUP_MIN, base);
      const fort = Math.max(COUP_MIN, base + div(base, DIV_ACCORD) + div(base, DIV_DOS));
      porteMin = Math.min(porteMin, plat, fort);
      deFace.push(nCoups(tenue, plat));
      deDos.push(nCoups(tenue, fort));
    }
    const mFace = mediane(deFace);
    const mDos = mediane(deDos);
    // La borne porte sur le 95e centile, pas sur le pire cas : une unité à
    // `lame` nulle est une mauvaise attaquante — c'est la spécialisation, et
    // la borner au pire cas obligeait à un plancher qui écrasait `lame`.
    const p95 = centile(deFace, 95);
    assert.ok(porteMin >= 1, `un coup porte ${porteMin} au lieu de 1 au moins`);
    assert.ok(mFace >= 2 && mFace <= 4, `${mFace} coups de face au lieu de 2 à 4`);
    assert.ok(mDos >= 1 && mDos <= 2, `${mDos} coups avec accord et dos au lieu de 1 à 2`);
    assert.ok(p95 <= 8, `${p95} coups au 95e centile au lieu de 8 au plus`);
  });
});

describe("bataille — la riposte", () => {
  /** Deux unités au contact ; `vif` frappe le premier. `lent` est plus lourd. */
  function paire(vifEperon: number, lentEperon: number, portees = [1, 1]) {
    const arcV = portees[0]! === 1 ? 0 : 16 * (portees[0]! - 1);
    const arcL = portees[1]! === 1 ? 0 : 16 * (portees[1]! - 1);
    return poser(
      [
        brute({
          pos: TRIO.ouest,
          lame: 12,
          ecu: 64 - 12 - vifEperon - arcV,
          eperon: vifEperon,
          arc: arcV,
        }),
      ],
      [
        brute({
          pos: TRIO.centre,
          lame: 12,
          ecu: 64 - 12 - lentEperon - arcL,
          eperon: lentEperon,
          arc: arcL,
        }),
      ],
    );
  }

  it("la frappée plus vive rend le coup : au journal, sans feuille, sans dépenser sa frappe", () => {
    const etat = paire(4, 20);
    const avant = etat.unites[0]!.tenue;
    const apres = jouer(etat, { geste: "frapper", unite: 0, cible: 1 });
    assert.equal(apres.journal.length, 2, "la riposte n'est pas au journal");
    assert.equal(apres.journal[0]!.riposte, false);
    const rendu = apres.journal[1]!;
    assert.equal(rendu.riposte, true);
    assert.equal(rendu.attaquant, 1);
    assert.equal(rendu.cible, 0);
    assert.equal(rendu.porte, COUP_BASE + 12 + rendu.accord + rendu.dos + rendu.allonge);
    assert.equal(apres.unites[0]!.tenue, avant - rendu.porte, "le riposté n'a pas encaissé");
    assert.equal(apres.feuilles, etat.feuilles - 1, "la riposte a coûté une feuille");
    assert.equal(apres.unites[1]!.aFrappe, false, "la riposte a mangé la frappe du tour");
    // Le riposteur garde son acte : il frappe encore quand vient sa phase.
    const sien = finDePhase(apres);
    assert.ok(actesPossibles(sien, 1).some((a) => a.geste === "frapper"));
  });

  it("pas de riposte à éperon égal ou inférieur : le seuil est strict", () => {
    for (const [v, l] of [
      [20, 20],
      [20, 4],
    ] as const) {
      const apres = jouer(paire(v, l), { geste: "frapper", unite: 0, cible: 1 });
      assert.equal(apres.journal.length, 1, `éperon ${v} contre ${l} : coup rendu à tort`);
    }
  });

  it("pas de riposte hors de portée : l'allonge et la riposte s'excluent exactement", () => {
    // L'archer (portée 3) frappe de deux cases : la cible, plus vive mais de
    // portée 1, encaisse l'allonge et ne rend rien.
    const etat = poser(
      [brute({ pos: TRIO.ouest, lame: 12, ecu: 20, eperon: 0, arc: 32 })],
      [brute({ pos: RANG[2]!, lame: 12, ecu: 20, eperon: 32, arc: 0 })],
    );
    assert.equal(portee(etat.unites[0]!), 3);
    assert.equal(portee(etat.unites[1]!), 1);
    assert.equal(distance(etat.unites[0]!.pos, etat.unites[1]!.pos), 2);
    const coup = resoudreCoup(etat, 0, 1);
    assert.ok(coup.allonge > 0, "l'allonge ne s'est pas appliquée");
    const apres = jouer(etat, { geste: "frapper", unite: 0, cible: 1 });
    assert.equal(apres.journal.length, 1, "on riposte hors de portée");
    assert.equal(riposteDe(apres, coup), null);
  });

  it("on ne riposte jamais à une riposte, et une frappée qui tombe ne rend rien", () => {
    const etat = paire(4, 20);
    const apres = jouer(etat, { geste: "frapper", unite: 0, cible: 1 });
    assert.equal(riposteDe(apres, apres.journal[1]!), null, "une riposte en a appelé une autre");
    // Cible à un point de tenue : elle tombe sous le coup, elle ne rend rien.
    const mourante = poser(
      [brute({ pos: TRIO.ouest, lame: 12, ecu: 20, eperon: 0, arc: 32 })],
      [brute({ pos: TRIO.centre, lame: 12, ecu: 20, eperon: 60, arc: 0, tenue: 1 })],
    );
    const fin = jouer(mourante, { geste: "frapper", unite: 0, cible: 1 });
    assert.equal(fin.journal.length, 1, "un mot tombé a riposté");
    assert.equal(fin.fin?.issue, "victoire");
  });

  it("riposteDe refuse une unité inconnue, et rend null sur un coup déjà rendu", () => {
    const etat = paire(4, 20);
    const coup = resoudreCoup(etat, 0, 1);
    assert.throws(() => riposteDe(etat, { ...coup, attaquant: 9 }), RejetTactique);
    assert.equal(riposteDe(etat, { ...coup, riposte: true }), null);
  });
});

describe("bataille — la charge", () => {
  it("chaque case parcourue avant de frapper pèse CHARGE_PAR_CASE sur le coup", () => {
    // Le chargeur part de RANG[0], marche jusqu'à RANG[1] (une case) et frappe
    // la cible de RANG[2]. Portée 2 des deux côtés : rien d'autre ne s'ajoute.
    const chargeur = brute({ pos: RANG[0]!, lame: 12, ecu: 20, eperon: 16, arc: 16 });
    const proie = brute({
      pos: RANG[2]!,
      lame: 12,
      ecu: 20,
      eperon: 16,
      arc: 16,
      mot: NEUTRE.b,
      classe: "defense",
    });
    const socle = poser([{ ...chargeur, mot: NEUTRE.a }], [proie]);
    const arret = resoudreCoup(socle, 0, 1);
    assert.equal(arret.charge, 0, "une unité qui n'a pas bougé charge");
    assert.equal(arret.porte, arret.base + arret.accord + arret.dos + arret.allonge);

    const lance = jouer(socle, { geste: "deplacer", unite: 0, vers: RANG[1]! });
    assert.equal(lance.unites[0]!.elan, 1);
    const coup = resoudreCoup(lance, 0, 1);
    assert.equal(coup.charge, CHARGE_PAR_CASE);
    assert.equal(coup.porte, arret.porte + CHARGE_PAR_CASE);
  });

  it("l'élan est le coût du chemin, pas la distance à vol d'oiseau", () => {
    // Un mur d'une seule ouverture : la case visée est à deux cases de vol,
    // le détour en coûte quatre, et c'est le détour que la charge paie.
    const mur: boolean[][] = [];
    for (let y = 0; y < GRILLE_N; y++) {
      const ligne: boolean[] = [];
      for (let x = 0; x < GRILLE_N; x++) ligne.push(x === 1 && y !== 4);
      mur.push(ligne);
    }
    // Le socle se pose sur des cases libres de la dalle réelle ; c'est le mur
    // bâti pour la démonstration qui décide ensuite des positions.
    const socle = poser(
      [brute({ pos: TRIO.ouest, lame: 0, ecu: 0, eperon: 64, arc: 0 })],
      [brute({ pos: MANEGE.g })],
    );
    const etat: EtatBataille = {
      ...socle,
      obstacles: mur,
      unites: [
        { ...socle.unites[0]!, pos: { x: 0, y: 2 } },
        { ...socle.unites[1]!, pos: { x: 8, y: 8 } },
      ],
    };
    const but = { x: 2, y: 2 };
    assert.equal(distance({ x: 0, y: 2 }, but), 2, "le vol d'oiseau vaut deux cases");
    const apres = jouer(etat, { geste: "deplacer", unite: 0, vers: but });
    assert.equal(apres.unites[0]!.elan, 6, "l'élan a suivi le vol d'oiseau, pas la route");
  });

  it("l'élan s'éteint au passage de main : on ne riposte jamais en charge", () => {
    const socle = poser(
      [brute({ pos: RANG[0]!, lame: 12, ecu: 20, eperon: 4, arc: 16 })],
      [brute({ pos: RANG[2]!, lame: 12, ecu: 20, eperon: 40, arc: 16 })],
    );
    // L'Indéchiffré charge d'une case pendant sa phase, puis la main revient.
    const sien = finDePhase(socle);
    const charge = jouer(sien, { geste: "deplacer", unite: 1, vers: RANG[1]! });
    assert.equal(charge.unites[1]!.elan, 1);
    const rendue = finDePhase(charge);
    assert.equal(rendue.unites[1]!.elan, 0, "l'élan a survécu à la fin de phase");
    // Il est plus vif (40 contre 4) : il riposte, mais sans charge.
    const frappe = jouer(rendue, { geste: "frapper", unite: 0, cible: 1 });
    const rendu = frappe.journal[1]!;
    assert.equal(rendu.riposte, true);
    assert.equal(rendu.charge, 0, "une riposte a chargé");
  });

  it("doit échouer — deplacer : un élan négatif ou fractionnaire n'est pas un pas", () => {
    const g = poser([brute({ pos: RANG[0]! })], [brute({ pos: RANG[2]! })]).unites[0]!;
    assert.throws(() => deplacer(g, RANG[1]!, -1), {
      name: "RejetTactique",
      message: /élan -1 au lieu d'un entier de 0 ou plus/,
    });
    assert.throws(() => deplacer(g, RANG[1]!, 1.5), {
      name: "RejetTactique",
      message: /élan 1.5 au lieu/,
    });
  });

  it("la trace suit l'élan : deux échiquiers qui ne diffèrent que par lui divergent", () => {
    const socle = poser([brute({ pos: RANG[0]! })], [brute({ pos: RANG[2]! })]);
    const bouge: EtatBataille = {
      ...socle,
      unites: [{ ...socle.unites[0]!, elan: 3 }, socle.unites[1]!],
    };
    assert.notEqual(traceBataille(socle), traceBataille(bouge));
  });
});

describe("bataille — le prix des axes", () => {
  // Le banc complet (2 000 objets, 8 distances, 3 politiques, ~296 000 duels)
  // vit hors dépôt ; ce contrôle en est la réduction rejouable. Il mesure sur
  // le VRAI moteur — aucune résolution n'est réécrite ici.

  /** La plus grande région libre d'un tenant : personne n'est enfermé. */
  const REGION: Case[] = (() => {
    const vues = new Set<string>();
    let best: Case[] = [];
    for (let y = 0; y < GRILLE_N; y++)
      for (let x = 0; x < GRILLE_N; x++) {
        const d = { x, y };
        if (!libre(d) || vues.has(cle(d))) continue;
        const lot: Case[] = [];
        const file: Case[] = [d];
        vues.add(cle(d));
        while (file.length > 0) {
          const c = file.pop()!;
          lot.push(c);
          for (const v of voisines(c))
            if (libre(v) && !vues.has(cle(v))) {
              vues.add(cle(v));
              file.push(v);
            }
        }
        if (lot.length > best.length) best = lot;
      }
    return best;
  })();

  /** Deux cases de la région à la distance voulue, aussi centrales que possible. */
  function place(voulue: number): { a: Case; b: Case } {
    const m = (GRILLE_N - 1) / 2;
    let choix: { a: Case; b: Case } | null = null;
    let meilleur = Infinity;
    for (const a of REGION)
      for (const b of REGION) {
        const s =
          1000 * Math.abs(distance(a, b) - voulue) +
          Math.abs(a.x - m) +
          Math.abs(a.y - m) +
          Math.abs(b.x - m) +
          Math.abs(b.y - m);
        if (s < meilleur) {
          meilleur = s;
          choix = { a, b };
        }
      }
    return choix!;
  }

  const PLACES = [place(1), place(4), place(8)];

  type Sujet = { axes: Combat; unite: Unite; v: number; d: number };

  /**
   * Une politique déterministe, la même pour les deux camps : 0 avance et
   * frappe, 1 se poste hors de portée adverse, 2 frappe puis décroche. Aucune
   * n'ignore un axe — une politique qui colle au contact mesurerait `arc` à
   * zéro par construction, et la mesure ne dirait plus rien du moteur.
   */
  function agir(e: EtatBataille, id: number, pol: number): EtatBataille {
    const vis = e.unites.filter(vivante);
    const u = vis.find((x) => x.id === id);
    if (u === undefined) return e;
    const ennemi = vis.find((x) => x.camp !== u.camp);
    if (ennemi === undefined) return e;
    const ma = portee(u);
    const sa = portee(ennemi);
    const couts = accessibles(e.obstacles, vis, u, pas(u));
    const versLui = accessibles(e.obstacles, [], ennemi, GRILLE_N * GRILLE_N);
    let best = u.pos;
    let meilleur = -1e9;
    for (const c of casesDe(couts)) {
      const dm = distance(c, ennemi.pos);
      const peut = dm >= 1 && dm <= ma;
      const score = peut
        ? 1000 + (pol >= 1 ? (dm > sa ? 400 : 0) + dm : -(couts.get(cle(c)) ?? 0))
        : -(versLui.get(cle(c)) ?? 999);
      if (score > meilleur) {
        meilleur = score;
        best = c;
      }
    }
    const ici = distance(u.pos, ennemi.pos);
    const refuges = pol === 2 ? casesDe(couts).filter((c) => distance(c, ennemi.pos) > sa) : [];
    let etat = e;
    if (pol === 2 && ici >= 1 && ici <= ma && ici <= sa && refuges.length > 0) {
      etat = jouer(etat, { geste: "frapper", unite: id, cible: ennemi.id });
      if (etat.fin !== null) return etat;
      if (vivante(etat.unites.find((x) => x.id === id)!))
        etat = jouer(etat, { geste: "deplacer", unite: id, vers: refuges[0]! });
      return etat;
    }
    if (!memeCase(best, u.pos)) {
      etat = jouer(etat, { geste: "deplacer", unite: id, vers: best });
      if (etat.fin !== null) return etat;
    }
    const apres = etat.unites.find((x) => x.id === id)!;
    if (!vivante(apres)) return etat;
    const proies = cibleDe(etat.unites.filter(vivante), apres, portee(apres));
    if (proies.length > 0) etat = jouer(etat, { geste: "frapper", unite: id, cible: proies[0]!.id });
    return etat;
  }

  /** Le plus vif ouvre : c'est le camp du coffre qui joue en premier. */
  function duel(a: Sujet, b: Sujet, p: { a: Case; b: Case }, pol: number): number {
    let e = ouvrirBataille(ETAGE, [{ ...a.unite, pos: p.a }], [{ ...b.unite, pos: p.b }], 100000);
    let garde = 0;
    while (e.fin === null && garde < 60) {
      garde += 1;
      for (const id of ordreDePhase(e)) {
        e = agir(e, id, pol);
        if (e.fin !== null) break;
      }
      if (e.fin === null) e = finDePhase(e);
    }
    for (const c of e.journal) assert.ok(c.porte > 0, `un coup a porté ${c.porte}`);
    const vivA = vivante(e.unites[0]!);
    const vivB = vivante(e.unites[1]!);
    return vivA && !vivB ? 0 : !vivA && vivB ? 1 : -1;
  }

  function pearson(xs: readonly number[], ys: readonly number[]): number {
    const n = xs.length;
    const mx = xs.reduce((t, x) => t + x, 0) / n;
    const my = ys.reduce((t, y) => t + y, 0) / n;
    let num = 0;
    let dx = 0;
    let dy = 0;
    for (let i = 0; i < n; i++) {
      const a = xs[i]! - mx;
      const b = ys[i]! - my;
      num += a * b;
      dx += a * a;
      dy += b * b;
    }
    return dx === 0 || dy === 0 ? 0 : num / Math.sqrt(dx * dy);
  }

  const SUJETS: Sujet[] = (() => {
    const out: Sujet[] = [];
    for (let i = 0; i < 150; i++) {
      const o = objetDepuisGraine(sha256d(utf8("prix-" + i)), "Satya");
      const a = combatDe(o);
      out.push({
        axes: a,
        unite: brute({
          pos: PLACES[0]!.a,
          lame: a.lame,
          ecu: a.ecu,
          eperon: a.eperon,
          arc: a.arc,
          mot: o.mot,
        }),
        v: 0,
        d: 0,
      });
    }
    return out;
  })();

  const TAUX: number[] = (() => {
    for (const p of PLACES)
      for (let pol = 0; pol < 3; pol++)
        for (let i = 0; i < SUJETS.length; i++)
          for (let k = 1; k <= 3; k++) {
            const j = (i + k * 47) % SUJETS.length;
            if (j === i) continue;
            const si = SUJETS[i]!;
            const sj = SUJETS[j]!;
            const ouvre = si.axes.eperon >= sj.axes.eperon;
            const g = duel(ouvre ? si : sj, ouvre ? sj : si, p, pol);
            if (g === -1) continue;
            const gagne = (g === 0) === ouvre;
            si.v += gagne ? 1 : 0;
            si.d += gagne ? 0 : 1;
          }
    return SUJETS.map((s) => (s.v + s.d === 0 ? 0.5 : s.v / (s.v + s.d)));
  })();

  it("aucun axe n'achète la victoire : |r| sous 0,30 pour les quatre", () => {
    for (const axe of ["lame", "ecu", "eperon", "arc"] as const) {
      const r = pearson(
        SUJETS.map((s) => s.axes[axe]),
        TAUX,
      );
      assert.ok(Math.abs(r) < 0.3, `r(${axe}) = ${r.toFixed(3)} au lieu de moins de 0,30`);
    }
  });

  it("lame+ecu ne fait plus la loi : quartile haut sur quartile bas sous 3×", () => {
    const rangs = SUJETS.map((s, i) => ({ somme: s.axes.lame + s.axes.ecu, t: TAUX[i]! })).sort(
      (a, b) => a.somme - b.somme,
    );
    const q = Math.floor(rangs.length / 4);
    const moy = (xs: { t: number }[]) => xs.reduce((t, x) => t + x.t, 0) / xs.length;
    const bas = moy(rangs.slice(0, q));
    const haut = moy(rangs.slice(rangs.length - q));
    const rapport = haut / Math.max(bas, 1e-9);
    assert.ok(rapport < 3, `quartiles ${rapport.toFixed(2)}× au lieu de moins de 3×`);
  });

  it("un mot étroit n'est jamais plus fort qu'un mot rond, seulement plus étroit", () => {
    // ext = Σ|axe − 16|/2 (SPEC_CRAFT §2) : l'extrémité, donc le tier.
    const ext = (a: Combat) =>
      Math.trunc(
        (Math.abs(a.lame - 16) +
          Math.abs(a.ecu - 16) +
          Math.abs(a.eperon - 16) +
          Math.abs(a.arc - 16)) /
          2,
      );
    const moy = (f: (e: number) => boolean) => {
      const lot = SUJETS.map((s, i) => ({ e: ext(s.axes), t: TAUX[i]! })).filter((x) => f(x.e));
      return lot.length === 0 ? 0.5 : lot.reduce((t, x) => t + x.t, 0) / lot.length;
    };
    const ronds = moy((e) => e <= 15);
    const etroits = moy((e) => e >= 25);
    assert.ok(
      etroits <= ronds + 0.05,
      `les mots étroits gagnent ${(100 * etroits).toFixed(1)} % contre ${(100 * ronds).toFixed(1)} % aux ronds : le tier achèterait de la force`,
    );
  });
});

describe("bataille — la feuille est celle du joueur", () => {
  /** Le coffre et un Indéchiffré au contact, l'un en face de l'autre. */
  function contact(feuilles: number): EtatBataille {
    return poser([brute({ pos: TRIO.ouest })], [brute({ pos: TRIO.centre })], feuilles);
  }

  it("un coup d'Indéchiffré ne brûle aucune feuille", () => {
    const debut = contact(3);
    const apres = finDePhase(debut);
    assert.equal(apres.phase, "indechiffre");
    const proie = apres.unites.find((u) => u.camp === "coffre")!;
    const frappeur = apres.unites.find((u) => u.camp === "indechiffre")!;
    const fin = jouer(apres, { geste: "frapper", unite: frappeur.id, cible: proie.id });
    assert.equal(fin.feuilles, 3, "l'Indéchiffré a dépensé une feuille du joueur");
    assert.equal(fin.journal.length, 1, "le coup n'a pas eu lieu");
    const touchee = fin.unites.find((u) => u.id === proie.id)!;
    assert.ok(touchee.tenue < proie.tenue, "le coup n'a rien porté");
  });

  it("un coup du coffre en brûle une, et une seule", () => {
    const debut = contact(3);
    const proie = debut.unites.find((u) => u.camp === "indechiffre")!;
    const frappeur = debut.unites.find((u) => u.camp === "coffre")!;
    const fin = jouer(debut, { geste: "frapper", unite: frappeur.id, cible: proie.id });
    assert.equal(fin.feuilles, 2);
  });

  it("l'arbre vide arrête le coffre, jamais les Indéchiffrés", () => {
    // Le coffre à zéro feuille ne peut plus frapper : la règle 4 le refuse.
    const sec = contact(0);
    const sien = sec.unites.find((u) => u.camp === "coffre")!;
    const leur = sec.unites.find((u) => u.camp === "indechiffre")!;
    assert.ok(
      !actesPossibles(sec, sien.id).some((a) => a.geste === "frapper"),
      "une frappe est proposée sans feuille",
    );
    // La bataille se clôt en `epuise` dès l'ouverture : on force l'état pour
    // isoler la règle elle-même, comme le ferait un client qui la contournerait.
    const force: EtatBataille = { ...sec, fin: null, phase: "indechiffre" };
    const apres = jouer(force, { geste: "frapper", unite: leur.id, cible: sien.id });
    assert.equal(apres.feuilles, 0);
    assert.equal(apres.journal.length, 1, "l'Indéchiffré a été arrêté par l'arbre vide");
    assert.throws(
      () => jouer({ ...force, phase: "coffre" }, { geste: "frapper", unite: sien.id, cible: leur.id }),
      RejetTactique,
    );
  });
});

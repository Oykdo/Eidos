/**
 * Contrôles de la politique — `ia.ts`.
 *
 * Ce qu'on vérifie : qu'elle est déterministe à l'octet, qu'elle ne joue que
 * des actes que le moteur accepte, qu'elle ne dépasse jamais son budget de
 * points d'action, qu'elle abat quand elle peut, qu'elle engage quand rien
 * n'est à portée, qu'elle refuse un mauvais échange, et que ce qu'elle annonce
 * est bien ce qu'elle jouera si le joueur ne bouge pas.
 *
 * Le terrain est la dalle la plus dégagée des 255, comme dans `bataille.test.ts` :
 * les scénarios ont besoin de place, pas d'un étage particulier.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sha256d, utf8 } from "../hash.ts";
import { objetDepuisGraine } from "../objets.ts";
import { dalleDe, ETAGES } from "../tour.ts";
import {
  actesPossibles,
  finDePhase,
  jouer,
  ordreDePhase,
  ouvrirBataille,
  traceBataille,
} from "./bataille.ts";
import { distance, memeCase } from "./grille.ts";
import { annoncer, jouerBataille, jouerPhase, planDe, TOURS_MAX } from "./ia.ts";
import { MULT_TENUE, pas, portee, TENUE_BASE, vivante } from "./unite.ts";
import {
  GRILLE_N,
  PA_PAR_TOUR,
  RejetTactique,
  type Case,
  type Classe,
  type Combat,
  type EtatBataille,
  type Unite,
} from "./types.ts";

// ---------------------------------------------------------------------------
// Terrain
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

/** Quatre cases libres alignées : le décor des portées. */
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

const TRIO = { ouest: RANG[0]!, centre: RANG[1]!, est: RANG[2]!, loinEst: RANG[3]! };

/** Une case libre à l'écart du rang, pour poser une seconde unité du coffre. */
const MANEGE: Case = (() => {
  for (let y = 0; y < GRILLE_N; y++)
    for (let x = 0; x < GRILLE_N; x++) {
      const c = { x, y };
      if (libre(c) && RANG.every((r) => !memeCase(r, c)) && distance(c, TRIO.centre) > 2) return c;
    }
  throw new Error("aucune case libre à l'écart du rang");
})();

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

// ---------------------------------------------------------------------------
// Fabrique d'unités
// ---------------------------------------------------------------------------

function axesDe(lame: number, ecu: number, eperon: number, arc: number): Combat {
  const table = { lame, ecu, eperon, arc } as const;
  let pointe: keyof typeof table = "lame";
  for (const axe of ["lame", "ecu", "eperon", "arc"] as const)
    if (table[axe] > table[pointe]) pointe = axe;
  return { lame, ecu, eperon, arc, somme: lame + ecu + eperon + arc, pointe };
}

const GRAINE = sha256d(utf8("eidos-tactique-ia"));
const MOTS: number[] = (() => {
  const out: number[] = [];
  let g = GRAINE;
  for (let k = 0; k < 16; k++) {
    out.push(objetDepuisGraine(g, "Satya").mot);
    g = sha256d(g);
  }
  return out;
})();

type Brute = {
  pos: Case;
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
    elan: 0,
    mot: b.mot ?? MOTS[0]!,
    archetype: "mars",
    age: "Satya",
    classe: b.classe ?? "arme",
    axes: axesDe(lame, ecu, eperon, arc),
    pos: b.pos,
    precedente: null,
    tenue: b.tenue ?? TENUE_BASE + MULT_TENUE * ecu,
    pa: PA_PAR_TOUR,
  };
}

function poser(
  coffre: readonly Unite[],
  indechiffres: readonly Unite[],
  feuilles = 64,
): EtatBataille {
  return ouvrirBataille(ETAGE, coffre, indechiffres, feuilles);
}

function frappes(actes: readonly { geste: string }[]): number {
  return actes.filter((a) => a.geste === "frapper").length;
}

/** Rejoue un plan et rend l'état d'arrivée. Chaque acte doit être accepté. */
function rejouerPlan(etat: EtatBataille, unite: number): EtatBataille {
  let e = etat;
  for (const acte of planDe(etat, unite).actes) e = jouer(e, acte);
  return e;
}

// ---------------------------------------------------------------------------

describe("ia — la politique est une lecture", () => {
  it("déterminisme : vingt lectures du même échiquier rendent le même plan", () => {
    const etat = poser([brute({ pos: TRIO.ouest })], [brute({ pos: TRIO.est })]);
    const premier = planDe(etat, 0);
    for (let k = 0; k < 20; k++) assert.deepEqual(planDe(etat, 0), premier);
  });

  it("elle n'engage rien : l'échiquier passé ressort intact, à l'octet", () => {
    const etat = poser([brute({ pos: TRIO.ouest })], [brute({ pos: TRIO.centre })]);
    const avant = traceBataille(etat);
    const copie = structuredClone(etat) as EtatBataille;
    planDe(etat, 0);
    planDe(etat, 1);
    annoncer(etat);
    assert.equal(traceBataille(etat), avant);
    assert.deepEqual(etat, copie);
  });

  it("elle ne joue que des actes que le moteur accepte, et jamais plus de PA_PAR_TOUR", () => {
    // Un tour de chaque camp, chaque acte confronté à `actesPossibles`.
    let e = poser([brute({ pos: TRIO.ouest })], [brute({ pos: LOIN.b })]);
    for (let phase = 0; phase < 4 && e.fin === null; phase++) {
      for (const id of ordreDePhase(e)) {
        const plan = planDe(e, id);
        assert.ok(
          plan.actes.length <= PA_PAR_TOUR,
          `plan de ${plan.actes.length} actes au lieu de ${PA_PAR_TOUR} au plus`,
        );
        assert.equal(plan.unite, id);
        for (const acte of plan.actes) {
          assert.ok(
            actesPossibles(e, id).some((p) => JSON.stringify(p) === JSON.stringify(acte)),
            `acte ${JSON.stringify(acte)} hors des possibles`,
          );
          e = jouer(e, acte);
          if (e.fin !== null) break;
        }
        if (e.fin !== null) break;
      }
      if (e.fin === null) e = finDePhase(e);
    }
  });

  it("la menace annoncée est la portée depuis la case d'arrivée", () => {
    const etat = poser([brute({ pos: TRIO.ouest })], [brute({ pos: TRIO.est })]);
    const plan = planDe(etat, 0);
    const apres = rejouerPlan(etat, 0);
    const arrivee = apres.unites[0]!;
    for (const c of plan.menace) {
      const d = distance(arrivee.pos, c);
      assert.ok(d >= 1 && d <= portee(arrivee), `case menacée à ${d} hors de la portée`);
    }
    assert.equal(plan.menace.length > 0, vivante(arrivee));
  });
});

describe("ia — les cinq rangs", () => {
  it("rang 1 : elle abat quand elle peut, même en encaissant la riposte", () => {
    // La cible tient à 1 : le coup la retire. Elle est plus vive et rend fort,
    // donc l'échange brut est mauvais — abattre passe quand même en premier.
    const etat = poser(
      [brute({ pos: TRIO.ouest, lame: 1, ecu: 61, eperon: 1, arc: 1 })],
      [
        brute({ pos: TRIO.centre, lame: 40, ecu: 1, eperon: 22, arc: 1, tenue: 1 }),
        brute({ pos: LOIN.b, lame: 16, ecu: 16, eperon: 16, arc: 16 }),
      ],
    );
    const plan = planDe(etat, 0);
    assert.equal(frappes(plan.actes), 1, "un coup suffit : elle n'en porte pas deux");
    const apres = rejouerPlan(etat, 0);
    assert.ok(!vivante(apres.unites[1]!), "la cible est retirée");
  });

  it("rang 2 : elle refuse un échange perdant et se tient sans frapper", () => {
    // Portées égales à 1 : aucune allonge possible, la riposte est inévitable.
    // Le riposteur frappe bien plus fort — l'échange est négatif partout.
    const etat = poser(
      [brute({ pos: TRIO.ouest, lame: 1, ecu: 61, eperon: 1, arc: 1 })],
      [brute({ pos: TRIO.centre, lame: 40, ecu: 1, eperon: 22, arc: 1 })],
    );
    assert.equal(portee(etat.unites[0]!), 1);
    assert.equal(portee(etat.unites[1]!), 1);
    const coup = actesPossibles(etat, 0).filter((a) => a.geste === "frapper");
    assert.equal(coup.length, 1, "le coup est pourtant disponible");
    assert.equal(frappes(planDe(etat, 0).actes), 0, "elle ne le porte pas");
  });

  it("rang 4 : sans personne à portée, elle engage — et deux pas valent mieux qu'un", () => {
    const etat = poser([brute({ pos: LOIN.a })], [brute({ pos: LOIN.b })]);
    const plan = planDe(etat, 0);
    assert.equal(plan.actes.length, PA_PAR_TOUR, "elle dépense ses deux points à marcher");
    assert.ok(
      plan.actes.every((a) => a.geste === "deplacer"),
      "rien à frapper : rien que des pas",
    );
    const apres = rejouerPlan(etat, 0);
    const avant = distance(LOIN.a, LOIN.b);
    const apresD = distance(apres.unites[0]!.pos, LOIN.b);
    assert.ok(apresD < avant, `elle se rapproche : ${apresD} au lieu de ${avant}`);
    assert.ok(
      avant - apresD <= 2 * pas(etat.unites[0]!),
      "le rapprochement reste borné par deux pas",
    );
  });

  it("l'allonge est préférée au corps à corps quand la portée la permet", () => {
    // Un archer contre un colosse lent et court : frapper hors de sa portée
    // vaut un bonus *et* aucun coup rendu. Elle doit garder ses distances.
    const archer = brute({ pos: TRIO.ouest, lame: 8, ecu: 8, eperon: 8, arc: 40 });
    const colosse = brute({ pos: TRIO.loinEst, lame: 24, ecu: 32, eperon: 7, arc: 1 });
    const etat = poser([archer], [colosse]);
    assert.ok(
      portee(etat.unites[0]!) > portee(etat.unites[1]!),
      "l'archer doit porter plus loin que le colosse",
    );
    const apres = rejouerPlan(etat, 0);
    assert.ok(apres.journal.length > 0, "elle a frappé");
    assert.equal(apres.journal[0]!.riposte, false, "aucune riposte");
    assert.ok(apres.journal[0]!.allonge > 0, "le coup a porté de loin");
  });
});

describe("ia — la télégraphie", () => {
  it("annoncer ne parle qu'au coffre, et une bataille finie n'annonce plus rien", () => {
    const etat = poser([brute({ pos: TRIO.ouest })], [brute({ pos: TRIO.est })]);
    const annonce = annoncer(etat);
    assert.equal(annonce.intentions.length, 1);
    assert.equal(annonce.intentions[0]!.unite, 1, "l'Indéchiffré est annoncé, pas le coffre");
    // Pendant la phase adverse, l'annonce du tour reste affichée telle quelle.
    const adverse = finDePhase(annonce);
    assert.equal(adverse.phase, "indechiffre");
    assert.deepEqual(annoncer(adverse).intentions, annonce.intentions);
  });

  it("elle annonce avec les points d'action que l'Indéchiffré aura, pas ceux qui lui restent", () => {
    let e = poser([brute({ pos: TRIO.ouest })], [brute({ pos: LOIN.b })]);
    e = finDePhase(e); // la main passe aux Indéchiffrés
    e = jouerPhase(e); // ils dépensent
    const use = e.unites[1]!;
    assert.ok(use.pa < PA_PAR_TOUR, "l'Indéchiffré a bien dépensé ses points");
    e = finDePhase(e); // la main revient au coffre : ses points sont encore à zéro
    assert.equal(e.phase, "coffre");
    assert.ok(e.unites[1]!.pa < PA_PAR_TOUR, "et ils ne lui sont pas rendus tout de suite");
    const annonce = annoncer(e);
    assert.ok(
      annonce.intentions[0]!.actes.length > 0,
      "l'annonce doit lire le tour à venir, pas le tour épuisé",
    );
  });

  it("l'intention est une figure : annoncée, puis rendue fausse quand la cible s'écarte", () => {
    const etat = annoncer(
      poser(
        [brute({ pos: TRIO.ouest, lame: 8, ecu: 8, eperon: 40, arc: 8 })],
        [brute({ pos: TRIO.centre, lame: 20, ecu: 20, eperon: 20, arc: 4 })],
      ),
    );
    const annonce = etat.intentions[0]!;
    assert.equal(annonce.unite, 1);
    assert.ok(frappes(annonce.actes) > 0, "elle annonce un coup sur le coffre à portée");
    const fuite = actesPossibles(etat, 0)
      .filter((a): a is Extract<typeof a, { geste: "deplacer" }> => a.geste === "deplacer")
      .sort((p, q) => distance(q.vers, TRIO.centre) - distance(p.vers, TRIO.centre))[0]!;
    assert.ok(
      distance(fuite.vers, TRIO.centre) > portee(etat.unites[1]!),
      "la fuite doit sortir de la portée adverse",
    );
    const apres = annoncer(finDePhase(finDePhase(jouer(etat, fuite))));
    assert.equal(apres.phase, "coffre");
    assert.notDeepEqual(apres.intentions[0]!.actes, annonce.actes);
    assert.equal(frappes(apres.intentions[0]!.actes), 0, "il n'y a plus rien à frapper");
  });

  it("ce qui est annoncé est ce qui est joué, quand le joueur ne bouge pas", () => {
    const etat = annoncer(
      poser([brute({ pos: TRIO.ouest })], [brute({ pos: TRIO.est })]),
    );
    const annonce = etat.intentions[0]!;
    const joue = jouerPhase(finDePhase(etat));
    let attendu = finDePhase(etat);
    for (const acte of annonce.actes) attendu = jouer(attendu, acte);
    assert.equal(traceBataille(joue), traceBataille(attendu));
  });
});

describe("ia — jouer une phase, jouer une bataille", () => {
  it("jouerPhase joue tout le camp qui a la main, et ne la passe pas", () => {
    const etat = poser(
      [brute({ pos: TRIO.ouest }), brute({ pos: MANEGE })],
      [brute({ pos: LOIN.b })],
    );
    const apres = jouerPhase(etat);
    assert.equal(apres.phase, "coffre", "la main reste au coffre : finDePhase est à l'appelant");
    for (const u of apres.unites)
      if (u.camp === "coffre")
        assert.ok(u.pa < PA_PAR_TOUR || !vivante(u), `unité ${u.id} n'a rien fait`);
    assert.ok(
      apres.unites.every((u) => u.camp !== "indechiffre" || u.pa === PA_PAR_TOUR),
      "le camp d'en face n'a pas été joué",
    );
  });

  it("une bataille tenue des deux côtés se termine, et la trace est reproductible", () => {
    const etat = poser(
      [brute({ pos: TRIO.ouest, lame: 40, ecu: 16, eperon: 4, arc: 4 })],
      [brute({ pos: TRIO.est, lame: 4, ecu: 4, eperon: 4, arc: 52 })],
    );
    const un = jouerBataille(etat);
    const deux = jouerBataille(etat);
    assert.equal(traceBataille(un.etat), traceBataille(deux.etat), "deux parties, une trace");
    assert.equal(un.phases, deux.phases);
    assert.ok(un.phases <= TOURS_MAX);
    assert.ok(un.etat.journal.length > 0, "des coups ont été portés");
  });

  it("la borne rend la main sans conclure : un abandon de mesure, pas une issue", () => {
    const etat = poser([brute({ pos: LOIN.a })], [brute({ pos: LOIN.b })]);
    const court = jouerBataille(etat, 2);
    assert.equal(court.phases, 2);
    assert.equal(court.etat.fin, null, "atteindre la borne n'est pas une issue");
  });

  it("doit échouer — planDe sur une unité absente, jouerBataille sur une borne qui n'en est pas", () => {
    const etat = poser([brute({ pos: TRIO.ouest })], [brute({ pos: TRIO.est })]);
    assert.throws(
      () => planDe(etat, 7),
      (e: unknown) => e instanceof RejetTactique && /unité 7 au lieu de/.test(e.message),
    );
    for (const borne of [-1, 1.5, Number.NaN]) {
      assert.throws(
        () => jouerBataille(etat, borne),
        (e: unknown) => e instanceof RejetTactique && /borne de tours/.test(e.message),
      );
    }
  });
});

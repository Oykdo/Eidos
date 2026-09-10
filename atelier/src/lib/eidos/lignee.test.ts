/**
 * Contrôles de la lignée — les sept critères de mort écrits d'avance dans
 * `docs/ETUDE_ECHANGE_OBJETS.md` §7.3, plus celui du groupement.
 *
 * Le contrôle central est le deuxième : **deux lignées depuis la même origine
 * doivent être impossibles.** Tout le reste en découle.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hexOf, sha256d, utf8 } from "./hash.ts";
import { coreTx } from "./lamport.ts";
import {
  OCTETS_SORTIE,
  RejetLignee,
  jugerLignee,
  lireCore,
  maillonCourant,
  maillonSuivant,
  maillonsDe,
  octetsLignee,
  origineDe,
  tenueDe,
  type Lignee,
  type Regard,
  type Tenue,
} from "./lignee.ts";

// ---------------------------------------------------------------------------
// Montage — des adresses et des corps, sans réseau ni signature
// ---------------------------------------------------------------------------

function h32(quoi: string): string {
  return hexOf(sha256d(utf8(quoi)));
}

function adresse(quoi: string): Uint8Array {
  return sha256d(utf8(quoi)).slice(0, 20);
}

/** Un corps qui dépense `entrees` et porte `nSorties` sorties. */
function corps(entrees: readonly Tenue[], nSorties: number, sel = "x"): string {
  return hexOf(
    coreTx(
      entrees.map((e) => ({ txid: Uint8Array.from(Buffer.from(e.txid, "hex")), vout: e.rang })),
      Array.from({ length: nSorties }, (_, k) => ({
        adresse: adresse(`${sel}/${k}`),
        atomes: 100_000_000,
      })),
    ),
  );
}

const ORIGINE = { idBloc: h32("bloc-7"), txid: h32("piece-du-claim"), rang: 1, j: 0 };

/** Le regard le plus permissif : tout est inclus, la sortie visée est vive. */
function regardSur(vive: Tenue): Regard {
  return {
    inclus: () => true,
    nonDepensee: (t) => t.txid === vive.txid && t.rang === vive.rang,
  };
}

// ---------------------------------------------------------------------------

describe("lignée — l'arithmétique", () => {
  it("1. déterminisme : la même origine et les mêmes maillons rendent les mêmes empreintes", () => {
    const a = origineDe(ORIGINE);
    for (let k = 0; k < 8; k++) assert.equal(origineDe({ ...ORIGINE }), a);
    assert.equal(a.length, 64);
    // Le rang dans le coffre sépare deux objets d'un même claim.
    assert.notEqual(origineDe({ ...ORIGINE, j: 1 }), a);
    // Et chaque champ compte.
    assert.notEqual(origineDe({ ...ORIGINE, rang: 2 }), a);
    assert.notEqual(origineDe({ ...ORIGINE, idBloc: h32("bloc-8") }), a);
    const m = maillonSuivant(a, h32("t1"), 0);
    assert.equal(maillonSuivant(a, h32("t1"), 0), m);
    assert.notEqual(maillonSuivant(a, h32("t1"), 1), m);
  });

  it("un corps se relit à l'octet : txid, entrées, nombre de sorties", () => {
    const e: Tenue[] = [{ txid: h32("a"), rang: 3 }];
    const c = corps(e, 2);
    const lu = lireCore(c);
    assert.deepEqual(lu.entrees, e);
    assert.equal(lu.nSorties, 2);
    assert.equal(lu.txid, hexOf(sha256d(Uint8Array.from(Buffer.from(c, "hex")))));
  });

  it("doit échouer — une origine ou un corps qui ne se relisent pas", () => {
    assert.throws(() => origineDe({ ...ORIGINE, idBloc: "00" }), RejetLignee);
    assert.throws(() => origineDe({ ...ORIGINE, j: 256 }), RejetLignee);
    assert.throws(() => origineDe({ ...ORIGINE, rang: -1 }), RejetLignee);
    assert.throws(() => maillonSuivant("zz", h32("t"), 0), RejetLignee);
    assert.throws(() => lireCore("abc"), RejetLignee);
    assert.throws(() => lireCore(""), RejetLignee);
    // Un corps qui annonce plus de sorties qu'il n'en porte.
    const tronque = corps([{ txid: h32("a"), rang: 0 }], 2).slice(0, -OCTETS_SORTIE * 2);
    assert.throws(() => lireCore(tronque), RejetLignee);
  });
});

describe("lignée — le juge", () => {
  it("2. LA DUPLICATION EST REFUSÉE : deux lignées depuis la même origine", () => {
    const piece: Tenue = { txid: ORIGINE.txid, rang: ORIGINE.rang };
    // Alice dépense sa pièce vers Bob : lignée légitime.
    const versBob = corps([piece], 2, "bob");
    const chezBob = lireCore(versBob).txid;
    const l1: Lignee = { origine: ORIGINE, maillons: [{ core: versBob, rang: 0 }] };
    assert.ok(jugerLignee(l1, regardSur({ txid: chezBob, rang: 0 })).ok);

    // Elle tente de vendre le MÊME objet à Carole, depuis la même origine.
    const versCarole = corps([piece], 2, "carole");
    const chezCarole = lireCore(versCarole).txid;
    const l2: Lignee = { origine: ORIGINE, maillons: [{ core: versCarole, rang: 0 }] };

    // Les deux corps dépensent la même sortie : ils sont arithmétiquement
    // valides tous les deux. C'est la CHAÎNE qui tranche — un seul des deux
    // txid peut être dans un bloc, l'autre est une double dépense.
    const chaine: Regard = {
      inclus: (t) => t === chezBob,
      nonDepensee: (t) => t.txid === chezBob && t.rang === 0,
    };
    assert.ok(jugerLignee(l1, chaine).ok, "la lignée incluse tient");
    const v2 = jugerLignee(l2, chaine);
    assert.equal(v2.ok, false);
    assert.match((v2 as { motif: string }).motif, /n'est dans aucun bloc/);
  });

  it("3. un maillon qui ne dépense pas la sortie précédente est refusé", () => {
    // La transaction dépense une AUTRE pièce que celle qui tient l'objet.
    const autre: Tenue = { txid: h32("piece-etrangere"), rang: 0 };
    const core = corps([autre], 1, "voleur");
    const l: Lignee = { origine: ORIGINE, maillons: [{ core, rang: 0 }] };
    const v = jugerLignee(l, regardSur({ txid: lireCore(core).txid, rang: 0 }));
    assert.equal(v.ok, false);
    assert.match((v as { motif: string }).motif, /ne dépense pas/);
  });

  it("un rang hors des sorties de la transaction est refusé", () => {
    const piece: Tenue = { txid: ORIGINE.txid, rang: ORIGINE.rang };
    const core = corps([piece], 2, "court");
    const l: Lignee = { origine: ORIGINE, maillons: [{ core, rang: 7 }] };
    const v = jugerLignee(l, regardSur({ txid: lireCore(core).txid, rang: 7 }));
    assert.equal(v.ok, false);
    assert.match((v as { motif: string }).motif, /rang 7 pour 2 sortie/);
  });

  it("4. une lignée dont la sortie finale est dépensée est refusée", () => {
    const piece: Tenue = { txid: ORIGINE.txid, rang: ORIGINE.rang };
    const core = corps([piece], 2, "passe");
    const l: Lignee = { origine: ORIGINE, maillons: [{ core, rang: 0 }] };
    const v = jugerLignee(l, { inclus: () => true, nonDepensee: () => false });
    assert.equal(v.ok, false);
    assert.match((v as { motif: string }).motif, /est dépensée/);
  });

  it("5. transfert : après l'envoi, le receveur juge le même objet et l'émetteur ne tient plus", () => {
    const piece: Tenue = { txid: ORIGINE.txid, rang: ORIGINE.rang };
    const core = corps([piece], 2, "transfert");
    const txid = lireCore(core).txid;
    const avant: Lignee = { origine: ORIGINE, maillons: [] };
    const apres: Lignee = { origine: ORIGINE, maillons: [{ core, rang: 0 }] };

    // Avant l'envoi, l'émetteur tient la pièce d'origine.
    const v0 = jugerLignee(avant, regardSur(piece));
    assert.ok(v0.ok && v0.echanges === 0);
    assert.deepEqual(tenueDe(avant), piece);

    // Après, la pièce d'origine est dépensée : l'émetteur ne tient plus rien.
    const chaine: Regard = { inclus: () => true, nonDepensee: (t) => t.txid === txid && t.rang === 0 };
    assert.equal(jugerLignee(avant, chaine).ok, false);
    const v1 = jugerLignee(apres, chaine);
    assert.ok(v1.ok && v1.echanges === 1);
    // C'est le même objet : son maillon zéro n'a pas bougé.
    assert.equal(maillonsDe(apres)[0], maillonsDe(avant)[0]);
    // Mais son identité courante a avancé.
    assert.notEqual(maillonCourant(apres), maillonCourant(avant));
  });

  it("une lignée de huit échanges se juge et chaque maillon avance", () => {
    let tenue: Tenue = { txid: ORIGINE.txid, rang: ORIGINE.rang };
    const maillons = [];
    for (let k = 0; k < 8; k++) {
      const core = corps([tenue], 2, `echange-${k}`);
      maillons.push({ core, rang: 0 });
      tenue = { txid: lireCore(core).txid, rang: 0 };
    }
    const l: Lignee = { origine: ORIGINE, maillons };
    const v = jugerLignee(l, regardSur(tenue));
    assert.ok(v.ok && v.echanges === 8, JSON.stringify(v));
    const tous = maillonsDe(l);
    assert.equal(tous.length, 9);
    assert.equal(new Set(tous).size, 9, "aucun maillon ne se répète");
    assert.deepEqual(tenueDe(l), tenue);
  });
});

describe("lignée — ce que ça coûte", () => {
  it("le groupement : N objets changent de mains dans UNE transaction", () => {
    // Le même corps, des rangs différents : une transaction, N objets.
    const N = 12;
    const pieces: Tenue[] = Array.from({ length: N }, (_, k) => ({ txid: h32(`p-${k}`), rang: 0 }));
    const core = corps(pieces, N + 1, "lot");
    const txid = lireCore(core).txid;
    const lignees = pieces.map((p, k) => ({
      origine: { ...ORIGINE, txid: p.txid, rang: p.rang, j: k },
      maillons: [{ core, rang: k }],
    }));
    for (let k = 0; k < N; k++) {
      const v = jugerLignee(lignees[k]!, regardSur({ txid, rang: k }));
      assert.ok(v.ok, `objet ${k} refusé : ${JSON.stringify(v)}`);
    }
    // Douze objets ont changé de mains pour un seul corps.
    assert.equal(new Set(lignees.map((l) => l.maillons[0]!.core)).size, 1);
    // Et les douze identités restent distinctes.
    assert.equal(new Set(lignees.map((l) => maillonCourant(l))).size, N);
  });

  it("le coût marginal d'un objet de plus est une sortie, pas une transaction", () => {
    const pieces: Tenue[] = Array.from({ length: 12 }, (_, k) => ({ txid: h32(`q-${k}`), rang: 0 }));
    const douze = corps(pieces, 13, "lot");
    const onze = corps(pieces.slice(0, 11), 12, "lot");
    // Une entrée de moins ET une sortie de moins : c'est la forme d'un lot.
    assert.equal(
      douze.length / 2 - onze.length / 2,
      36 + OCTETS_SORTIE,
      "un objet de plus doit coûter une entrée et une sortie",
    );
    // Et une lignée de N échanges pèse la somme de ses corps, rien de plus.
    const l: Lignee = { origine: ORIGINE, maillons: [{ core: douze, rang: 0 }] };
    assert.equal(octetsLignee(l), douze.length / 2);
  });

  it("6. la lignée ne touche pas la chaîne : le juge ne lit que ce qu'on lui passe", () => {
    // Aucune tête, aucun réseau, aucune signature : le module est une fonction
    // pure. Deux regards contradictoires sur la même lignée rendent deux
    // verdicts, ce qui prouve que rien n'est deviné.
    const piece: Tenue = { txid: ORIGINE.txid, rang: ORIGINE.rang };
    const core = corps([piece], 2, "pur");
    const l: Lignee = { origine: ORIGINE, maillons: [{ core, rang: 0 }] };
    const txid = lireCore(core).txid;
    assert.ok(jugerLignee(l, regardSur({ txid, rang: 0 })).ok);
    assert.equal(jugerLignee(l, { inclus: () => false, nonDepensee: () => true }).ok, false);
  });
});

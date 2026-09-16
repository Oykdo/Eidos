import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { ascensionDe } from "./ascension.ts";
import { captureDe, occupantsRestants } from "./capsules.ts";
import { spawnIci } from "./fouilles.ts";
import { normaliserObjets } from "./inventaire.ts";
import { normaliserTour, tourDe } from "./jauge.ts";
import { preuveReseau, serialiser } from "./merkle.ts";
import { parserFederation, parserTeteReseau } from "./temoin.ts";
import { ordreDePhase } from "./tactique/bataille.ts";
import { TOURS_MAX, planDe } from "./tactique/ia.ts";
import { DALLE_N, dalleDe, occupantsDe } from "./tour.ts";
import type { Coffre, ObjetPorte } from "./types.ts";
import { ETAPES } from "./pendule.ts";
import { FEUILLES, FRANCHIR_AU_SOMMET, argFrapper, feuillesRestantes, jugerVeillee, lectureVeillee, parcoursDe, signerGeste, type Veillee } from "./veillee.ts";
import {
  SAC_PLACES,
  abandonnerVeilleeDansCoffre,
  arbreDuCoffre,
  batailleDansCoffre,
  batailleEnlisee,
  batailleOuverte,
  capturerDansCoffre,
  creuserDansCoffre,
  enVeillee,
  exporterVeilleeDuCoffre,
  franchirDansCoffre,
  jouerDansBataille,
  ouvrirBatailleDansCoffre,
  ouvrirVeilleeDansCoffre,
  oublierReserves,
  parlerDansCoffre,
  passerLaMainDansBataille,
  premiereTombee,
  sacPlein,
  salleTenue,
  veilleeDe,
} from "./veillee-tour.ts";
import { coffreAtelier, coffreNeuf } from "./wallet.ts";

type TeteBrute = Record<string, unknown>;
const VEC = JSON.parse(readFileSync(new URL("../../../../vecteurs.json", import.meta.url), "utf8")) as {
  veillee: {
    federation: { hauteur_mss: number; racines: string[]; graines_publiques: string[] };
    veille: TeteBrute;
    premier_du_jour: TeteBrute;
    sorties_au_premier: { txid: string; rang: number; adresse: string; montant: number }[];
  };
};
function tete(raw: TeteBrute) {
  const t = parserTeteReseau(raw);
  if ("erreur" in t) throw new Error(t.erreur);
  return t;
}
const fed = parserFederation(VEC.veillee.federation);
if ("erreur" in fed) throw new Error(fed.erreur);
const jour = tete(VEC.veillee.premier_du_jour);
const veille = tete(VEC.veillee.veille);
const piece = VEC.veillee.sorties_au_premier[0]!;
const preuve = serialiser(preuveReseau(VEC.veillee.sorties_au_premier, `${piece.txid}:${piece.rang}`)!);

function ouvrir(c: Coffre, ancree = true): Coffre {
  oublierReserves();
  const r = ouvrirVeilleeDansCoffre(c, jour, veille, ancree ? { piece, preuve } : null);
  if (!r.ok) throw new Error(r.motif);
  return r.coffre;
}

function feuilles(c: Coffre): number {
  return FEUILLES - veilleeDe(c)!.v.gestes.length;
}
/** La porte de la ville (étage 0) a trois occupants : depuis 5b elle est tenue, et le butin y attend la
 *  bataille. Ces contrôles-ci testent le butin, pas la bataille : on entre dans une porte déjà dégagée,
 *  ses occupants abattus lors d'une veillée d'avant (ils ne reviennent pas). */
function degagee(c: Coffre): Coffre {
  return { ...c, tour: { ...tourDe(c), abattus: occupantsDe(0).map((o): [number, number] => [0, o.k]) } };
}

describe("la veillée dans la Tour : l'acte d'abord, la feuille ensuite", () => {
  it("s'ouvre à la porte de la ville avec la graine du jour ; l'atelier joue mais n'exporte pas", () => {
    const c = ouvrir(coffreAtelier("vide"));
    assert.ok(enVeillee(c));
    assert.equal(tourDe(c).etage, 0);
    assert.equal(ascensionDe(c)!.etape, 0);
    assert.equal(feuilles(c), FEUILLES);
    assert.equal(veilleeDe(c)!.indiceReserve, 0);
    assert.equal((exporterVeilleeDuCoffre(c) as { code: string }).code, "finie");
    assert.equal((ouvrirVeilleeDansCoffre(c, jour, veille, { piece, preuve }) as { code: string }).code, "finie");
    // relue depuis la jauge : la veillée revient, une forme absurde revient à null
    const t = normaliserTour(JSON.parse(JSON.stringify(c.tour)));
    assert.equal(t.veillee!.v.racine, veilleeDe(c)!.v.racine);
    assert.equal(normaliserTour({ ...c.tour, veillee: { v: 3 } }).veillee, null);
    assert.equal(normaliserTour({ ...c.tour, veillee: { v: veilleeDe(c)!.v, indiceReserve: -1 } }).veillee, null);
  });

  it("parler à Thalie honore l'hôte et brûle une feuille ; un hôte déjà honoré ne brûle rien", () => {
    const c = ouvrir(degagee(coffreAtelier("vide")));
    const r = parlerDansCoffre(c, []);
    assert.ok(r.ok, r.ok ? "" : r.motif);
    assert.equal(r.feuilles, FEUILLES - 1);
    assert.ok(tourDe(r.coffre).dons.includes(0));
    assert.equal(veilleeDe(r.coffre)!.indiceReserve, 1);
    assert.equal(veilleeDe(r.coffre)!.v.gestes[0]!.g, "parler");
    const deja = parlerDansCoffre(r.coffre, []);
    assert.ok(!deja.ok && deja.code === "acte");
    assert.equal(feuilles(r.coffre), FEUILLES - 1);
  });

  it("creuser la case d'arrivée donne et brûle ; hors dalle, capsule absente : rien ne brûle", () => {
    const c = ouvrir(degagee(coffreAtelier("vide")));
    const s = spawnIci(c, 0)!;
    const r = creuserDansCoffre(c, s.x, s.y);
    assert.ok(r.ok, r.ok ? "" : r.motif);
    assert.ok(tourDe(r.coffre).fouilles.some(([e, x, y]) => e === 0 && x === s.x && y === s.y));
    assert.equal(r.feuilles, FEUILLES - 1);
    const hors = creuserDansCoffre(r.coffre, 10, 10);
    assert.ok(!hors.ok && hors.code === "acte");
    const sans = capturerDansCoffre(r.coffre, 0, 99);
    assert.ok(!sans.ok && sans.code === "acte");
    assert.equal(feuilles(r.coffre), FEUILLES - 1);
  });

  it("ETAPES − 1 franchir dans le coffre d'atelier : sommet, ascension close, parcours = jauge, jugé", () => {
    let c = ouvrir(coffreAtelier("vide"));
    const etages: number[] = [];
    for (let k = 0; k < FRANCHIR_AU_SOMMET; k++) {
      const r = franchirDansCoffre(c, [], "monter");
      assert.ok(r.ok, r.ok ? "" : r.motif);
      c = r.coffre;
      etages.push(r.etage);
    }
    const w = veilleeDe(c)!;
    assert.equal(w.v.fin, "sommet");
    assert.equal(ascensionDe(c)!.fin, "sommet");
    assert.equal(w.v.gestes.length, FRANCHIR_AU_SOMMET);
    assert.equal(w.indiceReserve, FRANCHIR_AU_SOMMET);
    assert.deepEqual(parcoursDe(w.v).etapes.slice(1).map((e) => e.e), etages);
    assert.equal(tourDe(c).etage, etages[etages.length - 1]);
    const j = jugerVeillee(w.v, fed);
    assert.ok(j.ok && j.salles === ETAPES && j.butin === 0, j.ok ? "" : j.motif);
    assert.equal((franchirDansCoffre(c, []) as { code: string }).code, "finie");
    assert.equal((exporterVeilleeDuCoffre(c) as { code: string }).code, "atelier");
  });

  it("coffre personnel sans sceau : la porte 64 arrête en `porte`, sans feuille, preuve exportée et jugée", () => {
    let c = ouvrir(coffreNeuf("vide"));
    let fin: string | null = null;
    let signes = 0;
    for (let k = 0; k < FRANCHIR_AU_SOMMET && fin === null; k++) {
      const r = franchirDansCoffre(c, [], "monter");
      assert.ok(r.ok, r.ok ? "" : r.motif);
      c = r.coffre;
      fin = r.fin;
      if (fin === null) signes += 1;
    }
    assert.equal(fin, "porte");
    assert.ok(tourDe(c).etage < 64);
    const w = veilleeDe(c)!;
    assert.equal(w.v.gestes.length, signes, "la porte fermée ne brûle pas de feuille");
    assert.equal(ascensionDe(c)!.fin, "porte");
    const ex = exporterVeilleeDuCoffre(c);
    assert.ok(!("ok" in ex));
    const j = jugerVeillee(w.v, fed);
    assert.ok(j.ok && j.fin === "porte" && j.salles === signes + 1, j.ok ? "" : j.motif);
    assert.equal((parlerDansCoffre(c, []) as { code: string }).code, "finie");
    // s'effacer sur une veillée finie ne change rien
    assert.equal(veilleeDe(abandonnerVeilleeDansCoffre(c))!.v.fin, "porte");
  });

  it("veillée libre : sans pièce, l'atelier comme tout coffre joue les salles du jour ; rien ne s'exporte", () => {
    let c = ouvrir(degagee(coffreAtelier("vide")), false);
    assert.ok(enVeillee(c));
    assert.equal(veilleeDe(c)!.v.ancre, null);
    assert.equal(ascensionDe(c)!.ancre, null);
    const p = parlerDansCoffre(c, []);
    assert.ok(p.ok, p.ok ? "" : p.motif);
    c = p.coffre;
    const etagesLibre: number[] = [];
    for (let k = 0; k < FRANCHIR_AU_SOMMET; k++) {
      const r = franchirDansCoffre(c, [], "monter");
      assert.ok(r.ok, r.ok ? "" : r.motif);
      c = r.coffre;
      etagesLibre.push(r.etage);
    }
    assert.equal(veilleeDe(c)!.v.fin, "sommet");
    assert.deepEqual(lectureVeillee(veilleeDe(c)!.v), { salles: ETAPES, feuilles: ETAPES, butin: 1, coups: 0, libre: true, fin: "sommet" });
    assert.equal((exporterVeilleeDuCoffre(c) as { code: string }).code, "libre");
    assert.match((jugerVeillee(veilleeDe(c)!.v, fed) as { motif: string }).motif, /libre/);
    // les mêmes salles que la veillée ancrée du même jour
    let a = ouvrir(coffreAtelier("vide"));
    const etagesAncree: number[] = [];
    for (let k = 0; k < FRANCHIR_AU_SOMMET; k++) {
      const r = franchirDansCoffre(a, [], "monter") as { ok: true; coffre: Coffre; etage: number };
      a = r.coffre;
      etagesAncree.push(r.etage);
    }
    assert.deepEqual(etagesLibre, etagesAncree);
    const perso = ouvrir(coffreNeuf("vide"), false);
    assert.equal((exporterVeilleeDuCoffre(abandonnerVeilleeDansCoffre(perso)) as { code: string }).code, "libre");
  });

  it("le sac : un don va au sac, pas au coffre ; le sommet le verse ; une porte le verse", () => {
    let c = ouvrir(degagee(coffreAtelier("vide")));
    const avant = (c.objets ?? []).length;
    const p = parlerDansCoffre(c, []);
    assert.ok(p.ok, p.ok ? "" : p.motif);
    c = p.coffre;
    assert.equal(p.ajoutes.length, 1);
    assert.equal(veilleeDe(c)!.sac.length, 1);
    assert.equal((c.objets ?? []).length, avant, "le don n'est pas au coffre");
    let verses: number | null = null;
    for (let k = 0; k < FRANCHIR_AU_SOMMET; k++) {
      const r = franchirDansCoffre(c, [], "monter");
      assert.ok(r.ok, r.ok ? "" : r.motif);
      c = r.coffre;
      if (r.fin === "sommet") verses = r.verses.length;
    }
    assert.equal(veilleeDe(c)!.v.fin, "sommet");
    assert.ok(verses !== null && verses >= 1, "le sommet verse le sac");
    assert.equal(veilleeDe(c)!.sac.length, 0);
    assert.equal((c.objets ?? []).length, avant + verses!, "les objets du sac sont au coffre");
    // une porte fermée verse aussi
    let d = ouvrir(degagee(coffreNeuf("vide")));
    const avantD = (d.objets ?? []).length;
    d = (parlerDansCoffre(d, []) as { coffre: Coffre }).coffre;
    assert.equal(veilleeDe(d)!.sac.length, 1);
    let fin: string | null = null;
    let versesPorte = 0;
    while (fin === null) {
      const r = franchirDansCoffre(d, [], "monter") as { ok: true; coffre: Coffre; fin: string | null; verses: ObjetPorte[] };
      d = r.coffre;
      fin = r.fin;
      if (fin === "porte") versesPorte = r.verses.length;
    }
    assert.equal(fin, "porte");
    // le don de Thalie, plus les élixirs d'écho que le parcours a pu donner en route
    assert.ok(versesPorte >= 1, "la porte verse le sac");
    assert.equal((d.objets ?? []).length, avantD + versesPorte);
    assert.equal(veilleeDe(d)!.sac.length, 0);
    // s'effacer verse
    let e = ouvrir(degagee(coffreNeuf("vide")));
    e = (parlerDansCoffre(e, []) as { coffre: Coffre }).coffre;
    const efface = abandonnerVeilleeDansCoffre(e);
    assert.equal(veilleeDe(efface)!.v.fin, "abandon");
    assert.equal(veilleeDe(efface)!.sac.length, 0);
    assert.equal((efface.objets ?? []).length, (e.objets ?? []).length + 1);
  });

  it("le sac : l'arbre épuisé le perd — les gestes restent dans la preuve, pas les objets", () => {
    let c = ouvrir(degagee(coffreAtelier("vide")));
    const avant = (c.objets ?? []).length;
    // Un coup de bêche sur la case d'arrivée : du butin au sac, par la Tour.
    const etage = tourDe(c).etage;
    const s = spawnIci(c, etage)!;
    const r0 = creuserDansCoffre(c, s.x, s.y);
    assert.ok(r0.ok, r0.ok ? "" : r0.motif);
    c = r0.coffre;
    assert.ok(veilleeDe(c)!.sac.length > 0, "il y a du butin dans le sac");
    // À neuf salles, les gestes de la Tour seule ne vident pas l'arbre (trois bêches, un hôte, une alcôve
    // par salle et ETAPES − 1 franchir : 47 feuilles au plus sur 64) — ce sont les coups de la bataille qui
    // le videront (C4 PR 5b). On brûle donc les feuilles à la main jusqu'à l'avant-dernière, puis le dernier
    // geste passe par la Tour : c'est lui qui épuise l'arbre, et c'est la Tour qui perd le sac.
    const w = veilleeDe(c)!;
    const arbre = arbreDuCoffre(c, w.v)!;
    let v = w.v;
    while (feuillesRestantes(v) > 1) v = signerGeste(v, arbre, { g: "prendre", arg: 0 }) as Veillee;
    assert.equal(v.fin, null);
    c = { ...c, tour: { ...tourDe(c), veillee: { ...w, v, indiceReserve: v.gestes.length } } };
    const dalle = dalleDe(etage);
    let derniere: [number, number] | null = null;
    for (let y = 0; y < DALLE_N && derniere === null; y++) {
      for (let x = 0; x < DALLE_N && derniere === null; x++) {
        if (dalle[y]![x] && !(x === s.x && y === s.y)) derniere = [x, y];
      }
    }
    assert.ok(derniere !== null, "une case à creuser");
    const r = creuserDansCoffre(c, derniere![0], derniere![1]);
    assert.ok(r.ok, r.ok ? "" : r.motif);
    assert.equal(r.fin, "epuise");
    assert.ok(r.perdus.length > 0, "le sac est perdu avec l'arbre");
    c = r.coffre;
    assert.equal(veilleeDe(c)!.v.fin, "epuise");
    assert.equal(veilleeDe(c)!.sac.length, 0);
    assert.equal((c.objets ?? []).length, avant, "rien n'est entré au coffre");
    assert.equal(veilleeDe(c)!.v.gestes.length, FEUILLES);
    assert.equal(lectureVeillee(veilleeDe(c)!.v).butin, FEUILLES);
    assert.equal((creuserDansCoffre(c, s.x, s.y) as { code: string }).code, "finie");
  });

  it("le sac : plein, les gestes de butin sont refusés, franchir reste possible ; la jauge le relit", () => {
    const c = ouvrir(degagee(coffreAtelier("vide")));
    const w = veilleeDe(c)!;
    const sac = normaliserObjets(
      Array.from({ length: SAC_PLACES }, (_, k) => ({ mot: 1000 + k, archetype: "terre", age: "Kali", nonce: k, hauteur: 0 })),
    );
    assert.equal(sac.length, SAC_PLACES);
    const plein: Coffre = { ...c, tour: { ...tourDe(c), veillee: { ...w, sac } } };
    assert.ok(sacPlein(veilleeDe(plein)!));
    assert.equal((parlerDansCoffre(plein, []) as { code: string }).code, "sac");
    const s = spawnIci(plein, 0)!;
    assert.equal((creuserDansCoffre(plein, s.x, s.y) as { code: string }).code, "sac");
    const f = franchirDansCoffre(plein, [], "monter");
    assert.ok(f.ok, f.ok ? "" : f.motif);
    assert.equal(veilleeDe(f.coffre)!.sac.length, SAC_PLACES);
    // relecture : le sac revient, une forme absurde revient vide
    const t = normaliserTour(JSON.parse(JSON.stringify(plein.tour)));
    assert.equal(t.veillee!.sac.length, SAC_PLACES);
    assert.equal(normaliserTour({ ...plein.tour, veillee: { ...w, sac: "non" } }).veillee!.sac.length, 0);
  });

  it("réserve d'indice : une jauge relue d'avant un geste ne resigne pas la feuille", () => {
    const c0 = ouvrir(degagee(coffreAtelier("vide")));
    const c1 = (parlerDansCoffre(c0, []) as { coffre: Coffre }).coffre;
    assert.equal(veilleeDe(c1)!.indiceReserve, 1);
    // la copie d'avant : l'hôte s'honore encore, mais la feuille 0 est déjà réservée dans la session
    const r = parlerDansCoffre(c0, []);
    assert.ok(!r.ok && r.code === "reserve", r.ok ? "" : r.motif);
    // une jauge dont l'indice réservé dépasse les gestes (deux appareils) refuse aussi
    const t = tourDe(c0);
    const bidouille: Coffre = { ...c0, tour: { ...t, veillee: { ...t.veillee!, indiceReserve: 3 } } };
    const b = creuserDansCoffre(bidouille, spawnIci(c0, 0)!.x, spawnIci(c0, 0)!.y, () => true);
    assert.ok(!b.ok && b.code === "reserve");
    // s'effacer : abandon, exportable pour un coffre personnel ancré
    const p = abandonnerVeilleeDansCoffre(ouvrir(coffreNeuf("vide")));
    assert.equal(veilleeDe(p)!.v.fin, "abandon");
    assert.ok(!("ok" in exporterVeilleeDuCoffre(p)));
  });
});

// ---------------------------------------------------------------------------
// La bataille dans la veillée (C4 PR 5b)
// ---------------------------------------------------------------------------
/** Un coffre d'atelier armé : une capture par étage donné, lue comme le jeu la lit (captureDe). */
function coffreArme(etages: readonly number[]): Coffre {
  return { ...coffreAtelier("vide"), objets: etages.map((e) => captureDe(occupantsDe(e)[0]!, e, 0)) };
}

/** Joue la bataille ouverte jusqu'à son issue, le coffre tenu par la politique du dépôt (planDe), comme le banc. */
function jouerJusquAuBout(c0: Coffre): Coffre {
  let c = c0;
  for (let tours = 0; tours < TOURS_MAX; tours++) {
    const r = batailleDansCoffre(c);
    if (!r || r.partie.etat.fin !== null) break;
    for (const id of ordreDePhase(r.partie.etat, "coffre")) {
      const cur = batailleDansCoffre(c);
      if (!cur || cur.partie.etat.fin !== null) break;
      for (const a of planDe(cur.partie.etat, id).actes) {
        const x = jouerDansBataille(c, a);
        if (!x.ok) throw new Error(`${a.geste} : ${x.motif}`);
        c = x.coffre;
        if (x.issue !== null) break;
      }
    }
    if (!batailleOuverte(c)) break;
    const m = passerLaMainDansBataille(c);
    if (!m.ok) throw new Error(m.motif);
    c = m.coffre;
  }
  return c;
}

describe("la bataille dans la veillée : la salle tenue, l'acte d'abord, la feuille ensuite", () => {
  it("salle tenue : le butin est refusé, franchir passe ; la bataille s'ouvre avec les objets du coffre et rien ne se signe", () => {
    const c = ouvrir(coffreArme([0, 50, 61]), false);
    assert.equal(occupantsDe(0).length, 3);
    assert.ok(salleTenue(c), "la porte de la ville est tenue");
    assert.equal((parlerDansCoffre(c, []) as { code: string }).code, "tenue");
    const s0 = spawnIci(c, 0)!;
    assert.equal((creuserDansCoffre(c, s0.x, s0.y) as { code: string }).code, "tenue");
    assert.equal(feuilles(c), FEUILLES, "un refus ne brûle rien");
    // franchir passe une salle tenue : on renonce à son butin, pas à la montée
    const f = franchirDansCoffre(c, [], "monter");
    assert.ok(f.ok, f.ok ? "" : f.motif);
    assert.equal(feuilles(f.coffre), FEUILLES - 1);
    // ouvrir la bataille : un à trois objets, les occupants restants en face, les feuilles de l'arbre
    assert.equal((ouvrirBatailleDansCoffre(c, []) as { code: string }).code, "acte");
    assert.equal((ouvrirBatailleDansCoffre(c, [0, 0]) as { code: string }).code, "acte");
    const o = ouvrirBatailleDansCoffre(c, [0, 1, 2]);
    assert.ok(o.ok, o.ok ? "" : o.motif);
    assert.equal(o.signe, false);
    assert.equal(feuilles(o.coffre), FEUILLES, "l'ouverture ne signe rien");
    const w = veilleeDe(o.coffre)!;
    assert.deepEqual(w.bataille, { etape: 0, etage: 0, indices: [0, 1, 2], feuilles: FEUILLES, actes: [], fin: null, tour: null });
    const r = batailleDansCoffre(o.coffre)!;
    assert.equal(r.partie.etat.feuilles, FEUILLES);
    assert.equal(r.partie.etat.unites.length, 6);
    assert.ok(batailleOuverte(o.coffre));
    // ouverte, elle se finit d'abord : ni franchir, ni une seconde bataille, ni le butin
    assert.equal((franchirDansCoffre(o.coffre, [], "monter") as { code: string }).code, "bataille");
    assert.equal((ouvrirBatailleDansCoffre(o.coffre, [0]) as { code: string }).code, "bataille");
    assert.equal((parlerDansCoffre(o.coffre, []) as { code: string }).code, "bataille");
    // une salle libre n'ouvre rien
    const libre = { ...c, tour: { ...tourDe(c), abattus: [[0, 0], [0, 1], [0, 2]] as [number, number][] } };
    assert.ok(!salleTenue(libre));
    assert.equal((ouvrirBatailleDansCoffre(libre, [0]) as { code: string }).code, "acte");
  });

  it("frapper : l'acte d'abord, la feuille ensuite — un coup refusé par le moteur ne brûle rien, un coup porté signe l'attaquant et la cible ; se déplacer et passer la main sont gratuits", () => {
    let c = ouvrir(coffreArme([0, 50, 61]), false);
    c = (ouvrirBatailleDansCoffre(c, [0, 1, 2]) as { coffre: Coffre }).coffre;
    // hors de portée au premier tour : le moteur refuse, rien n'est signé
    const loin = jouerDansBataille(c, { geste: "frapper", unite: 0, cible: 3 });
    assert.ok(!loin.ok && loin.code === "acte" && /refuse/.test(loin.motif));
    assert.equal(feuilles(c), FEUILLES);
    // la politique du dépôt joue le coffre : ses actes passent, seuls les coups signent
    let coups = 0;
    let gratuits = 0;
    const r0 = batailleDansCoffre(c)!;
    for (const id of ordreDePhase(r0.partie.etat, "coffre")) {
      const cur = batailleDansCoffre(c)!;
      for (const a of planDe(cur.partie.etat, id).actes) {
        const x = jouerDansBataille(c, a);
        assert.ok(x.ok, x.ok ? "" : x.motif);
        c = x.coffre;
        if (a.geste === "frapper") {
          coups += 1;
          assert.ok(x.signe);
          const g = veilleeDe(c)!.v.gestes.at(-1)!;
          assert.equal(g.g, "frapper");
          assert.equal(g.arg, argFrapper(a.unite, a.cible));
          assert.equal(g.mot, 0);
        } else {
          gratuits += 1;
          assert.ok(!x.signe);
        }
        assert.equal(x.partie.etat.feuilles, feuilles(c), "le moteur et l'arbre comptent pareil");
      }
    }
    assert.ok(gratuits > 0, "au moins un pas");
    assert.equal(veilleeDe(c)!.v.gestes.length, coups);
    assert.equal(veilleeDe(c)!.indiceReserve, coups);
    const m = passerLaMainDansBataille(c);
    assert.ok(m.ok, m.ok ? "" : m.motif);
    assert.ok(!m.signe);
    assert.equal(feuilles(m.coffre), FEUILLES - coups);
    assert.equal(veilleeDe(m.coffre)!.bataille!.actes.at(-1)!.geste, "main");
    assert.equal(lectureVeillee(veilleeDe(m.coffre)!.v).coups, coups);
    assert.equal(lectureVeillee(veilleeDe(m.coffre)!.v).butin, 0, "un coup n'est pas du butin");
  });

  it("la bataille vit dans la jauge : relue d'un carnet, elle se rejoue à la trace près ; absurde, elle revient à null", () => {
    let c = ouvrir(coffreArme([0, 50, 61]), false);
    c = (ouvrirBatailleDansCoffre(c, [0, 1, 2]) as { coffre: Coffre }).coffre;
    const r0 = batailleDansCoffre(c)!;
    const premier = planDe(r0.partie.etat, ordreDePhase(r0.partie.etat, "coffre")[0]!).actes[0]!;
    c = (jouerDansBataille(c, premier) as { coffre: Coffre }).coffre;
    c = (passerLaMainDansBataille(c) as { coffre: Coffre }).coffre;
    const avant = batailleDansCoffre(c)!;
    const relu: Coffre = { ...c, tour: normaliserTour(JSON.parse(JSON.stringify(c.tour))) };
    const apres = batailleDansCoffre(relu)!;
    assert.equal(apres.partie.trace, avant.partie.trace);
    assert.deepEqual(apres.b, avant.b);
    // un acte qui ne se rejoue pas : null
    const faux = { ...c, tour: { ...tourDe(c), veillee: { ...veilleeDe(c)!, bataille: { ...avant.b, actes: [...avant.b.actes, { geste: "frapper" as const, unite: 0, cible: 99 }] } } } };
    assert.equal(batailleDansCoffre(faux), null);
    // le coffre a changé sous elle (un objet en moins) : null
    const change = { ...c, objets: (c.objets ?? []).slice(1) };
    assert.equal(batailleDansCoffre(change), null);
    // le compte de feuilles ne suit plus la veillée : null
    const decale = { ...c, tour: { ...tourDe(c), veillee: { ...veilleeDe(c)!, bataille: { ...avant.b, feuilles: avant.b.feuilles - 1 } } } };
    assert.equal(batailleDansCoffre(decale), null);
    // une forme absurde dans la jauge : la bataille revient à null, la veillée reste
    const t = normaliserTour({ ...c.tour, veillee: { ...veilleeDe(c)!, bataille: { etape: 0, etage: 0, indices: [0, 0], feuilles: 64, actes: [], fin: null } } });
    assert.equal(t.veillee!.bataille, null);
    assert.equal(t.veillee!.v.racine, veilleeDe(c)!.v.racine);
  });

  it("victoire : les abattus ne reviennent pas, la salle se lit ; la bataille finie ne se rejoue plus et franchir l'efface", () => {
    let c = ouvrir(coffreArme([0, 50, 61]), true);
    c = (ouvrirBatailleDansCoffre(c, [0, 1, 2]) as { coffre: Coffre }).coffre;
    c = jouerJusquAuBout(c);
    const w = veilleeDe(c)!;
    assert.equal(w.bataille!.fin, "victoire");
    assert.ok(w.bataille!.tour! >= 1);
    assert.deepEqual(tourDe(c).abattus, [[0, 0], [0, 1], [0, 2]]);
    assert.equal(occupantsRestants(c, 0).length, 0);
    assert.ok(!salleTenue(c));
    assert.ok(!batailleOuverte(c));
    assert.equal(batailleDansCoffre(c), null, "finie, elle ne se rejoue plus");
    assert.equal((c.objets ?? []).length, 3, "rien ne quitte le coffre à la victoire");
    const coups = w.v.gestes.filter((g) => g.g === "frapper").length;
    assert.ok(coups > 0);
    assert.equal(w.v.gestes.length, coups);
    // la salle se lit : creuser passe, et un abattu ne se prend pas
    const s0 = spawnIci(c, 0)!;
    const cr = creuserDansCoffre(c, s0.x, s0.y);
    assert.ok(cr.ok, cr.ok ? "" : cr.motif);
    assert.equal((capturerDansCoffre(cr.coffre, 0, 0) as { code: string }).code, "acte");
    // franchir efface la bataille de la salle quittée
    const f = franchirDansCoffre(cr.coffre, [], "monter");
    assert.ok(f.ok, f.ok ? "" : f.motif);
    assert.equal(veilleeDe(f.coffre)!.bataille, null);
    // jugée : les coups sont comptés à part du butin
    const j = jugerVeillee({ ...veilleeDe(f.coffre)!.v, fin: "abandon" }, fed);
    assert.ok(j.ok, j.ok ? "" : j.motif);
    if (j.ok) {
      assert.equal(j.coups, coups);
      assert.equal(j.butin, 1);
      assert.equal(j.salles, 2);
    }
  });

  it("défaite : ancrée, la première tombée quitte le coffre (riposte comprise) ; libre, rien ne part ; la salle reste tenue et franchir passe", () => {
    // une seule capture contre trois : la défaite est sûre
    let libre = ouvrir(coffreArme([61]), false);
    libre = (ouvrirBatailleDansCoffre(libre, [0]) as { coffre: Coffre }).coffre;
    libre = jouerJusquAuBout(libre);
    assert.equal(veilleeDe(libre)!.bataille!.fin, "defaite");
    assert.equal((libre.objets ?? []).length, 1, "en libre, une lecture : rien ne quitte le coffre");
    assert.ok(salleTenue(libre));
    oublierReserves();
    let ancree = ouvrir(coffreArme([61]), true);
    ancree = (ouvrirBatailleDansCoffre(ancree, [0]) as { coffre: Coffre }).coffre;
    ancree = jouerJusquAuBout(ancree);
    assert.equal(veilleeDe(ancree)!.bataille!.fin, "defaite");
    assert.equal((ancree.objets ?? []).length, 0, "ancrée : la première tombée est retirée");
    assert.deepEqual(tourDe(ancree).abattus, []);
    assert.ok(salleTenue(ancree), "les occupants restent");
    assert.ok(veilleeDe(ancree)!.v.fin === null);
    assert.ok(feuilles(ancree) > 0 && feuilles(ancree) < FEUILLES, "les coups portés sont brûlés, la défaite ne prend rien de plus");
    const f = franchirDansCoffre(ancree, [], "monter");
    assert.ok(f.ok, f.ok ? "" : f.motif);
    // premiereTombee : le premier coup du journal qui retire une unité du coffre, riposte ou non
    assert.equal(premiereTombee([], 3), null);
    const coup = { attaquant: 3, cible: 1, base: 0, accord: 0, dos: 0, allonge: 0, charge: 0, porte: 9, tenueApres: 0, retiree: true, riposte: false };
    assert.equal(premiereTombee([{ ...coup, cible: 4, retiree: true }, { ...coup, cible: 2, retiree: false }, coup, { ...coup, cible: 0 }], 3), 1);
    assert.equal(premiereTombee([{ ...coup, attaquant: 0, cible: 2, riposte: true }], 3), 2);
  });

  it("l'arbre vide en bataille : épuisé des deux côtés, le sac est perdu ; enlisée, franchir passe ; s'effacer en pleine bataille la compte perdue", () => {
    let c = ouvrir(coffreArme([0, 50, 61]), true);
    const s0 = spawnIci(c, 0)!;
    // du butin d'abord : impossible, la salle est tenue — on remplit le sac à la main pour la mesure
    c = { ...c, tour: { ...tourDe(c), veillee: { ...veilleeDe(c)!, sac: [captureDe(occupantsDe(96)[0]!, 96, 0)] } } };
    // on brûle les feuilles hors bataille jusqu'à deux, puis la bataille s'ouvre avec deux feuilles
    const w0 = veilleeDe(c)!;
    const arbre = arbreDuCoffre(c, w0.v)!;
    let v = w0.v;
    while (feuillesRestantes(v) > 2) v = signerGeste(v, arbre, { g: "prendre", arg: 0 }) as Veillee;
    c = { ...c, tour: { ...tourDe(c), veillee: { ...veilleeDe(c)!, v, indiceReserve: v.gestes.length } } };
    c = (ouvrirBatailleDansCoffre(c, [0, 1, 2]) as { coffre: Coffre }).coffre;
    assert.equal(batailleDansCoffre(c)!.partie.etat.feuilles, 2);
    c = jouerJusquAuBout(c);
    const w = veilleeDe(c)!;
    assert.equal(w.bataille!.fin, "epuise");
    assert.equal(w.v.fin, "epuise");
    assert.equal(feuilles(c), 0);
    assert.equal(w.sac.length, 0, "l'arbre épuisé perd le sac");
    assert.equal((c.objets ?? []).length, 3, "épuisé n'est pas une défaite : rien ne quitte le coffre");
    void s0;
    // enlisée : TOURS_MAX passages de main sans issue — franchir passe, rien n'est perdu
    oublierReserves();
    let e = ouvrir(coffreArme([0, 50, 61]), true);
    e = (ouvrirBatailleDansCoffre(e, [0, 1, 2]) as { coffre: Coffre }).coffre;
    const b = veilleeDe(e)!.bataille!;
    const enlisee = { ...e, tour: { ...tourDe(e), veillee: { ...veilleeDe(e)!, bataille: { ...b, actes: Array.from({ length: TOURS_MAX }, () => ({ geste: "main" as const })) } } } };
    assert.ok(batailleEnlisee(enlisee));
    assert.ok(batailleOuverte(enlisee));
    const f = franchirDansCoffre(enlisee, [], "monter");
    assert.ok(f.ok, f.ok ? "" : f.motif);
    assert.equal(veilleeDe(f.coffre)!.bataille, null);
    assert.equal((f.coffre.objets ?? []).length, 3);
    // s'effacer avec une bataille ouverte en ancré : perdue, la première tombée part si une unité est tombée
    oublierReserves();
    let a = ouvrir(coffreArme([61]), true);
    a = (ouvrirBatailleDansCoffre(a, [0]) as { coffre: Coffre }).coffre;
    // deux passages de main : les trois occupants frappent la capture seule
    a = (passerLaMainDansBataille(a) as { coffre: Coffre }).coffre;
    if (batailleOuverte(a)) a = (passerLaMainDansBataille(a) as { coffre: Coffre }).coffre;
    const tombee = batailleOuverte(a) ? premiereTombee(batailleDansCoffre(a)!.partie.etat.journal, 1) : 0;
    const fini = abandonnerVeilleeDansCoffre(a);
    assert.equal(veilleeDe(fini)!.v.fin, "abandon");
    assert.equal((fini.objets ?? []).length, tombee === null ? 1 : 0);
  });
});

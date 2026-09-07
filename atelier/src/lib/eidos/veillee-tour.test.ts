import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { ascensionDe } from "./ascension.ts";
import { spawnIci } from "./fouilles.ts";
import { normaliserTour, tourDe } from "./jauge.ts";
import { preuveReseau, serialiser } from "./merkle.ts";
import { parserFederation, parserTeteReseau } from "./temoin.ts";
import type { Coffre } from "./types.ts";
import { FEUILLES, FRANCHIR_AU_SOMMET, jugerVeillee, lectureVeillee, parcoursDe } from "./veillee.ts";
import {
  abandonnerVeilleeDansCoffre,
  capturerDansCoffre,
  creuserDansCoffre,
  enVeillee,
  exporterVeilleeDuCoffre,
  franchirDansCoffre,
  ouvrirVeilleeDansCoffre,
  oublierReserves,
  parlerDansCoffre,
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
    const c = ouvrir(coffreAtelier("vide"));
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
    const c = ouvrir(coffreAtelier("vide"));
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

  it("26 franchir dans le coffre d'atelier : sommet, ascension close, parcours = jauge, jugé", () => {
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
    assert.ok(j.ok && j.salles === 27 && j.butin === 0, j.ok ? "" : j.motif);
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
    let c = ouvrir(coffreAtelier("vide"), false);
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
    assert.deepEqual(lectureVeillee(veilleeDe(c)!.v), { salles: 27, feuilles: 27, butin: 1, libre: true, fin: "sommet" });
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

  it("réserve d'indice : une jauge relue d'avant un geste ne resigne pas la feuille", () => {
    const c0 = ouvrir(coffreAtelier("vide"));
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

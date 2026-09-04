import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CELLULES,
  FORMES,
  accorderDansCoffre,
  bestiaireDe,
  celluleDe,
  formeProche,
  lectureUranie,
  offrirDansCoffre,
} from "./bestiaire.ts";
import { captureDe, libererDansCoffre } from "./capsules.ts";
import { CELLULES_DOXA, alignement } from "./cosmos.ts";
import { VECTEUR_EMPREINTES } from "./cosmos-empreintes.ts";
import { habille } from "./equipement.ts";
import { conjuguerPar } from "./groupe.ts";
import { sha256d, utf8 } from "./hash.ts";
import { etageMuse } from "./hotes.ts";
import { celluleDoxa } from "./integrite.ts";
import { motDeQ } from "./lecture.ts";
import { objetDepuisGraine } from "./objets.ts";
import { paireDe, qDeMot } from "./resonance.ts";
import { ETAGES, occupantsDe } from "./tour.ts";
import type { Coffre, ObjetPorte } from "./types.ts";
import { coffreAtelier } from "./wallet.ts";

function objet(mot: number, archetype = "mars"): ObjetPorte {
  return habille({ mot, archetype, age: "Kali", nonce: 1, hauteur: 1 }, 8, {
    genre: "arme",
    emplacement: "arme",
    affixe: null,
    sockets: 0,
    gemmes: [],
    nom: "Lame",
    palierLair: null,
  });
}

describe("bestiaire — les captures par cellule de la doxa", () => {
  it("la cellule d'une capture est celle de la forme la plus proche des 101", () => {
    assert.equal(CELLULES.length, CELLULES_DOXA);
    assert.equal(FORMES.length, VECTEUR_EMPREINTES.length - 1);
    assert.ok(FORMES.every((f) => f.classe !== "ancre"));
    const occ = occupantsDe(3)[0]!;
    const cap = captureDe(occ, 3, 1);
    const f = formeProche(qDeMot(cap.mot));
    assert.equal(celluleDe(cap), celluleDoxa(f.classe, f.regime));
    assert.ok(CELLULES.includes(celluleDe(cap)));
    // la forme la plus proche maximise |alignement|
    const q = qDeMot(cap.mot);
    const d = (x: bigint) => (x < 0n ? -x : x);
    for (const g of FORMES) assert.ok(d(alignement(q, g.q)) <= d(alignement(q, f.q)));
    // une forme du catalogue est sa propre plus proche
    const forme = FORMES[7]!;
    assert.equal(formeProche(forme.q).rang, forme.rang);
    const b = bestiaireDe({ objets: [cap, objet(5)] });
    assert.deepEqual(b.remplies, [celluleDe(cap)]);
    assert.equal(b.cellules[celluleDe(cap)]!.length, 1);
    assert.equal(b.complet, false);
  });

  it("vingt et une cellules remplies : la lecture d'Uranie s'ouvre, rien d'autre", () => {
    const vues = new Map<string, ObjetPorte>();
    for (let e = 0; e < ETAGES && vues.size < CELLULES_DOXA; e++) {
      for (const o of occupantsDe(e)) {
        const cap = captureDe(o, e, 1);
        const k = celluleDe(cap);
        if (!vues.has(k)) vues.set(k, cap);
      }
    }
    assert.equal(vues.size, CELLULES_DOXA, "les 491 occupants couvrent les 21 cellules");
    const objets = [...vues.values()];
    const b = bestiaireDe({ objets });
    assert.equal(b.remplies.length, CELLULES_DOXA);
    assert.equal(b.complet, true);
    const u = lectureUranie({ objets });
    assert.equal(u.ouverte, true);
    assert.equal(u.total, 101);
    assert.ok(u.rencontrees.length >= CELLULES_DOXA && u.rencontrees.length <= 101);
    assert.equal(lectureUranie({ objets: objets.slice(0, 20) }).ouverte, false);
    assert.equal("bonus" in b, false);
    assert.equal("niveau" in b, false);
  });

  it("accord par le mercure = nouvel objet, ancien mot noté ; offrande à Terpsichore = une gemme", () => {
    const c0 = coffreAtelier("vide");
    const occ = occupantsDe(12)[0]!;
    const cap = captureDe(occ, 12, 1);
    const arme = objet(objetDepuisGraine(sha256d(utf8("porte")), "Kali").mot);
    const sans: Coffre = { ...c0, objets: [arme, cap] };
    assert.deepEqual(accorderDansCoffre(sans, 1, 12), { ok: false, code: "mercure" });
    const avec: Coffre = {
      ...sans,
      tour: { ...sans.tour, elixirs: [{ etage: 12, mot: 1, espece: "mercure" }] },
    };
    const lib = libererDansCoffre(avec, cap.mot);
    const r = accorderDansCoffre(lib, 1, 12);
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.ancien, cap.mot >>> 0);
    assert.notEqual(r.capture.mot, cap.mot);
    assert.equal(r.capture.genre, "capture");
    assert.equal(r.capture.archetype, cap.archetype);
    assert.equal(r.coffre.objets.length, 2);
    assert.equal(
      r.coffre.objets.some((o) => o.mot === cap.mot),
      false,
    );
    assert.deepEqual(r.coffre.tour.bus, [cap.mot >>> 0]);
    assert.equal(r.coffre.tour.liberee, r.capture.mot);
    // le nouveau mot est le mot du conjugué g q ḡ, g l'objet porté
    assert.equal(
      r.capture.mot >>> 0,
      motDeQ(conjuguerPar(qDeMot(arme.mot), qDeMot(cap.mot))) >>> 0,
    );
    assert.deepEqual(accorderDansCoffre(avec, 0, 12), { ok: false, code: "capture" });
    // offrande : chez Terpsichore seulement, constructive avec l'objet porté
    const venus = etageMuse("venus");
    assert.deepEqual(offrirDansCoffre(sans, 1, 12), { ok: false, code: "muse" });
    const porteQ = { q: qDeMot(arme.mot), classe: arme.archetype };
    let bonne: ObjetPorte | null = null;
    for (let e = 0; e < ETAGES && !bonne; e++) {
      for (const o of occupantsDe(e)) {
        const k = captureDe(o, e, 1);
        if (
          paireDe(porteQ, { q: qDeMot(k.mot), classe: k.archetype }, 0, 1).polarite ===
          "constructif"
        ) {
          bonne = k;
          break;
        }
      }
    }
    assert.ok(bonne);
    const off = offrirDansCoffre({ ...c0, objets: [arme, bonne!] }, 1, venus);
    assert.equal(off.ok, true);
    if (off.ok) {
      assert.equal(off.gemme.genre, "gemme");
      assert.equal(off.gemme.archetype, "venus");
      assert.equal(
        off.coffre.objets.some((o) => o.genre === "capture"),
        false,
      );
      assert.equal(off.coffre.objets.length, 2);
    }
    let mauvaise: ObjetPorte | null = null;
    for (let e = 0; e < ETAGES && !mauvaise; e++) {
      for (const o of occupantsDe(e)) {
        const k = captureDe(o, e, 1);
        if (
          paireDe(porteQ, { q: qDeMot(k.mot), classe: k.archetype }, 0, 1).polarite !==
          "constructif"
        ) {
          mauvaise = k;
          break;
        }
      }
    }
    assert.deepEqual(offrirDansCoffre({ ...c0, objets: [arme, mauvaise!] }, 1, venus), {
      ok: false,
      code: "resonance",
    });
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BLOCS_PAR_CAPSULE,
  NOM_CAPSULE,
  capsuleDeThalie,
  capsuleDepuisGraine,
  captureDe,
  forgerCapsule,
  libereeDe,
  libererDansCoffre,
  lirePrise,
  occupantsRestants,
  porteurDe,
  prendreDansCoffre,
  resonanceEtageDuCoffre,
} from "./capsules.ts";
import { FIGURES } from "./constantes.ts";
import { elixirDansCoffre } from "./elixirs.ts";
import { habille } from "./equipement.ts";
import { sha256d, utf8 } from "./hash.ts";
import { NOMS_CAPTURE } from "./hotes-lexique.ts";
import { figureOrbite, motDeQ, paradeLue } from "./lecture.ts";
import { objetDepuisGraine } from "./objets.ts";
import { qDeMot } from "./resonance.ts";
import { occupantsDe, resonanceEtage } from "./tour.ts";
import type { Coffre, ObjetPorte } from "./types.ts";
import { coffreAtelier, minerCoffre } from "./wallet.ts";

function porte(mot: number, genre: ObjetPorte["genre"] = "arme", nom = "Lame"): ObjetPorte {
  return habille({ mot, archetype: "mars", age: "Kali", nonce: 1, hauteur: 1 }, 8, {
    genre,
    emplacement: genre === "arme" ? "arme" : null,
    affixe: null,
    sockets: 0,
    gemmes: [],
    nom,
    palierLair: null,
  });
}

function chercher(pred: (mot: number) => boolean, prefixe: string, max = 4000): number {
  for (let i = 0; i < max; i++) {
    const m = objetDepuisGraine(sha256d(utf8(`${prefixe}/${i}`)), "Kali").mot;
    if (pred(m)) return m;
  }
  throw new Error(`aucun mot pour ${prefixe}`);
}

const ETAGE = 5;
const OCC = occupantsDe(ETAGE)[0]!;

describe("capsules — prendre un occupant sans le tuer", () => {
  it("capsule vide = glyphe creux ; Thalie en donne une par poste du jour, Érato la forge", () => {
    assert.equal(NOM_CAPSULE, FIGURES[0]!.repeat(3));
    const c0 = coffreAtelier("vide");
    const g = sha256d(utf8("capsule-test"));
    const cap = capsuleDepuisGraine(g, "Kali", 0, "terre");
    assert.equal(cap.genre, "capsule");
    assert.equal(cap.nom, NOM_CAPSULE);
    assert.equal(cap.sockets, 0);
    assert.deepEqual(capsuleDepuisGraine(g, "Kali", 0, "terre").mot, cap.mot);
    // Thalie : trois blocs du jour, une capsule, pas deux
    const ts = Date.UTC(2026, 8, 4, 12);
    assert.equal(capsuleDeThalie(c0, ts).ok, false);
    let c = c0;
    for (let i = 0; i < BLOCS_PAR_CAPSULE; i++) c = minerCoffre(c, 4, Math.floor(ts / 1000) + i);
    const r = capsuleDeThalie(c, ts);
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.capsule.genre, "capsule");
    assert.equal(r.coffre.tour.capsules.length, 1);
    assert.equal(capsuleDeThalie(r.coffre, ts).ok, false);
    // Érato : gemme + sel → capsule au mot de la gemme, les deux consommés, le sel noté
    const gemme = porte(objetDepuisGraine(sha256d(utf8("gemme")), "Kali").mot, "gemme", "T1");
    const sel = elixirDansCoffre(c0, sha256d(utf8("sel")), "Kali", "sel");
    const forge = forgerCapsule({ ...c0, objets: [gemme, sel] }, 0, 1);
    assert.equal(forge.ok, true);
    if (!forge.ok) return;
    assert.equal(forge.capsule.mot, gemme.mot);
    assert.equal(forge.coffre.objets.length, 1);
    assert.deepEqual(forge.coffre.tour.bus, [sel.mot >>> 0]);
    const mercure = elixirDansCoffre(c0, sha256d(utf8("mercure")), "Kali", "mercure");
    assert.deepEqual(forgerCapsule({ ...c0, objets: [gemme, mercure] }, 0, 1), {
      ok: false,
      code: "sel",
    });
    assert.deepEqual(forgerCapsule({ ...c0, objets: [sel, sel] }, 0, 1), {
      ok: false,
      code: "gemme",
    });
  });

  it("prise nette : même orbite, au grain de la lecture", () => {
    const c0 = coffreAtelier("vide");
    const fig = figureOrbite(OCC.q);
    const mot = chercher((m) => figureOrbite(qDeMot(m)) === fig, "nette");
    const cap = { ...capsuleDepuisGraine(sha256d(utf8("x")), "Kali", 0), mot };
    const prise = lirePrise(cap, null, OCC, false);
    assert.equal(prise.orbite, true);
    assert.equal(prise.temps, 1);
    assert.equal(prise.issue, "nette");
    const r = prendreDansCoffre({ ...c0, objets: [cap] }, ETAGE, 0, 0);
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.capture.genre, "capture");
    assert.equal(r.capture.mot, motDeQ(OCC.q));
    assert.equal(r.capture.archetype, OCC.classe);
    assert.equal(r.capture.age, "Kali");
    assert.ok(NOMS_CAPTURE[OCC.classe].includes(r.capture.nom));
    assert.equal(r.coffre.objets.length, 1);
    assert.deepEqual(r.coffre.tour.captures, [[ETAGE, 0]]);
    const deja = prendreDansCoffre(r.coffre, ETAGE, 0, 0);
    assert.equal(deja.ok, false);
  });

  it("prise fragile : la parade tient avec le sel, l'occupant s'échappe sans", () => {
    const c0 = coffreAtelier("vide");
    const fig = figureOrbite(OCC.q);
    const g = chercher((m) => figureOrbite(qDeMot(m)) !== fig, "porte");
    const c = chercher(
      (m) => figureOrbite(qDeMot(m)) !== fig && paradeLue(qDeMot(g), qDeMot(m), OCC.q),
      "fragile",
      20000,
    );
    const cap = { ...capsuleDepuisGraine(sha256d(utf8("y")), "Kali", 0), mot: c };
    const arme = porte(g);
    const sans = { ...c0, objets: [arme, cap] };
    assert.equal(porteurDe(sans)?.mot, arme.mot);
    const p = lirePrise(cap, arme, OCC, false);
    assert.equal(p.orbite, false);
    assert.equal(p.parade, true);
    assert.equal(p.issue, "echappe");
    const e = prendreDansCoffre(sans, ETAGE, 0, 1);
    assert.equal(e.ok, false);
    if (!e.ok) {
      assert.equal(e.code, "echappe");
      assert.equal(e.coffre.objets.length, 2, "la capsule reste");
    }
    const avecSel: Coffre = {
      ...sans,
      tour: { ...sans.tour, elixirs: [{ etage: ETAGE, mot: 7, espece: "sel" }] },
    };
    const t = prendreDansCoffre(avecSel, ETAGE, 0, 1);
    assert.equal(t.ok, true);
    if (t.ok) {
      assert.equal(t.prise.issue, "fragile");
      assert.equal(t.prise.temps, 2);
      assert.equal(t.coffre.objets.length, 2);
    }
    // le sel bu à un autre étage ne tient pas
    const ailleurs: Coffre = {
      ...sans,
      tour: { ...sans.tour, elixirs: [{ etage: ETAGE + 1, mot: 7, espece: "sel" }] },
    };
    assert.equal(prendreDansCoffre(ailleurs, ETAGE, 0, 1).ok, false);
  });

  it("capsule brisée : retirée de la jauge, rien d'autre n'est perdu", () => {
    const c0 = coffreAtelier("vide");
    const fig = figureOrbite(OCC.q);
    const g = chercher((m) => figureOrbite(qDeMot(m)) !== fig, "porte2");
    const c = chercher(
      (m) => figureOrbite(qDeMot(m)) !== fig && !paradeLue(qDeMot(g), qDeMot(m), OCC.q),
      "brisee",
    );
    const cap = { ...capsuleDepuisGraine(sha256d(utf8("z")), "Kali", 0), mot: c };
    const arme = porte(g);
    const r = prendreDansCoffre({ ...c0, objets: [arme, cap] }, ETAGE, 0, 1);
    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.equal(r.code, "brisee");
    assert.equal(r.prise?.temps, 3);
    assert.deepEqual(r.coffre.objets, [arme]);
    assert.deepEqual(r.coffre.tour.captures, []);
    const sansCapsule = prendreDansCoffre({ ...c0, objets: [arme] }, ETAGE, 0, 0);
    assert.equal(sansCapsule.ok, false);
    if (!sansCapsule.ok) assert.equal(sansCapsule.code, "capsule");
    const sansOccupant = prendreDansCoffre({ ...c0, objets: [cap] }, ETAGE, 7, 0);
    assert.equal(sansOccupant.ok, false);
    if (!sansOccupant.ok) assert.equal(sansOccupant.code, "occupant");
  });

  it("capture = mot de l'occupant ; l'étage perd son occupant, sa résonance change ; une libérée au plus", () => {
    let etage = -1;
    for (let e = 0; e < 60; e++)
      if (occupantsDe(e).length >= 2) {
        etage = e;
        break;
      }
    assert.ok(etage >= 0);
    const occ = occupantsDe(etage)[1]!;
    const capture = captureDe(occ, etage, 3);
    assert.equal(capture.mot, motDeQ(occ.q));
    assert.equal(figureOrbite(qDeMot(capture.mot)), figureOrbite(occ.q));
    const c0 = coffreAtelier("vide");
    const avant = resonanceEtage(etage);
    const c: Coffre = { ...c0, objets: [capture], tour: { ...c0.tour, captures: [[etage, 1]] } };
    assert.equal(occupantsRestants(c, etage).length, occupantsDe(etage).length - 1);
    const apres = resonanceEtageDuCoffre(c, etage);
    assert.ok(apres.nDestructif < avant.nDestructif);
    assert.deepEqual(resonanceEtageDuCoffre(c0, etage), avant);
    // libérer
    assert.equal(libereeDe(c), null);
    const lib = libererDansCoffre(c, capture.mot);
    assert.equal(libereeDe(lib)?.mot, capture.mot);
    assert.equal(libereeDe(libererDansCoffre(lib, null)), null);
    assert.equal(libererDansCoffre(c, 12345).tour.liberee, null);
  });
});

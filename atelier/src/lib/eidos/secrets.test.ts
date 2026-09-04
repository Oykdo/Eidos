import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { habille } from "./equipement.ts";
import { sha256d, utf8 } from "./hash.ts";
import { hoteDe, honorerDansCoffre } from "./hotes.ts";
import { figureOrbite, tientAxeElite, tientAxeSupreme } from "./lecture.ts";
import { objetDepuisGraine } from "./objets.ts";
import { qDeMot } from "./resonance.ts";
import { PORTES } from "./sceaux.ts";
import {
  OBSERVATOIRE,
  aUneAlcove,
  arriverDansCoffre,
  echosDuQuartier,
  enEcho,
  estObservatoire,
  etagesAlcoves,
  franchirAntre,
  gardienDe,
  lectureObservatoire,
  lireDuel,
  ouvrirAlcove,
  tenueLue,
  ticketPour,
} from "./secrets.ts";
import { coupeDe, dalleDe, occupantsDe } from "./tour.ts";
import type { Coffre, ObjetPorte } from "./types.ts";
import { coffreAtelier } from "./wallet.ts";

function objet(
  mot: number,
  genre: ObjetPorte["genre"] = "arme",
  extra: Partial<ObjetPorte> = {},
): ObjetPorte {
  return habille({ mot, archetype: "mars", age: "Kali", nonce: 1, hauteur: 1 }, 8, {
    genre,
    emplacement: genre === "arme" ? "arme" : null,
    affixe: null,
    sockets: 0,
    gemmes: [],
    nom: genre,
    palierLair: null,
    ...extra,
  });
}

function chercher(pred: (mot: number) => boolean, prefixe: string, max = 20000): number {
  for (let i = 0; i < max; i++) {
    const m = objetDepuisGraine(sha256d(utf8(`${prefixe}/${i}`)), "Kali").mot;
    if (pred(m)) return m;
  }
  throw new Error(`aucun mot pour ${prefixe}`);
}

const ETAGE = 5;

describe("secrets — alcôves, échos, antres, observatoire", () => {
  it("alcôve = croix au centre de la dalle ; le coffret s'ouvre une fois", () => {
    const liste = etagesAlcoves();
    assert.ok(liste.length >= 8 && liste.length <= 20, String(liste.length));
    for (const e of liste) {
      const d = dalleDe(e);
      assert.ok(d[4]![4] && d[3]![4] && d[5]![4] && d[4]![3] && d[4]![5]);
    }
    const e = liste[0]!;
    assert.equal(aUneAlcove(e), true);
    const c0 = coffreAtelier("vide");
    const r = ouvrirAlcove(c0, e);
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.ok(["gemme", "elixir", "capsule"].includes(r.coffret.genre));
    assert.deepEqual(r.coffre.tour.alcoves, [e]);
    assert.deepEqual(ouvrirAlcove(r.coffre, e), { ok: false, code: "deja" });
    let sans = -1;
    for (let k = 0; k < 255; k++)
      if (!aUneAlcove(k)) {
        sans = k;
        break;
      }
    assert.deepEqual(ouvrirAlcove(c0, sans), { ok: false, code: "aucune" });
    // même coffre, même alcôve : même coffret
    const r2 = ouvrirAlcove(c0, e);
    if (r2.ok) assert.equal(r2.coffret.mot, r.coffret.mot);
  });

  it("échos = même orbite exacte des coupes ; l'ordre est exigé, sans redescendre", () => {
    const kali = echosDuQuartier("Kali");
    assert.ok(kali.length >= 3);
    for (const [a, b] of kali) {
      assert.ok(a < b && b <= 63);
      assert.equal(enEcho(a, b), true);
      const p = coupeDe(a);
      const q = coupeDe(b);
      assert.equal(p[0] * p[0], q[0] * q[0], "même |Re| : même orbite, même norme");
    }
    assert.equal(enEcho(0, 0), false);
    assert.ok(echosDuQuartier("Satya").every(([a, b]) => a >= 192 && b <= 254));
    const [a, b] = kali[0]!;
    // monter du sol jusqu'à b : l'écho (a, b) est accompli, un élixir de mercure tombe
    let c: Coffre = coffreAtelier("vide");
    let dons = 0;
    for (let e = 1; e <= b; e++) {
      const r = arriverDansCoffre(c, e);
      c = r.coffre;
      dons += r.dons.length;
      if (e === b) {
        assert.ok(r.echos.some(([x, y]) => x === a && y === b));
        assert.ok(r.dons.every((d) => d.genre === "elixir" && d.nom === "mercure"));
      }
    }
    assert.ok(dons >= 1);
    assert.ok(c.tour.echos.some(([x, y]) => x === a && y === b));
    assert.equal(c.tour.etage, b);
    assert.equal(c.tour.sommet, b);
    // redescendre sous a puis remonter : le même écho ne tombe pas deux fois ; repartir d'au-dessus de a ne le lit pas
    const avant = c.objets.length;
    c = arriverDansCoffre(c, a + 1).coffre;
    assert.equal(c.tour.depuis, a + 1);
    for (let e = a + 2; e <= b; e++) c = arriverDansCoffre(c, e).coffre;
    assert.equal(c.objets.length, avant);
    const base = coffreAtelier("vide");
    let d: Coffre = { ...base, tour: { ...base.tour, etage: a + 1, sommet: a + 1, depuis: a + 1 } };
    for (let e = a + 2; e <= b; e++) d = arriverDansCoffre(d, e).coffre;
    assert.equal(
      d.tour.echos.some(([x, y]) => x === a && y === b),
      false,
    );
    assert.equal(d.objets.length, 0);
  });

  it("antre : le gardien tient l'axe ; les trois temps du duel sur des mots figés ; repoussé d'un étage", () => {
    const g5 = gardienDe(ETAGE);
    assert.equal(tientAxeElite(g5.q, coupeDe(ETAGE)), true);
    assert.equal(g5.classe, occupantsDe(ETAGE)[0]!.classe);
    assert.deepEqual(gardienDe(ETAGE), g5);
    for (const p of PORTES) assert.equal(tientAxeSupreme(gardienDe(p).q, coupeDe(p)), true);
    const ticket = {
      ...objet(objetDepuisGraine(sha256d(utf8("ticket")), "Kali").mot, "lair", {
        palierLair: 1,
        nom: "lair-1",
      }),
      archetype: "lune",
    };
    const c0: Coffre = {
      ...coffreAtelier("vide"),
      tour: { ...coffreAtelier("vide").tour, etage: ETAGE, sommet: ETAGE },
    };
    assert.equal(ticketPour({ objets: [ticket] }, ETAGE), 0);
    assert.equal(ticketPour({ objets: [ticket] }, 100), -1);
    const sansTicket = franchirAntre(c0, ETAGE);
    assert.equal(sansTicket.ok, false);
    if (!sansTicket.ok) assert.equal(sansTicket.code, "ticket");
    const fig = figureOrbite(g5.q);
    // temps 1 : même orbite
    const m1 = chercher((m) => figureOrbite(qDeMot(m)) === fig, "duel-orbite");
    const c1: Coffre = { ...c0, objets: [ticket, objet(m1)] };
    const d1 = lireDuel(c1, ETAGE);
    assert.equal(d1.temps, 1);
    const r1 = franchirAntre(c1, ETAGE);
    assert.equal(r1.ok, true);
    if (r1.ok) {
      assert.ok(["gemme", "pierre"].includes(r1.don.genre));
      assert.ok(r1.don.affixe === "T3" || r1.don.affixe === "S3");
      assert.equal(
        r1.coffre.objets.some((o) => o.genre === "lair"),
        false,
        "ticket consommé",
      );
      assert.deepEqual(r1.coffre.tour.antres, [ETAGE]);
      const deja = franchirAntre(r1.coffre, ETAGE);
      assert.equal(deja.ok, false);
      if (!deja.ok) assert.equal(deja.code, "deja");
    }
    // temps 2 : l'objet tient l'axe du biome ; ou le mercure
    const m2 = chercher(
      (m) => figureOrbite(qDeMot(m)) !== fig && tientAxeElite(qDeMot(m), coupeDe(ETAGE)),
      "duel-axe",
    );
    const d2 = lireDuel({ ...c0, objets: [ticket, objet(m2)] }, ETAGE);
    assert.equal(d2.orbite, false);
    assert.equal(d2.tientAxe, true);
    assert.equal(d2.temps, 2);
    const m0 = chercher((m) => {
      const d = lireDuel({ ...c0, objets: [ticket, objet(m)] }, ETAGE);
      return !d.orbite && !d.tientAxe && d.tenue === 0n;
    }, "duel-rien");
    const cM: Coffre = {
      ...c0,
      objets: [ticket, objet(m0)],
      tour: { ...c0.tour, elixirs: [{ etage: ETAGE, mot: 1, espece: "mercure" }] },
    };
    assert.equal(lireDuel(cM, ETAGE).temps, 2);
    assert.equal(lireDuel(cM, ETAGE).mercure, true);
    // temps 3 : la résonance d'ensemble ; sans rien, repoussé d'un étage, le ticket reste
    const c3: Coffre = { ...c0, objets: [ticket, objet(m0)] };
    const d3 = lireDuel(c3, ETAGE);
    assert.equal(d3.orbite, false);
    assert.equal(d3.parade, false);
    assert.equal(d3.tenue, 0n);
    assert.equal(d3.passage, false);
    const rep = franchirAntre(c3, ETAGE);
    assert.equal(rep.ok, false);
    if (!rep.ok) {
      assert.equal(rep.code, "repousse");
      assert.equal(rep.coffre.tour.etage, ETAGE - 1);
      assert.equal(rep.coffre.objets.length, 2);
    }
    const m3 = chercher((m) => {
      const d = lireDuel({ ...c0, objets: [ticket, objet(m0, "armure"), objet(m)] }, ETAGE);
      return !d.orbite && !d.tientAxe && d.tenue > 0n;
    }, "duel-ensemble");
    const c4: Coffre = { ...c0, objets: [ticket, objet(m0, "armure"), objet(m3)] };
    const d4 = lireDuel(c4, ETAGE);
    assert.equal(d4.temps, 3);
    assert.ok(d4.tenue > 0n);
    // une capture libérée de la classe du gardien dessert ; le sel lit ce heurt neutre
    const meme = { q: g5.q, classe: g5.classe };
    const heurt = tenueLue([{ q: qDeMot(m3), classe: "mars" }, meme, meme], false);
    const sel = tenueLue([{ q: qDeMot(m3), classe: "mars" }, meme, meme], true);
    assert.ok(sel.tenue > heurt.tenue);
    assert.ok(sel.paires.every((p) => p.polarite !== "destructif"));
  });

  it("observatoire : l'étage 254 lit, il ne donne rien", () => {
    assert.equal(OBSERVATOIRE, 254);
    assert.equal(estObservatoire(254), true);
    assert.equal(estObservatoire(253), false);
    const u = hoteDe(254)!;
    assert.equal(u.muse, "uranie");
    assert.equal(u.majeur, true);
    assert.deepEqual(u.don, { genre: "service", service: "lecture" });
    const c0 = coffreAtelier("vide");
    assert.deepEqual(honorerDansCoffre(c0, 254, { ages: [] }), { ok: false, code: "service" });
    const l = lectureObservatoire(c0);
    assert.deepEqual(l, {
      etage: 254,
      honores: 0,
      echos: 0,
      antres: 0,
      alcoves: 0,
      captures: 0,
      bus: 0,
      portes: [],
    });
    const c: Coffre = { ...c0, tour: { ...c0.tour, dons: [0, 42], portes: ["Dvapara"] } };
    assert.equal(lectureObservatoire(c).honores, 2);
    assert.deepEqual(lectureObservatoire(c).portes, ["Dvapara"]);
  });
});

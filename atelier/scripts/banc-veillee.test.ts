import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { tourVide } from "../src/lib/eidos/jauge.ts";
import { CRANS, ETAPES } from "../src/lib/eidos/pendule.ts";
import { ouvrirBataille } from "../src/lib/eidos/tactique/bataille.ts";
import { caseLibre, indechiffresDe, posesDuCoffre } from "../src/lib/eidos/tactique/partie.ts";
import type { Case, Coup } from "../src/lib/eidos/tactique/types.ts";
import { uniteDepuisObjet } from "../src/lib/eidos/tactique/unite.ts";
import { dalleDe } from "../src/lib/eidos/tour.ts";
import {
  CONFIGURATIONS,
  ETALONS_VEILLEE_COMPLET,
  ETALONS_VEILLEE_RAPIDE,
  PAR_BANDE_DU_DEPOT,
  PARAMETRES_VEILLEE,
  ROSTER,
  SEUILS,
  TOLERANCES_VEILLEE,
  bancVeillee,
  etageDeSalles,
  etageDuDepot,
  formaterResultat,
  jouerRun,
  peutDepenser,
  premiereTombee,
  recrueDe,
  rosterDe,
  type Configuration,
} from "./banc-veillee.ts";

const cfgDe = (nom: string): Configuration => {
  const c = CONFIGURATIONS.find((x) => x.nom === nom);
  assert.ok(c !== undefined, `configuration ${nom}`);
  return c;
};

/** Un verdict ne se compare à celui du complet que loin des seuils : à 24 runs, un run vaut 42 ‰. */
function loinDesSeuils(e: { arrivesMille: number; gardentMille: number | null }): boolean {
  const marge = TOLERANCES_VEILLEE.verdict;
  if (Math.abs(e.arrivesMille - SEUILS.arriveeMin) < marge) return false;
  if (e.gardentMille !== null && Math.abs(e.gardentMille - SEUILS.gardentMax) < marge) return false;
  return true;
}

describe("banc de la veillée — le budget d'une run entière, échantillon gelé", () => {
  const p = PARAMETRES_VEILLEE.rapide;
  const r = bancVeillee("rapide");

  it("rejoue le pendule du dépôt : à un étage par bande, etageDeSalles est etageDe", () => {
    assert.equal(PAR_BANDE_DU_DEPOT, 1);
    for (let i = 0; i < ETAPES; i++) {
      for (let q = 0; q < CRANS; q++) {
        for (const octet of [0, 1, 2, 3, 127, 254, 255]) {
          const h = new Uint8Array(32);
          h[1] = octet;
          assert.equal(etageDeSalles(i, q, h, 1), etageDuDepot(i, q, h), `étape ${i}, position ${q}, octet ${octet}`);
        }
      }
    }
    // à un étage par bande, neuf étapes balaient les neuf bandes : la dernière est celle d'Uranie
    const h0 = new Uint8Array(32);
    assert.equal(etageDeSalles(0, 0, h0, 1), 0);
    for (let q = 0; q < CRANS; q++) assert.ok(etageDeSalles(8, q, h0, 1) >= 226, `étape 8 en bande d'Uranie (position ${q})`);
    // à trois étages par bande (l'ancien code, en référence), vingt-sept étapes restent dans leur bande
    for (let i = 0; i < 27; i++) for (let q = 0; q < CRANS; q++) {
      const e = etageDeSalles(i, q, h0, 3);
      assert.ok(e >= 0 && e <= 254 && (i === 0 ? e === 0 : Math.floor((e * 9) / 255) === Math.floor(i / 3)), `étape ${i} (3 par bande), position ${q} → ${e}`);
    }
  });

  it("quarante-cinq configurations : douze socles avec et sans permadeath, les neuf contreparties d'A28 à 9 salles, le bot qui ramasse", () => {
    assert.equal(r.configurations.length, 45);
    assert.equal(CONFIGURATIONS.filter((c) => c.regle === "coup").length, 4 + 9 + 2);
    assert.equal(CONFIGURATIONS.filter((c) => c.permadeath).length, 6 + 27);
    // les douze premières sont celles du 2026-09-14, intactes : la lice seule, aucune contrepartie, aucun butin
    for (const c of CONFIGURATIONS.slice(0, 12)) {
      assert.equal(c.contrepartie, "aucune", c.nom);
      assert.equal(c.reserve, ROSTER, c.nom);
      assert.equal(c.butin, 0, c.nom);
    }
    // les six dernières ramassent, sur le roster qui revient, à 9 salles
    const ramassent = CONFIGURATIONS.slice(39);
    assert.deepEqual(ramassent.map((c) => c.butin), [1, 2, 1, 2, 1, 2]);
    assert.ok(ramassent.every((c) => !c.permadeath && c.salles === 9 && c.contrepartie === "aucune" && c.reserve === ROSTER));
    assert.ok(CONFIGURATIONS.slice(0, 39).every((c) => c.butin === 0), "seules les six dernières ramassent");
    const contreparties = CONFIGURATIONS.slice(12, 39);
    assert.ok(contreparties.every((c) => c.permadeath && c.salles === 9), "les contreparties se mesurent à 9 salles, en permadeath");
    assert.deepEqual(
      contreparties.filter((c) => c.contrepartie === "perdue").map((c) => c.reserve),
      [3, 6, 9, 3, 6, 9, 3, 6, 9],
    );
    assert.deepEqual(contreparties.filter((c) => c.contrepartie === "recrue").map((c) => c.reserve), [3, 3, 3]);
    assert.deepEqual(
      contreparties.filter((c) => c.contrepartie === "aucune").map((c) => c.reserve),
      [6, 9, 12, 6, 9, 12, 6, 9, 12],
    );
    assert.deepEqual(contreparties.filter((c) => c.contrepartie === "perdue-1").map((c) => c.reserve), [3, 6, 3, 6, 3, 6]);
    for (const c of r.configurations) assert.equal(c.runs, p.runs);
    assert.deepEqual(r.seuils, SEUILS);
  });

  it("se rejoue à l'octet : le même run deux fois rend le même compte, deux rosters ne rendent pas le même", () => {
    const cfg = CONFIGURATIONS[0]!;
    assert.deepEqual(jouerRun(cfg, 0, 0), jouerRun(cfg, 0, 0));
    assert.deepEqual(jouerRun(cfgDe("mort-32-9"), 2, 5), jouerRun(cfgDe("mort-32-9"), 2, 5));
    assert.notDeepEqual(jouerRun(cfg, 0, 0), jouerRun(cfg, 0, 1));
  });

  it("les configurations sont appariées : même jour, même roster, mêmes batailles — seule la règle change", () => {
    // sans permadeath, à 9 salles, les trois règles jouent les mêmes 8 batailles tant qu'aucune n'épuise
    const trois = ["coup-64-9", "mort-32-9", "mort-64-9"].map(cfgDe);
    let comparees = 0;
    for (let k = 0; k < p.runs; k++) {
      const runs = trois.map((c) => jouerRun(c, k % p.jours, k));
      if (runs.some((x) => x.fin !== "sommet")) continue;
      comparees += 1;
      for (const x of runs.slice(1)) {
        assert.equal(x.batailles, runs[0]!.batailles, `run ${k} : batailles`);
        assert.equal(x.coups, runs[0]!.coups, `run ${k} : coups`);
        assert.equal(x.morts, runs[0]!.morts, `run ${k} : morts`);
        assert.equal(x.defaites, runs[0]!.defaites, `run ${k} : défaites`);
      }
    }
    assert.ok(comparees >= p.runs / 2, `${comparees} runs comparés sur ${p.runs}`);
    // et le budget seul les distingue : « mort » à 32 garde moins que « coup » à 64
    const a = jouerRun(cfgDe("coup-64-9"), 0, 0);
    const b = jouerRun(cfgDe("mort-32-9"), 0, 0);
    assert.equal(a.feuilles, 64 - 8 - a.coups);
    assert.equal(b.feuilles, 32 - 8 - b.morts);
  });

  it("un run se lit : un franchir par salle, le dernier est le sommet, l'arbre vide est une fin", () => {
    for (const cfg of CONFIGURATIONS.filter((c) => !c.permadeath)) {
      for (let k = 0; k < 6; k++) {
        const run = jouerRun(cfg, k, k);
        const franchir = cfg.salles - 1;
        assert.ok(run.batailles >= 1 && run.batailles <= franchir, `${cfg.nom} : ${run.batailles} batailles`);
        assert.equal(run.victoires + run.defaites + run.nuls + run.epuisees, run.batailles, `${cfg.nom} : chaque bataille dans une case`);
        if (run.fin === "sommet") {
          assert.equal(run.salle, franchir);
          assert.equal(run.batailles, franchir, "la dernière salle ne se joue pas");
          const depense = cfg.regle === "coup" ? run.coups : run.morts;
          assert.equal(run.feuilles, cfg.arbre - franchir - depense - run.butin, `${cfg.nom} : le compte des feuilles`);
          assert.ok(run.feuilles >= 0);
        } else {
          // épuisé : l'arbre était vide — un franchir par salle atteinte, une feuille par coup ou par retrait, et par geste
          assert.equal(run.feuilles, 0);
          assert.ok(run.salle < cfg.salles);
          if (cfg.regle === "coup") assert.equal(run.coups + run.salle + run.butin, cfg.arbre, `${cfg.nom} : coups + franchir + butin = arbre`);
          else assert.ok(run.morts + run.salle + run.butin >= cfg.arbre, `${cfg.nom} : morts + franchir + butin ≥ arbre`);
        }
      }
    }
  });

  it("en permadeath, arriver c'est arriver vivant ; la règle telle qu'écrite vide le roster avant la troisième salle", () => {
    for (const c of r.configurations.filter((x) => x.permadeath)) {
      assert.ok(c.arrivesMille <= 1000 - c.rosterBalayeMille, `${c.nom} : un roster mort n'arrive pas`);
      assert.equal(c.verdict.tropCourt, c.arrivesMille < SEUILS.arriveeMin);
    }
    for (const c of r.configurations.filter((x) => x.permadeath && x.contrepartie === "aucune" && x.reserve === ROSTER)) {
      assert.ok(c.rosterBalayeMille >= 900, `${c.nom} : roster balayé ${c.rosterBalayeMille} ‰`);
      assert.ok((c.salleBalayeMediane ?? 99) <= 2, `${c.nom} : balayé à la salle ${c.salleBalayeMediane}`);
      assert.equal(c.recruesParRunMille, 0, `${c.nom} : aucune recrue sans la contrepartie`);
    }
  });

  it("les contreparties d'A28 se lisent run par run : « perdue » ne retire qu'à la défaite, la réserve prolonge, la recrue coûte une feuille", () => {
    const socle = cfgDe("coup-64-9");
    const perdue = cfgDe("coup-64-9-pd-perdue");
    const recrue = cfgDe("coup-64-9-pd-recrue");
    const reserves = [cfgDe("coup-64-9-pd-r6"), cfgDe("coup-64-9-pd-r9"), cfgDe("coup-64-9-pd-r12")];
    const perdueR6 = cfgDe("coup-64-9-pd-perdue-r6");
    // la garde de la recrue : une feuille par salle qui reste à franchir, à la feuille près
    assert.equal(peutDepenser(9, 0, 8), true);
    assert.equal(peutDepenser(8, 0, 8), false);
    assert.equal(peutDepenser(2, 7, 8), true);
    assert.equal(peutDepenser(1, 7, 8), false);
    // et elle mord : à 9 feuilles, huit franchirs à payer, aucune victoire ne laisse de quoi recruter
    const arbreNu = { ...recrue, nom: "recrue-9-feuilles", arbre: 9 };
    let recruesAvecGarde = 0;
    for (let k = 0; k < p.runs; k++) recruesAvecGarde += jouerRun(arbreNu, k % p.jours, k).recrues;
    assert.equal(recruesAvecGarde, 0, "à 9 feuilles la garde refuse toute recrue");
    // la réserve prolonge le roster sans le changer : ses trois premiers sont l'équipe des autres configurations
    for (let k = 0; k < 4; k++) assert.deepEqual(rosterDe(k, 12).slice(0, ROSTER), rosterDe(k));
    // la recrue est l'Indéchiffré qu'on vient d'abattre, lu comme partie.ts le lit : la même unité,
    // mot, archétype, âge, classe et axes (l'archétype permute les axes : le mot seul ne suffit pas)
    const coffreVide = { objets: [], tour: tourVide() };
    for (const etage of [0, 17, 130, 254]) {
      assert.deepEqual(recrueDe(etage), recrueDe(etage));
      const modele = indechiffresDe(coffreVide, etage)[0]!;
      const rec = recrueDe(etage);
      const u = uniteDepuisObjet(rec.objet, modele.id, modele.camp, modele.pos, rec.classe);
      assert.deepEqual(
        { mot: u.mot, archetype: u.archetype, age: u.age, classe: u.classe, axes: u.axes, tenue: u.tenue },
        { mot: modele.mot, archetype: modele.archetype, age: modele.age, classe: modele.classe, axes: modele.axes, tenue: modele.tenue },
        `étage ${etage}`,
      );
    }
    let avecDefaite = 0;
    let avecRecrue = 0;
    for (let k = 0; k < p.runs; k++) {
      const d = k % p.jours;
      const s = jouerRun(socle, d, k);
      const a = jouerRun(perdue, d, k);
      // « perdue » : sans défaite, le run est celui du socle ; à la première défaite, la lice entière quitte le coffre
      if (a.defaites === 0) {
        assert.equal(a.perdues, 0, `run ${k} : rien ne quitte le coffre sans défaite`);
        assert.equal(a.rosterBalaye, null);
        assert.deepEqual({ ...a, perdues: 0, recrues: 0 }, { ...s, perdues: 0, recrues: 0 }, `run ${k} : le socle`);
      } else {
        avecDefaite += 1;
        assert.equal(a.defaites, 1, `run ${k} : la première défaite est la dernière bataille`);
        assert.equal(a.perdues, ROSTER);
        assert.equal(a.rosterBalaye, a.premiereDefaite);
        assert.equal(a.batailles, a.premiereDefaite! + 1);
      }
      // la réserve : tant que la lice reste pleine (trois vivants), une réserve plus longue rejoue le même run ;
      // dès qu'on entre à deux, les batailles divergent et rien ne s'ordonne run par run
      const rs = reserves.map((c) => jouerRun(c, d, k));
      for (let i = 1; i < rs.length; i++) {
        const court = rs[i - 1]!;
        const long = rs[i]!;
        if (court.perdues <= reserves[i - 1]!.reserve - ROSTER) assert.deepEqual(long, court, `run ${k} : réserve ${reserves[i]!.reserve} rejoue ${reserves[i - 1]!.reserve}`);
        else assert.ok(court.perdues > reserves[i - 1]!.reserve - ROSTER && long.perdues > reserves[i - 1]!.reserve - ROSTER, `run ${k} : la lice s'est vidée sous les deux`);
      }
      // « perdue » sur une réserve : le même run tant qu'aucune bataille n'est perdue ; à la première défaite, la lice
      // entière quitte le coffre et la réserve prend la suite
      const ar6 = jouerRun(perdueR6, d, k);
      if (a.defaites === 0) assert.deepEqual(ar6, a, `run ${k} : perdue-r6 rejoue perdue`);
      else {
        assert.equal(ar6.premiereDefaite, a.premiereDefaite, `run ${k} : la même première défaite`);
        assert.ok(ar6.perdues >= ROSTER && ar6.perdues <= perdueR6.reserve, `run ${k} : perdues ${ar6.perdues}`);
        assert.ok(ar6.batailles >= a.batailles, `run ${k} : la réserve se bat encore`);
      }
      // la recrue : au plus une par salle gagnée, une feuille chacune, jamais sans une tombée avant
      const b = jouerRun(recrue, d, k);
      assert.ok(b.recrues <= b.victoires, `run ${k} : ${b.recrues} recrues pour ${b.victoires} victoires`);
      if (b.recrues > 0) {
        avecRecrue += 1;
        assert.ok(b.perdues > 0, `run ${k} : une recrue remplace une tombée`);
      }
      if (b.fin === "sommet") assert.equal(b.feuilles, recrue.arbre - (recrue.salles - 1) - b.coups - b.recrues, `run ${k} : le compte des feuilles avec les recrues`);
    }
    assert.ok(avecDefaite >= 3 && avecDefaite <= p.runs - 3, `${avecDefaite} runs avec défaite sur ${p.runs}`);
    assert.ok(avecRecrue >= 3, `${avecRecrue} runs avec recrue`);
    // et le compte par configuration : le puits se lit, la recrue n'existe que sous sa contrepartie
    const m = (nom: string) => r.configurations.find((c) => c.nom === nom)!;
    assert.ok(m("coup-64-9-pd-r12").perduesParRunMille > m("coup-64-9-pd-r6").perduesParRunMille);
    assert.ok(m("coup-64-9-pd-r12").arrivesMille >= m("coup-64-9-pd-r9").arrivesMille);
    assert.ok(m("coup-64-9-pd-r9").arrivesMille >= m("coup-64-9-pd-r6").arrivesMille);
    assert.ok(m("coup-64-9-pd-recrue").recruesParRunMille > 0);
    assert.equal(m("coup-64-9-pd-perdue").recruesParRunMille, 0);
  });

  it("« perdue-1 » se lit run par run : une défaite coûte la première tombée et rien d'autre, lue au journal du moteur", () => {
    // la première tombée est la cible du premier coup du journal qui retire une unité du coffre —
    // un Indéchiffré tombé avant ne compte pas, une riposte compte, un coup qui ne retire pas non plus
    const coffreVide = { objets: [], tour: tourVide() };
    const roster = rosterDe(0);
    const obstacles = dalleDe(0);
    const poses = posesDuCoffre(ROSTER);
    const prises: Case[] = [];
    const coffre = roster.map((m, j) => {
      const pos = caseLibre(obstacles, prises, poses[j]!);
      prises.push(pos);
      return uniteDepuisObjet(m.objet, j, "coffre", pos, m.classe);
    });
    const etat = ouvrirBataille(0, coffre, indechiffresDe(coffreVide, 0, prises), 64);
    const n = coffre.length;
    assert.ok(etat.unites.length > n, "au moins un Indéchiffré à l'étage 0");
    const coup = (attaquant: number, cible: number, retiree: boolean, riposte = false): Coup => ({
      attaquant, cible, base: 0, accord: 0, dos: 0, allonge: 0, charge: 0, porte: 0, tenueApres: retiree ? 0 : 1, retiree, riposte,
    });
    const journal = [coup(n, 0, false), coup(0, n, true), coup(n, 1, true, true), coup(n, 0, true), coup(n, 2, true)];
    assert.equal(premiereTombee({ ...etat, journal }), 1);
    assert.equal(premiereTombee({ ...etat, journal: journal.slice(3) }), 0);
    assert.throws(() => premiereTombee({ ...etat, journal: journal.slice(0, 2) }), /aucune unité du coffre retirée/);
    assert.throws(() => premiereTombee(etat), /aucune unité du coffre retirée/);

    const socle = cfgDe("coup-64-9");
    const perdue = cfgDe("coup-64-9-pd-perdue");
    const perdue1 = cfgDe("coup-64-9-pd-perdue1");
    const perdue1R6 = cfgDe("coup-64-9-pd-perdue1-r6");
    let avecDefaite = 0;
    let continues = 0;
    for (let k = 0; k < p.runs; k++) {
      const d = k % p.jours;
      const s = jouerRun(socle, d, k);
      const a = jouerRun(perdue, d, k);
      const e = jouerRun(perdue1, d, k);
      const e6 = jouerRun(perdue1R6, d, k);
      // une défaite, une unité : jamais plus, jamais moins ; le roster ne se vide qu'à la troisième
      assert.equal(e.perdues, e.defaites, `run ${k} : ${e.perdues} perdues pour ${e.defaites} défaites`);
      assert.ok(e.perdues <= ROSTER);
      assert.equal(e.rosterBalaye !== null, e.defaites === ROSTER, `run ${k} : balayé à la troisième défaite`);
      assert.equal(e.recrues, 0);
      assert.equal(e6.perdues, e6.defaites, `run ${k} : réserve de 6, ${e6.perdues} perdues pour ${e6.defaites} défaites`);
      assert.equal(e6.rosterBalaye !== null, e6.defaites === perdue1R6.reserve);
      if (a.defaites === 0) {
        // sans défaite, les trois sont le socle
        assert.deepEqual(e, a, `run ${k} : perdue-1 rejoue perdue`);
        assert.deepEqual(e6, e, `run ${k} : la réserve rejoue perdue-1`);
        assert.deepEqual({ ...e, perdues: 0, recrues: 0 }, { ...s, perdues: 0, recrues: 0 });
      } else {
        avecDefaite += 1;
        // jusqu'à la première défaite, le même run ; « perdue » s'y arrête, « perdue-1 » continue à deux
        assert.equal(e.premiereDefaite, a.premiereDefaite, `run ${k} : la même première défaite`);
        assert.equal(e6.premiereDefaite, a.premiereDefaite);
        assert.equal(a.batailles, a.premiereDefaite! + 1);
        assert.ok(e.batailles >= a.batailles, `run ${k} : perdue-1 se bat encore`);
        if (e.batailles > a.batailles) continues += 1;
      }
      // ce qui arrive sous « perdue » arrive sous « perdue-1 » (c'est le même run, sans défaite)
      if (a.fin === "sommet" && a.rosterBalaye === null) assert.ok(e.fin === "sommet" && e.rosterBalaye === null, `run ${k}`);
    }
    assert.ok(avecDefaite >= 3 && avecDefaite <= p.runs - 3, `${avecDefaite} runs avec défaite sur ${p.runs}`);
    assert.ok(continues >= 3, `${continues} runs continués après la première défaite`);
    // et le compte : un objet par défaite contre trois — le puits est plus petit, la réserve de 6 ne se vide jamais
    const m = (nom: string) => r.configurations.find((c) => c.nom === nom)!;
    assert.ok(m("coup-64-9-pd-perdue1").perduesParRunMille < m("coup-64-9-pd-perdue").perduesParRunMille);
    assert.ok(m("coup-64-9-pd-perdue1").arrivesMille >= m("coup-64-9-pd-perdue").arrivesMille);
    assert.ok(m("coup-64-9-pd-perdue1-r6").arrivesMille >= m("coup-64-9-pd-perdue1").arrivesMille);
    assert.ok(m("coup-64-9-pd-perdue1-r6").rosterBalayeMille <= m("coup-64-9-pd-perdue1").rosterBalayeMille);
  });

  it("le bot qui ramasse se lit run par run : un geste par salle gagnée sous la garde, l'arbre refuse ou se vide, jamais les deux à la fois", () => {
    const socles = ["coup-64-9", "mort-32-9", "mort-64-9"].map(cfgDe);
    let refuses = 0;
    let epuisesApresButin = 0;
    for (const socle of socles) {
      const b1 = cfgDe(`${socle.nom}-b1`);
      const b2 = cfgDe(`${socle.nom}-b2`);
      for (let k = 0; k < p.runs; k++) {
        const d = k % p.jours;
        const s = jouerRun(socle, d, k);
        const u = jouerRun(b1, d, k);
        const v = jouerRun(b2, d, k);
        assert.equal(s.butin + s.butinRefuse, 0, `${socle.nom} run ${k} : le socle ne ramasse rien`);
        for (const [cfg, run] of [[b1, u], [b2, v]] as const) {
          // voulu = l'appétit par salle gagnée ; pris + refusé = voulu ; jamais plus qu'une feuille par geste
          assert.equal(run.butin + run.butinRefuse, cfg.butin * run.victoires, `${cfg.nom} run ${k} : pris + refusé = voulu`);
          if (run.fin === "sommet") {
            assert.equal(run.feuilles, cfg.arbre - (cfg.salles - 1) - (cfg.regle === "coup" ? run.coups : run.morts) - run.butin);
            // la garde tient : un geste n'est refusé qu'à l'arbre à ras (une feuille par salle à franchir) —
            // un run refusé qui arrive quand même arrive à zéro, le dernier franchir étant le sommet
            if (run.butinRefuse > 0) assert.equal(run.feuilles, 0, `${cfg.nom} run ${k} : refusé avec ${run.feuilles} feuilles restantes`);
          }
          if (run.butinRefuse > 0) refuses += 1;
          if (run.fin === "epuise" && run.butin > 0) epuisesApresButin += 1;
        }
        // sous « mort », le moteur ne voit pas le budget : les batailles sont celles du socle, seul le compte change
        if (socle.regle === "mort") {
          for (const run of [u, v]) {
            if (run.fin !== "sommet") continue;
            assert.equal(run.batailles, s.batailles, `${socle.nom} run ${k} : mêmes batailles`);
            assert.equal(run.victoires, s.victoires);
            assert.equal(run.morts, s.morts);
            assert.equal(run.coups, s.coups);
          }
        }
        // deux gestes prennent au moins autant qu'un, et ne laissent pas plus
        if (u.fin === "sommet" && v.fin === "sommet") {
          assert.ok(v.butin >= u.butin, `${socle.nom} run ${k} : b2 ramasse au moins autant que b1`);
          assert.ok(v.feuilles <= u.feuilles);
        }
      }
    }
    assert.ok(refuses >= 3, `${refuses} runs où l'arbre a refusé un geste`);
    assert.ok(epuisesApresButin >= 3, `${epuisesApresButin} runs épuisés après avoir ramassé`);
    // et par configuration : ramasser coûte ce que l'arbre a ; « une mort à 32 » refuse et se vide, « un coup à 64 » finance deux gestes par salle
    const m = (nom: string) => r.configurations.find((c) => c.nom === nom)!;
    for (const socle of socles) {
      const s0 = m(socle.nom);
      const s1 = m(`${socle.nom}-b1`);
      const s2 = m(`${socle.nom}-b2`);
      assert.ok(s1.restantesMediane! < s0.restantesMediane!, `${socle.nom} : ramasser un geste coûte`);
      assert.ok(s2.butinParRunMille >= s1.butinParRunMille, `${socle.nom} : deux gestes ramassent au moins autant`);
      assert.ok(s1.butinVouluParRunMille >= s1.butinParRunMille);
      assert.equal(s0.butinRefuseMille, 0);
    }
    assert.ok(m("mort-32-9-b2").butinRefuseMille + m("mort-32-9-b2").epuisesMille > m("coup-64-9-b2").butinRefuseMille + m("coup-64-9-b2").epuisesMille);
    // « un coup à 64 » finance deux gestes par salle : le complet dit 46 ‰ des runs refusés (7 ‰ des batailles) — sur
    // 24 runs, un refus vaut 42 ‰ ; on demande donc « rare », jamais « jamais »
    assert.ok(m("coup-64-9-b2").butinRefuseMille <= TOLERANCES_VEILLEE.verdict, `« un coup à 64 » finance deux gestes par salle sur l'échantillon (${m("coup-64-9-b2").butinRefuseMille} ‰ refusés)`);
    assert.ok(m("mort-64-9-b2").butinRefuseMille <= TOLERANCES_VEILLEE.verdict);
  });

  it("ne dérive pas de sa calibration : arrivés, feuilles restantes, coups et morts par bataille", () => {
    for (const c of r.configurations) {
      const e = ETALONS_VEILLEE_RAPIDE[c.nom];
      assert.ok(e !== undefined, `étalon manquant pour ${c.nom}`);
      assert.ok(
        Math.abs(c.arrivesMille - e.arrivesMille) <= TOLERANCES_VEILLEE.arrives,
        `${c.nom} : arrivés ${c.arrivesMille} ‰ au lieu de ${e.arrivesMille}`,
      );
      assert.equal(c.restantesMediane === null, e.restantesMediane === null, `${c.nom} : arrivés ou non`);
      if (c.restantesMediane !== null && e.restantesMediane !== null) {
        assert.ok(
          Math.abs(c.restantesMediane - e.restantesMediane) <= TOLERANCES_VEILLEE.restantes,
          `${c.nom} : restantes ${c.restantesMediane} au lieu de ${e.restantesMediane}`,
        );
      }
      assert.ok(
        Math.abs(c.coupsParBatailleMille - e.coupsParBatailleMille) <= TOLERANCES_VEILLEE.coups,
        `${c.nom} : coups ${c.coupsParBatailleMille} ‰ au lieu de ${e.coupsParBatailleMille}`,
      );
      assert.ok(
        Math.abs(c.mortsParBatailleMille - e.mortsParBatailleMille) <= TOLERANCES_VEILLEE.morts,
        `${c.nom} : morts ${c.mortsParBatailleMille} ‰ au lieu de ${e.mortsParBatailleMille}`,
      );
    }
  });

  it("l'échantillon dit ce que le complet dit : 27 salles ne se financent pas, 9 salles tiennent le budget", () => {
    let verdictsCompares = 0;
    for (const c of r.configurations) {
      const complet = ETALONS_VEILLEE_COMPLET[c.nom];
      assert.ok(complet !== undefined, `étalon complet manquant pour ${c.nom}`);
      if (loinDesSeuils(complet)) {
        verdictsCompares += 1;
        assert.deepEqual(c.verdict, complet.verdict, `${c.nom} : ${JSON.stringify(c.verdict)} au lieu de ${JSON.stringify(complet.verdict)}`);
      }
      // le bot qui ramasse mesure justement ce que l'arbre ne finance pas : il ne juge pas le socle
      if (!c.permadeath && c.butin === 0) {
        if (c.salles === 27) assert.ok(c.arrivesMille <= 100, `${c.nom} : 27 salles, presque personne n'arrive (${c.arrivesMille} ‰)`);
        else assert.ok(c.arrivesMille >= 900, `${c.nom} : 9 salles, le budget tient (${c.arrivesMille} ‰)`);
      }
    }
    assert.ok(verdictsCompares >= 9, `${verdictsCompares} verdicts loin des seuils comparés au complet`);
  });

  it("se formate en un tableau, une ligne par configuration", () => {
    const texte = formaterResultat(r);
    assert.equal(texte.split("\n").length, 2 + r.configurations.length);
    assert.ok(texte.includes("coup-64-9 |") && texte.includes("mort-32-9 |"));
  });
});

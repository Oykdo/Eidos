import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { tourVide } from "../src/lib/eidos/jauge.ts";
import { CRANS, ETAPES } from "../src/lib/eidos/pendule.ts";
import { indechiffresDe } from "../src/lib/eidos/tactique/partie.ts";
import { uniteDepuisObjet } from "../src/lib/eidos/tactique/unite.ts";
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
  peutRecruter,
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

  it("rejoue le pendule du dépôt : à trois étages par bande, etageDeSalles est etageDe", () => {
    assert.equal(PAR_BANDE_DU_DEPOT, 3);
    for (let i = 0; i < ETAPES; i++) {
      for (let q = 0; q < CRANS; q++) {
        assert.equal(etageDeSalles(i, q, 3), etageDuDepot(i, q), `étape ${i}, position ${q}`);
      }
    }
    // à un étage par bande, neuf étapes balaient les neuf bandes : la dernière est celle d'Uranie
    assert.equal(etageDeSalles(0, 0, 1), 0);
    for (let q = 0; q < CRANS; q++) assert.ok(etageDeSalles(8, q, 1) >= 226, `étape 8 en bande d'Uranie (position ${q})`);
  });

  it("trente-trois configurations : douze socles avec et sans permadeath, puis les sept contreparties d'A28 à 9 salles", () => {
    assert.equal(r.configurations.length, 33);
    assert.equal(CONFIGURATIONS.filter((c) => c.regle === "coup").length, 4 + 7);
    assert.equal(CONFIGURATIONS.filter((c) => c.permadeath).length, 6 + 21);
    // les douze premières sont celles du 2026-09-14, intactes : la lice seule, aucune contrepartie
    for (const c of CONFIGURATIONS.slice(0, 12)) {
      assert.equal(c.contrepartie, "aucune", c.nom);
      assert.equal(c.reserve, ROSTER, c.nom);
    }
    const contreparties = CONFIGURATIONS.slice(12);
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
          assert.equal(run.feuilles, cfg.arbre - franchir - depense, `${cfg.nom} : le compte des feuilles`);
          assert.ok(run.feuilles >= 0);
        } else {
          // épuisé : l'arbre était vide — un franchir par salle atteinte, une feuille par coup ou par retrait
          assert.equal(run.feuilles, 0);
          assert.ok(run.salle < cfg.salles);
          if (cfg.regle === "coup") assert.equal(run.coups + run.salle, cfg.arbre, `${cfg.nom} : coups + franchir = arbre`);
          else assert.ok(run.morts + run.salle >= cfg.arbre, `${cfg.nom} : morts + franchir ≥ arbre`);
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
    assert.equal(peutRecruter(9, 0, 8), true);
    assert.equal(peutRecruter(8, 0, 8), false);
    assert.equal(peutRecruter(2, 7, 8), true);
    assert.equal(peutRecruter(1, 7, 8), false);
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
      if (!c.permadeath) {
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

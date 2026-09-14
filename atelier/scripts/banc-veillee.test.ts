import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CRANS, ETAPES } from "../src/lib/eidos/pendule.ts";
import {
  CONFIGURATIONS,
  ETALONS_VEILLEE_COMPLET,
  ETALONS_VEILLEE_RAPIDE,
  PAR_BANDE_DU_DEPOT,
  PARAMETRES_VEILLEE,
  SEUILS,
  TOLERANCES_VEILLEE,
  bancVeillee,
  etageDeSalles,
  etageDuDepot,
  formaterResultat,
  jouerRun,
  type Configuration,
} from "./banc-veillee.ts";

const cfgDe = (nom: string): Configuration => {
  const c = CONFIGURATIONS.find((x) => x.nom === nom);
  assert.ok(c !== undefined, `configuration ${nom}`);
  return c;
};

/** Un verdict ne se compare à celui du complet que loin des seuils : à 30 runs, un run vaut 33 ‰. */
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

  it("douze configurations, les deux règles à leur arbre, 27 et 9 salles, avec et sans permadeath", () => {
    assert.equal(r.configurations.length, 12);
    assert.equal(CONFIGURATIONS.filter((c) => c.regle === "coup").length, 4);
    assert.equal(CONFIGURATIONS.filter((c) => c.permadeath).length, 6);
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
      assert.ok(c.rosterBalayeMille >= 900, `${c.nom} : roster balayé ${c.rosterBalayeMille} ‰`);
      assert.ok((c.salleBalayeMediane ?? 99) <= 2, `${c.nom} : balayé à la salle ${c.salleBalayeMediane}`);
      assert.ok(c.arrivesMille <= 1000 - c.rosterBalayeMille, `${c.nom} : un roster mort n'arrive pas`);
      assert.equal(c.verdict.tropCourt, c.arrivesMille < SEUILS.arriveeMin);
    }
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

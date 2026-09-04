import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sha256d, utf8 } from "./hash.ts";
import {
  BANDES,
  CRANS,
  ETAPES,
  bandeDe,
  debutBande,
  etageDe,
  graineRun,
  penduleInitial,
  rangBande,
  run,
  transition,
} from "./pendule.ts";
import { SEUILS, repetition, simuler } from "./pendule-phase0.ts";
import { ETAGES, biomeDe } from "./tour.ts";

const graine = graineRun("eidos-atelier-reseau-essai-v1", 0, sha256d(utf8("ville/test")));

describe("pendule-9 — parcours, jamais contenu", () => {
  it("neuf bandes contiguës qui couvrent 0..254, alignées sur biomeDe", () => {
    assert.equal(debutBande(0), 0);
    for (let k = 0; k < BANDES; k++) {
      const d = debutBande(k);
      const f = k + 1 < BANDES ? debutBande(k + 1) - 1 : ETAGES - 1;
      assert.ok(f - d + 1 >= 27, `bande ${k} : ${f - d + 1} étages, il en faut 27 pour 9 triplets`);
      assert.equal(bandeDe(d), k);
      assert.equal(bandeDe(f), k);
      assert.equal(biomeDe(d).id, biomeDe(f).id);
    }
    assert.equal(bandeDe(ETAGES - 1), BANDES - 1);
    assert.equal(rangBande(0), 8); // Terre
    assert.equal(rangBande(8), 0); // Uranie
  });

  it("l'étage d'une étape reste dans sa bande ; l'étape 0 est la porte de la ville", () => {
    for (let i = 0; i < ETAPES; i++) {
      for (let p = 0; p < CRANS; p++) {
        const e = etageDe(i, p);
        assert.equal(bandeDe(e), i === 0 ? 0 : Math.floor(i / 3), `étape ${i} cran ${p} → ${e}`);
      }
    }
    assert.equal(etageDe(0, 5), 0);
    assert.equal(etageDe(26, 8), ETAGES - 1);
  });

  it("déterminisme : même graine, mêmes choix, même objet ⇒ même run ; un choix change la suite", () => {
    const a = run(graine, () => "monter", () => 42);
    const b = run(graine, () => "monter", () => 42);
    assert.deepEqual(a, b);
    assert.equal(a.length, ETAPES);
    const c = run(graine, (i) => (i === 3 ? "lire" : "monter"), () => 42);
    assert.deepEqual(c.slice(0, 4), a.slice(0, 4));
    assert.notDeepEqual(c.slice(4), a.slice(4));
    const d = run(graine, () => "monter", () => 43);
    assert.notDeepEqual(d, a);
    for (const et of a) {
      assert.ok(et.p >= 0 && et.p < CRANS && et.s.x >= 0 && et.s.x < 9 && et.s.y === et.p);
    }
  });

  it("table de vérité gelée : les 27 étapes d'un run de référence", () => {
    const a = run(graine, (i) => (["monter", "lire", "offrir"] as const)[i % 3]!, (i) => 0x1234_5678 + i);
    const table = a.map((x) => `${x.p}:${x.e}:${x.s.x}`).join(" ");
    assert.equal(penduleInitial(graine), a[0]!.p);
    // gelée le 2026-09-04 ; toute modification de la transition doit la régénérer sciemment
    assert.equal(table, TABLE_GELEE);
  });

  it("la transition dépend de la résonance de l'étage quitté et du sens de la muse", () => {
    const t1 = transition(graine, 5, 4, 10, "monter", 1);
    const t2 = transition(graine, 5, 4, 11, "monter", 1);
    assert.ok(t1.p !== t2.p || t1.h.join() !== t2.h.join());
    const bandeImpaire = debutBande(1); // Lune, rang 7 : sens inversé
    assert.equal(rangBande(1) % 2, 1);
    const t3 = transition(graine, 3, 0, bandeImpaire, "monter", 1);
    assert.ok(t3.p >= 0 && t3.p < CRANS);
  });

  it("phase 0 : les trois mesures tiennent sur 2 000 runs", () => {
    const r = simuler(2000, 11);
    assert.ok(r.couverture >= SEUILS.couvertureMin, `couverture ${r.couverture}`);
    assert.ok(r.repetitionMoyenne <= SEUILS.repetitionMax, `répétition ${r.repetitionMoyenne}`);
    assert.ok(r.gemmesParLigneMax <= SEUILS.gemmesParLigneMax, `gemmes ${r.gemmesParLigneMax}`);
    assert.ok(r.verdict.ok);
    assert.equal(repetition(run(graine, () => "monter", () => 1), run(graine, () => "monter", () => 1)), 1);
  });
});

const TABLE_GELEE =
  "3:0:5 7:23:6 2:8:1 3:38:1 1:33:6 3:40:7 5:72:8 8:83:3 2:65:2 4:98:7 4:99:7 4:100:5 2:120:2 6:133:3 7:137:1 0:142:2 5:158:7 8:169:7 0:170:4 2:177:0 7:194:0 1:202:8 5:215:1 2:207:4 2:233:7 3:237:4 6:247:2";

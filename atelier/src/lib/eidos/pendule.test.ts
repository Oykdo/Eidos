import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { concat, sha256d, utf8 } from "./hash.ts";
import {
  BANDES,
  CRANS,
  ETAGES_PAR_BANDE,
  ETAPES,
  TAG_PENDULE,
  bandeDe,
  debutBande,
  etageDe,
  graineRun,
  penduleInitial,
  rangBande,
  run,
  transition,
  don,
  genreDon,
  quantiteDon,
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
      assert.ok(f - d + 1 >= CRANS * ETAGES_PAR_BANDE, `bande ${k} : ${f - d + 1} étages, il en faut ${CRANS * ETAGES_PAR_BANDE} pour neuf crans`);
      assert.equal(bandeDe(d), k);
      assert.equal(bandeDe(f), k);
      assert.equal(biomeDe(d).id, biomeDe(f).id);
    }
    assert.equal(bandeDe(ETAGES - 1), BANDES - 1);
    assert.equal(rangBande(0), 8); // Terre
    assert.equal(rangBande(8), 0); // Uranie
  });

  it("l'étage d'une étape reste dans sa bande, le cran choisit son neuvième, le hachage l'étage dedans ; l'étape 0 est la porte de la ville", () => {
    const h0 = new Uint8Array(32);
    for (let i = 0; i < ETAPES; i++) {
      for (let p = 0; p < CRANS; p++) {
        const vus = new Set<number>();
        for (let b = 0; b < 256; b++) {
          const h = new Uint8Array(32);
          h[1] = b;
          const e = etageDe(i, p, h);
          vus.add(e);
          assert.equal(bandeDe(e), i === 0 ? 0 : Math.floor(i / ETAGES_PAR_BANDE), `étape ${i} cran ${p} → ${e}`);
          // le neuvième du cran : cran 0 en bas de la bande, cran 8 en haut
          const k = Math.floor(i / ETAGES_PAR_BANDE);
          const debut = debutBande(k);
          const fin = k + 1 < BANDES ? debutBande(k + 1) - 1 : ETAGES - 1;
          const taille = fin - debut + 1;
          if (i > 0) {
            assert.ok(e >= debut + Math.floor((p * taille) / CRANS), `étape ${i} cran ${p} : ${e} sous son neuvième`);
            assert.ok(e <= Math.min(fin, debut + Math.floor(((p + 1) * taille) / CRANS) - 1 + ETAGES_PAR_BANDE - 1), `étape ${i} cran ${p} : ${e} au-dessus de son neuvième`);
          }
        }
        // le hachage fait visiter tout le neuvième (3 ou 4 étages), jamais un seul
        if (i > 0) assert.ok(vus.size >= 3, `étape ${i} cran ${p} : ${vus.size} étage(s) joignables au lieu de 3 au moins`);
      }
    }
    assert.equal(etageDe(0, 5, h0), 0);
    const hautH = new Uint8Array(32);
    hautH[1] = 255;
    assert.equal(etageDe(ETAPES - 1, CRANS - 1, hautH), ETAGES - 1);
    // tous les étages d'une bande sont joignables par un cran et un octet
    for (let k = 1; k < BANDES; k++) {
      const tous = new Set<number>();
      for (let p = 0; p < CRANS; p++) for (let b = 0; b < 256; b++) { const h = new Uint8Array(32); h[1] = b; tous.add(etageDe(k * ETAGES_PAR_BANDE, p, h)); }
      const debut = debutBande(k);
      const fin = k + 1 < BANDES ? debutBande(k + 1) - 1 : ETAGES - 1;
      assert.equal(tous.size, fin - debut + 1, `bande ${k} : ${tous.size} étages joignables sur ${fin - debut + 1}`);
    }
    void TAG_PENDULE;
    void concat;
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

  it("table de vérité gelée : les 9 étapes d'un run de référence", () => {
    const a = run(graine, (i) => (["monter", "lire", "offrir"] as const)[i % 3]!, (i) => 0x1234_5678 + i);
    const table = a.map((x) => `${x.p}:${x.e}:${x.s.x}`).join(" ");
    assert.equal(penduleInitial(graine), a[0]!.p);
    // gelée le 2026-09-04, régénérée le 2026-09-16 (A18 : 9 salles, l'étage choisi par le hachage dans le neuvième du cran) ;
    // toute modification de la transition doit la régénérer sciemment
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

  it("le don : le genre au hachage, la quantité à la position — jamais au maître ni au run", () => {
    for (let y = 0; y < CRANS; y++) {
      assert.equal(quantiteDon({ x: 4, y }), y + 1);
      for (let x = 0; x < CRANS; x++) assert.equal(quantiteDon({ x, y }), quantiteDon({ x: 0, y }));
    }
    const etapes = run(graine, () => "monter", () => 0);
    for (const et of etapes) {
      const d = don(et.e, et.s, "a", 0);
      assert.equal(d.genre, genreDon(et.e, et.s, "a", 0));
      assert.equal(d.quantite, et.p + 1);
      assert.equal(don(et.e, et.s, "b", 7).quantite, d.quantite);
      assert.ok(d.quantite >= 1 && d.quantite <= CRANS);
    }
  });
});

const TABLE_GELEE = "3:0:5 7:50:6 1:61:7 3:96:8 5:131:8 6:162:8 0:172:8 3:208:5 4:240:0";

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cadencer, lisser, normaliser, placerEtiquette, TOLERANCE_MS } from "./fond-orbital.ts";

describe("fond orbital — les calculs purs du composant", () => {
  it("le pointeur lissé rejoint la cible, puis revient à plat jusqu'à null", () => {
    let p = lisser(null, { x: 1, y: -0.5 });
    assert.deepEqual(p, { x: 0.1, y: -0.05 });
    for (let i = 0; i < 60; i++) p = lisser(p, { x: 1, y: -0.5 });
    assert.ok(
      p !== null && Math.abs(p.x - 1) < 0.01 && Math.abs(p.y + 0.5) < 0.01,
      "vers la cible",
    );
    // Cible retirée : retour lent, jamais un saut.
    const q = lisser(p, null);
    assert.ok(q !== null && q.x > 0.85 && q.x < p!.x, "un pas de dix pour cent");
    let r: ReturnType<typeof lisser> = q;
    let pas = 0;
    while (r !== null && pas < 200) {
      r = lisser(r, null);
      pas++;
    }
    assert.equal(r, null);
    assert.ok(pas > 30 && pas < 200, `retour à plat en ${pas} pas`);
    assert.equal(lisser(null, null), null);
    // Le pas se règle ; à k = 1 la cible est atteinte d'un coup.
    assert.deepEqual(lisser(null, { x: 0.3, y: 0.7 }, 1), { x: 0.3, y: 0.7 });
  });

  it("normaliser : centre = (0, 0), coins = ±1, jamais hors de [−1, 1]", () => {
    const vue = { largeur: 800, hauteur: 600 };
    assert.deepEqual(normaliser(400, 300, vue), { x: 0, y: 0 });
    assert.deepEqual(normaliser(0, 0, vue), { x: -1, y: -1 });
    assert.deepEqual(normaliser(800, 600, vue), { x: 1, y: 1 });
    assert.deepEqual(normaliser(-50, 5000, vue), { x: -1, y: 1 });
    assert.deepEqual(normaliser(10, 10, { largeur: 0, hauteur: 0 }), { x: 0, y: 0 });
  });

  it("cadencer : au plus trente images par seconde à 60, 120 et 144 Hz, jamais plus serrées que l'intervalle moins la tolérance", () => {
    const ips = 30;
    const intervalle = 1000 / ips;
    for (const hz of [60, 120, 144]) {
      let precedent: number | null = null;
      let dessins = 0;
      let dernier = -Infinity;
      const n = 10 * hz;
      for (let i = 0; i < n; i++) {
        const t = (i * 1000) / hz;
        const suivant = cadencer(precedent, t, ips);
        if (suivant === null) continue;
        assert.ok(
          t - dernier >= intervalle - TOLERANCE_MS - 1e-9,
          `${hz} Hz : deux images trop proches`,
        );
        dernier = t;
        precedent = suivant;
        dessins++;
      }
      assert.ok(dessins >= 285 && dessins <= 301, `${hz} Hz : ${dessins} images en dix secondes`);
    }
    assert.equal(cadencer(null, 123, ips), 123);
    assert.equal(cadencer(100, 110, ips), null);
    // Une horloge qui recule dessine sans attendre : la limite assumée.
    assert.equal(cadencer(100, 50, ips), 50);
  });

  it("l'étiquette reste dans la vue, à droite de l'astre sinon à gauche", () => {
    const vue = { largeur: 400, hauteur: 300 };
    const taille = { largeur: 200, hauteur: 40 };
    const droite = placerEtiquette({ x: 100, y: 150 }, taille, vue);
    assert.deepEqual(droite, { x: 114, y: 130 });
    const gauche = placerEtiquette({ x: 300, y: 150 }, taille, vue);
    assert.deepEqual(gauche, { x: 86, y: 130 });
    for (const a of [
      { x: 0, y: 0 },
      { x: 400, y: 0 },
      { x: 0, y: 300 },
      { x: 400, y: 300 },
      { x: 200, y: 150 },
    ]) {
      const p = placerEtiquette(a, taille, vue);
      assert.ok(p.x >= 14 && p.x + taille.largeur <= 400 - 14, `x ${p.x} pour ${a.x},${a.y}`);
      assert.ok(p.y >= 14 && p.y + taille.hauteur <= 300 - 14, `y ${p.y} pour ${a.x},${a.y}`);
    }
    // Trop large pour tenir d'aucun côté : calée à la marge gauche, elle déborde à droite (LIMITE).
    assert.deepEqual(placerEtiquette({ x: 150, y: 150 }, { largeur: 400, hauteur: 40 }, vue), {
      x: 14,
      y: 130,
    });
  });
});

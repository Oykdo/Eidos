import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ATOMES } from "../eidos/constantes.ts";
import { H0, T, rewardAt } from "../eidos/eonis.ts";
import { construireArbre, rayonDuPalier } from "./modele.ts";
import {
  CHARGE_POIDS,
  METAUX,
  PREMIER_CULMINATION,
  amplitude,
  chromaNoeud,
  estCulmination,
  facteurAnneau,
  lumenArbre,
  poserPalierLumen,
} from "./lumen.ts";

describe("lumen de l'arbre", () => {
  it("ρ = R(h)/a ∈ [½, 3/2], lu dans la table — pas Math.cos", () => {
    const creux = lumenArbre(0);
    assert.equal(creux.age, "Satya");
    assert.ok(Math.abs(creux.rho - rewardAt(0) / (40 * ATOMES)) < 1e-12);
    assert.ok(creux.rho >= 0.5 && creux.rho <= 0.52, `creux ${creux.rho}`);

    const pic = lumenArbre(H0);
    assert.ok(pic.culmination);
    assert.ok(pic.rho >= 1.48 && pic.rho <= 1.5, `pic ${pic.rho}`);
    assert.equal(pic.sigma, 1);

    const midi = lumenArbre(H0 + T / 4);
    assert.ok(Math.abs(midi.rho - 1) < 0.02, `midi ${midi.rho}`);
  });

  it("culmination : p = 41, pas un module sur 425", () => {
    assert.equal(PREMIER_CULMINATION, 41);
    assert.equal(estCulmination(H0), true);
    assert.equal(estCulmination(H0 + 1), true);
    assert.equal(estCulmination(0), false);
    assert.equal(estCulmination(H0 + T), true);
  });

  it("σ suit a/40 : Satya 1, Kali ¼", () => {
    assert.equal(lumenArbre(0).sigma, 1);
    const kaliDebut = 838656 + 628992 + 419328;
    const k = lumenArbre(kaliDebut);
    assert.equal(k.age, "Kali");
    assert.equal(k.sigma, 0.25);
    assert.equal(k.metal, METAUX.Kali);
  });

  it("anneaux : facteur borné, écart D_t / D_{t+1} reste positif", () => {
    for (const h of [0, H0, H0 + T / 4, 100]) {
      const L = lumenArbre(h);
      const f = facteurAnneau(L);
      assert.ok(f >= 0.97 && f <= 1.03, `facteur ${f} h=${h}`);
      for (let t = 0; t < 9; t++) {
        const a = poserPalierLumen(t, "cone", L);
        const b = poserPalierLumen(t + 1, "cone", L);
        assert.ok(b.r - a.r > 0.9, `croisement D${t}/D${t + 1} h=${h}`);
      }
    }
    assert.equal(rayonDuPalier(0) < rayonDuPalier(1), true);
  });

  it("souffle et charge sont séparés : D9 et ρ = 1 montrent la circulation", () => {
    const a = construireArbre();
    const midi = lumenArbre(H0 + T / 4);
    const pic = lumenArbre(H0);
    const d0 = a.noeuds.find((n) => n.palier === 0)!;
    const d9 = a.noeuds.find((n) => n.palier === 9)!;

    assert.equal(CHARGE_POIDS, 0.5);
    assert.ok(Math.abs(amplitude(d0, midi)) < 0.01, "midi sans charge : plat");
    assert.ok(Math.abs(amplitude(d9, pic)) < 0.01, "D9 sans charge : muet");

    const d0Midi = amplitude(d0, midi, 100, 100);
    const d9Midi = amplitude(d9, midi, 100, 100);
    assert.ok(d0Midi > 0.05, `D0 à ρ=1 ${d0Midi}`);
    assert.ok(d9Midi > 0.05, `D9 à ρ=1 ${d9Midi}`);

    const d0Pic = amplitude(d0, pic);
    const d0PicCharge = amplitude(d0, pic, 100, 100);
    const d9PicCharge = amplitude(d9, pic, 100, 100);
    assert.ok(d0Pic > 0);
    assert.ok(d0PicCharge > d0Pic);
    assert.ok(d9PicCharge > 0);
    assert.ok(Math.abs(d0PicCharge) < 0.6, "cap sous l'écart d'anneau");
    assert.ok(Math.abs(d9PicCharge) < 0.6);
  });

  it("chroma : nuit = métal, jour tire vers la famille, nœud chaud vers l'or", () => {
    const a = construireArbre();
    const n = a.noeuds[0]!;
    const nuit = lumenArbre(0);
    const pic = lumenArbre(H0);
    const cNuit = chromaNoeud(n, nuit, { chaudNoeud: null, chaudSecteur: null });
    const cJour = chromaNoeud(n, pic, { chaudNoeud: null, chaudSecteur: null });
    const cChaud = chromaNoeud(n, pic, { chaudNoeud: n.id, chaudSecteur: n.secteur });
    assert.ok((nuit.rho - 0.5) * nuit.sigma < 0.03);
    assert.notEqual(cJour, cNuit);
    assert.notEqual(cChaud, cJour);
  });
});

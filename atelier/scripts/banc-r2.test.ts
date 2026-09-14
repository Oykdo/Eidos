import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { COMBAT_AXES } from "../src/lib/eidos/combat.ts";
import { TIERS } from "../src/lib/eidos/tiers.ts";
import {
  bancR2,
  ETALONS_R2_COMPLET,
  ETALONS_R2_RAPIDE,
  ETAGE_R2,
  PARAMETRES_R2,
  TOLERANCES_R2,
} from "./banc-r2.ts";

/** La cible (a) du §9 ter de `SPEC_TACTIQUE.md` : |r| < 0,30, en millièmes. */
const CIBLE_R_MILLE = 300;

describe("banc R2 — le prix des axes, échantillon gelé", () => {
  const p = PARAMETRES_R2.rapide;
  const r2 = bancR2("rapide");

  it("rejoue les mêmes duels sur le moteur et la politique réels, deux sièges", () => {
    assert.equal(ETAGE_R2, 198);
    assert.equal(r2.pool.duels, p.pool * p.distances.length * p.adversaires * 2);
    assert.equal(r2.tiers.duels, TIERS * p.parTier * p.distances.length * p.adversaires * 2);
    assert.equal(r2.tiers.tauxMille.length, TIERS);
    assert.equal(r2.melees.batailles, p.melees);
    assert.ok(r2.pool.coupsMille > 0, "des coups ont été portés");
  });

  it("le résultat se date : les constantes du moteur mesuré y sont, et le pas d'un tour dépasse la portée", () => {
    // C2 (2026-09-13) a mesuré que refermer ce dépassement (`DIV_PAS = 64`,
    // 6 < 7) ne change rien au prix des axes : `DIV_PAS` reste à 32, et un
    // tour de deux pas pleins vaut 8 cases contre une portée de 7. Ce contrôle
    // affirme l'état mesuré ; il tombe le jour où la constante bouge, et c'est
    // alors la calibration complète qu'il faut refaire.
    assert.equal(r2.moteur.DIV_PAS, 32);
    assert.equal(r2.moteur.pasTourMax, 8);
    assert.equal(r2.moteur.porteeMax, 7);
    assert.ok(r2.moteur.pasTourMax > r2.moteur.porteeMax);
    // C2 ter (2026-09-14) : le socle est à 24, avec la riposte en contre.
    assert.equal(r2.moteur.COUP_BASE, 24);
  });

  it("ne dérive pas de sa calibration : r par axe, bande de tier, nuls, feuilles", () => {
    for (const axe of COMBAT_AXES) {
      const ecart = Math.abs(r2.pool.r[axe] - ETALONS_R2_RAPIDE.r[axe]);
      assert.ok(
        ecart <= TOLERANCES_R2.r,
        `r(${axe}) ${r2.pool.r[axe]} au lieu de ${ETALONS_R2_RAPIDE.r[axe]} à ${TOLERANCES_R2.r} millièmes près`,
      );
    }
    assert.ok(
      Math.abs(r2.tiers.bandeMille - ETALONS_R2_RAPIDE.bandeMille) <= TOLERANCES_R2.bande,
      `bande de tier ${r2.tiers.bandeMille} au lieu de ${ETALONS_R2_RAPIDE.bandeMille}`,
    );
    assert.ok(
      r2.pool.nulsMille <= ETALONS_R2_RAPIDE.nulsMille + TOLERANCES_R2.nuls,
      `nuls ${r2.pool.nulsMille} ‰ au lieu de ${ETALONS_R2_RAPIDE.nulsMille} ‰ au plus`,
    );
    assert.ok(
      r2.melees.coupsMax <= ETALONS_R2_RAPIDE.coupsMax + TOLERANCES_R2.coups,
      `${r2.melees.coupsMax} feuilles au pire au lieu de ${ETALONS_R2_RAPIDE.coupsMax}`,
    );
  });

  it("l'échantillon rapide reste du même côté de chaque cible que la calibration complète", () => {
    // Le protocole complet (440 320 duels) ne tourne pas en CI : ses chiffres
    // sont publiés dans `ETALONS_R2_COMPLET`, et l'échantillon doit rester du
    // même côté de chaque **cible** qu'eux — |r| < 0,30 par axe, quartiles
    // sous 3×, une bande positive. Pas du même signe : ce contrôle le
    // demandait quand les prix étaient grands (−0,640 / +0,591), et C2 ter a
    // montré qu'un prix proche de zéro n'a pas de signe stable entre les deux
    // échelles (eperon −0,128 complet, +0,053 rapide ; arc +0,145 / −0,109).
    for (const axe of COMBAT_AXES) {
      const complet = Math.abs(ETALONS_R2_COMPLET.r[axe]) < CIBLE_R_MILLE;
      const rapide = Math.abs(r2.pool.r[axe]) < CIBLE_R_MILLE;
      assert.equal(
        rapide,
        complet,
        `r(${axe}) : l'échantillon (${r2.pool.r[axe]}) et le protocole complet (${ETALONS_R2_COMPLET.r[axe]}) ne sont pas du même côté de ${CIBLE_R_MILLE} millièmes`,
      );
    }
    assert.equal(r2.tiers.bandeMille > 0, ETALONS_R2_COMPLET.bandeMille > 0);
    assert.equal(r2.pool.quartilesLameEcuCent < 300, true, "la cible (b) tient sur l'échantillon");
  });

  it("C2 ter : la cible du §9 ter tient sur le protocole complet, et l'échantillon le voit", () => {
    // |r| < 0,30 sur les quatre axes, mesuré le 2026-09-14 (PS2.10) ; la
    // veille, eperon −0,640 et arc +0,591. Ce contrôle affirme l'état mesuré :
    // il tombe le jour où une constante ou une règle bouge, et c'est alors le
    // protocole complet qu'il faut refaire, pas l'étalon qu'il faut retoucher.
    for (const axe of COMBAT_AXES) {
      assert.ok(
        Math.abs(ETALONS_R2_COMPLET.r[axe]) < CIBLE_R_MILLE,
        `r(${axe}) ${ETALONS_R2_COMPLET.r[axe]} au lieu de moins de ${CIBLE_R_MILLE} sur le protocole complet`,
      );
      assert.ok(
        Math.abs(r2.pool.r[axe]) < CIBLE_R_MILLE,
        `r(${axe}) ${r2.pool.r[axe]} au lieu de moins de ${CIBLE_R_MILLE} sur l'échantillon`,
      );
    }
  });
});

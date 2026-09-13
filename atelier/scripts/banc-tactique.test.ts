import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  bancTactique,
  ETAGE_BANC,
  ETALONS_COMPLETS,
  VECTEURS_BANC,
} from "./banc-tactique.ts";

function assertCalibre(nom: string, mesure: number, etalon: number): void {
  const ecart = Math.abs(mesure - etalon);
  assert.ok(
    ecart * 100 <= etalon * 10,
    `${nom} : ${mesure} au lieu de ${etalon} à 10 % près`,
  );
}

describe("banc tactique — échantillon gelé", () => {
  it("rejoue les mêmes 128 duels sur le moteur et la politique réels", () => {
    const un = bancTactique();
    const deux = bancTactique();

    assert.equal(ETAGE_BANC, 198);
    assert.equal(VECTEURS_BANC.length, 32);
    assert.equal(un.duels, 128);
    assert.deepEqual(deux, un, "deux rejouages donnent le même rapport");
    assert.ok(un.termines > 0, "le corpus doit contenir des batailles finies");
    assert.ok(un.mesures.coup > 0, "un coup a une mesure");
    assert.ok(un.mesures.tenue > 0, "la tenue a une mesure");
    assert.ok(un.mesures.charge >= 0, "la charge a une mesure");
    assert.ok(un.mesures.pas > 0, "le pas a une mesure");
    for (const nom of Object.keys(ETALONS_COMPLETS) as (keyof typeof ETALONS_COMPLETS)[])
      assertCalibre(nom, un.mesures[nom], ETALONS_COMPLETS[nom]);
  });
});

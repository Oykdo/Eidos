import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { OEUFS, oeufDuCode } from "./oeufs.ts";
import { ETAGES } from "./tour.ts";
import { TOURNURES, ageDuBloc, epithete, fantomeDe, nomDeSalle, oeufDeSalle, tournureDe } from "./fantomes.ts";

describe("noms de salles : le nom d'ère de l'œuf de la coupe", () => {
  it("255 salles nommées, chaque nom est l'un des 64 noms d'ère, plus d'un œuf est représenté", () => {
    const codes = new Set<number>();
    for (let e = 0; e < ETAGES; e++) {
      const o = oeufDeSalle(e);
      assert.ok(o.index >= 0 && o.index < 64);
      assert.equal(nomDeSalle(e, "fr"), o.nomEre.fr);
      assert.equal(nomDeSalle(e, "en"), o.nomEre.en);
      assert.ok(OEUFS.some((x) => x.nomEre.fr === nomDeSalle(e, "fr")));
      codes.add(o.index);
    }
    assert.ok(codes.size >= 8, `${codes.size} œufs distincts sur 255 salles`);
    assert.equal(oeufDeSalle(0).index, oeufDeSalle(255).index, "étage 255 lu comme 0 (etageDe)");
    // gelé : la porte de la ville
    assert.equal(oeufDeSalle(0).nomEre.fr, oeufDuCode(oeufDeSalle(0).index).nomEre.fr);
  });
});

describe("fantômes : six tournures, la fin du run et l'âge de son bloc", () => {
  it("l'âge d'abord (écho), la fin ensuite", () => {
    assert.equal(tournureDe("sommet", "Kali", "Kali"), "revenu");
    assert.equal(tournureDe("epuise", "Kali", "Kali"), "dernier");
    assert.equal(tournureDe("porte", "Kali", "Kali"), "ombre");
    assert.equal(tournureDe("abandon", "Kali", "Kali"), "efface");
    assert.equal(tournureDe(null, "Kali", "Kali"), "murmure");
    assert.equal(tournureDe("sommet", "Satya", "Kali"), "echo");
    assert.equal(ageDuBloc(0), "Satya");
    assert.equal(ageDuBloc(2_096_640 - 1), "Kali");
    assert.equal(ageDuBloc(2_096_640), "Kali", "hors table : Kali");
  });

  it("les six épithètes en deux langues, sur un nom d'ère", () => {
    const fr = TOURNURES.map((t) => epithete(t, "Ère du Vide primordial", "fr"));
    assert.deepEqual(fr, [
      "Écho de l'Ère du Vide primordial",
      "L'Ère du Vide primordial revenue",
      "Dernière Ère du Vide primordial",
      "Ombre de l'Ère du Vide primordial",
      "L'Ère du Vide primordial qui s'efface",
      "Murmure de l'Ère du Vide primordial",
    ]);
    const en = TOURNURES.map((t) => epithete(t, "Era of Primordial Void", "en"));
    assert.deepEqual(en, [
      "Echo of the Era of Primordial Void",
      "Era of Primordial Void Reborn",
      "Last Era of Primordial Void",
      "Era of Primordial Void's Shadow",
      "Fading Era of Primordial Void",
      "Whisper of the Era of Primordial Void",
    ]);
    const f = fantomeDe({ fin: "porte", etageFinal: 64, hauteurBloc: 5 }, 7, "fr");
    assert.equal(f.tournure, "ombre");
    assert.equal(f.nom, `Ombre de l'${nomDeSalle(64, "fr")}`);
    assert.equal(fantomeDe({ fin: "porte", etageFinal: 64, hauteurBloc: 5 }, 2_000_000, "en").tournure, "echo");
  });
});

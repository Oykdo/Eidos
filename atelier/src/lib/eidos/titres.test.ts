import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { REGIMES } from "./cosmos.ts";
import { AFFIXES, GENRES, habille } from "./equipement.ts";
import { FORMES, ficheDe } from "./fiche.ts";
import { sha256d, utf8 } from "./hash.ts";
import { motDeQ } from "./lecture.ts";
import { objetDepuisGraine } from "./objets.ts";
import { SIGNATURES } from "./signatures.ts";
import {
  ADJECTIFS_ORBITE,
  NOMS_EMPLACEMENT,
  NOMS_FIGURE,
  TITRES_POSSIBLES,
  TOURNURES,
  VARIANTES,
  epitheteDe,
  rollsTitre,
  titreDe,
} from "./titres.ts";
import type { Genre, NomAge, ObjetPorte } from "./types.ts";

function objet(graine: string, age: NomAge, extra?: Partial<ObjetPorte>): ObjetPorte {
  const g = sha256d(utf8(graine));
  const o = objetDepuisGraine(g, age);
  return habille(
    { mot: o.mot, archetype: o.archetype, age, nonce: g[8]!, hauteur: 3 },
    g[9]!,
    extra,
  );
}

describe("titres — épithète, nom, suffixe composés depuis le mot", () => {
  it("le lexique des titres : 21 figures avec leur genre, 12 adjectifs accordés, 5 tournures, 10 emplacements", () => {
    let figures = 0;
    for (const r of REGIMES) {
      assert.equal(NOMS_FIGURE[r].length, VARIANTES);
      for (const n of NOMS_FIGURE[r]) {
        assert.ok(n.fr && n.en && (n.genre === "m" || n.genre === "f"));
        figures += 1;
      }
    }
    assert.equal(figures, 21);
    assert.equal(ADJECTIFS_ORBITE.length, 4);
    for (const trio of ADJECTIFS_ORBITE) {
      assert.equal(trio.length, VARIANTES);
      for (const a of trio) assert.ok(a.m && a.f && a.en);
    }
    assert.equal(TOURNURES.length, 5);
    for (const t of TOURNURES) {
      assert.ok(t.fr("Clio").includes("Clio") && t.en("Clio").includes("Clio"));
    }
    assert.equal(Object.keys(NOMS_EMPLACEMENT).length, 10);
    assert.equal(TITRES_POSSIBLES, 21 * 12 * 45);
  });

  it("les tirages de titre viennent du mot canon : même mot, mêmes variantes ; q et −q, même titre", () => {
    const o = objet("titre-1", "Satya");
    const r1 = rollsTitre(o.mot);
    const r2 = rollsTitre(o.mot);
    assert.deepEqual(r1, r2);
    assert.ok(r1.figure < VARIANTES && r1.adjectif < VARIANTES && r1.nom < 256);
    const f = ficheDe(o);
    const t = titreDe(f, "fr");
    assert.deepEqual(
      titreDe(ficheDe({ ...o, nonce: 1, hauteur: 99, nom: o.nom }), "fr"),
      t,
      "la jauge ne change pas le titre",
    );
  });

  it("l'épithète s'accorde : nom féminin, adjectif féminin ; l'anglais met l'adjectif devant", () => {
    const o = objet("titre-2", "Kali");
    const f = ficheDe(o);
    const r = rollsTitre(o.mot);
    const n = NOMS_FIGURE[f.forme.regime][r.figure]!;
    const a = ADJECTIFS_ORBITE[f.orbite]![r.adjectif]!;
    assert.equal(epitheteDe(f, "fr"), `${n.fr} ${n.genre === "f" ? a.f : a.m}`);
    assert.equal(epitheteDe(f, "en"), `${a.en} ${n.en}`);
    // chaque adjectif féminin diffère du masculin quand la langue le veut
    assert.equal(ADJECTIFS_ORBITE[0]![0]!.f, "renversée");
    assert.equal(ADJECTIFS_ORBITE[3]![1]!.f, "calme");
  });

  it("sur le catalogue, les titres sont nombreux et distincts ; chaque genre a un nom de base dans les deux langues", () => {
    const titres = new Set<string>();
    for (const f of FORMES) {
      const o = objet(
        `cat-${f.rang}`,
        (["Satya", "Treta", "Dvapara", "Kali"] as const)[f.rang % 4]!,
      );
      const fiche = ficheDe({ ...o, mot: motDeQ(f.q) });
      const fr = titreDe(fiche, "fr");
      const en = titreDe(fiche, "en");
      assert.ok(fr.titre.length > 8 && en.titre.length > 8);
      assert.ok(fr.titre.includes(fr.epithete) && fr.titre.includes(fr.suffixe));
      assert.notEqual(fr.titre, en.titre);
      titres.add(fr.titre);
    }
    assert.ok(titres.size >= 90, `${titres.size} titres distincts sur 100 formes`);
    for (const genre of GENRES) {
      const o = objet(`genre-${genre}`, "Treta", {
        genre: genre as Genre,
        emplacement: genre === "armure" ? "casque" : genre === "arme" ? "arme" : null,
        affixe: genre === "pierre" || genre === "gemme" ? AFFIXES[1] : null,
        nom: genre === "capture" ? "Chthon" : undefined,
      });
      const fiche = ficheDe(o);
      const fr = titreDe(fiche, "fr");
      const en = titreDe(fiche, "en");
      assert.ok(fr.nom.length > 0 && en.nom.length > 0, genre);
      if (genre === "capture") assert.equal(fr.nom, "Chthon");
    }
    const muses = new Set(SIGNATURES.map((s) => s.id));
    assert.equal(muses.size, 9);
  });
});

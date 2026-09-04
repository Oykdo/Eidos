import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CLASSES, REGIMES, coupsParTour } from "./cosmos.ts";
import { AFFIXES, GENRES, habille } from "./equipement.ts";
import { FORMES, faiblesseDe, ficheDe, forceDe, rareteDe, texteFiche } from "./fiche.ts";
import { sha256d, utf8 } from "./hash.ts";
import { motDeQ } from "./lecture.ts";
import { objetDepuisGraine } from "./objets.ts";
import * as L from "./objets-lexique.ts";
import { SIGNATURES } from "./signatures.ts";
import type { NomAge, ObjetPorte } from "./types.ts";

const AGES: NomAge[] = ["Satya", "Treta", "Dvapara", "Kali"];

function objet(graine: string, age: NomAge, extra?: Partial<ObjetPorte>): ObjetPorte {
  const g = sha256d(utf8(graine));
  const o = objetDepuisGraine(g, age);
  return habille(
    { mot: o.mot, archetype: o.archetype, age, nonce: g[8]!, hauteur: 7 },
    g[9]!,
    extra,
  );
}

function propre(s: string): boolean {
  return s.length > 0 && !/undefined|NaN|\[object|null/.test(s);
}

describe("fiche — la lecture d'un objet, en fonctions pures", () => {
  it("le lexique est complet, bilingue, sans doublon entre les langues", () => {
    for (const c of CLASSES)
      for (const r of REGIMES) {
        const b = L.CARACTERES[c][r];
        assert.ok(propre(b.fr) && propre(b.en) && b.fr !== b.en, `${c}×${r}`);
      }
    assert.equal(L.ORBITES.length, 4);
    assert.equal(L.RARETES.length, 5);
    assert.deepEqual(
      L.RARETES.map((r) => r.seuil),
      [...L.RARETES.map((r) => r.seuil)].sort((a, b) => b - a),
      "seuils décroissants",
    );
    assert.equal(L.RARETES[L.RARETES.length - 1]!.seuil, 0);
    assert.deepEqual(
      AGES.map((a) => L.AGES[a].a),
      [40, 30, 20, 10],
    );
    assert.deepEqual(Object.keys(L.GENRES_TEXTE).sort(), [...GENRES].sort());
    assert.deepEqual(Object.keys(L.AFFIXES_TEXTE).sort(), [...AFFIXES].sort());
    assert.deepEqual(Object.keys(L.TEMPERAMENTS).sort(), SIGNATURES.map((s) => s.id).sort());
    assert.deepEqual(Object.keys(L.NOMS_REGIME).sort(), [...REGIMES].sort());
    for (const b of [
      ...L.ORBITES,
      ...L.RARETES.map((r) => r.texte),
      ...AGES.map((a) => L.AGES[a].texte),
      ...Object.values(L.GENRES_TEXTE),
      ...Object.values(L.AFFIXES_TEXTE),
      ...Object.values(L.POLARITES_TEXTE),
      ...Object.values(L.TEMPERAMENTS),
    ])
      assert.ok(propre(b.fr) && propre(b.en) && b.fr !== b.en, b.fr);
  });

  it("force et faiblesse disent exactement coupsParTour : l'ascendant tourne de trois en trois", () => {
    for (const r of REGIMES) {
      assert.equal(coupsParTour(r, forceDe(r)), 2, `${r} compose deux fois contre ${forceDe(r)}`);
      assert.equal(
        coupsParTour(faiblesseDe(r), r),
        2,
        `${faiblesseDe(r)} compose deux fois contre ${r}`,
      );
      for (const t of REGIMES) if (t !== forceDe(r)) assert.equal(coupsParTour(r, t), 1);
    }
    assert.equal(forceDe("Vide"), "Vide");
    assert.equal(faiblesseDe("Vide"), "Vide");
    const cycle = REGIMES.filter((r) => r !== "Vide");
    assert.equal(new Set(cycle.map(forceDe)).size, 6, "hors le Vide, un cycle de six");
  });

  it("le catalogue : la fiche est cohérente avec le mot repaqueté ; l'aller-retour motDeQ → qDeMot perd 53 formes sur 100 (limite connue)", () => {
    assert.equal(FORMES.length, 100);
    let perdues = 0;
    for (const f of FORMES) {
      const fiche = ficheDe({ ...objet(`forme-${f.rang}`, "Kali"), mot: motDeQ(f.q) });
      const lue = FORMES.find((g) => g.rang === fiche.forme.rang)!;
      assert.equal(fiche.cellule, `${lue.classe}×${lue.regime}`, `rang ${f.rang}`);
      assert.ok(
        fiche.proximite >= 85,
        `rang ${f.rang} : proximité ${fiche.proximite} à la forme lue`,
      );
      if (fiche.forme.rang !== f.rang) perdues += 1;
    }
    // paqueter omet la plus grande composante et perd son signe : depaqueter rend
    // l'inverse de la rotation une fois sur deux. À corriger sciemment (convention
    // « composante omise ≥ 0 »), puis régénérer ce nombre.
    assert.equal(perdues, 53);
    assert.equal(rareteDe(100), 0);
    assert.equal(rareteDe(59), 4);
    assert.equal(rareteDe(78), 2);
  });

  it("la fiche est pure : même mot, même fiche ; la jauge (nonce, nom, hauteur) ne change pas la lecture", () => {
    const a = objet("fiche-1", "Satya");
    const b = { ...a, nonce: (a.nonce + 1) & 65535, nom: "autre", hauteur: 99 };
    const fa = ficheDe(a);
    const fb = ficheDe(b);
    assert.deepEqual(ficheDe(a), fa);
    for (const k of [
      "forme",
      "cellule",
      "proximite",
      "rarete",
      "orbite",
      "force",
      "faiblesse",
      "axeAncre",
      "sceau",
      "canon",
    ] as const)
      assert.deepEqual(fb[k], fa[k], k);
    assert.equal(fa.ensemble, null, "seul : pas d'ensemble");
    assert.ok(fa.q.every((x) => Number.isInteger(x)));
    assert.equal(fa.motHex.length, 8);
  });

  it("les phrases : quatre registres non vides, propres, différentes entre les langues, pures", () => {
    let n = 0;
    for (const f of FORMES.filter((_, i) => i % 9 === 0))
      for (const age of AGES) {
        const o = objet(`texte-${f.rang}-${age}`, age, {
          affixe: AFFIXES[f.rang % 6],
          gemmes: [AFFIXES[(f.rang + 1) % 6]!],
          sockets: 2,
        });
        const fiche = ficheDe({ ...o, mot: motDeQ(f.q) });
        const fr = texteFiche(fiche, "fr");
        const en = texteFiche(fiche, "en");
        for (const reg of ["forme", "caractere", "traits", "technique"] as const) {
          assert.ok(fr[reg].length >= 2, `${reg} fr`);
          assert.equal(fr[reg].length, en[reg].length, `${reg} : même nombre de phrases`);
          for (const s of [...fr[reg], ...en[reg]]) assert.ok(propre(s), s);
          assert.notEqual(fr[reg][0], en[reg][0]);
        }
        assert.deepEqual(texteFiche(fiche, "fr"), fr);
        assert.ok(fr.traits.some((s) => s.startsWith("Gemme enchâssée")));
        assert.ok(
          fr.technique.some((s) => s.includes("mot effectif")),
          "les gemmes changent le mot effectif",
        );
        n += 1;
      }
    assert.ok(n >= 40);
  });

  it("l'ensemble lit la résonance avec les autres : même classe, destructif", () => {
    const a = objet("ens-a", "Treta");
    const meme = { ...objet("ens-b", "Treta"), archetype: a.archetype };
    const autre = {
      ...objet("ens-c", "Treta"),
      archetype: SIGNATURES.find((s) => s.id !== a.archetype)!.id,
    };
    const f = ficheDe(a, [a, meme, autre]);
    assert.ok(f.ensemble);
    assert.equal(f.ensemble!.n, 2, "l'objet lui-même est ignoré");
    assert.ok(f.ensemble!.destructif >= 1);
    const t = texteFiche(f, "fr");
    assert.ok(t.caractere.some((s) => s.startsWith("Dans ce coffre, 2 autres objets")));
  });
});

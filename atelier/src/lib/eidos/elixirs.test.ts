import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEGRES,
  ELIXIRS,
  ESPECES,
  FIOLES,
  boireDansCoffre,
  codeGlypheDe,
  codeDuNom,
  codesDeEspece,
  degreDe,
  elixirDansCoffre,
  elixirDe,
  elixirDeObjet,
  elixirDouzeDansCoffre,
  especeActive,
  especeDe,
  especeDouzeDe,
  especeDouzeDePorte,
  especeDouzeDuCode,
  etageDominant,
  eteindreSoufre,
  objetElixir,
  objetElixirDouze,
  paNet,
  signeElixir,
  type Degre,
  type EspeceDouze,
} from "./elixirs.ts";
import { caractereDe } from "./chymie.ts";
import { codeDuGroupe, groupeDuCode } from "./glyphs.ts";
import { sha256d, utf8 } from "./hash.ts";
import { glypheDe } from "./lecture.ts";
import { objetDepuisGraine, sceauObjet, type Objet } from "./objets.ts";
import { TRIA_PRIMA } from "./signatures.ts";
import { coffreAtelier } from "./wallet.ts";

const GRAINE = sha256d(utf8("elixir-test"));

describe("élixirs — la tria prima, un étage", () => {
  it("espèce = étage dominant du glyphe : sel ○, mercure ☽, soufre ✚", () => {
    assert.deepEqual([...ESPECES], ["sel", "mercure", "soufre"]);
    assert.deepEqual(
      TRIA_PRIMA.map((t) => t.id),
      ["sel", "mercure", "soufre"],
    );
    assert.equal(etageDominant([1, 0, 0]), 0);
    assert.equal(etageDominant([0, 3, 3]), 1);
    assert.equal(etageDominant([2, 2, 3]), 2);
    assert.equal(etageDominant([0, 0, 0]), 0);
    for (let i = 0; i < 40; i++) {
      const o = objetDepuisGraine(sha256d(utf8(`e${i}`)), "Kali");
      const g = glypheDe(o);
      assert.equal(especeDe(o), TRIA_PRIMA[etageDominant(g)].id);
    }
    for (const espece of ESPECES) {
      const o = objetElixir(GRAINE, "Treta", espece, "lune");
      assert.equal(especeDe(o), espece);
      assert.equal(o.archetype, "lune");
      assert.deepEqual(objetElixir(GRAINE, "Treta", espece, "lune"), o);
      assert.equal([...FIOLES[espece]].length, 3);
    }
  });

  it("effet borné à un étage : bu à 5, rien à 6", () => {
    const c0 = coffreAtelier("vide");
    const fiole = elixirDansCoffre(c0, GRAINE, "Kali", "sel");
    assert.equal(fiole.genre, "elixir");
    assert.equal(fiole.nom, "sel");
    const c = { ...c0, objets: [fiole] };
    const r = boireDansCoffre(c, 0, 5);
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.espece, "sel");
    assert.equal(especeActive(r.coffre, 5, "sel"), true);
    assert.equal(especeActive(r.coffre, 6, "sel"), false);
    assert.equal(especeActive(r.coffre, 5, "mercure"), false);
    assert.equal(especeActive(r.coffre, 5 + 255, "sel"), true);
  });

  it("élixir bu : retiré de la jauge, mot noté, jamais rebu", () => {
    const c0 = coffreAtelier("vide");
    const fiole = elixirDansCoffre(c0, GRAINE, "Kali", "mercure");
    const c = { ...c0, objets: [fiole, fiole] };
    const r = boireDansCoffre(c, 0, 9);
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.coffre.objets.length, 1);
    assert.deepEqual(r.coffre.tour.bus, [fiole.mot >>> 0]);
    assert.deepEqual(r.coffre.tour.elixirs, [
      { etage: 9, mot: fiole.mot >>> 0, espece: "mercure" },
    ]);
    const encore = boireDansCoffre(r.coffre, 0, 10);
    assert.equal(encore.ok, false);
    if (!encore.ok) assert.equal(encore.code, "deja");
    assert.deepEqual(boireDansCoffre(c0, 0, 1), { ok: false, code: "objet" });
    const pas = { ...c0, objets: [{ ...fiole, genre: "gemme" as const }] };
    assert.deepEqual(boireDansCoffre(pas, 0, 1), { ok: false, code: "genre" });
  });

  it("le mot n'est jamais réécrit ; le soufre s'éteint quand la pièce a tourné", () => {
    const c0 = coffreAtelier("vide");
    const fiole = elixirDansCoffre(c0, GRAINE, "Satya", "soufre", "mars");
    const c = { ...c0, objets: [fiole] };
    const r = boireDansCoffre(c, 0, 3);
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.coffre.tour.elixirs[0]!.mot, fiole.mot >>> 0);
    assert.equal(especeActive(r.coffre, 3, "soufre"), true);
    const apres = eteindreSoufre(r.coffre, 3);
    assert.equal(especeActive(apres, 3, "soufre"), false);
    assert.deepEqual(apres.tour.bus, [fiole.mot >>> 0]);
    assert.deepEqual(eteindreSoufre(apres, 3), apres);
    // l'objet élixir lui-même : mot, archétype, âge intacts après habillage
    assert.equal(fiole.archetype, "mars");
    assert.equal(fiole.age, "Satya");
    assert.equal(fiole.affixe, null);
    assert.equal(fiole.sockets, 0);
  });
});

describe("élixirs — les douze espèces, lues et non décrétées", () => {
  /**
   * 100 000 objets comptés au vol ; seuls les 800 premiers sont gardés.
   * `objetDepuisGraine` ne lit que huit octets : une empreinte de 32 en
   * nourrit quatre, ce qui divise par quatre le hachage de la mesure.
   */
  const MESURE = (() => {
    const compte: Record<string, number> = {};
    const echantillon: Objet[] = [];
    const n = 100000;
    let g = sha256d(utf8("chy-douze"));
    for (let i = 0; i < n; i += 4) {
      g = sha256d(g);
      for (let j = 0; j < 4; j++) {
        const o = objetDepuisGraine(g.subarray(j * 8), "Kali");
        const id = especeDouzeDe(o);
        compte[id] = (compte[id] ?? 0) + 1;
        if (i + j < 800) echantillon.push(o);
      }
    }
    return { compte, n, echantillon };
  })();

  it("douze espèces : trois familles de quatre, 64 cellules, aucune vide", () => {
    assert.equal(ELIXIRS.length, 12);
    assert.deepEqual([...DEGRES], [0, 1, 2, 3]);
    assert.equal(new Set(ELIXIRS.map((e) => e.id)).size, 12);
    assert.equal(new Set(ELIXIRS.map((e) => e.effet)).size, 12);
    assert.equal(new Set(ELIXIRS.map((e) => e.cle)).size, 12);
    assert.equal(new Set(ELIXIRS.map((e) => e.signe)).size, 12);
    for (const f of ESPECES) {
      assert.equal(ELIXIRS.filter((e) => e.famille === f).length, 4, `${f} n'a pas quatre degrés`);
      for (const d of DEGRES) {
        const e = elixirDe(`${f}.${d}`);
        assert.equal(e.id, `${f}.${d}`);
        assert.equal(e.cle, `elixir.${f}.${d}`);
      }
    }
    // les effectifs exacts sur les 64 codes : 8 8 8 6 · 5 6 5 4 · 4 4 4 2
    const compte: Record<string, number> = {};
    for (let c = 0; c < 64; c++) {
      const id = especeDouzeDuCode(c);
      compte[id] = (compte[id] ?? 0) + 1;
    }
    assert.deepEqual(
      ELIXIRS.map((e) => compte[e.id] ?? 0),
      [8, 8, 8, 6, 5, 6, 5, 4, 4, 4, 4, 2],
    );
    for (const e of ELIXIRS) {
      assert.equal(compte[e.id], e.cellules, `${e.id} déclare ${e.cellules} cellules`);
      assert.equal(codesDeEspece(e.id).length, e.cellules);
      assert.ok(e.cellules > 0, `${e.id} est une cellule vide`);
    }
    assert.equal(ELIXIRS.reduce((s, e) => s + e.cellules, 0), 64);
    // rapport 4,00× exact entre la plus commune (8/64) et la plus rare (2/64)
    const parts = ELIXIRS.map((e) => e.cellules);
    assert.equal(Math.max(...parts) / Math.min(...parts), 4);
    assert.equal(elixirDe("soufre.3").cellules, 2);
  });

  it("le nom d'une espèce se lit dans sa cellule, jamais ailleurs", () => {
    for (const e of ELIXIRS) {
      const code = codeDuNom(e.id);
      assert.equal(
        especeDouzeDuCode(code),
        e.id,
        `le signe ${e.signe} (code ${code}) tombe en ${especeDouzeDuCode(code)}`,
      );
      assert.ok(codesDeEspece(e.id).includes(code));
      const signe = caractereDe(code);
      assert.equal(signe.id, e.signe);
      // le nom de l'élixir est celui de la plaque, éventuellement raccourci
      // avant sa virgule : « Argent vif, ou Mercure » donne « Argent vif ».
      assert.ok(
        signe.fr === e.fr || signe.fr.startsWith(`${e.fr},`),
        `${e.id} : ${signe.fr} au lieu de ${e.fr}`,
      );
      assert.equal(signe.en, e.en, `${e.id} : ${signe.en} au lieu de ${e.en}`);
      assert.equal(signeElixir(e.id), signe.uni);
      assert.ok(signeElixir(e.id).length > 0);
    }
    // les codes 48-49-50 tombent en sel·0/1/2 dans cet ordre : la table s'écrit seule
    assert.deepEqual(
      [48, 49, 50].map((c) => especeDouzeDuCode(c)),
      ["sel.0", "sel.1", "sel.2"],
    );
    assert.deepEqual([48, 49, 50].map((c) => caractereDe(c).id), ["selalkali", "selammoniac", "sel"]);
  });

  it("le degré lit exactement les deux étages que la famille jette", () => {
    for (let c = 0; c < 64; c++) {
      const g = groupeDuCode(c);
      const f = etageDominant(g);
      assert.equal(degreDe(g), ((g[(f + 1) % 3]! + g[(f + 2) % 3]!) % 4) as Degre);
      // la figure de la famille n'entre pas dans le degré
      const autre: [number, number, number] = [...g];
      autre[f] = g[f]!; // inchangée par construction
      assert.equal(degreDe(autre), degreDe(g));
    }
    assert.equal(degreDe([3, 0, 0]), 0);
    assert.equal(degreDe([3, 0, 1]), 1);
    assert.equal(degreDe([3, 3, 0]), 3);
    assert.equal(degreDe([2, 2, 3]), 0); // (2+2) mod 4
    assert.equal(degreDe([0, 0, 0]), 0);
  });

  it("distribution des douze sur 100 000 objets : à 0,25 point de l'exact", () => {
    const { compte, n } = MESURE;
    let pire = 0;
    for (const e of ELIXIRS) {
      const pct = ((compte[e.id] ?? 0) * 100) / n;
      const attendu = (e.cellules * 100) / 64;
      const d = Math.abs(pct - attendu);
      if (d > pire) pire = d;
      assert.ok(pct > 0, `${e.id} n'est jamais sorti`);
    }
    assert.ok(pire < 0.25, `écart de ${pire.toFixed(3)} point au lieu de moins de 0,25`);
    // les familles gardent leurs parts d'hier : 30/64, 20/64, 14/64
    const fam: Record<string, number> = { sel: 0, mercure: 0, soufre: 0 };
    for (const e of ELIXIRS) fam[e.famille]! += compte[e.id] ?? 0;
    for (const [f, cell] of [["sel", 30], ["mercure", 20], ["soufre", 14]] as const) {
      const pct = (fam[f]! * 100) / n;
      assert.ok(Math.abs(pct - (cell * 100) / 64) < 0.5, `${f} à ${pct.toFixed(2)} %`);
    }
  });

  it("les trois effets d'hier sont sel·0, mercure·1 et soufre·0 — et rien n'a bougé", () => {
    assert.equal(elixirDe("sel.0").effet, "resonance-neutre");
    assert.equal(elixirDe("mercure.1").effet, "parade-accordee");
    assert.equal(elixirDe("soufre.0").effet, "pierre-sans-forgeronne");
    // non-régression : la famille se lit comme avant, objet par objet
    for (const o of MESURE.echantillon) {
      const g = glypheDe(o);
      assert.equal(especeDe(o), TRIA_PRIMA[etageDominant(g)].id);
      assert.equal(especeDouzeDe(o).split(".")[0], especeDe(o));
    }
    // non-régression : le tirage par famille rend le même objet qu'avant
    const attendus: Record<string, number> = { sel: 0, mercure: 0, soufre: 0 };
    for (const espece of ESPECES) {
      const o = objetElixir(GRAINE, "Treta", espece, "lune");
      attendus[espece] = o.mot;
      assert.equal(especeDe(o), espece);
      assert.deepEqual(objetElixir(GRAINE, "Treta", espece, "lune"), o);
    }
    // non-régression : boire rend la famille, la note dans la jauge, retire l'objet
    const c0 = coffreAtelier("vide");
    const fiole = elixirDansCoffre(c0, GRAINE, "Kali", "sel");
    assert.equal(fiole.nom, "sel");
    const r = boireDansCoffre({ ...c0, objets: [fiole] }, 0, 5);
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.espece, "sel");
    assert.equal(especeActive(r.coffre, 5, "sel"), true);
    assert.deepEqual(r.coffre.tour.elixirs, [{ etage: 5, mot: fiole.mot >>> 0, espece: "sel" }]);
    assert.equal(r.coffre.objets.length, 0);
    // le degré s'ajoute au résultat, il ne remplace rien
    assert.equal(r.douze, especeDouzeDePorte(fiole));
    assert.equal(r.elixir.famille, "sel");
    // le soufre s'éteint toujours quand la pièce a tourné
    const s = boireDansCoffre(
      { ...c0, objets: [elixirDansCoffre(c0, GRAINE, "Satya", "soufre", "mars")] },
      0,
      3,
    );
    assert.equal(s.ok, true);
    if (!s.ok) return;
    assert.equal(especeActive(s.coffre, 3, "soufre"), true);
    assert.equal(especeActive(eteindreSoufre(s.coffre, 3), 3, "soufre"), false);
  });

  it("le premier glyphe du sceau est les six premiers bits de la feuille", () => {
    for (const o of MESURE.echantillon.slice(0, 400)) {
      assert.equal(codeGlypheDe(o), codeDuGroupe(glypheDe(o)), `sceau ${sceauObjet(o).slice(0, 3)}`);
      assert.deepEqual(groupeDuCode(codeGlypheDe(o)), glypheDe(o));
    }
  });

  it("lieu, points d'action et net : sept à 1 PA, trois à 2, deux de tempo", () => {
    assert.equal(ELIXIRS.filter((e) => e.pa === 1).length, 9);
    assert.equal(ELIXIRS.filter((e) => e.pa === 2).length, 3);
    assert.deepEqual(
      ELIXIRS.filter((e) => e.pa === 2).map((e) => e.id),
      ["sel.2", "soufre.0", "soufre.3"],
    );
    // sept appoints purs à 1 PA, deux exceptions de tempo
    assert.equal(ELIXIRS.filter((e) => e.pa === 1 && e.paRendu === 0).length, 7);
    assert.equal(paNet(elixirDe("mercure.0")), 0);
    assert.equal(paNet(elixirDe("mercure.3")), -1);
    for (const e of ELIXIRS) {
      assert.ok(e.pa === 1 || e.pa === 2, `${e.id} coûte ${e.pa} PA`);
      assert.ok(paNet(e) >= -1 && paNet(e) <= 2, `${e.id} : net ${paNet(e)}`);
      // le sel et le mercure en bataille ; le soufre à la forge et sur la route
      const attendu = e.famille === "soufre" ? (e.degre === 3 ? "route" : "forge") : "bataille";
      assert.equal(e.lieu, attendu, `${e.id} agit en ${e.lieu}`);
    }
    // le plus fort effet du lot est le plus rare du mercure
    assert.equal(elixirDe("mercure.3").cellules, 4);
    assert.equal(Math.min(...ELIXIRS.filter((e) => e.famille === "mercure").map((e) => e.cellules)), 4);
  });

  it("un élixir de douzième espèce : déterministe, visé, le mot jamais réécrit", () => {
    const c0 = coffreAtelier("vide");
    for (const e of ELIXIRS) {
      const o = objetElixirDouze(GRAINE, "Treta", e.id, "lune");
      assert.equal(especeDouzeDe(o), e.id);
      assert.equal(especeDe(o), e.famille);
      assert.equal(o.archetype, "lune");
      assert.deepEqual(objetElixirDouze(GRAINE, "Treta", e.id, "lune"), o);
      assert.equal(elixirDeObjet(o).id, e.id);
      const porte = elixirDouzeDansCoffre(c0, GRAINE, "Kali", e.id);
      assert.equal(porte.genre, "elixir");
      // le nom porté reste la famille : un coffre d'hier se relit sans perte
      assert.equal(porte.nom, e.famille);
      assert.equal(especeDouzeDePorte(porte), e.id);
      assert.equal(porte.affixe, null);
      assert.equal(porte.sockets, 0);
    }
  });

  it("doit échouer : une espèce hors des douze, un étage hors 0..3", () => {
    assert.throws(() => elixirDe("sel.4" as EspeceDouze), /au lieu de l'une des 12/);
    assert.throws(() => elixirDe("cendres.0" as EspeceDouze), /au lieu de l'une des 12/);
    assert.throws(() => objetElixirDouze(GRAINE, "Kali", "soufre.9" as EspeceDouze), /au lieu de l'une des 12/);
    assert.throws(() => degreDe([4, 0, 0]), /au lieu de 0\.\.3/);
    assert.throws(() => degreDe([0, -1, 0]), /au lieu de 0\.\.3/);
    assert.throws(() => degreDe([0, 0, 1.5]), /au lieu de 0\.\.3/);
    assert.throws(() => signeElixir("mercure.4" as EspeceDouze), /au lieu de l'une des 12/);
  });
});

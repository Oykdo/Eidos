import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { habille } from "./equipement.ts";
import { sha256d, utf8 } from "./hash.ts";
import {
  BANDES,
  PERIODE_HOTE,
  aUnHote,
  bandeDe,
  bandeParIndice,
  demandeSatisfaite,
  etageMuse,
  etagesHotes,
  honorerDansCoffre,
  hoteDe,
  objetDon,
} from "./hotes.ts";
import {
  GROUPES_REPLIQUES,
  NOMS_CAPTURE,
  NOMS_PAR_MUSE,
  REPLIQUES,
  REPLIQUES_PAR_GROUPE,
  REPLIQUES_PAR_MUSE,
  ROLES,
} from "./hotes-lexique.ts";
import { objetDepuisGraine } from "./objets.ts";
import { PORTES } from "./sceaux.ts";
import { SIGNATURES } from "./signatures.ts";
import { ETAGES, biomeDe, graineEtage } from "./tour.ts";
import { coffreAtelier } from "./wallet.ts";

const MUSES = SIGNATURES.map((s) => s.id);

describe("hôtes — neuf muses, leurs familiers, leurs dons", () => {
  it("présence déterministe : 1 sur 7, 0 et 254 toujours, les portes toujours", () => {
    assert.equal(aUnHote(0), true);
    assert.equal(aUnHote(ETAGES - 1), true);
    for (const p of PORTES) assert.equal(aUnHote(p), true);
    let ordinaires = 0;
    for (let e = 1; e < ETAGES - 1; e++) {
      if (PORTES.includes(e) || bandeDe(e).mediane === e) continue;
      const attendu = graineEtage(e)[1]! % PERIODE_HOTE === 0;
      assert.equal(aUnHote(e), attendu, `étage ${e}`);
      if (attendu) ordinaires += 1;
    }
    assert.ok(ordinaires > ETAGES / 12 && ordinaires < ETAGES / 4);
    assert.deepEqual(etagesHotes(), etagesHotes());
    assert.equal(hoteDe(1)?.etage ?? null, null);
    const h = hoteDe(24);
    assert.ok(h);
    assert.deepEqual(hoteDe(24), h);
    assert.equal(h!.muse, "terre");
    assert.equal(h!.majeur, false);
    assert.equal(hoteDe(64)!.portier, true);
    assert.equal(hoteDe(64)!.muse, "saturne");
    assert.equal(hoteDe(64)!.demande, "porte");
  });

  it("une muse par bande, à l'étage médian ; Thalie au sol, Uranie au faîte", () => {
    assert.equal(BANDES, 9);
    assert.equal(etageMuse("terre"), 0);
    assert.equal(etageMuse("uranie"), ETAGES - 1);
    const vus = new Set<string>();
    for (let e = 0; e < ETAGES; e++) {
      const h = hoteDe(e);
      if (!h || !h.majeur) continue;
      assert.equal(vus.has(h.muse), false, `deux fois ${h.muse}`);
      vus.add(h.muse);
      assert.equal(h.muse, biomeDe(e).id);
      assert.equal(h.etage, etageMuse(h.muse));
      assert.equal(h.role, ROLES[h.muse].majeur);
    }
    assert.equal(vus.size, 9);
    for (let b = 1; b < BANDES - 1; b++) {
      const { de, a, mediane } = bandeParIndice(b);
      assert.equal(mediane, Math.floor((de + a) / 2));
      assert.equal(bandeDe(de).bande, b);
      assert.equal(bandeDe(a).bande, b);
      assert.equal(bandeDe(a + 1).bande, b + 1);
    }
    assert.equal(bandeParIndice(0).de, 0);
    assert.equal(bandeParIndice(8).a, ETAGES - 1);
  });

  it("lexique : 27 répliques par muse, FR et EN, 12 noms ; l'hôte y puise trois phrases", () => {
    for (const m of MUSES) {
      for (const langue of ["fr", "en"] as const) {
        let n = 0;
        for (const g of GROUPES_REPLIQUES) {
          const liste = REPLIQUES[m][langue][g];
          assert.equal(liste.length, REPLIQUES_PAR_GROUPE, `${m} ${langue} ${g}`);
          assert.equal(new Set(liste).size, liste.length, `doublon ${m} ${langue} ${g}`);
          for (const s of liste)
            assert.ok(s.trim().length > 12 && /[.!?]$/.test(s.trim()), `${m}: ${s}`);
          n += liste.length;
        }
        assert.equal(n, REPLIQUES_PAR_MUSE);
      }
      assert.equal(NOMS_CAPTURE[m].length, NOMS_PAR_MUSE);
      assert.equal(new Set(NOMS_CAPTURE[m]).size, NOMS_PAR_MUSE);
      assert.equal(ROLES[m].mineurs.length, 3);
    }
    const tous = MUSES.flatMap((m) => [...NOMS_CAPTURE[m]]);
    assert.equal(new Set(tous).size, tous.length, "un nom, une muse");
    for (const e of etagesHotes()) {
      const h = hoteDe(e)!;
      GROUPES_REPLIQUES.forEach((g, i) => {
        assert.ok(REPLIQUES[h.muse].fr[g].includes(h.repliques.fr[i]!));
        assert.ok(REPLIQUES[h.muse].en[g].includes(h.repliques.en[i]!));
      });
    }
  });

  it("don unique par (coffre, étage) ; la demande se lit, rien n'est consommé", () => {
    const c0 = coffreAtelier("une-piece");
    const ctx = { ages: [] as const };
    // Thalie ne demande rien
    const r = honorerDansCoffre(c0, 0, ctx);
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.don.genre, "elixir");
    assert.equal(r.don.nom, "sel");
    assert.equal(r.coffre.objets.length, 1);
    assert.deepEqual(r.coffre.tour.dons, [0]);
    const deja = honorerDansCoffre(r.coffre, 0, ctx);
    assert.equal(deja.ok, false);
    if (!deja.ok) assert.equal(deja.code, "deja");
    // même coffre, même étage : même don
    assert.equal(objetDon(hoteDe(0)!, c0)!.mot, r.don.mot);
    // un autre maître, un autre don
    assert.notEqual(objetDon(hoteDe(0)!, { ...c0, maitre: "autre" })!.mot, r.don.mot);
    // Polymnie veut un sceau de l'âge courant
    const p = hoteDe(212)!;
    assert.equal(p.muse, "saturne");
    assert.equal(demandeSatisfaite(p, c0, { ages: [] }), false);
    assert.equal(demandeSatisfaite(p, c0, { ages: ["Satya"] }), true);
    assert.equal(demandeSatisfaite(p, c0, { ages: ["Kali"] }), false);
    // Melpomène veut un objet de la classe du biome (soleil) ; rien n'est consommé
    const m = hoteDe(127)!;
    assert.equal(m.muse, "soleil");
    const o = objetDepuisGraine(sha256d(utf8("hote-test")), "Kali");
    const soleil = habille(
      { mot: o.mot, archetype: "soleil", age: "Kali", nonce: 1, hauteur: 1 },
      3,
      {
        genre: "trouve",
        emplacement: null,
        affixe: null,
        sockets: 0,
        gemmes: [],
        nom: "trouve",
        palierLair: null,
      },
    );
    assert.equal(demandeSatisfaite(m, c0, ctx), false);
    const avec = { ...c0, objets: [soleil] };
    assert.equal(demandeSatisfaite(m, avec, ctx), true);
    const h2 = honorerDansCoffre(avec, 127, ctx);
    assert.equal(h2.ok, true);
    if (h2.ok) {
      assert.equal(h2.don.nom, "soufre");
      assert.ok(h2.coffre.objets.some((x) => x.mot === soleil.mot));
    }
    // aucun hôte : rien
    assert.deepEqual(honorerDansCoffre(c0, 1, ctx), { ok: false, code: "aucun" });
  });

  it("jamais d'arme ni de philosophale en don ; un familier donne au plus un élixir", () => {
    const c = coffreAtelier("vide");
    for (const e of etagesHotes()) {
      const h = hoteDe(e)!;
      const d = objetDon(h, c);
      if (h.don.genre === "service") {
        assert.equal(d, null);
        assert.equal(h.majeur, true);
        continue;
      }
      assert.ok(d);
      assert.ok(["elixir", "gemme", "lair"].includes(d!.genre), `${e}: ${d!.genre}`);
      assert.notEqual(d!.genre, "arme");
      assert.notEqual(d!.genre, "philosophale");
      if (!h.majeur) assert.equal(d!.genre, "elixir");
      if (d!.genre === "elixir" && h.don.genre === "elixir") assert.equal(d!.nom, h.don.espece);
      if (d!.genre === "lair") assert.equal(d!.palierLair, e);
    }
  });
});

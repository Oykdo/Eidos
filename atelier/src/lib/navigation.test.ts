import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { EN, FR } from "./i18n.ts";
import {
  GROUPES,
  GUIDE,
  fichierRoute,
  groupeDe,
  pages,
  registreDe,
  sousOnglets,
} from "./navigation.ts";

describe("navigation — une liste, trois conditions", () => {
  it("chaque page a sa route dans src/routes", () => {
    for (const p of pages()) {
      const f = fileURLToPath(new URL(`../routes/${fichierRoute(p.to)}`, import.meta.url));
      assert.ok(existsSync(f), `${p.to} → ${f}`);
    }
  });

  it("identifiants et chemins uniques, registres cohérents", () => {
    const ids = pages().map((p) => p.id);
    assert.equal(new Set(ids).size, ids.length);
    const chemins = pages().map((p) => p.to);
    assert.equal(new Set(chemins).size, chemins.length);
    assert.equal(GROUPES.length, 3);
    assert.equal(groupeDe("coffre"), "verifier");
    assert.equal(groupeDe("arbre"), "lire");
    assert.equal(groupeDe("tour"), "jouer");
    assert.equal(groupeDe("guide"), "guide");
    assert.equal(GUIDE.to, "/guide");
    assert.equal(fichierRoute("/"), "index.tsx");
    assert.equal(fichierRoute("/tour"), "tour.tsx");
  });

  it("label et lede existent en FR et en EN", () => {
    for (const p of pages()) {
      for (const k of [p.label, p.lede]) {
        assert.ok(k in FR, `FR manque ${k}`);
        assert.ok(k in EN, `EN manque ${k}`);
      }
    }
    for (const g of GROUPES) {
      assert.ok(g.label in FR && g.label in EN, g.label);
    }
  });

  it("chaque registre ouvre une de ses pages, et n'affiche que les siennes en sous-onglets", () => {
    for (const g of GROUPES) {
      assert.ok(
        g.items.some((it) => it.to === g.defaut),
        `${g.id} : defaut ${g.defaut} n'est pas une de ses pages`,
      );
      for (const it of g.items) {
        assert.deepEqual(sousOnglets(it.id), g.items);
        assert.equal(registreDe(it.id)?.id, g.id);
      }
    }
    // le Guide n'appartient à aucun registre : pas de second rang sur sa page
    assert.equal(registreDe(GUIDE.id), null);
    assert.deepEqual(sousOnglets(GUIDE.id), []);
    // deux rangs au plus : 3 registres + Guide en tête, jamais les neuf pages à plat
    assert.equal(GROUPES.length + 1, 4);
    assert.ok(Math.max(...GROUPES.map((g) => g.items.length)) <= 4);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { coffreAtelier, coffreNeuf } from "./wallet.ts";
import { verifierAdresse } from "./glyphs.ts";
import { demanderAuReseau } from "./robinet.ts";

describe("robinet réseau", () => {
  it("refuse la graine d'atelier", () => {
    const r = demanderAuReseau(coffreAtelier("vide"));
    assert.ok("refus" in r);
  });

  it("ouvre une issue avec 31 glyphes valides", () => {
    const c = coffreNeuf("vide");
    const r = demanderAuReseau(c);
    assert.ok(!("refus" in r));
    if ("refus" in r) return;
    assert.match(r.url, /^https:\/\/github.com\/Oykdo\/Eidos\/issues\/new\?/);
    assert.match(r.url, /title=robinet/);
    const v = verifierAdresse(r.symboles);
    assert.equal(v.hexa, r.hexa);
    const groupes = r.symboles.split(/\s+/).filter((g) => g !== "|");
    assert.equal(groupes.length, 31);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { coffreAtelier, coffreNeuf } from "./wallet.ts";
import { verifierAdresse } from "./glyphs.ts";
import { courrielDemande, demanderAuReseau } from "./robinet.ts";

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

  it("courriel : mailto prérempli, sujet robinet, mêmes glyphes que l'issue", () => {
    const c = coffreNeuf("vide");
    const r = courrielDemande(c, "robinet@example.org");
    assert.ok(!("refus" in r));
    if ("refus" in r) return;
    assert.match(r.url, /^mailto:robinet@example\.org\?subject=robinet&body=/);
    const corps = decodeURIComponent(r.url.split("&body=")[1]!);
    assert.ok(corps.includes(r.symboles));
    assert.equal(verifierAdresse(r.symboles).hexa, r.hexa);
    const issue = demanderAuReseau(c);
    assert.ok(!("refus" in issue));
    if ("refus" in issue) return;
    assert.equal(issue.symboles, r.symboles);
    assert.equal(issue.hexa, r.hexa);
  });

  it("courriel : refusé sans boîte valide, et pour la graine d'atelier", () => {
    assert.ok("refus" in courrielDemande(coffreNeuf("vide"), "pas une adresse"));
    assert.ok("refus" in courrielDemande(coffreNeuf("vide"), ""));
    assert.ok("refus" in courrielDemande(coffreAtelier("vide"), "robinet@example.org"));
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { parserFederation, parserTeteReseau } from "./temoin.ts";
import { fabriquerTrophee, jugerTrophee, parserTrophee, serialiserTrophee } from "./trophee.ts";
import type { Sceau } from "./sceaux.ts";

const VEC = JSON.parse(
  readFileSync(new URL("../../../../vecteurs.json", import.meta.url), "utf8"),
) as {
  tete: {
    federation: { hauteur_mss: number; racines: string[]; graines_publiques: string[] };
    tete_signee: Record<string, unknown>;
    sorties: { txid: string; rang: number; adresse: string; montant: number }[];
  };
};

const tete = parserTeteReseau({ tete_signee: VEC.tete.tete_signee });
const fed = parserFederation(VEC.tete.federation);
if ("erreur" in tete || "erreur" in fed) throw new Error("vecteur tête illisible");
const s0 = VEC.tete.sorties[0]!;
const sceau: Sceau = { id: "arche", age: "Kali", adresse: "11".repeat(20), vers: s0.adresse };

describe("trophée — un sceau adossé à une preuve", () => {
  it("fabriqué depuis l'état et la tête, jugé sans rejeu, relié à la relique publiée", () => {
    const t = fabriquerTrophee(sceau, VEC.tete.sorties, tete);
    assert.ok(!("erreur" in t), "erreur" in t ? t.erreur : "");
    assert.equal(t.sortie.txid, s0.txid);
    const relu = parserTrophee(serialiserTrophee(t));
    assert.ok(!("erreur" in relu), "erreur" in relu ? relu.erreur : "");
    const monde = [{ id: "arche", adresse: "11".repeat(20), age: "Kali", etat: "recuperee", txid: s0.txid, vers: s0.adresse }];
    const v = jugerTrophee(relu, fed, monde);
    assert.equal(v.ok, true, v.motif);
    assert.equal(v.relie, true);
    assert.equal(jugerTrophee(relu, fed, [{ id: "arche", etat: "intacte" }]).relie, false);
    assert.equal(jugerTrophee(relu, fed).relie, null);
  });

  it("refuse : montant altéré, racine étrangère, tête d'un autre validateur, pièce absente", () => {
    const t = fabriquerTrophee(sceau, VEC.tete.sorties, tete);
    assert.ok(!("erreur" in t));
    const altere = { ...t, sortie: { ...t.sortie, montant: t.sortie.montant + 1 } };
    assert.match(jugerTrophee(altere, fed).motif, /feuille/);
    const etranger = { ...t, tete: { ...t.tete, utxoRoot: "00".repeat(32) } };
    assert.match(jugerTrophee(etranger, fed).motif, /racine|tête/);
    const autre = { ...t, tete: { ...t.tete, validateur: (t.tete.validateur + 1) % fed.racines.length } };
    assert.match(jugerTrophee(autre, fed).motif, /tête refusée/);
    const absent = fabriquerTrophee({ ...sceau, vers: "ff".repeat(20) }, VEC.tete.sorties, tete);
    assert.ok("erreur" in absent && /dépensée/.test(absent.erreur));
    assert.ok("erreur" in parserTrophee("{}"));
    assert.ok("erreur" in parserTrophee("pas du json"));
    const sansTete = JSON.parse(serialiserTrophee(t)) as Record<string, unknown>;
    sansTete.tete = { hauteur: 1 };
    assert.ok("erreur" in parserTrophee(JSON.stringify(sansTete)));
  });
});

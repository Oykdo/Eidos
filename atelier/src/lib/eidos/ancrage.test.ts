import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { hexOf } from "./hash.ts";
import { fabriquerAscension, graineAncree, jugerAscension, parserAscension, serialiserAscension, traceDe } from "./ancrage.ts";
import { ETAPES, run, type Choix } from "./pendule.ts";
import { parserFederation, parserTeteReseau, type TemoinReseau } from "./temoin.ts";

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
const reseau: TemoinReseau = { tete, verdict: { ok: true, validateur: tete.validateur }, sorties: VEC.tete.sorties, majUnix: null, lu: 0 };
const s0 = VEC.tete.sorties[0]!;
const ref = `${s0.txid}:${s0.rang}`;
const choix = Array.from({ length: ETAPES - 1 }, (_, i) => (["monter", "lire", "offrir"] as const)[i % 3] as Choix);
const mots = Array.from({ length: ETAPES - 1 }, (_, i) => 1000 + i);

describe("ascension ancrée — une pièce, un bloc, un run", () => {
  it("la graine ne dépend que du bloc et de la pièce : ni coffre, ni machine", () => {
    const g1 = graineAncree(tete.idBloc, s0);
    const g2 = graineAncree(tete.idBloc, { txid: s0.txid, rang: s0.rang });
    assert.equal(hexOf(g1), hexOf(g2));
    assert.notEqual(hexOf(graineAncree("00".repeat(32), s0)), hexOf(g1));
    assert.notEqual(hexOf(graineAncree(tete.idBloc, { txid: s0.txid, rang: s0.rang + 1 })), hexOf(g1));
    // rejouer la même pièce au même bloc donne le même run : rien à farmer
    const a = run(g1, (i) => choix[i]!, (i) => mots[i]!);
    const b = run(g2, (i) => choix[i]!, (i) => mots[i]!);
    assert.equal(traceDe(a), traceDe(b));
  });

  it("fabriquée depuis la tête suivie, sérialisée, relue, jugée sans rejouer la chaîne", () => {
    const a = fabriquerAscension(reseau, ref, choix, mots);
    assert.ok(!("erreur" in a), "erreur" in a ? a.erreur : "");
    const relue = parserAscension(serialiserAscension(a));
    assert.ok(!("erreur" in relue));
    const v = jugerAscension(relue, fed);
    assert.ok(v.ok, v.ok ? "" : v.motif);
    if (v.ok) {
      assert.equal(v.etapes.length, ETAPES);
      assert.equal(v.hauteur, tete.hauteur);
    }
  });

  it("refuse : tête non vérifiée, pièce absente, trace falsifiée, choix altéré, pièce d'un autre bloc", () => {
    assert.ok("erreur" in fabriquerAscension({ ...reseau, verdict: { ok: false, motif: "signature" } }, ref, choix, mots));
    assert.ok("erreur" in fabriquerAscension(reseau, "ff".repeat(32) + ":0", choix, mots));
    assert.ok("erreur" in fabriquerAscension(reseau, ref, choix.slice(1), mots));
    const a = fabriquerAscension(reseau, ref, choix, mots);
    assert.ok(!("erreur" in a));
    const trace = { ...a, trace: "00".repeat(32) };
    assert.match((jugerAscension(trace, fed) as { motif: string }).motif, /trace/);
    const c2 = [...a.choix];
    c2[5] = c2[5] === "monter" ? "lire" : "monter";
    assert.match((jugerAscension({ ...a, choix: c2 }, fed) as { motif: string }).motif, /trace/);
    const autreBloc = { ...a, tete: { ...a.tete, idBloc: "11".repeat(32) } };
    assert.match((jugerAscension(autreBloc, fed) as { motif: string }).motif, /tête/);
    const montant = { ...a, piece: { ...a.piece, montant: a.piece.montant + 1 } };
    assert.match((jugerAscension(montant, fed) as { motif: string }).motif, /feuille/);
    assert.ok("erreur" in parserAscension("{}"));
  });
});

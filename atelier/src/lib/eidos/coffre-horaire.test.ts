import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { hexOf } from "./hash.ts";
import { parserFederation, parserTeteReseau } from "./temoin.ts";
import { preuveReseau, serialiser } from "./merkle.ts";
import { tourVide } from "./jauge.ts";
import { coffreAtelier } from "./wallet.ts";
import {
  AGES_COFFRE,
  jugerClaim,
  reclamerDansCoffre,
  PROBA_TIER,
  TIERS,
  cleClaim,
  coffreDe,
  graineCoffre,
  memeObjet,
  museDuTier,
  tierDe,
} from "./coffre-horaire.ts";
import { SIGNATURES } from "./signatures.ts";

const BLOC = "31a68674bf8b3ed90bcf4e110fdab1f7273b66a486817fd26683b220af9c51bc";
const PIECE = { txid: "17b5470bfe2f0c3aec87f5a5c5d21b5da558194100d1e7a3955053cbe4bef847", rang: 0 };

describe("coffre horaire — le tirage, jamais le juge", () => {
  it("le tier compte les zéros de tête du premier octet, borné 1..9", () => {
    const g = (b: number) => Uint8Array.from([b, ...new Array<number>(31).fill(0)]);
    assert.deepEqual(
      [255, 128, 127, 64, 1, 0].map((b) => tierDe(g(b))),
      [1, 1, 2, 2, 8, 9],
    );
    for (let b = 0; b < 256; b++) {
      const t = tierDe(g(b));
      assert.ok(t >= 1 && t <= TIERS, `octet ${b} : tier ${t}`);
    }
  });

  it("les probabilités somment à 1 et se lisent sur les 256 octets", () => {
    assert.ok(Math.abs(PROBA_TIER.reduce((s, p) => s + p, 0) - 1) < 1e-15);
    const g = (b: number) => Uint8Array.from([b, ...new Array<number>(31).fill(0)]);
    for (let t = 1; t <= TIERS; t++) {
      const part =
        Array.from({ length: 256 }, (_, b) => tierDe(g(b))).filter((x) => x === t).length / 256;
      assert.equal(part, PROBA_TIER[t - 1]);
    }
  });

  it("un coffre est déterministe : même bloc, même pièce, même coffre", () => {
    const a = coffreDe(BLOC, PIECE);
    const b = coffreDe(BLOC, { ...PIECE });
    assert.deepEqual(a, b);
    assert.equal(a.graine, hexOf(graineCoffre(BLOC, PIECE)));
    assert.equal(a.objets.length, a.tier);
    for (const o of a.objets) {
      assert.equal(o.age, AGES_COFFRE[a.tier - 1]);
      assert.ok(o.mot >= 0 && Number.isInteger(o.mot));
    }
    assert.notEqual(coffreDe(BLOC, { ...PIECE, rang: 1 }).graine, a.graine);
  });

  it("neuf tiers, neuf muses : Thalie la plus commune, Uranie la plus rare, une lecture", () => {
    assert.equal(museDuTier(1).muse, "Thalie");
    assert.equal(museDuTier(1).astre, "⊕");
    assert.equal(museDuTier(TIERS).muse, "Uranie");
    assert.equal(museDuTier(TIERS).astre, "★");
    const ids = new Set(Array.from({ length: TIERS }, (_, i) => museDuTier(i + 1).id));
    assert.equal(ids.size, SIGNATURES.length, "chaque tier a sa muse, aucune deux fois");
    // la muse la plus rare est celle dont la chance est la plus faible : l'ordre suit PROBA_TIER
    for (let t = 2; t <= TIERS; t++) assert.ok(PROBA_TIER[t - 1]! <= PROBA_TIER[t - 2]!);
    for (const t of [0, 10, 1.5, Number.NaN]) assert.throws(() => museDuTier(t), /hors 1\.\.9/);
    // la muse ne touche pas l'objet : même graine, même mot, quel que soit ce qu'on en lit
    const a = coffreDe(BLOC, PIECE);
    assert.deepEqual(coffreDe(BLOC, PIECE).objets.map((o) => o.mot), a.objets.map((o) => o.mot));
  });

  it("réclamer pour de vrai : le juge exige la tête et la preuve, le carnet garde la clé", () => {
    const VEC = JSON.parse(readFileSync(new URL("../../../../vecteurs.json", import.meta.url), "utf8")) as {
      tete: { tete_signee: Record<string, unknown>; federation: Record<string, unknown>; sorties: { txid: string; rang: number; adresse: string; montant: number }[] };
    };
    const tete = parserTeteReseau({ tete_signee: VEC.tete.tete_signee });
    const fed = parserFederation(VEC.tete.federation);
    assert.ok(!("erreur" in tete) && !("erreur" in fed));
    if ("erreur" in tete || "erreur" in fed) return;
    const piece = VEC.tete.sorties[0]!;
    const p = preuveReseau(VEC.tete.sorties, `${piece.txid}:${piece.rang}`);
    assert.ok(p);
    const preuve = serialiser(p);
    const claim = { tete, piece, preuve };

    // preuve étrangère : refusée avant même de regarder la signature
    const fausse = { ...preuve, racine: "00".repeat(32) };
    assert.equal(jugerClaim({ ...claim, preuve: fausse }, fed, new Set()).ok, false);
    // tête dont la racine est substituée : id_bloc ne se recompose plus
    const substituee = { ...tete, utxoRoot: "00".repeat(32) };
    assert.equal(jugerClaim({ ...claim, tete: substituee }, fed, new Set()).ok, false);

    const c = { ...coffreAtelier("vide"), tour: tourVide() };
    const r = reclamerDansCoffre(c, claim, fed);
    assert.ok(r.ok, r.ok ? "" : r.motif);
    if (!r.ok) return;
    assert.equal(r.coffre.objets.length, c.objets.length + r.ouverture.tier);
    assert.deepEqual(r.coffre.tour.coffres, [cleClaim(tete.idBloc, piece)]);

    // une pièce, un bloc : la seconde fois est refusée, et le coffre n'a pas bougé
    const encore = reclamerDansCoffre(r.coffre, claim, fed);
    assert.equal(encore.ok, false);
    if (encore.ok) return;
    assert.match(encore.motif, /déjà réclamé/);
  });

  it("l'ouverture porte exactement ce que le juge a accepté : pris entier, rien de perdu", () => {
    const VEC = JSON.parse(readFileSync(new URL("../../../../vecteurs.json", import.meta.url), "utf8")) as {
      tete: { tete_signee: Record<string, unknown>; federation: Record<string, unknown>; sorties: { txid: string; rang: number; adresse: string; montant: number }[] };
    };
    const tete = parserTeteReseau({ tete_signee: VEC.tete.tete_signee });
    const fed = parserFederation(VEC.tete.federation);
    assert.ok(!("erreur" in tete) && !("erreur" in fed));
    if ("erreur" in tete || "erreur" in fed) return;
    const piece = VEC.tete.sorties[0]!;
    const p = preuveReseau(VEC.tete.sorties, `${piece.txid}:${piece.rang}`);
    assert.ok(p);
    const claim = { tete, piece, preuve: serialiser(p) };

    // un coffre qui a déjà des objets : les neufs s'ajoutent à la fin, les anciens ne bougent pas
    const avant = coffreDe("11".repeat(32), { txid: "22".repeat(32), rang: 3 }, 7).objets;
    const c = { ...coffreAtelier("vide"), objets: avant, tour: tourVide() };
    const r = reclamerDansCoffre(c, claim, fed);
    assert.ok(r.ok, r.ok ? "" : r.motif);
    if (!r.ok) return;
    const { ouverture: o } = r;
    const tire = coffreDe(tete.idBloc, piece, tete.hauteur);
    assert.equal(o.tier, tire.tier);
    assert.equal(o.graine, tire.graine);
    assert.equal(o.idBloc, tete.idBloc);
    assert.equal(o.hauteur, tete.hauteur);
    assert.equal(o.cle, cleClaim(tete.idBloc, piece));
    assert.equal(o.objets.length, o.tier, "t objets pour un tier t, aucun de perdu");
    assert.deepEqual(o.objets, tire.objets, "l'ouverture est le tirage, à l'objet près");
    assert.deepEqual(r.coffre.objets.slice(0, avant.length), avant);
    assert.deepEqual(r.coffre.objets.slice(avant.length), o.objets, "les neufs sont les derniers");
    // chaque objet de l'ouverture se retrouve une fois et une seule dans le coffre (memeObjet)
    for (const n of o.objets)
      assert.equal(r.coffre.objets.filter((x) => memeObjet(x, n)).length, 1);
    for (const a of avant) assert.ok(!o.objets.some((n) => memeObjet(a, n)), "un ancien n'est pas neuf");
    // l'ouverture n'est pas dans le coffre : rien à persister, le carnet ne la connaît pas
    assert.ok(!("ouverture" in r.coffre));
  });
});

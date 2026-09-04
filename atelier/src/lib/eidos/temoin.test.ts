import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { preuveReseau as preuveReseauV, serialiser as serialiserV } from "./merkle.ts";
import {
  idBlocDe,
  jugerReseau,
  jugerSortieReseau,
  parserFederation,
  parserTeteReseau,
  suivreReseau,
  verifierTeteReseau,
} from "./temoin.ts";

const VEC = JSON.parse(
  readFileSync(new URL("../../../../vecteurs.json", import.meta.url), "utf8"),
) as {
  tete: {
    federation: { hauteur_mss: number; racines: string[]; graines_publiques: string[] };
    tete_signee: Record<string, unknown> & { id_bloc: string; utxo_root: string; hauteur: number };
    sorties: { txid: string; rang: number; adresse: string; montant: number }[];
  };
};
import {
  adopterTete,
  avancer,
  encoderJson,
  juger,
  parserTete,
  parserTeteLien,
  serialiserTete,
  temoinVide,
} from "./temoin.ts";
import { preuvePourSortie, serialiser } from "./merkle.ts";
import { appliquerEnvoi, coffreAtelier } from "./wallet.ts";

describe("témoin — second carnet", () => {
  it("sans tête : aveugle", () => {
    const c = coffreAtelier("mixte");
    const p = serialiser(preuvePourSortie(c.sorties, c.sorties[0]!.ref)!);
    const { vue } = juger(temoinVide(), p);
    assert.equal(vue.code, "aveugle");
  });

  it("après suivre : une preuve du carnet est incluse", () => {
    const c = coffreAtelier("mixte");
    const { temoin } = avancer(temoinVide(), c.chaine);
    const p = serialiser(preuvePourSortie(c.sorties, c.sorties[0]!.ref)!);
    const { vue } = juger(temoin, p);
    assert.equal(vue.code, "incluse");
    assert.equal(p.racine, temoin.tete!.merkle);
  });

  it("un envoi sans suivre : racine étrangère", () => {
    const avant = coffreAtelier("une-piece");
    const { temoin } = avancer(temoinVide(), avant.chaine);
    const { coffre } = appliquerEnvoi(avant, 100_000_000, "00".repeat(20));
    assert.ok(coffre.derniereSig?.ok);
    const p = serialiser(preuvePourSortie(coffre.sorties, coffre.sorties[0]!.ref)!);
    const { vue } = juger(temoin, p);
    assert.equal(vue.code, "etrangere");
  });

  it("suivre après l'envoi : la nouvelle preuve passe", () => {
    const avant = coffreAtelier("une-piece");
    let { temoin } = avancer(temoinVide(), avant.chaine);
    const { coffre } = appliquerEnvoi(avant, 100_000_000, "00".repeat(20));
    const suite = avancer(temoin, coffre.chaine);
    assert.equal(suite.ok, true);
    temoin = suite.temoin;
    const p = serialiser(preuvePourSortie(coffre.sorties, coffre.sorties[0]!.ref)!);
    const { vue } = juger(temoin, p);
    assert.equal(vue.code, "incluse");
  });

  it("fourche si le journal est recréé sans la tête", () => {
    const a = coffreAtelier("mixte");
    const { coffre } = appliquerEnvoi(a, 50_000_000, "00".repeat(20));
    const { temoin } = avancer(temoinVide(), coffre.chaine);
    const neuf = coffreAtelier("mixte");
    const r = avancer(temoin, neuf.chaine);
    assert.equal(r.ok, false);
    assert.match(r.message, /fourche/);
  });

  it("feuille altérée : chemin rompu, même racine", () => {
    const c = coffreAtelier("mixte");
    const { temoin } = avancer(temoinVide(), c.chaine);
    const p = serialiser(preuvePourSortie(c.sorties, c.sorties[0]!.ref)!);
    p.feuille = (p.feuille.startsWith("00") ? "01" : "00") + p.feuille.slice(2);
    const { vue } = juger(temoin, p);
    assert.equal(vue.code, "rompue");
  });

  it("tête portable : aller-retour et lien", () => {
    const c = coffreAtelier("mixte");
    const t = c.chaine[c.chaine.length - 1]!;
    const port = serialiserTete({
      hauteur: t.hauteur,
      hash: t.hash,
      merkle: t.merkle,
      prev: t.prev,
    });
    const lu = parserTete(JSON.stringify(port));
    assert.ok(!("erreur" in lu));
    const via = parserTeteLien(encoderJson(port));
    assert.ok(!("erreur" in via));
    const temoin = adopterTete(temoinVide(), via);
    const p = serialiser(preuvePourSortie(c.sorties, c.sorties[0]!.ref)!);
    const { vue } = juger(temoin, p);
    assert.equal(vue.code, "incluse");
  });
});

describe("témoin du réseau — tête signée, sans rejeu", () => {
  it("recompose id_bloc, vérifie la signature XMSS, juge une preuve contre utxo_root", () => {
    const tete = parserTeteReseau({ tete_signee: VEC.tete.tete_signee });
    assert.ok(!("erreur" in tete), "erreur" in tete ? tete.erreur : "");
    const fed = parserFederation(VEC.tete.federation);
    assert.ok(!("erreur" in fed), "erreur" in fed ? fed.erreur : "");
    assert.equal(idBlocDe(tete), VEC.tete.tete_signee.id_bloc);
    const v = verifierTeteReseau(tete, fed);
    assert.deepEqual(v, { ok: true, validateur: tete.validateur });

    const s = VEC.tete.sorties;
    const ref = `${s[0]!.txid}:${s[0]!.rang}`;
    const p = preuveReseauV(s, ref);
    assert.ok(p);
    assert.equal(p.racine, tete.utxoRoot);
    assert.equal(jugerReseau(tete, serialiserV(p)).code, "incluse");
  });

  it("racine UTXO substituée : id_bloc ne se recompose plus ; signature d'un autre : refus ; preuve étrangère", () => {
    const tete = parserTeteReseau(VEC.tete.tete_signee);
    const fed = parserFederation(VEC.tete.federation);
    assert.ok(!("erreur" in tete) && !("erreur" in fed));
    const substituee = { ...tete, utxoRoot: "00".repeat(32) };
    assert.equal(verifierTeteReseau(substituee, fed).ok, false);
    assert.deepEqual(verifierTeteReseau(substituee, fed), { ok: false, motif: "id_bloc" });
    const autre = { ...tete, validateur: (tete.validateur + 1) % fed.racines.length };
    assert.deepEqual(verifierTeteReseau(autre, fed), { ok: false, motif: "signature" });
    const horsBorne = { ...tete, validateur: 99 };
    assert.deepEqual(verifierTeteReseau(horsBorne, fed), { ok: false, motif: "validateur" });

    const s = VEC.tete.sorties.map((x) => ({ ...x }));
    s[0]!.montant += 1;
    const p = preuveReseauV(s, `${s[0]!.txid}:${s[0]!.rang}`);
    assert.ok(p);
    assert.equal(jugerReseau(tete, serialiserV(p)).code, "etrangere");
    assert.equal(jugerReseau(tete, { ...serialiserV(p), racine: tete.utxoRoot }).code, "rompue");
    assert.ok("erreur" in parserTeteReseau({ ...VEC.tete.tete_signee, signature: "00" }));
    assert.ok("erreur" in parserFederation({ hauteur_mss: 4, racines: ["00"] }));
  });
});

describe("suivre le réseau — etat.json + federation.json (fetch simulé)", () => {
  const sortiesObj: Record<string, { adresse: string; montant: number }> = {};
  for (const s of VEC.tete.sorties) sortiesObj[`${s.txid}:${s.rang}`] = { adresse: s.adresse, montant: s.montant };
  const etat = { maj_unix: 1_788_000_000, tete_signee: VEC.tete.tete_signee, sorties: sortiesObj };
  const fed = { hauteur_mss: 4, racines: VEC.tete.federation.racines, graines_publiques: VEC.tete.federation.graines_publiques };
  const fetchOk = async (u: string) => ({ ok: true, json: async () => (u.endsWith("etat.json") ? etat : fed) });

  it("tête vérifiée, sorties lues, une sortie jugée incluse, une absente étrangère", async () => {
    const r = await suivreReseau(fetchOk);
    assert.ok(!("erreur" in r), "erreur" in r ? r.erreur : "");
    assert.equal(r.verdict.ok, true);
    assert.equal(r.sorties.length, VEC.tete.sorties.length);
    assert.equal(r.majUnix, 1_788_000_000);
    const s0 = VEC.tete.sorties[0]!;
    assert.equal(jugerSortieReseau(r, `${s0.txid}:${s0.rang}`).vue.code, "incluse");
    assert.equal(jugerSortieReseau(r, "ff".repeat(32) + ":0").vue.code, "etrangere");
  });

  it("fédération injoignable ou tête altérée : erreur ou verdict négatif, jamais une inclusion", async () => {
    const r = await suivreReseau(async (u) =>
      u.endsWith("federation.json") ? { ok: false, status: 404, json: async () => null } : { ok: true, json: async () => etat },
    );
    assert.ok("erreur" in r && /federation/.test(r.erreur));
    const altere = { ...etat, tete_signee: { ...VEC.tete.tete_signee, utxo_root: "00".repeat(32) } };
    const r2 = await suivreReseau(async (u) => ({ ok: true, json: async () => (u.endsWith("etat.json") ? altere : fed) }));
    assert.ok(!("erreur" in r2));
    assert.equal(r2.verdict.ok, false);
    const s0 = VEC.tete.sorties[0]!;
    assert.equal(jugerSortieReseau(r2, `${s0.txid}:${s0.rang}`).vue.code, "aveugle");
  });
});

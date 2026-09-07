import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { OCTETS_MAX, extraireSource, lireIndex, messageDepot, tetesDansLaChaine, tetesDe, verifierDepot } from "./depot.ts";
import { preuveReseau, serialiser } from "./merkle.ts";
import { parserFederation, parserTeteReseau } from "./temoin.ts";
import { arreterVeillee, construireArbre, graineArbre, ouvrirVeillee, serialiserVeillee, signerGeste, type Veillee } from "./veillee.ts";

type TeteBrute = Record<string, unknown>;
type SortieBrute = { txid: string; rang: number; adresse: string; montant: number };
const racine = new URL("../../../../", import.meta.url);
const VEC = JSON.parse(readFileSync(new URL("vecteurs.json", racine), "utf8")) as {
  veillee: {
    federation: { hauteur_mss: number; racines: string[]; graines_publiques: string[] };
    veille: TeteBrute;
    premier_du_jour: TeteBrute;
    second_du_jour: TeteBrute;
    sorties_au_premier: SortieBrute[];
  };
};
function tete(raw: TeteBrute) {
  const t = parserTeteReseau(raw);
  if ("erreur" in t) throw new Error(t.erreur);
  return t;
}
const fed = parserFederation(VEC.veillee.federation);
if ("erreur" in fed) throw new Error(fed.erreur);
const veille = tete(VEC.veillee.veille);
const jour = tete(VEC.veillee.premier_du_jour);
const second = tete(VEC.veillee.second_du_jour);
const chaine = [veille, jour, second];
const piece = VEC.veillee.sorties_au_premier[0]!;
const preuve = serialiser(preuveReseau(VEC.veillee.sorties_au_premier, `${piece.txid}:${piece.rang}`)!);

function preuveFinie(maitre: string, libre = false): Veillee {
  const arbre = construireArbre(graineArbre(maitre, jour.idBloc, libre ? null : piece));
  const v = ouvrirVeillee(arbre, jour, veille, libre ? null : { piece, preuve });
  if ("erreur" in v) throw new Error(v.erreur);
  const un = signerGeste(v, arbre, { g: "parler", arg: 0 }) as Veillee;
  const deux = signerGeste(un, arbre, { g: "franchir", arg: 0, mot: 7 }) as Veillee;
  return arreterVeillee(deux, "abandon");
}

describe("le dépôt : ce que le corps d'une issue peut dire", () => {
  it("un JSON collé, une pièce jointe, un gist, un dépôt brut ; tout autre hôte est ignoré", () => {
    const petit = '{"v":1,"spec":"eidos-veillee/1","x":1}';
    assert.deepEqual(extraireSource(`Voici ma preuve :\n${petit}\nmerci`), { genre: "json", texte: petit });
    const piece = "https://github.com/user-attachments/files/12345678/20331-6d19bd75-0.json";
    assert.deepEqual(extraireSource(`[20331-6d19bd75-0.json](${piece})`), { genre: "url", url: piece });
    const gist = "https://gist.githubusercontent.com/oykdo/0123456789abcdef0123456789abcdef/raw/preuve.json";
    assert.deepEqual(extraireSource(`ma preuve : ${gist}.`), { genre: "url", url: gist });
    const brut = "https://raw.githubusercontent.com/Oykdo/preuves/main/veillees/20331-6d19bd75-0.json";
    assert.deepEqual(extraireSource(brut), { genre: "url", url: brut });
    assert.ok("erreur" in extraireSource("https://evil.example/preuve.json et http://github.com/user-attachments/files/1/a.json"));
    assert.ok("erreur" in extraireSource("https://github.com/user-attachments/files/1/../../secret"));
    assert.ok("erreur" in extraireSource("rien du tout"));
    assert.ok("erreur" in extraireSource("{ pas du json \"eidos-veillee/1\" }"));
    assert.ok("erreur" in extraireSource("x".repeat(OCTETS_MAX + 1)));
    // un JSON qui n'est pas une veillée n'est pas retenu, l'adresse derrière l'est
    assert.deepEqual(extraireSource(`{"a":1} ${piece}`), { genre: "url", url: piece });
  });

  it("l'index se relit avec tolérance", () => {
    assert.deepEqual(lireIndex("[]"), []);
    assert.deepEqual(lireIndex('["a.json", 3, "b.json"]'), ["a.json", "b.json"]);
    assert.deepEqual(lireIndex("pas du json"), []);
    assert.deepEqual(lireIndex('{"a":1}'), []);
  });
});

describe("le dépôt : lisible, ancré, nouveau, dans la chaîne, vrai", () => {
  it("une preuve ancrée et finie est acceptée : nom, contenu resérialisé, index complété, lecture", () => {
    const v = preuveFinie("alice");
    const r = verifierDepot(serialiserVeillee(v), fed, chaine, ["20000-00000000-0.json"]);
    assert.ok(r.ok, r.ok ? "" : r.motif);
    if (!r.ok) return;
    assert.equal(r.nom, `${v.jour}-${piece.txid.slice(0, 8)}-${piece.rang}.json`);
    assert.deepEqual(r.index, ["20000-00000000-0.json", r.nom]);
    assert.equal(r.contenu, serialiserVeillee(v));
    assert.ok(r.classee && r.classee.salles === 2 && r.classee.butin === 1);
    assert.match(messageDepot(r, "12"), /acceptée.*veillees\//);
    // sans chaîne (fichier absent), le juge seul décide
    assert.ok(verifierDepot(serialiserVeillee(v), fed, null, []).ok);
  });

  it("refuse : libre, en cours, déjà déposée, illisible, trop grande, altérée", () => {
    const v = preuveFinie("bob");
    const texte = serialiserVeillee(v);
    assert.match((verifierDepot(serialiserVeillee(preuveFinie("bob", true)), fed, chaine, []) as { motif: string }).motif, /libre/);
    const enCours = { ...v, fin: null };
    assert.match((verifierDepot(serialiserVeillee(enCours), fed, chaine, []) as { motif: string }).motif, /en cours/);
    const nom = `${v.jour}-${piece.txid.slice(0, 8)}-${piece.rang}.json`;
    assert.match((verifierDepot(texte, fed, chaine, [nom]) as { motif: string }).motif, /déjà déposée/);
    assert.match((verifierDepot("{}", fed, chaine, []) as { motif: string }).motif, /illisible/);
    assert.match((verifierDepot("x".repeat(OCTETS_MAX + 1), fed, chaine, []) as { motif: string }).motif, /trop grande/);
    const alteree = { ...v, gestes: v.gestes.map((g, k) => (k === 1 ? { ...g, mot: g.mot + 1 } : g)) };
    assert.match((verifierDepot(serialiserVeillee(alteree), fed, chaine, []) as { motif: string }).motif, /juge/);
    assert.match(messageDepot({ ok: false, motif: "x" }, "3"), /refusée/);
  });

  it("refuse une tête absente de la chaîne publiée : le murmure est arrêté au dépôt", () => {
    const v = preuveFinie("carol");
    const autre = { ...jour, idBloc: "11".repeat(32) };
    const d = tetesDansLaChaine(v, [veille, autre, second]);
    assert.ok(!d.ok && /orphelin/.test(d.motif));
    assert.match((verifierDepot(serialiserVeillee(v), fed, [veille, autre, second], []) as { motif: string }).motif, /orphelin/);
    assert.match((verifierDepot(serialiserVeillee(v), fed, [veille], []) as { motif: string }).motif, /au-delà/);
    assert.ok(tetesDansLaChaine(v, chaine).ok);
    // la chaîne réelle du dépôt se lit et se vérifie ; une chaîne d'une autre fédération est refusée
    const brute = new Uint8Array(readFileSync(new URL("chaine-eidos.dat", racine)));
    const fedReelle = parserFederation(JSON.parse(readFileSync(new URL("federation.json", racine), "utf8")));
    if ("erreur" in fedReelle) throw new Error(fedReelle.erreur);
    const reelles = tetesDe(brute, fedReelle);
    assert.ok(reelles && !("erreur" in reelles) && reelles.length > 1);
    const mauvaise = tetesDe(brute, fed);
    assert.ok(mauvaise && "erreur" in mauvaise);
    assert.equal(tetesDe(null, fed), null);
  });
});

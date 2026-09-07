import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { lireTetes, premierDuJour, suivreChaine, tetesDeLaVeillee, verifierChaine } from "./chaine-reseau.ts";
import { parserFederation, parserTeteReseau } from "./temoin.ts";
import { estPremierDuJour, jourDe } from "./veillee.ts";

const racine = new URL("../../../../", import.meta.url);
const CHAINE = new Uint8Array(readFileSync(new URL("chaine-eidos.dat", racine)));
const ETAT = JSON.parse(readFileSync(new URL("etat.json", racine), "utf8")) as { hauteur: number; tete_signee: Record<string, unknown> };
const fed = parserFederation(JSON.parse(readFileSync(new URL("federation.json", racine), "utf8")));
if ("erreur" in fed) throw new Error(fed.erreur);

type TeteBrute = Record<string, unknown>;
const VEC = JSON.parse(readFileSync(new URL("vecteurs.json", racine), "utf8")) as {
  veillee: { federation: unknown; jour: number; veille: TeteBrute; premier_du_jour: TeteBrute; second_du_jour: TeteBrute };
};
function tete(raw: TeteBrute) {
  const t = parserTeteReseau(raw);
  if ("erreur" in t) throw new Error(t.erreur);
  return t;
}

describe("la chaîne du réseau d'essai, lue en en-têtes signés", () => {
  it("chaine-eidos.dat : chaque en-tête vérifié, chaîné ; la dernière tête est celle d'etat.json", () => {
    const tetes = lireTetes(CHAINE);
    assert.ok(!("erreur" in tetes), "erreur" in tetes ? tetes.erreur : "");
    assert.equal(tetes.length, ETAT.hauteur + 1);
    const v = verifierChaine(tetes, fed);
    assert.ok(v.ok, v.ok ? "" : `${v.hauteur} : ${v.motif}`);
    const publiee = tete(ETAT.tete_signee);
    const derniere = tetes[tetes.length - 1]!;
    assert.deepEqual(derniere, publiee);
    // le bloc 0 s'ouvre sur 32 zéros ; les hauteurs se suivent
    assert.equal(tetes[0]!.prev, "00".repeat(32));
    assert.ok(tetes.every((t, k) => t.hauteur === k));
  });

  it("refuse : magic, format, troncature, signature altérée, chaînage rompu", () => {
    const mauvais = new Uint8Array(CHAINE);
    mauvais[0] ^= 1;
    assert.match((lireTetes(mauvais) as { erreur: string }).erreur, /magic/);
    const format = new Uint8Array(CHAINE);
    format[9] = 4;
    assert.match((lireTetes(format) as { erreur: string }).erreur, /format 4/);
    assert.match((lireTetes(CHAINE.subarray(0, CHAINE.length - 100)) as { erreur: string }).erreur, /tronqué|incohérente/);
    const tetes = lireTetes(CHAINE) as ReturnType<typeof tete>[];
    const alt = tetes.map((t, k) => (k === 3 ? { ...t, signature: "00" + t.signature.slice(2) } : t));
    const va = verifierChaine(alt, fed);
    assert.ok(!va.ok && va.hauteur === 3 && /signature/.test(va.motif));
    const rompu = tetes.map((t, k) => (k === 5 ? { ...t, prev: "11".repeat(32) } : t));
    const vr = verifierChaine(rompu, fed);
    assert.ok(!vr.ok && vr.hauteur === 5 && /prev/.test(vr.motif));
    assert.ok(!verifierChaine([], fed).ok);
  });

  it("le premier bloc du jour, avec la tête de la veille, sur les vecteurs et sur la chaîne réelle", () => {
    const veille = tete(VEC.veillee.veille);
    const premier = tete(VEC.veillee.premier_du_jour);
    const second = tete(VEC.veillee.second_du_jour);
    const j = premierDuJour([veille, premier, second], VEC.veillee.jour);
    assert.ok(j && j.tete.idBloc === premier.idBloc && j.veille.idBloc === veille.idBloc);
    assert.ok(estPremierDuJour(j!.tete, j!.veille).ok);
    assert.equal(premierDuJour([veille, premier, second], VEC.veillee.jour + 1), null, "pas de bloc ce jour-là");
    assert.equal(premierDuJour([veille, premier, second], VEC.veillee.jour - 1), null, "le bloc 0 n'a pas de veille");
    assert.equal(tetesDeLaVeillee([veille, premier, second], premier.ts + 3600)!.tete.idBloc, premier.idBloc);
    const tetes = lireTetes(CHAINE) as ReturnType<typeof tete>[];
    const jours = [...new Set(tetes.map((t) => jourDe(t.ts)))];
    for (const jour of jours.slice(1)) {
      const r = premierDuJour(tetes, jour);
      assert.ok(r, `jour ${jour}`);
      assert.ok(estPremierDuJour(r!.tete, r!.veille).ok);
      assert.ok(tetes.every((t) => jourDe(t.ts) !== jour || t.hauteur >= r!.tete.hauteur), "le premier est le plus bas du jour");
    }
  });

  it("suivreChaine : lit, vérifie, rend les têtes ; injoignable ou refusée, le motif", async () => {
    const ok = await suivreChaine(fed, async () => ({ ok: true, arrayBuffer: async () => CHAINE.buffer.slice(CHAINE.byteOffset, CHAINE.byteOffset + CHAINE.byteLength) }));
    assert.ok("tetes" in ok && ok.hauteur === ETAT.hauteur);
    const ko = await suivreChaine(fed, async () => ({ ok: false, status: 404, arrayBuffer: async () => new ArrayBuffer(0) }));
    assert.match((ko as { erreur: string }).erreur, /404/);
    const autre = parserFederation({ ...VEC.veillee.federation as object });
    if ("erreur" in autre) throw new Error(autre.erreur);
    const refus = await suivreChaine(autre, async () => ({ ok: true, arrayBuffer: async () => CHAINE.buffer.slice(CHAINE.byteOffset, CHAINE.byteOffset + CHAINE.byteLength) }));
    assert.match((refus as { erreur: string }).erreur, /bloc 0 : signature/);
  });
});

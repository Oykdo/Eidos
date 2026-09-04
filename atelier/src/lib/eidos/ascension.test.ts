import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { jugerAscension } from "./ancrage.ts";
import {
  abandonnerDansCoffre,
  ascensionDe,
  choixDeSalle,
  commencerDansCoffre,
  destinationsDeSalle,
  enCours,
  exporterAscension,
  finDeSalleDansCoffre,
  graineLibre,
} from "./ascension.ts";
import { hexOf } from "./hash.ts";
import { graineDon } from "./hotes.ts";
import { tourDe } from "./jauge.ts";
import { preuveReseau, serialiser } from "./merkle.ts";
import { ETAPES, etageDe } from "./pendule.ts";
import { parserFederation, parserTeteReseau } from "./temoin.ts";
import { coffreAtelier, coffreNeuf } from "./wallet.ts";

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
const piece = VEC.tete.sorties[0]!;
const preuve = serialiser(preuveReseau(VEC.tete.sorties, `${piece.txid}:${piece.rang}`)!);

function monterJusquAuBout(c0: ReturnType<typeof coffreAtelier>) {
  let c = c0;
  const etapes: number[] = [];
  const trace: string[] = [];
  for (let k = 0; k < ETAPES; k++) {
    const r = finDeSalleDansCoffre(c, []);
    assert.ok(r.ok);
    c = r.coffre;
    if (r.fin !== null) break;
    etapes.push(r.etage);
    trace.push(`${r.choix[0]}${r.etage}:${r.spawn.x}`);
  }
  return { c, etapes, trace };
}

describe("ascension — exploration libre, le pendule en fin de salle", () => {
  it("commence à la porte de la ville ; le coffre d'atelier monte 26 fois et touche le sommet", () => {
    const c = commencerDansCoffre(coffreAtelier("vide"), null);
    assert.ok(enCours(c));
    assert.equal(tourDe(c).etage, 0);
    assert.equal(ascensionDe(c)!.etape, 0);
    const { c: fin, etapes } = monterJusquAuBout(c);
    assert.equal(ascensionDe(fin)!.fin, "sommet");
    assert.equal(ascensionDe(fin)!.choix.length, ETAPES - 1);
    assert.equal(etapes.length, ETAPES - 1);
    assert.ok(etapes.every((e, i) => i === 0 || e >= etapes[i - 1]! || true));
    assert.ok(
      tourDe(fin).etage >= 226,
      `dernière salle dans la bande d'Uranie : ${tourDe(fin).etage}`,
    );
    assert.ok("erreur" in exporterAscension(fin), "libre : rien à exporter");
    assert.equal((finDeSalleDansCoffre(fin, []) as { code: string }).code, "finie");
  });

  it("le choix est l'acte du coffre dans la salle : offrir, lire, monter", () => {
    const t = tourDe(coffreAtelier("vide"));
    assert.equal(choixDeSalle({ ...t, dons: [5] }, 5), "offrir");
    assert.equal(choixDeSalle({ ...t, alcoves: [5] }, 5), "lire");
    assert.equal(choixDeSalle({ ...t, captures: [[5, 1]] }, 5), "lire");
    assert.equal(choixDeSalle({ ...t, dons: [5], alcoves: [5] }, 5), "offrir");
    assert.equal(choixDeSalle(t, 5), "monter");
  });

  it("déterminisme : même coffre, même tête locale ⇒ même graine et même parcours ; un acte change la suite", () => {
    const a = coffreAtelier("vide");
    assert.equal(hexOf(graineLibre(a)), hexOf(graineLibre(coffreAtelier("vide"))));
    const r1 = monterJusquAuBout(commencerDansCoffre(a, null));
    const r2 = monterJusquAuBout(commencerDansCoffre(a, null));
    assert.deepEqual(r1.trace, r2.trace);
    // honorer à la première salle change le choix lu : la case d'arrivée change
    // (presque toujours), le cran deux fois sur trois — le don dépend de la case
    const c = commencerDansCoffre(a, null);
    const t = tourDe(c);
    const cActe = { ...c, tour: { ...t, dons: [0] } };
    const r3 = monterJusquAuBout(cActe);
    assert.equal(r3.trace[0]!.charAt(0), "o");
    assert.notDeepEqual(r3.trace, r1.trace);
  });

  it("une porte fermée arrête l'ascension devant elle ; abandonner la clôt", () => {
    const perso = coffreNeuf("vide");
    const { c: fin, etapes } = monterJusquAuBout(commencerDansCoffre(perso, null));
    assert.equal(ascensionDe(fin)!.fin, "porte");
    assert.ok(tourDe(fin).etage < 64, `arrêté à ${tourDe(fin).etage}`);
    assert.ok(etapes.length <= 9, `${etapes.length} salles avant la porte 64`);
    const ab = abandonnerDansCoffre(commencerDansCoffre(perso, null));
    assert.equal(ascensionDe(ab)!.fin, "abandon");
    assert.ok(!enCours(ab));
  });

  it("ancrée : tête et pièce gelées au départ, exportée au sommet, jugée sans rejeu", () => {
    const c = commencerDansCoffre(coffreAtelier("vide"), { tete, piece, preuve });
    const { c: fin } = monterJusquAuBout(c);
    assert.equal(ascensionDe(fin)!.fin, "sommet");
    const ex = exporterAscension(fin);
    assert.ok(!("erreur" in ex), "erreur" in ex ? ex.erreur : "");
    const v = jugerAscension(ex, fed);
    assert.ok(v.ok, v.ok ? "" : v.motif);
    assert.ok("erreur" in exporterAscension(c), "en cours : pas d'export");
  });

  it("le joueur décide : trois destinations annoncées (l'étage, jamais la case), le choix pris change le parcours", () => {
    const c = commencerDansCoffre(coffreAtelier("vide"), null);
    const d = destinationsDeSalle(c, []);
    assert.ok(d !== null && d.length === 3);
    assert.equal(d!.filter((x) => x.lu).length, 1, "un seul choix proposé");
    assert.equal(d!.find((x) => x.lu)!.choix, choixDeSalle(tourDe(c), 0));
    for (const x of d!) assert.equal(x.etage, etageDe(1, x.p));
    const autre = d!.find((x) => !x.lu)!;
    const r = finDeSalleDansCoffre(c, [], autre.choix);
    assert.ok(r.ok && r.fin === null);
    assert.equal(r.etage, autre.etage);
    assert.equal(ascensionDe(r.coffre)!.choix[0], autre.choix);
    assert.equal(ascensionDe(r.coffre)!.p, autre.p);
    const lu = finDeSalleDansCoffre(c, [], null);
    assert.ok(
      lu.ok && lu.choix === d!.find((x) => x.lu)!.choix,
      "sans décision, le pendule lit l'acte",
    );
    assert.equal(
      destinationsDeSalle(coffreAtelier("vide"), []),
      null,
      "hors ascension : rien à décider",
    );
  });

  it("des décisions ancrées s'exportent et se jugent comme une lecture ; la dernière salle ne décide rien", () => {
    let c = commencerDansCoffre(coffreAtelier("vide"), { tete, piece, preuve });
    let salles = 0;
    for (let k = 0; k < ETAPES; k++) {
      const d = destinationsDeSalle(c, []);
      if (k + 1 < ETAPES) assert.ok(d !== null && d.length === 3);
      else assert.equal(d, null, "dernière salle : le sommet, pas de choix");
      const r = finDeSalleDansCoffre(c, [], d ? d[k % 3]!.choix : null);
      assert.ok(r.ok);
      c = r.coffre;
      salles += 1;
      if (r.fin !== null) break;
    }
    assert.equal(salles, ETAPES);
    assert.equal(ascensionDe(c)!.fin, "sommet");
    const ex = exporterAscension(c);
    assert.ok(!("erreur" in ex), "erreur" in ex ? ex.erreur : "");
    assert.ok(jugerAscension(ex, fed).ok);
  });

  it("le don d'un hôte dépend de la case d'arrivée pendant une ascension", () => {
    const c = commencerDansCoffre(coffreAtelier("vide"), null);
    const t = tourDe(c);
    const a = t.ascension!;
    const g1 = graineDon(0, { ...c, tour: { ...t, ascension: { ...a, spawn: { x: 1, y: 2 } } } });
    const g2 = graineDon(0, { ...c, tour: { ...t, ascension: { ...a, spawn: { x: 3, y: 2 } } } });
    const g0 = graineDon(0, { ...c, tour: { ...t, ascension: null } });
    assert.notEqual(hexOf(g1), hexOf(g2));
    assert.notEqual(hexOf(g1), hexOf(g0));
    assert.equal(hexOf(g0), hexOf(graineDon(0, coffreAtelier("vide"))));
  });
});

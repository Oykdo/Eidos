/**
 * Exporte une veillée pour le labo Python (labo/aura_veillee.py) : les gestes
 * sans leurs signatures, et le parcours rejoué. Le labo lit, il ne juge pas —
 * les signatures restent ici, jugerVeillee reste le seul juge.
 *
 *   node --experimental-strip-types scripts/exporter-veillee.ts [graineBot]
 *   node --experimental-strip-types scripts/exporter-veillee.ts --depuis <fichier>
 *   → JSON sur stdout : { jour, hauteur, fin, gestes: [{ i, g, etape, etage, arg, mot }], parcours: [Etape] }
 *
 * Sans --depuis : une veillée LIBRE jouée par le bot « gourmand » (même boucle
 * que veillee-bot.jouerVeillee, réduite à ce qu'il faut pour obtenir la veillée
 * elle-même — le bot ne rend que ses mesures). C'est la fixture de la CI.
 *
 * Avec --depuis : une veillée VRAIMENT JOUÉE, relue par `parserVeillee` depuis
 * un fichier exporté (`serialiserVeillee`, ce que la page Veillée donne) ou
 * depuis un carnet (`coffre.tour.veillee.v`). Aucune signature ne sort : le
 * même filtre s'applique, ancrée ou libre.
 *
 * Figures, pas preuves ; un run du bot coûte 2 à 4 s (l'arbre de 64 feuilles
 * est rebâti), une relecture est immédiate.
 * LIMITE : `--depuis` ne vérifie rien — c'est une lecture. Un fichier qui ne se
 * parse pas est refusé, un fichier qui ment passe : `jugerVeillee` est ailleurs.
 */

import { xorshift } from "../src/lib/eidos/pendule-phase0.ts";
import { CHOIX, ETAPES, type Choix } from "../src/lib/eidos/pendule.ts";
import {
  parcoursDe,
  parserVeillee,
  serialiserVeillee,
  type Veillee,
} from "../src/lib/eidos/veillee.ts";
import { graineDePolitique, jourDuVecteur } from "../src/lib/eidos/veillee-bot.ts";
import {
  abandonnerVeilleeDansCoffre,
  creuserDansCoffre,
  franchirDansCoffre,
  ouvrirAlcoveDansCoffre,
  ouvrirVeilleeDansCoffre,
  parlerDansCoffre,
  veilleeDe,
  type Reserver,
} from "../src/lib/eidos/veillee-tour.ts";
import { coffreAtelier } from "../src/lib/eidos/wallet.ts";
import { tourDe } from "../src/lib/eidos/jauge.ts";
import { spawnIci } from "../src/lib/eidos/fouilles.ts";
import { aUnHote, donHonore } from "../src/lib/eidos/hotes.ts";
import { aUneAlcove } from "../src/lib/eidos/secrets.ts";
import type { Coffre } from "../src/lib/eidos/types.ts";
import { readFileSync } from "node:fs";

/** Le seul point de sortie : gestes sans signatures, parcours rejoué. */
function rendre(v: Veillee): never {
  const parcours = parcoursDe(v).etapes;
  const gestes = v.gestes.map(({ i, g, etape, etage, arg, mot }) => ({
    i,
    g,
    etape,
    etage,
    arg,
    mot,
  }));
  process.stdout.write(
    JSON.stringify({ jour: v.jour, hauteur: v.hauteur, fin: v.fin, gestes, parcours }) + "\n",
  );
  process.exit(0);
}

if (process.argv[2] === "--depuis") {
  const chemin = process.argv[3];
  if (!chemin) throw new Error("--depuis attend un fichier");
  const raw = readFileSync(chemin, "utf8");
  const direct = parserVeillee(raw);
  if (!("erreur" in direct)) rendre(direct);
  // sinon : un carnet, dont on prend la veillée du coffre
  let carnet: { coffre?: { tour?: { veillee?: { v?: unknown } } } };
  try {
    carnet = JSON.parse(raw) as typeof carnet;
  } catch {
    throw new Error(`ni veillée ni carnet : ${direct.erreur}`);
  }
  const brute = carnet.coffre?.tour?.veillee?.v;
  if (!brute) throw new Error(`ni veillée ni carnet portant une veillée : ${direct.erreur}`);
  const duCarnet = parserVeillee(serialiserVeillee(brute as Veillee));
  if ("erreur" in duCarnet) throw new Error(`veillée du carnet illisible : ${duCarnet.erreur}`);
  rendre(duCarnet);
}

const graineBot = Number(process.argv[2] ?? "7");
const alea = xorshift(graineDePolitique(graineBot, "gourmand"));
const jour = jourDuVecteur();
const ouverture = ouvrirVeilleeDansCoffre(coffreAtelier("vide"), jour.tete, jour.veille, null);
if (!ouverture.ok) throw new Error(ouverture.motif);
let c: Coffre = ouverture.coffre;
const vus = new Set<string>();
const reserver: Reserver = (racine, indice) => {
  const k = `${racine}/${indice}`;
  if (vus.has(k)) return false;
  vus.add(k);
  return true;
};
const finie = (): boolean => veilleeDe(c)!.v.fin !== null;
const applique = (r: { ok: true; coffre: Coffre } | { ok: false }): void => {
  if (r.ok) c = r.coffre;
};
for (let tour = 0; tour <= ETAPES && !finie(); tour++) {
  const etage = tourDe(c).etage;
  if (aUnHote(etage) && !donHonore(c, etage)) applique(parlerDansCoffre(c, [], reserver));
  if (finie()) break;
  const s = spawnIci(c, etage);
  if (s) applique(creuserDansCoffre(c, s.x, s.y, reserver));
  if (finie()) break;
  if (aUneAlcove(etage) && !tourDe(c).alcoves.includes(etage))
    applique(ouvrirAlcoveDansCoffre(c, reserver));
  if (finie()) break;
  const choix: Choix = CHOIX[Math.floor(alea() * CHOIX.length)]!;
  const f = franchirDansCoffre(c, [], choix, reserver);
  if (!f.ok) break;
  c = f.coffre;
}
if (!finie()) c = abandonnerVeilleeDansCoffre(c);
const v = veilleeDe(c)!.v;
const parcours = parcoursDe(v).etapes;
const gestes = v.gestes.map(({ i, g, etape, etage, arg, mot }) => ({
  i,
  g,
  etape,
  etage,
  arg,
  mot,
}));
process.stdout.write(
  JSON.stringify({ jour: v.jour, hauteur: v.hauteur, fin: v.fin, gestes, parcours }) + "\n",
);

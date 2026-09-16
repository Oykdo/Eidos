/**
 * Exporte une veillée pour le labo Python (labo/aura_veillee.py) : les gestes
 * sans leurs signatures, et le parcours rejoué. Le labo lit, il ne juge pas —
 * les signatures restent ici, jugerVeillee reste le seul juge.
 *
 *   node --experimental-strip-types scripts/exporter-veillee.ts [graineBot]
 *   node --experimental-strip-types scripts/exporter-veillee.ts --depuis <fichier>
 *   → JSON sur stdout : { jour, hauteur, fin, gestes: [{ i, g, etape, etage, arg, mot }], parcours: [Etape] }
 *
 * Sans --depuis : une veillée LIBRE jouée par le bot « gourmand » de
 * veillee-bot.ts (`jouerVeilleeEntiere` : la même boucle, batailles comprises
 * depuis C4 PR 5b — le bot se bat avec trois captures). C'est la fixture de la CI.
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

import { readFileSync } from "node:fs";
import { xorshift } from "../src/lib/eidos/pendule-phase0.ts";
import {
  parcoursDe,
  parserVeillee,
  serialiserVeillee,
  type Veillee,
} from "../src/lib/eidos/veillee.ts";
import { graineDePolitique, jouerVeilleeEntiere, jourDuVecteur } from "../src/lib/eidos/veillee-bot.ts";

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
const v = jouerVeilleeEntiere("gourmand", alea, jour).v;

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

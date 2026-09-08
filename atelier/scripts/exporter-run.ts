/**
 * Exporte un run du pendule-9 pour le labo Python (labo/unification.py).
 * L'atelier décide du parcours, le labo lit l'aura : ce script est le seul pont.
 *
 *   node --experimental-strip-types scripts/exporter-run.ts [maitre] [n] [ville]
 *   → JSON sur stdout : 27 étapes { i, p, e, s: { x, y } }
 *
 * Choix et objet porté sont fixés (monter/lire/offrir en boucle, portMot = 0) :
 * un export est une lecture reproductible, jamais une partie. Figures, pas preuves.
 * LIMITE : aucune option pour rejouer des choix réels ; une ascension jouée se
 * relirait par parserAscension (même schéma), reste de la LIST 6 — sauver.ts n'est
 * que le sélecteur de fichier du navigateur, pas une porte vers les runs.
 */

import { sha256d, utf8 } from "../src/lib/eidos/hash.ts";
import { CHOIX, graineRun, quantiteDon, run, type Choix } from "../src/lib/eidos/pendule.ts";

const [maitre = "labo", n = "0", ville = "labo"] = process.argv.slice(2);
const graine = graineRun(maitre, Number(n), sha256d(utf8(`ville/${ville}`)));
const etapes = run(
  graine,
  (i) => CHOIX[i % CHOIX.length] as Choix,
  () => 0,
).map((et) => ({ ...et, q: quantiteDon(et.s) }));
process.stdout.write(JSON.stringify(etapes) + "\n");

/**
 * Exporte une veillée LIBRE jouée par le bot (politique « gourmand ») pour le
 * labo Python (labo/aura_veillee.py) : les gestes sans leurs signatures, et le
 * parcours rejoué. Le labo lit, il ne juge pas — les signatures restent ici.
 *
 *   node --experimental-strip-types scripts/exporter-veillee.ts [graineBot]
 *   → JSON sur stdout : { jour, hauteur, fin, gestes: [{ i, g, etape, etage, arg, mot }], parcours: [Etape] }
 *
 * Même boucle que veillee-bot.jouerVeillee, réduite à ce qu'il faut pour
 * obtenir la veillée elle-même (le bot ne rend que ses mesures). Figures, pas
 * preuves ; un run coûte 2 à 4 s (l'arbre de 64 feuilles est rebâti).
 */

import { xorshift } from "../src/lib/eidos/pendule-phase0.ts";
import { CHOIX, ETAPES, type Choix } from "../src/lib/eidos/pendule.ts";
import { parcoursDe } from "../src/lib/eidos/veillee.ts";
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
  if (aUneAlcove(etage) && !tourDe(c).alcoves.includes(etage)) applique(ouvrirAlcoveDansCoffre(c, reserver));
  if (finie()) break;
  const choix: Choix = CHOIX[Math.floor(alea() * CHOIX.length)]!;
  const f = franchirDansCoffre(c, [], choix, reserver);
  if (!f.ok) break;
  c = f.coffre;
}
if (!finie()) c = abandonnerVeilleeDansCoffre(c);
const v = veilleeDe(c)!.v;
const parcours = parcoursDe(v).etapes;
const gestes = v.gestes.map(({ i, g, etape, etage, arg, mot }) => ({ i, g, etape, etage, arg, mot }));
process.stdout.write(JSON.stringify({ jour: v.jour, hauteur: v.hauteur, fin: v.fin, gestes, parcours }) + "\n");

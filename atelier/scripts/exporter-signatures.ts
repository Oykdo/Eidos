/**
 * Exporte les neuf signatures planétaires et leur rang de bande pour le labo
 * (labo/aura_voxel_lab.py, table des muses). Une seule source : signatures.ts, via biomeDe (tour.ts) et rangBande (pendule.ts).
 *
 *   node --experimental-strip-types scripts/exporter-signatures.ts
 *   → JSON sur stdout : [{ bande, rang, id, astre, muse, etages }]
 *
 * Le labo ne recopie pas les muses : il relit ce fichier. Figures, pas preuves.
 */

import { BANDES, debutBande, rangBande } from "../src/lib/eidos/pendule.ts";
import { biomeDe } from "../src/lib/eidos/tour.ts";

const out = Array.from({ length: BANDES }, (_, k) => {
  const s = biomeDe(debutBande(k));
  return { bande: k, rang: rangBande(k), id: s.id, astre: s.astre, muse: s.muse, etages: s.etages };
});
process.stdout.write(JSON.stringify(out) + "\n");

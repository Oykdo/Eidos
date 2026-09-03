/**
 * Artefacts gelés de la chaîne d'essai — etat.json, hauteur 76.
 * Même adresse, trois digests. Le rendu se rejoue sans le réseau.
 */

import type { Artefact } from "../eidos/signatures.ts";
import { artefactDeGoutte } from "../eidos/signatures.ts";

export const ADRESSE_CHAINES = "1a56415346085a7afc028ccc90426f67762e6d10";

export const ARTEFACTS_CHAINES: readonly Artefact[] = [
  {
    id: "terre",
    code: 3,
    txid: "0a26b7b67e7bdc7f89ca0caf4b9607631419ff8f956e89bd3977f84da2195f54",
    adresse: ADRESSE_CHAINES,
    digest: "835cde241b49956530a5797f9071312bb337b378eadb6c325edc9fd7a16b486e",
  },
  {
    id: "lune",
    code: 42,
    txid: "f497f852ec21d832df367c4e356fbc4c54a368d3b8c18cdcecbc55d8483581c3",
    adresse: ADRESSE_CHAINES,
    digest: "6acd30e45e1d89365f8b3ee362e9e5a3b8a572a2c50f8aebdf966c01bb51dbde",
  },
  {
    id: "soleil",
    code: 21,
    txid: "d3c35c9f30dfbe85cf61981a3272aec1586fea406e793c799ce480866150aa0e",
    adresse: ADRESSE_CHAINES,
    digest: "95e5308b2308cb43256104db054361e684ba08ece0bfe1a29c9f5829b18eb3b2",
  },
];

/** Œuf de l'essai local — déjà dans signatures.test.ts. */
export function artefactEssai(): Artefact {
  return artefactDeGoutte("00".repeat(32), "11".repeat(20))!;
}

export function fusionnerArtefacts(vus: Artefact[]): Artefact[] {
  const out: Artefact[] = [];
  const seen = new Set<string>();
  for (const a of [...ARTEFACTS_CHAINES, ...vus]) {
    if (seen.has(a.digest)) continue;
    seen.add(a.digest);
    out.push(a);
  }
  return out;
}

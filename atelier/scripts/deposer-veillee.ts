#!/usr/bin/env node
/**
 * Dépose une preuve de veillée depuis une issue GitHub — le juge dans la CI.
 *
 *   node --experimental-strip-types scripts/deposer-veillee.ts
 *
 * Lit l'environnement (jamais un argument, jamais une interpolation) :
 *   EIDOS_ISSUE_BODY     le corps de l'issue : un JSON collé ou l'adresse du fichier
 *   EIDOS_ISSUE_NUMBER   pour le message
 *   EIDOS_MESSAGE        le fichier où écrire le message rendu au déposant
 * Lit le dépôt : federation.json, chaine-eidos.dat, veillees/index.json.
 * Écrit, si la preuve passe : veillees/<nom>.json et veillees/index.json.
 * Code de sortie : 0 acceptée, 2 refusée (rien d'écrit), 1 erreur d'exécution.
 *
 * Tout ce qui décide est dans src/lib/eidos/depot.ts, testé ; ce script ne
 * fait que l'entrée et la sortie. LIMITE : la pièce jointe est téléchargée
 * sans authentification, avec un plafond d'octets et un délai.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { OCTETS_MAX, extraireSource, lireIndex, messageDepot, tetesDe, verifierDepot } from "../src/lib/eidos/depot.ts";
import { parserFederation } from "../src/lib/eidos/temoin.ts";

const RACINE = join(import.meta.dirname, "..", "..");
const DOSSIER = join(RACINE, "veillees");

function ecrireMessage(texte: string): void {
  const chemin = process.env.EIDOS_MESSAGE;
  if (chemin) writeFileSync(chemin, texte + "\n", "utf8");
  console.log(texte);
}

async function telecharger(url: string): Promise<string> {
  const ctrl = new AbortController();
  const delai = setTimeout(() => ctrl.abort(), 30_000);
  try {
    const r = await fetch(url, { signal: ctrl.signal, redirect: "follow" });
    if (!r.ok) throw new Error(`téléchargement refusé (${r.status})`);
    const lecteur = r.body?.getReader();
    if (!lecteur) throw new Error("réponse sans corps");
    const morceaux: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await lecteur.read();
      if (done) break;
      total += value.byteLength;
      if (total > OCTETS_MAX) {
        ctrl.abort();
        throw new Error(`fichier trop grand (plus de ${OCTETS_MAX} octets)`);
      }
      morceaux.push(value);
    }
    const tout = new Uint8Array(total);
    let i = 0;
    for (const m of morceaux) {
      tout.set(m, i);
      i += m.byteLength;
    }
    return new TextDecoder("utf-8", { fatal: true }).decode(tout);
  } finally {
    clearTimeout(delai);
  }
}

async function main(): Promise<number> {
  const numero = (process.env.EIDOS_ISSUE_NUMBER ?? "?").replace(/[^0-9]/g, "") || "?";
  const corps = process.env.EIDOS_ISSUE_BODY ?? "";
  const fed = parserFederation(JSON.parse(readFileSync(join(RACINE, "federation.json"), "utf8")));
  if ("erreur" in fed) {
    ecrireMessage(`Erreur : federation.json illisible (${fed.erreur}).`);
    return 1;
  }
  const cheminChaine = join(RACINE, "chaine-eidos.dat");
  const tetes = tetesDe(existsSync(cheminChaine) ? new Uint8Array(readFileSync(cheminChaine)) : null, fed);
  if (tetes && "erreur" in tetes) {
    ecrireMessage(`Erreur : ${tetes.erreur}.`);
    return 1;
  }
  const cheminIndex = join(DOSSIER, "index.json");
  const index = lireIndex(existsSync(cheminIndex) ? readFileSync(cheminIndex, "utf8") : "[]");

  const source = extraireSource(corps);
  if ("erreur" in source) {
    ecrireMessage(messageDepot({ ok: false, motif: source.erreur }, numero));
    return 2;
  }
  let texte: string;
  try {
    texte = source.genre === "json" ? source.texte : await telecharger(source.url);
  } catch (e) {
    ecrireMessage(messageDepot({ ok: false, motif: `fichier injoignable : ${e instanceof Error ? e.message : String(e)}` }, numero));
    return 2;
  }
  const r = verifierDepot(texte, fed, tetes, index);
  ecrireMessage(messageDepot(r, numero));
  if (!r.ok) return 2;
  writeFileSync(join(DOSSIER, r.nom), r.contenu + "\n", "utf8");
  writeFileSync(cheminIndex, JSON.stringify(r.index, null, 2) + "\n", "utf8");
  return 0;
}

main().then(
  (code) => process.exit(code),
  (e) => {
    ecrireMessage(`Erreur : ${e instanceof Error ? e.message : String(e)}.`);
    process.exit(1);
  },
);

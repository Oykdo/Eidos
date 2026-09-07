/**
 * Le dépôt d'une preuve de veillée par issue — le juge dans la CI, jamais un serveur.
 *
 * Une preuve `eidos-veillee/1` pèse cent à trois cents kilo-octets (une
 * signature WOTS+ par geste) : elle n'entre pas dans le corps d'une issue
 * GitHub (65 536 caractères). Le joueur la **joint** à l'issue (glisser le
 * fichier : GitHub le range sous `github.com/user-attachments/files/…`), ou
 * la colle dans un gist, ou la publie dans un dépôt ; le corps de l'issue ne
 * porte que l'adresse. Une preuve minuscule peut aussi être collée telle
 * quelle. Trois hôtes seulement sont lus, en HTTPS, avec un plafond d'octets.
 *
 * Ce que le juge de la CI vérifie avant de committer le fichier dans
 * `veillees/` et sa ligne dans `index.json` :
 *   - la preuve se lit (`parserVeillee`) et n'est pas libre (une lecture) ;
 *   - son nom de fichier (`<jour>-<txid 8 hex>-<rang>.json`) n'est pas déjà
 *     dans l'index : une pièce, une veillée par jour, la première déposée tient ;
 *   - ses trois têtes (le jour, la veille, l'ancre) sont **dans la chaîne
 *     publiée** (`chaine-eidos.dat`, lue en en-têtes signés) : une veillée
 *     ancrée sur un bloc que la chaîne n'a pas gardé — le « murmure » de la
 *     bible — est refusée ici, ce que le classement du navigateur ne fait pas ;
 *   - `jugerVeillee` : deux têtes XMSS, la pièce contre la racine, chaque
 *     feuille dans l'ordre, le parcours recalculé, la fin cohérente.
 *
 * Le corps de l'issue n'est jamais interpolé dans une commande : il arrive par
 * l'environnement (`EIDOS_ISSUE_BODY`, comme pour le robinet), et rien n'en est
 * retenu qu'une adresse d'un hôte autorisé ou un JSON qui se parse. Le fichier
 * écrit est la preuve **resérialisée** par l'atelier, pas l'octet reçu.
 *
 * Figures, pas preuves : l'acceptation dit que la preuve est vraie, pas que
 * la pièce est au déposant — cela se prouve en la dépensant.
 *
 * LIMITE : une pièce jointe GitHub est téléchargée sans authentification ;
 * si GitHub la protège un jour, le gist et le dépôt brut restent. Pas de frein
 * par auteur : la pièce d'ancrage est le frein (une par jour).
 */

import { lireTetes, verifierChaine } from "./chaine-reseau.ts";
import { classer, nomDeFichier, type Classee } from "./classement.ts";
import type { FederationPublique, TeteReseau } from "./temoin.ts";
import { jugerVeillee, parserVeillee, serialiserVeillee, type Veillee } from "./veillee.ts";

/** Un fichier de preuve ne dépasse pas deux mégaoctets (64 gestes ≈ 310 Ko en hexadécimal). */
export const OCTETS_MAX = 2_000_000;

/** Les hôtes lus, et rien d'autre : la pièce jointe d'une issue, un gist, un dépôt brut. */
export const SOURCES_AUTORISEES: readonly RegExp[] = [
  /^https:\/\/github\.com\/user-attachments\/files\/[0-9]{1,12}\/[A-Za-z0-9._-]{1,120}$/,
  /^https:\/\/gist\.githubusercontent\.com\/[A-Za-z0-9._-]{1,64}\/[0-9a-f]{8,64}\/raw(?:\/[A-Za-z0-9._-]{1,120}){1,3}$/,
  /^https:\/\/raw\.githubusercontent\.com\/[A-Za-z0-9._-]{1,64}\/[A-Za-z0-9._-]{1,100}\/[A-Za-z0-9._-]{1,120}(?:\/[A-Za-z0-9._-]{1,120}){0,8}$/,
];

const URL_CANDIDATE = /https:\/\/[A-Za-z0-9._/-]+/g;

export type Source = { genre: "json"; texte: string } | { genre: "url"; url: string };

/** Dans le corps d'une issue : un JSON `eidos-veillee/1` collé, sinon la première adresse autorisée. */
export function extraireSource(corps: string): Source | { erreur: string } {
  const texte = corps.replace(/\r\n/g, "\n");
  if (texte.length > OCTETS_MAX) return { erreur: "corps trop long" };
  const debut = texte.indexOf("{");
  const fin = texte.lastIndexOf("}");
  if (debut >= 0 && fin > debut) {
    const candidat = texte.slice(debut, fin + 1);
    if (candidat.includes('"eidos-veillee/1"')) {
      try {
        JSON.parse(candidat);
        return { genre: "json", texte: candidat };
      } catch {
        /* pas un JSON : on cherche une adresse */
      }
    }
  }
  for (const m of texte.matchAll(URL_CANDIDATE)) {
    const url = m[0].replace(/[.)\]]+$/, "");
    if (SOURCES_AUTORISEES.some((re) => re.test(url))) return { genre: "url", url };
  }
  return { erreur: "ni preuve collée, ni pièce jointe, ni gist, ni dépôt brut dans ce message" };
}

export type DepotOk = { ok: true; nom: string; contenu: string; index: string[]; classee: Classee | null };
export type DepotKo = { ok: false; motif: string };

/** La chaîne publiée, lue en en-têtes et vérifiée ; null si le fichier manque (la CI l'a toujours). */
export function tetesDe(buf: Uint8Array | null, fed: FederationPublique): TeteReseau[] | { erreur: string } | null {
  if (!buf) return null;
  const tetes = lireTetes(buf);
  if ("erreur" in tetes) return tetes;
  const v = verifierChaine(tetes, fed);
  if (!v.ok) return { erreur: `chaîne publiée refusée au bloc ${v.hauteur} : ${v.motif}` };
  return tetes;
}

/** Les trois têtes de la preuve sont-elles celles de la chaîne publiée, à leur hauteur ? */
export function tetesDansLaChaine(v: Veillee, tetes: readonly TeteReseau[]): { ok: true } | { ok: false; motif: string } {
  const attendues: [string, TeteReseau][] = [["jour", v.tete], ["veille", v.veille]];
  if (v.ancre) attendues.push(["ancre", v.ancre.teteAncre]);
  for (const [nom, t] of attendues) {
    const dans = tetes[t.hauteur];
    if (!dans) return { ok: false, motif: `tête du ${nom} (bloc ${t.hauteur}) au-delà de la chaîne publiée (${tetes.length - 1})` };
    if (dans.idBloc !== t.idBloc) return { ok: false, motif: `tête du ${nom} (bloc ${t.hauteur}) absente de la chaîne publiée : bloc orphelin, un murmure` };
  }
  return { ok: true };
}

/**
 * Juge un dépôt : lisible, ancré, nouveau, dans la chaîne, vrai. Rend le nom
 * du fichier, la preuve resérialisée, et l'index complété.
 */
export function verifierDepot(
  texte: string,
  fed: FederationPublique,
  tetes: readonly TeteReseau[] | null,
  index: readonly string[],
  hauteurCourante?: number,
): DepotOk | DepotKo {
  if (texte.length > OCTETS_MAX) return { ok: false, motif: `preuve trop grande (${texte.length} caractères, ${OCTETS_MAX} au plus)` };
  const v = parserVeillee(texte);
  if ("erreur" in v) return { ok: false, motif: `preuve illisible : ${v.erreur}` };
  const nom = nomDeFichier(v);
  if (nom === null) return { ok: false, motif: "veillée libre : une lecture, rien à déposer" };
  if (v.fin === null) return { ok: false, motif: "veillée en cours : finis-la d'abord" };
  if (index.includes(nom)) return { ok: false, motif: `déjà déposée : ${nom} — une pièce, une veillée par jour ; la première tient la place` };
  if (tetes) {
    const d = tetesDansLaChaine(v, tetes);
    if (!d.ok) return { ok: false, motif: d.motif };
  }
  const j = jugerVeillee(v, fed);
  if (!j.ok) return { ok: false, motif: `refusée par le juge : ${j.motif}` };
  const cl = classer([v], fed, { hauteurCourante: hauteurCourante ?? tetes?.[tetes.length - 1]?.hauteur });
  return { ok: true, nom, contenu: serialiserVeillee(v), index: [...index, nom], classee: cl.classees[0] ?? null };
}

/** `index.json` relu avec tolérance : un tableau de chaînes, sinon vide. */
export function lireIndex(raw: string): string[] {
  try {
    const o = JSON.parse(raw) as unknown;
    return Array.isArray(o) ? o.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/** Le message rendu au déposant, en une ligne par fait. */
export function messageDepot(r: DepotOk | DepotKo, numero: string): string {
  if (!r.ok) return `Preuve refusée (issue #${numero}) : ${r.motif}. Rien n'a été déposé.`;
  const c = r.classee;
  const lecture = c ? ` Lecture : ${c.salles} salles, ${c.butin} de butin, score ${c.score}, ${c.fantome.nom}.` : "";
  return `Preuve acceptée et déposée sous veillees/${r.nom} (issue #${numero}).${lecture} Le classement se recalcule dans le navigateur de chacun ; le juge ne sait pas si la pièce est à vous — cela se prouve en la dépensant.`;
}

/**
 * État publié du réseau d'essai — ce que l'atelier lit, pas ce qu'il croit.
 * etat.json est rejoué depuis la chaîne par le nœud ; ici on ne fait que le
 * parser. Pour une lecture vérifiée (tête signée), voir temoin.suivreReseau.
 */

export const ETAT_URL = "https://raw.githubusercontent.com/Oykdo/Eidos/main/etat.json";
export const MEMPOOL_URL = "https://raw.githubusercontent.com/Oykdo/Eidos/main/mempool.json";

export type SortieReseau = { adresse: string; montant: number; txid?: string; rang?: number };

export type ArtefactReseau = {
  id: string;
  code: number;
  txid: string;
  adresse: string;
  digest?: string;
};

export type EtatReseau = {
  hauteur: number;
  age: string;
  a_courant: number;
  recompense_courante_atomes: number;
  tresor_adresse: string | null;
  sorties: SortieReseau[];
  artefacts: ArtefactReseau[];
};

export function parserEtat(raw: unknown): EtatReseau {
  const o = (raw ?? {}) as Record<string, unknown>;
  const sorties: SortieReseau[] = [];
  if (o.sorties && typeof o.sorties === "object") {
    for (const [k, v] of Object.entries(o.sorties as Record<string, unknown>)) {
      const s = v as { adresse?: unknown; montant?: unknown };
      if (typeof s.adresse === "string" && typeof s.montant === "number") {
        const [txid, rang] = k.split(":");
        sorties.push({
          adresse: s.adresse,
          montant: s.montant,
          txid: txid && txid.length === 64 ? txid : undefined,
          rang: rang !== undefined && /^\d+$/.test(rang) ? Number(rang) : undefined,
        });
      }
    }
  }
  const artefacts: ArtefactReseau[] = [];
  if (Array.isArray(o.artefacts)) {
    for (const x of o.artefacts) {
      const a = x as { id?: unknown; code?: unknown; txid?: unknown; adresse?: unknown; digest?: unknown };
      if (typeof a.id === "string" && typeof a.code === "number" && typeof a.txid === "string" && typeof a.adresse === "string") {
        artefacts.push({
          id: a.id,
          code: a.code,
          txid: a.txid,
          adresse: a.adresse,
          digest: typeof a.digest === "string" ? a.digest : undefined,
        });
      }
    }
  }
  const tresor = typeof o.tresor_adresse === "string" && o.tresor_adresse.length === 40 ? o.tresor_adresse : null;
  return {
    hauteur: typeof o.hauteur === "number" ? o.hauteur : 0,
    age: typeof o.age === "string" ? o.age : "Satya",
    a_courant: typeof o.a_courant === "number" ? o.a_courant : 40,
    recompense_courante_atomes: typeof o.recompense_courante_atomes === "number" ? o.recompense_courante_atomes : 0,
    tresor_adresse: tresor,
    sorties,
    artefacts,
  };
}

export async function chargerEtat(url = ETAT_URL): Promise<EtatReseau | null> {
  try {
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) return null;
    return parserEtat(await r.json());
  } catch {
    return null;
  }
}

/** Les canaux du robinet que le nœud annonce (etat.json.robinet_canaux) :
 *  l'issue GitHub, et une boîte aux lettres quand le dépôt en déclare une.
 *  Lecture : la page propose ce que le nœud publie, elle ne l'invente pas. */
export type CanauxRobinet = { issue: string | null; courriel: string | null };

const COURRIEL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function parserCanaux(raw: unknown): CanauxRobinet {
  const o = (raw ?? {}) as Record<string, unknown>;
  const c = (o.robinet_canaux && typeof o.robinet_canaux === "object" ? o.robinet_canaux : {}) as Record<string, unknown>;
  const issue =
    typeof c.issue === "string" && /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/issues\/new/.test(c.issue) && c.issue.length <= 200
      ? c.issue
      : null;
  const courriel = typeof c.courriel === "string" && c.courriel.length <= 254 && COURRIEL.test(c.courriel) ? c.courriel : null;
  return { issue, courriel };
}

/** Une demande de la file publiée (mempool.json), telle que le robinet l'inscrit
 *  et que le nœud la fait évoluer : en_attente → servie (bloc) ou refus (motif). */
export type EtatDemande = "en_attente" | "servie" | "refus";
export type DemandeReseau = {
  type: "robinet" | "envoi";
  adresse: string | null;
  etat: EtatDemande;
  bloc: number | null;
  motif: string | null;
  canal: string;
  ref: string | null;
  issue: number | null;
};

export const MAX_DEMANDES_LUES = 1000;

export function parserMempool(raw: unknown): DemandeReseau[] {
  const o = (raw ?? {}) as Record<string, unknown>;
  if (!Array.isArray(o.demandes)) return [];
  const out: DemandeReseau[] = [];
  for (const x of o.demandes.slice(0, MAX_DEMANDES_LUES)) {
    const d = (x ?? {}) as Record<string, unknown>;
    const type = d.type === "envoi" ? "envoi" : d.type === "robinet" || d.type === undefined ? "robinet" : null;
    const etat = d.etat === "en_attente" || d.etat === "servie" || d.etat === "refus" ? d.etat : null;
    if (type === null || etat === null) continue;
    out.push({
      type,
      adresse: typeof d.adresse === "string" && /^[0-9a-f]{40}$/.test(d.adresse) ? d.adresse : null,
      etat,
      bloc: typeof d.bloc === "number" && Number.isInteger(d.bloc) && d.bloc >= 0 ? d.bloc : null,
      motif: typeof d.motif === "string" ? d.motif.slice(0, 200) : null,
      canal: typeof d.canal === "string" && d.canal.length <= 16 ? d.canal : "issue",
      ref: typeof d.ref === "string" && d.ref.length <= 64 ? d.ref : null,
      issue: typeof d.issue === "number" && Number.isInteger(d.issue) ? d.issue : null,
    });
  }
  return out;
}

/** La demande qui concerne ce coffre : une demande en attente d'abord, sinon
 *  la dernière inscrite (servie ou refusée) ; null si aucune. */
export function statutDemande(demandes: DemandeReseau[], adresses: Set<string> | string[]): DemandeReseau | null {
  const mienne = adresses instanceof Set ? adresses : new Set(adresses);
  const siennes = demandes.filter((d) => d.type === "robinet" && d.adresse !== null && mienne.has(d.adresse));
  if (siennes.length === 0) return null;
  return siennes.find((d) => d.etat === "en_attente") ?? siennes[siennes.length - 1]!;
}

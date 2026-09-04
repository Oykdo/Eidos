/**
 * État publié du réseau d'essai — ce que l'atelier lit, pas ce qu'il croit.
 * etat.json est rejoué depuis la chaîne par le nœud ; ici on ne fait que le
 * parser. Pour une lecture vérifiée (tête signée), voir temoin.suivreReseau.
 */

export const ETAT_URL = "https://raw.githubusercontent.com/Oykdo/Eidos/main/etat.json";

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

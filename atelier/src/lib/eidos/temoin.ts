/** Second carnet : une tête suivie à part, qui juge une preuve sans ouvrir le coffre.
 *
 *  Deux têtes : celle du journal local (TeteConnue, racine des sorties du
 *  coffre) et celle du réseau d'essai (TeteReseau, lue dans etat.json) — un
 *  en-tête étendu signé XMSS par le proposant, dont la racine UTXO engage le
 *  carnet entier. Le témoin recompose id_bloc, vérifie la signature contre
 *  federation.json, puis juge une preuve contre utxo_root, sans rejouer. */

import { hashReproduit, tete as teteChaine } from "./chaine.ts";
import { concat, fromHex, hexOf, sha256d, u64 } from "./hash.ts";
import {
  parserPreuve,
  preuveReseau,
  serialiser,
  verifierPreuve,
  type PreuvePortable,
  type SortieMin,
} from "./merkle.ts";
import { verifierMss } from "./xmss.ts";
import type { BlocLocal } from "./types.ts";

export type TeteConnue = {
  hauteur: number;
  hash: string;
  merkle: string;
  prev: string;
};

export type CodeVerdict = "incluse" | "etrangere" | "rompue" | "aveugle";

export type VuePreuve = {
  at: number;
  feuille: string;
  racine: string;
  code: CodeVerdict;
  detail: string;
};

export type Temoin = {
  tete: TeteConnue | null;
  vues: VuePreuve[];
};

export function temoinVide(): Temoin {
  return { tete: null, vues: [] };
}

export function teteDeBloc(b: BlocLocal): TeteConnue {
  return {
    hauteur: b.hauteur,
    hash: b.hash,
    merkle: b.merkle,
    prev: b.prev,
  };
}

function chainageDepuis(chaine: BlocLocal[], debut: number): boolean {
  for (let i = debut + 1; i < chaine.length; i++) {
    const b = chaine[i]!;
    const p = chaine[i - 1]!;
    if (b.prev !== p.hash || b.hauteur !== p.hauteur + 1 || !hashReproduit(b)) {
      return false;
    }
  }
  return true;
}

export function avancer(
  temoin: Temoin,
  chaine: BlocLocal[],
): { temoin: Temoin; ok: boolean; message: string } {
  const tip = teteChaine(chaine);
  if (!tip) {
    return { temoin, ok: false, message: "journal vide" };
  }
  if (!temoin.tete) {
    return {
      temoin: { ...temoin, tete: teteDeBloc(tip) },
      ok: true,
      message: `tête adoptée · bloc ${tip.hauteur}`,
    };
  }
  const i = chaine.findIndex((b) => b.hash === temoin.tete!.hash);
  if (i < 0) {
    return {
      temoin,
      ok: false,
      message: "fourche — cette tête n'est plus dans le journal",
    };
  }
  if (!chainageDepuis(chaine, i)) {
    return { temoin, ok: false, message: "chainage rompu au-delà de la tête" };
  }
  const last = chaine[chaine.length - 1]!;
  if (last.hash === temoin.tete.hash) {
    return { temoin, ok: true, message: `déjà à jour · bloc ${last.hauteur}` };
  }
  return {
    temoin: { ...temoin, tete: teteDeBloc(last) },
    ok: true,
    message: `avancée ${temoin.tete.hauteur} → ${last.hauteur}`,
  };
}

export function juger(
  temoin: Temoin,
  preuve: PreuvePortable,
): { temoin: Temoin; vue: VuePreuve } {
  let code: CodeVerdict;
  let detail: string;
  if (!temoin.tete) {
    code = "aveugle";
    detail = "pas de tête — suivre d'abord";
  } else if (!verifierPreuve(preuve)) {
    code = "rompue";
    detail = "chemin rompu";
  } else if (preuve.racine !== temoin.tete.merkle) {
    code = "etrangere";
    detail = "racine étrangère — pas cette tête";
  } else {
    code = "incluse";
    detail = `incluse · bloc ${temoin.tete.hauteur}`;
  }
  const vue: VuePreuve = {
    at: Date.now(),
    feuille: preuve.feuille,
    racine: preuve.racine,
    code,
    detail,
  };
  return {
    temoin: { ...temoin, vues: [vue, ...temoin.vues].slice(0, 8) },
    vue,
  };
}

export function adopterTete(temoin: Temoin, tete: TeteConnue): Temoin {
  return { ...temoin, tete };
}

export type TetePortable = {
  v: 1;
  hauteur: number;
  hash: string;
  merkle: string;
  prev: string;
};

export function serialiserTete(t: TeteConnue): TetePortable {
  return { v: 1, hauteur: t.hauteur, hash: t.hash, merkle: t.merkle, prev: t.prev };
}

export function parserTete(raw: string): TetePortable | { erreur: string } {
  try {
    const o = JSON.parse(raw) as Partial<TetePortable>;
    if (o.v !== 1) return { erreur: "tête illisible" };
    if (typeof o.hauteur !== "number" || o.hauteur < 0) {
      return { erreur: "hauteur invalide" };
    }
    for (const k of ["hash", "merkle", "prev"] as const) {
      if (typeof o[k] !== "string" || o[k]!.length !== 64) {
        return { erreur: "empreintes attendues sur 32 octets" };
      }
    }
    return {
      v: 1,
      hauteur: o.hauteur,
      hash: o.hash!.toLowerCase(),
      merkle: o.merkle!.toLowerCase(),
      prev: o.prev!.toLowerCase(),
    };
  } catch {
    return { erreur: "JSON invalide" };
  }
}

export function encoderJson(o: unknown): string {
  const json = JSON.stringify(o);
  const b64 = btoa(json);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decoderJson(s: string): unknown {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  return JSON.parse(atob(pad));
}

export function parserTeteLien(s: string): TetePortable | { erreur: string } {
  try {
    return parserTete(JSON.stringify(decoderJson(s)));
  } catch {
    return { erreur: "lien de tête illisible" };
  }
}

export function parserPreuveLien(s: string): PreuvePortable | { erreur: string } {
  try {
    return parserPreuve(JSON.stringify(decoderJson(s)));
  } catch {
    return { erreur: "lien de preuve illisible" };
  }
}

// ---------------------------------------------------------------------------
// Tête du réseau d'essai : en-tête étendu + signature XMSS, sans rejeu
// ---------------------------------------------------------------------------
export type TeteReseau = {
  hauteur: number;
  prev: string;
  merkle: string;
  ts: number;
  utxoRoot: string;
  idBloc: string;
  validateur: number;
  indice: number;
  signature: string;
  chemin: string[];
};

export type FederationPublique = {
  hauteur: number;
  racines: string[];
  grainesPub: string[];
};

const HEX32 = /^[0-9a-f]{64}$/;

/** `etat.json.tete_signee` tel que noeud.py l'écrit. */
export function parserTeteReseau(raw: unknown): TeteReseau | { erreur: string } {
  const o = ((raw as { tete_signee?: unknown })?.tete_signee ?? raw) as Record<string, unknown>;
  if (!o || typeof o !== "object") return { erreur: "tête absente" };
  for (const k of ["prev", "merkle", "utxo_root", "id_bloc"]) {
    if (typeof o[k] !== "string" || !HEX32.test(o[k] as string)) {
      return { erreur: `${k} : 32 octets hex attendus` };
    }
  }
  if (typeof o.hauteur !== "number" || typeof o.ts !== "number") return { erreur: "hauteur ou ts absent" };
  if (typeof o.validateur !== "number" || typeof o.indice !== "number") return { erreur: "validateur ou indice absent" };
  if (typeof o.signature !== "string" || !/^[0-9a-f]{4288}$/.test(o.signature)) {
    return { erreur: "signature WOTS+ : 2 144 octets attendus" };
  }
  if (!Array.isArray(o.chemin) || !o.chemin.every((c) => typeof c === "string" && HEX32.test(c))) {
    return { erreur: "chemin mal formé" };
  }
  return {
    hauteur: o.hauteur,
    prev: o.prev as string,
    merkle: o.merkle as string,
    ts: o.ts,
    utxoRoot: o.utxo_root as string,
    idBloc: o.id_bloc as string,
    validateur: o.validateur,
    indice: o.indice,
    signature: o.signature,
    chemin: o.chemin as string[],
  };
}

/** federation.json : racines et graines publiques des validateurs. */
export function parserFederation(raw: unknown): FederationPublique | { erreur: string } {
  const o = (raw ?? {}) as Record<string, unknown>;
  const racines = o.racines;
  const graines = o.graines_publiques;
  if (typeof o.hauteur_mss !== "number") return { erreur: "hauteur_mss absente" };
  if (!Array.isArray(racines) || !racines.every((r) => typeof r === "string" && HEX32.test(r))) {
    return { erreur: "racines mal formées" };
  }
  if (!Array.isArray(graines) || graines.length !== racines.length ||
      !graines.every((g) => typeof g === "string" && HEX32.test(g))) {
    return { erreur: "graines publiques absentes ou mal formées" };
  }
  return { hauteur: o.hauteur_mss, racines: racines as string[], grainesPub: graines as string[] };
}

/** E.header (gelé) ‖ utxo_root, nonce nul en fédéré : 120 octets. */
export function enteteFedere(t: Pick<TeteReseau, "hauteur" | "prev" | "merkle" | "ts" | "utxoRoot">): Uint8Array {
  return concat(u64(t.hauteur), fromHex(t.prev), fromHex(t.merkle), u64(t.ts), u64(0), fromHex(t.utxoRoot));
}

export function idBlocDe(t: Pick<TeteReseau, "hauteur" | "prev" | "merkle" | "ts" | "utxoRoot">): string {
  return hexOf(sha256d(enteteFedere(t)));
}

export type VerdictTete =
  | { ok: true; validateur: number }
  | { ok: false; motif: "id_bloc" | "validateur" | "signature" };

/** Recompose id_bloc depuis l'en-tête étendu (la racine UTXO y est donc
 *  engagée), puis vérifie la signature XMSS du validateur désigné. */
export function verifierTeteReseau(t: TeteReseau, f: FederationPublique): VerdictTete {
  if (idBlocDe(t) !== t.idBloc) return { ok: false, motif: "id_bloc" };
  const racine = f.racines[t.validateur];
  const gp = f.grainesPub[t.validateur];
  if (racine === undefined || gp === undefined) return { ok: false, motif: "validateur" };
  const ok = verifierMss(fromHex(racine), fromHex(gp), f.hauteur, fromHex(t.idBloc), {
    indice: t.indice,
    wots: fromHex(t.signature),
    chemin: t.chemin.map(fromHex),
  });
  return ok ? { ok: true, validateur: t.validateur } : { ok: false, motif: "signature" };
}

/** Juge une preuve de sortie contre la racine UTXO d'une tête déjà vérifiée. */
export function jugerReseau(
  tete: TeteReseau,
  preuve: PreuvePortable,
): { code: CodeVerdict; detail: string } {
  if (!verifierPreuve(preuve)) return { code: "rompue", detail: "chemin rompu" };
  if (preuve.racine !== tete.utxoRoot) {
    return { code: "etrangere", detail: `racine étrangère — pas le carnet du bloc ${tete.hauteur}` };
  }
  return { code: "incluse", detail: `incluse · carnet du bloc ${tete.hauteur}` };
}

// ---------------------------------------------------------------------------
// Suivre le réseau : etat.json + federation.json, vérifiés, sans rejeu
// ---------------------------------------------------------------------------
export const ETAT_RESEAU_URL = "https://raw.githubusercontent.com/Oykdo/Eidos/main/etat.json";
export const FEDERATION_URL = "https://raw.githubusercontent.com/Oykdo/Eidos/main/federation.json";

export type TemoinReseau = {
  tete: TeteReseau;
  verdict: VerdictTete;
  sorties: SortieMin[];
  majUnix: number | null;
  lu: number;
};

type FetchMinimal = (url: string) => Promise<{ ok: boolean; status?: number; json(): Promise<unknown> }>;

function sortiesDe(raw: unknown): SortieMin[] {
  const o = (raw ?? {}) as { sorties?: Record<string, { adresse?: unknown; montant?: unknown }> };
  const out: SortieMin[] = [];
  for (const [cle, v] of Object.entries(o.sorties ?? {})) {
    const [txid, rang] = cle.split(":");
    if (!txid || !HEX32.test(txid) || !/^\d+$/.test(rang ?? "")) continue;
    if (typeof v?.adresse !== "string" || typeof v?.montant !== "number") continue;
    out.push({ txid, rang: Number(rang), adresse: v.adresse, montant: v.montant });
  }
  return out;
}

/** Lit l'état publié et la fédération, recompose la tête, vérifie la
 *  signature. Le verdict est rendu même négatif : c'est au témoin de refuser. */
export async function suivreReseau(
  fetchImpl: FetchMinimal = (u) => fetch(u, { cache: "no-store" }),
  urls: { etat?: string; federation?: string } = {},
): Promise<TemoinReseau | { erreur: string }> {
  let etat: unknown;
  let fed: unknown;
  try {
    const [re, rf] = await Promise.all([
      fetchImpl(urls.etat ?? ETAT_RESEAU_URL),
      fetchImpl(urls.federation ?? FEDERATION_URL),
    ]);
    if (!re.ok) return { erreur: `etat.json injoignable (${re.status ?? "?"})` };
    if (!rf.ok) return { erreur: `federation.json injoignable (${rf.status ?? "?"})` };
    etat = await re.json();
    fed = await rf.json();
  } catch (e) {
    return { erreur: `réseau injoignable : ${e instanceof Error ? e.message : String(e)}` };
  }
  const tete = parserTeteReseau(etat);
  if ("erreur" in tete) return { erreur: `tête : ${tete.erreur}` };
  const f = parserFederation(fed);
  if ("erreur" in f) return { erreur: `fédération : ${f.erreur}` };
  const o = etat as { maj_unix?: unknown };
  return {
    tete,
    verdict: verifierTeteReseau(tete, f),
    sorties: sortiesDe(etat),
    majUnix: typeof o.maj_unix === "number" ? o.maj_unix : null,
    lu: Date.now(),
  };
}

/** Preuve d'une sortie publiée, jugée contre la tête suivie. */
export function jugerSortieReseau(
  r: TemoinReseau,
  ref: string,
): { vue: VuePreuve; preuve: PreuvePortable | null } {
  const p = preuveReseau(r.sorties, ref);
  if (!p) {
    return {
      vue: { at: Date.now(), feuille: "", racine: r.tete.utxoRoot, code: "etrangere",
             detail: `${ref.slice(0, 12)}… absente de l'état publié` },
      preuve: null,
    };
  }
  const preuve = serialiser(p);
  const j = r.verdict.ok
    ? jugerReseau(r.tete, preuve)
    : { code: "aveugle" as CodeVerdict, detail: "tête non vérifiée — signature refusée" };
  return {
    vue: { at: Date.now(), feuille: preuve.feuille, racine: preuve.racine, code: j.code, detail: j.detail },
    preuve,
  };
}

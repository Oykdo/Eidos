/** Second carnet : une tête suivie à part, qui juge une preuve sans ouvrir le coffre. */

import { hashReproduit, tete as teteChaine } from "./chaine.ts";
import { parserPreuve, verifierPreuve, type PreuvePortable } from "./merkle.ts";
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

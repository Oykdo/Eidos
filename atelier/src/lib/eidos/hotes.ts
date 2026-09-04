/**
 * Hôtes de la Tour — neuf muses, leurs familiers, leurs dons.
 *
 * Présence : `graineEtage(e)[1] % 7 === 0`, un étage sur sept ; toujours à
 * 0 (Thalie, la porte de la ville), à 254 (Uranie, l'observatoire) et aux
 * portes 64 · 128 · 192 (le portier). La muse de la bande est l'hôte majeur,
 * une fois par bande : Thalie au sol, Uranie au faîte, les sept autres à
 * l'étage médian de leur bande (arrondi vers le bas). Ailleurs, un familier.
 *
 * Identité : graine `SHA-256d("eidos-hote/1" ‖ étage)` → rôle, visage (le
 * glyphe de son mot), trois répliques du lexique. Indépendante du coffre :
 * tout le monde rencontre le même hôte au même étage.
 *
 * Don : un objet tiré comme les autres, `SHA-256d("eidos-don/1" ‖ étage ‖
 * maître:n)`, un seul par (coffre, étage), noté dans `tour.dons`. Genres :
 * elixir, gemme, lair. Jamais arme, armure ni philosophale. Les familiers
 * donnent au plus un élixir. Érato forge (service), Polymnie révèle les échos
 * (service), Uranie lit (service) : aucun objet.
 *
 * Le portier des portes est un familier de Polymnie, gardienne des sceaux,
 * quelle que soit la bande : c'est le sceau qu'il lit.
 *
 * LIMITE : les demandes se lisent dans le coffre au moment d'honorer ; rien
 * n'est consommé, sauf ce que le craft d'Érato consomme déjà (la pierre).
 */

import { affixeDe, craftDansCoffre, habille, type Craft } from "./equipement.ts";
import { elixirDansCoffre, especeActive, eteindreSoufre, type Espece } from "./elixirs.ts";
import { concat, sha256d, u32, utf8 } from "./hash.ts";
import {
  GROUPES_REPLIQUES,
  ROLES,
  REPLIQUES,
  type Bilingue,
  type LangueHote,
} from "./hotes-lexique.ts";
import { tourDe } from "./jauge.ts";
import { figureOrbite, glypheDe } from "./lecture.ts";
import { objetDepuisGraine } from "./objets.ts";
import { paireDe, qDeMot, resonanceDe, type Membre } from "./resonance.ts";
import { PORTES, quartierDe } from "./sceaux.ts";
import { SIGNATURES, type SignatureId } from "./signatures.ts";
import { ETAGES, biomeDe, etageDe, graineEtage } from "./tour.ts";
import type { Coffre, NomAge, ObjetPorte } from "./types.ts";

export const TAG_HOTE = utf8("eidos-hote/1");
export const TAG_DON = utf8("eidos-don/1");
export const PERIODE_HOTE = 7;
export const BANDES = 9;

export type Bande = { bande: number; muse: SignatureId; de: number; a: number; mediane: number };

/** Bande b : étages e tels que ⌊9e/255⌋ = b. Terre = 0, Uranie = 8. */
export function bandeDe(etage: number): Bande {
  const e = etageDe(etage);
  const bande = Math.min(BANDES - 1, Math.floor((e * BANDES) / ETAGES));
  return bandeParIndice(bande);
}

export function bandeParIndice(bande: number): Bande {
  const b = Math.max(0, Math.min(BANDES - 1, bande | 0));
  const de = Math.ceil((ETAGES * b) / BANDES);
  const a = Math.ceil((ETAGES * (b + 1)) / BANDES) - 1;
  const mediane = b === 0 ? 0 : b === BANDES - 1 ? ETAGES - 1 : Math.floor((de + a) / 2);
  return { bande: b, muse: SIGNATURES[BANDES - 1 - b]!.id, de, a, mediane };
}

/** L'étage où la muse se tient : 0 pour Thalie, 254 pour Uranie, le médian sinon. */
export function etageMuse(muse: SignatureId): number {
  const i = SIGNATURES.findIndex((s) => s.id === muse);
  return bandeParIndice(BANDES - 1 - i).mediane;
}

export function graineHote(etage: number): Uint8Array {
  return sha256d(concat(TAG_HOTE, u32(etageDe(etage))));
}

export function estPorte(etage: number): boolean {
  return PORTES.includes(etageDe(etage));
}

/** Un hôte est présent : 1 sur 7, plus 0, 254, les portes, et l'étage de chaque muse. */
export function aUnHote(etage: number): boolean {
  const e = etageDe(etage);
  if (e === 0 || e === ETAGES - 1 || estPorte(e)) return true;
  if (bandeDe(e).mediane === e) return true;
  return graineEtage(e)[1]! % PERIODE_HOTE === 0;
}

export type Demande =
  | "rien"
  | "preuve"
  | "orbite"
  | "constructive"
  | "classe"
  | "pierre-piece"
  | "ensemble"
  | "sceau"
  | "porte";

export type Service = "forge" | "echos" | "lecture";

export type Don =
  | { genre: "elixir"; espece: Espece }
  | { genre: "gemme" }
  | { genre: "lair" }
  | { genre: "service"; service: Service };

export type Hote = {
  etage: number;
  muse: SignatureId;
  majeur: boolean;
  portier: boolean;
  role: Bilingue;
  mot: number;
  age: NomAge;
  visage: [number, number, number];
  demande: Demande;
  don: Don;
  repliques: Record<LangueHote, [string, string, string]>;
};

const DEMANDE_MUSE: Record<SignatureId, Demande> = {
  terre: "rien",
  lune: "preuve",
  mercure: "orbite",
  venus: "constructive",
  soleil: "classe",
  mars: "pierre-piece",
  jupiter: "ensemble",
  saturne: "sceau",
  uranie: "rien",
};

const DON_MUSE: Record<SignatureId, Don> = {
  terre: { genre: "elixir", espece: "sel" },
  lune: { genre: "elixir", espece: "sel" },
  mercure: { genre: "elixir", espece: "mercure" },
  venus: { genre: "gemme" },
  soleil: { genre: "elixir", espece: "soufre" },
  mars: { genre: "service", service: "forge" },
  jupiter: { genre: "lair" },
  saturne: { genre: "service", service: "echos" },
  uranie: { genre: "service", service: "lecture" },
};

/** L'espèce que donne un familier : celle de sa muse, ou lue dans la graine. */
function especeFamilier(muse: SignatureId, g: Uint8Array): Espece {
  const d = DON_MUSE[muse];
  if (d.genre === "elixir") return d.espece;
  return (["sel", "mercure", "soufre"] as const)[g[3]! % 3]!;
}

export function hoteDe(etage: number): Hote | null {
  const e = etageDe(etage);
  if (!aUnHote(e)) return null;
  const g = graineHote(e);
  const bande = bandeDe(e);
  const portier = estPorte(e);
  const muse: SignatureId = portier ? "saturne" : bande.muse;
  const majeur = !portier && bande.mediane === e;
  const roles = ROLES[muse];
  const role = majeur
    ? roles.majeur
    : portier
      ? roles.mineurs[0]
      : muse === "saturne"
        ? roles.mineurs[1 + (g[4]! % 2)]!
        : roles.mineurs[g[4]! % 3]!;
  const age = quartierDe(e);
  const o = objetDepuisGraine(g, age);
  const mot = o.mot;
  const visage = glypheDe({ mot, archetype: muse, age });
  const demande: Demande = portier ? "porte" : DEMANDE_MUSE[muse];
  const don: Don = majeur ? DON_MUSE[muse] : { genre: "elixir", espece: especeFamilier(muse, g) };
  const choix = (langue: LangueHote): [string, string, string] =>
    GROUPES_REPLIQUES.map((grp, i) => {
      const liste = REPLIQUES[muse][langue][grp];
      return liste[g[i]! % liste.length]!;
    }) as [string, string, string];
  return {
    etage: e,
    muse,
    majeur,
    portier,
    role,
    mot,
    age,
    visage,
    demande,
    don,
    repliques: { fr: choix("fr"), en: choix("en") },
  };
}

/** Tous les étages qui ont un hôte, dans l'ordre. */
export function etagesHotes(): number[] {
  const out: number[] = [];
  for (let e = 0; e < ETAGES; e++) if (aUnHote(e)) out.push(e);
  return out;
}

// ---------------------------------------------------------------------------
// Demandes — lues dans le coffre, rien n'est consommé
// ---------------------------------------------------------------------------

export type Contexte = {
  /** âges scellés du coffre (sceaux.agesScelles) */
  ages: readonly NomAge[];
};

function membres(objets: readonly ObjetPorte[]): Membre[] {
  return objets.map((o) => ({ q: qDeMot(o.mot), classe: o.archetype }));
}

function estPiece(o: ObjetPorte): boolean {
  return o.genre === "arme" || o.genre === "armure" || o.genre === "trouve";
}

/** La demande de l'hôte est-elle satisfaite par ce coffre ? */
export function demandeSatisfaite(
  h: Hote,
  c: Pick<Coffre, "objets" | "sorties" | "chaine">,
  ctx: Contexte,
): boolean {
  const objets = c.objets ?? [];
  switch (h.demande) {
    case "rien":
      return true;
    case "preuve":
      return c.sorties.length > 0 && (c.chaine?.length ?? 0) > 0;
    case "orbite": {
      const fig = objets.map((o) => figureOrbite(qDeMot(o.mot)));
      for (let i = 0; i < fig.length; i++)
        for (let j = i + 1; j < fig.length; j++) if (fig[i] === fig[j]) return true;
      return false;
    }
    case "constructive": {
      const m = membres(objets);
      for (let i = 0; i < m.length; i++) {
        for (let j = i + 1; j < m.length; j++)
          if (paireDe(m[i]!, m[j]!, i, j).polarite === "constructif") return true;
      }
      return false;
    }
    case "classe":
      return objets.some((o) => o.archetype === biomeDe(h.etage).id);
    case "pierre-piece":
      return objets.some((o) => o.genre === "pierre" && o.affixe) && objets.some(estPiece);
    case "ensemble": {
      const m = membres(objets);
      const n = Math.min(m.length, 24);
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          for (let k = j + 1; k < n; k++)
            if (resonanceDe([m[i]!, m[j]!, m[k]!]).tenue > 0n) return true;
        }
      }
      return false;
    }
    case "sceau":
      return ctx.ages.includes(quartierDe(h.etage));
    case "porte":
      return ctx.ages.includes(quartierDe(h.etage));
  }
}

// ---------------------------------------------------------------------------
// Dons
// ---------------------------------------------------------------------------

export function graineDon(etage: number, c: Pick<Coffre, "maitre" | "n">): Uint8Array {
  return sha256d(concat(TAG_DON, u32(etageDe(etage)), utf8(`${c.maitre}:${c.n}`)));
}

export function donHonore(c: Pick<Coffre, "tour">, etage: number): boolean {
  return tourDe(c).dons.includes(etageDe(etage));
}

/** L'objet que donnerait l'hôte à ce coffre, ou null pour un service. */
export function objetDon(h: Hote, c: Pick<Coffre, "maitre" | "n" | "chaine">): ObjetPorte | null {
  const g = graineDon(h.etage, c);
  const tip = c.chaine[c.chaine.length - 1];
  const hauteur = tip?.hauteur ?? 0;
  const age = quartierDe(h.etage);
  const d = h.don;
  if (d.genre === "elixir") return elixirDansCoffre(c, g, age, d.espece, h.muse);
  if (d.genre === "gemme") {
    const o = objetDepuisGraine(g, age);
    return habille({ mot: o.mot, archetype: h.muse, age, nonce: g[8]!, hauteur }, g[9]!, {
      genre: "gemme",
      emplacement: null,
      affixe: affixeDe(g[9]!),
      sockets: 0,
      gemmes: [],
      nom: affixeDe(g[9]!),
      palierLair: null,
    });
  }
  if (d.genre === "lair") {
    const o = objetDepuisGraine(g, age);
    return habille({ mot: o.mot, archetype: h.muse, age, nonce: g[8]!, hauteur }, g[9]!, {
      genre: "lair",
      emplacement: null,
      affixe: null,
      sockets: 0,
      gemmes: [],
      nom: `lair-${h.etage}`,
      palierLair: h.etage,
    });
  }
  return null;
}

export type HonorerKo = { ok: false; code: "aucun" | "deja" | "demande" | "service" };
export type HonorerOk = { ok: true; coffre: Coffre; don: ObjetPorte; hote: Hote };
export type Honorer = HonorerOk | HonorerKo;

/** Honore l'hôte de l'étage : sa demande lue, son don tiré, l'étage noté. */
export function honorerDansCoffre(c: Coffre, etage: number, ctx: Contexte): Honorer {
  const h = hoteDe(etage);
  if (!h) return { ok: false, code: "aucun" };
  if (donHonore(c, etage)) return { ok: false, code: "deja" };
  if (!demandeSatisfaite(h, c, ctx)) return { ok: false, code: "demande" };
  const don = objetDon(h, c);
  if (!don) return { ok: false, code: "service" };
  const t = tourDe(c);
  return {
    ok: true,
    hote: h,
    don,
    coffre: {
      ...c,
      objets: [...(c.objets ?? []), don],
      tour: { ...t, dons: [...t.dons, h.etage] },
    },
  };
}

/**
 * Tourner dans la Tour : chez Érato (majeure) sans élixir ; ailleurs, le
 * soufre bu à cet étage, une fois. Le craft est celui de la ville.
 */
export function tournerDansLaTour(
  c: Coffre,
  etage: number,
  i: number,
  j: number,
): Craft | { ok: false; code: "soufre" } {
  const h = hoteDe(etage);
  const forge = h?.majeur && h.don.genre === "service" && h.don.service === "forge";
  const soufre = especeActive(c, etage, "soufre");
  if (!forge && !soufre) return { ok: false, code: "soufre" };
  const a = c.objets?.[i];
  const b = c.objets?.[j];
  if (!a || !b) return { ok: false, code: "vide" };
  if (a.genre !== "pierre" && b.genre !== "pierre") return { ok: false, code: "type" };
  const r = craftDansCoffre(c, i, j);
  if (!r.ok) return r;
  return forge ? r : { ...r, coffre: eteindreSoufre(r.coffre, etage) };
}

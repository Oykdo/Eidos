/**
 * Les pages de l'atelier, en trois registres (Vérifier / Lire / Jouer) plus
 * le Guide. Une seule liste : la barre de navigation (Nav.tsx) et la section
 * « Écosystème » de l'accueil (Ecosysteme.tsx) la lisent toutes deux.
 * Ajouter une page = une entrée ici, une route dans src/routes, deux textes
 * (label et lede) dans i18n.ts, FR et EN. navigation.test.ts vérifie ces
 * trois conditions.
 */
import type { Msg } from "./i18n.ts";

export type NavId =
  | "coffre"
  | "tour"
  | "veillee"
  | "bataille"
  | "coffreHoraire"
  | "journal"
  | "temoin"
  | "arbre"
  | "reliques"
  | "glyphes"
  | "signatures"
  | "guide";

export type Chemin =
  | "/"
  | "/tour"
  | "/veillee"
  | "/bataille"
  | "/coffre-horaire"
  | "/journal"
  | "/temoin"
  | "/arbre"
  | "/reliques"
  | "/glyphes"
  | "/signatures"
  | "/guide";

export type Registre = "verifier" | "lire" | "jouer";

export type Page = { to: Chemin; id: NavId; label: Msg; lede: Msg };
/** `defaut` : la page qu'ouvre le registre quand on le choisit dans la barre. */
export type Groupe = { id: Registre; label: Msg; defaut: Chemin; items: Page[] };

/**
 * Trois registres en tête, leurs pages en sous-onglets — jamais neuf onglets à plat :
 *   Vérifier — ce qui engage : carnet, chaîne, signatures, adresses.
 *   Lire     — des figures : la carte des reliques, les lectures en muses.
 *   Jouer    — hors invariant : la tour, les sceaux et reliques.
 * Le Guide reste à part.
 */
export const GROUPES: Groupe[] = [
  {
    id: "verifier",
    label: "nav.groupe.verifier",
    defaut: "/",
    items: [
      { to: "/", id: "coffre", label: "nav.coffre", lede: "eco.coffre" },
      { to: "/journal", id: "journal", label: "nav.journal", lede: "eco.journal" },
      { to: "/temoin", id: "temoin", label: "nav.temoin", lede: "eco.temoin" },
      { to: "/glyphes", id: "glyphes", label: "nav.glyphes", lede: "eco.glyphes" },
    ],
  },
  {
    id: "lire",
    label: "nav.groupe.lire",
    defaut: "/arbre",
    items: [
      { to: "/arbre", id: "arbre", label: "nav.arbre", lede: "eco.arbre" },
      { to: "/signatures", id: "signatures", label: "nav.signatures", lede: "eco.signatures" },
    ],
  },
  {
    id: "jouer",
    label: "nav.groupe.jouer",
    defaut: "/tour",
    items: [
      { to: "/tour", id: "tour", label: "nav.tour", lede: "eco.tour" },
      { to: "/veillee", id: "veillee", label: "nav.veillee", lede: "eco.veillee" },
      { to: "/coffre-horaire", id: "coffreHoraire", label: "nav.coffreHoraire", lede: "eco.coffreHoraire" },
      { to: "/reliques", id: "reliques", label: "nav.reliques", lede: "eco.reliques" },
    ],
  },
];

export const GUIDE: Page = { to: "/guide", id: "guide", label: "nav.guide", lede: "eco.guide" };

/**
 * Pages rattachées : atteintes depuis une page d'un registre, jamais un
 * sous-onglet de plus (quatre au plus par registre, navigation.test.ts). La
 * barre montre le registre et le sous-onglet du parent ; la route existe.
 * La bataille se joue depuis la Tour : une salle qui tient un Indéchiffré.
 */
export const RATTACHEES: Partial<Record<NavId, NavId>> = { bataille: "tour" };

/** La page du registre qui porte `id` : elle-même, ou son parent si elle est rattachée. */
export function parentDe(id: NavId): NavId {
  return RATTACHEES[id] ?? id;
}

/** Toutes les pages, Guide compris, dans l'ordre d'affichage. */
export function pages(): Page[] {
  return [...GROUPES.flatMap((g) => g.items), GUIDE];
}

export function groupeDe(id: NavId): Registre | "guide" {
  const p = parentDe(id);
  return GROUPES.find((g) => g.items.some((it) => it.id === p))?.id ?? "guide";
}

/** Le registre d'une page, ou null pour le Guide (qui n'en a pas). */
export function registreDe(id: NavId): Groupe | null {
  const p = parentDe(id);
  return GROUPES.find((g) => g.items.some((it) => it.id === p)) ?? null;
}

/** Les sous-onglets à montrer : les pages du registre courant, rien d'autre. */
export function sousOnglets(id: NavId): Page[] {
  return registreDe(id)?.items ?? [];
}

/** Le fichier de route TanStack qui sert ce chemin (src/routes/…). */
export function fichierRoute(to: Chemin): string {
  return to === "/" ? "index.tsx" : `${to.slice(1)}.tsx`;
}

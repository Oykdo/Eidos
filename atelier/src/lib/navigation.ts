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
  | "/journal"
  | "/temoin"
  | "/arbre"
  | "/reliques"
  | "/glyphes"
  | "/signatures"
  | "/guide";

export type Registre = "verifier" | "lire" | "jouer";

export type Page = { to: Chemin; id: NavId; label: Msg; lede: Msg };
export type Groupe = { id: Registre; label: Msg; items: Page[] };

/**
 * Trois registres, pas neuf onglets à plat :
 *   Vérifier — ce qui engage : carnet, chaîne, signatures, adresses.
 *   Lire     — des figures : la carte des reliques, les lectures en muses.
 *   Jouer    — hors invariant : la tour, les sceaux et reliques.
 * Le Guide reste à part.
 */
export const GROUPES: Groupe[] = [
  {
    id: "verifier",
    label: "nav.groupe.verifier",
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
    items: [
      { to: "/arbre", id: "arbre", label: "nav.arbre", lede: "eco.arbre" },
      { to: "/signatures", id: "signatures", label: "nav.signatures", lede: "eco.signatures" },
    ],
  },
  {
    id: "jouer",
    label: "nav.groupe.jouer",
    items: [
      { to: "/tour", id: "tour", label: "nav.tour", lede: "eco.tour" },
      { to: "/reliques", id: "reliques", label: "nav.reliques", lede: "eco.reliques" },
    ],
  },
];

export const GUIDE: Page = { to: "/guide", id: "guide", label: "nav.guide", lede: "eco.guide" };

/** Toutes les pages, Guide compris, dans l'ordre d'affichage. */
export function pages(): Page[] {
  return [...GROUPES.flatMap((g) => g.items), GUIDE];
}

export function groupeDe(id: NavId): Registre | "guide" {
  return GROUPES.find((g) => g.items.some((it) => it.id === id))?.id ?? "guide";
}

/** Le fichier de route TanStack qui sert ce chemin (src/routes/…). */
export function fichierRoute(to: Chemin): string {
  return to === "/" ? "index.tsx" : `${to.slice(1)}.tsx`;
}

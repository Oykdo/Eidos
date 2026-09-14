/**
 * Animation — ce qu'une scène montre **entre** deux états, calculé une fois,
 * entier, sans horloge.
 *
 * Le moteur ne connaît pas le temps : `jouer` rend l'état d'après, et rien
 * entre les deux. Ce module rejoue les derniers actes d'une partie
 * (`Partie.avant`, `Partie.derniers`) sur l'état d'avant et en tire des
 * **événements** — un pas le long de son parcours entier, un coup, un contre,
 * une chute, un passer — puis leur donne des durées fixes, et rend pour tout
 * instant `t` la **pose** de chaque unité : où elle est (en cases, fractionnaire
 * pendant un pas), sa tenue, la pulsation d'un coup qu'elle porte, le recul
 * d'un coup qu'elle encaisse, l'enfoncement d'une chute.
 *
 *     evenementsDe(avant, actes)  →  Evenement[]        rejoue avec `jouer`
 *     ligneDeTemps(evenements)    →  { etapes, duree }   durées de `DUREES`
 *     posesA(avant, ligne, t)     →  Pose[]              pour un `t` en ms
 *
 * Le parcours d'un pas est celui de `chemin` (`grille.ts`) sur l'échiquier
 * d'avant le pas — le même que la lecture montre en aperçu. Les coups et les
 * contres sont lus dans le journal : rien n'est réinventé. Une chute suit un
 * coup marqué `retiree`.
 *
 * Tout est déterministe : deux appels sur les mêmes actes rendent les mêmes
 * poses à l'octet, et une scène peut en rendre un instant précis sans jamais
 * tourner. La scène, elle, choisit `t` sur sa propre horloge ; c'est le seul
 * endroit où le temps entre, et il n'entre dans aucun état.
 *
 * LIMITE : c'est une figure. Les poses n'engagent rien — ni le carnet, ni la
 * chaîne, ni la partie ; un rejeu qui n'anime pas donne le même état final.
 * Les durées sont plates : une charge de quatre cases dure quatre fois un
 * pas, un contre le temps d'un coup, quel que soit ce qu'il porte.
 */

import { jouer } from "./bataille.ts";
import { chemin } from "./grille.ts";
import { pas, vivante } from "./unite.ts";
import { RejetTactique, type Acte, type Case, type Coup, type EtatBataille } from "./types.ts";

export type Evenement =
  | { readonly genre: "pas"; readonly unite: number; readonly parcours: readonly Case[] }
  | { readonly genre: "coup"; readonly coup: Coup }
  | { readonly genre: "chute"; readonly unite: number }
  | { readonly genre: "passer"; readonly unite: number };

/** Durées, en millisecondes, entières. Un pas dure `parCase` par case parcourue. */
export const DUREES = { parCase: 140, coup: 220, chute: 260 } as const;

export type Etape = {
  readonly debut: number;
  readonly fin: number;
  readonly evenement: Evenement;
};

export type LigneDeTemps = {
  readonly etapes: readonly Etape[];
  /** Fin de la dernière étape. `0` s'il n'y a rien à montrer. */
  readonly duree: number;
};

export type Pose = {
  readonly unite: number;
  /** Position en cases ; fractionnaire pendant un pas. */
  readonly x: number;
  readonly y: number;
  /** La tenue telle que la scène doit la montrer à cet instant. */
  readonly tenue: number;
  /** `0..1`, pulsation d'un coup porté — `1` au milieu du coup. */
  readonly frappe: number;
  /** `0..1`, recul d'un coup encaissé — `1` à l'impact. */
  readonly encaisse: number;
  /** `0..1`, enfoncement d'une stèle abattue ; `1` quand elle a disparu. */
  readonly chute: number;
};

/**
 * Rejoue `actes` sur `avant` et rend les événements dans l'ordre. Lève
 * (`RejetTactique`, celui de `jouer`) si un acte n'est pas permis : les actes
 * d'une partie le sont toujours, ceux d'un appelant qui invente ne le sont pas.
 */
export function evenementsDe(avant: EtatBataille, actes: readonly Acte[]): Evenement[] {
  let e = avant;
  const out: Evenement[] = [];
  for (const acte of actes) {
    if (acte.geste === "deplacer") {
      const u = e.unites.find((x) => x.id === acte.unite);
      if (u === undefined) throw new RejetTactique(`unité ${acte.unite} inconnue au lieu d'une unité en lice`);
      const suite = chemin(e.obstacles, e.unites.filter(vivante), u, acte.vers, pas(u));
      e = jouer(e, acte);
      out.push({ genre: "pas", unite: u.id, parcours: [{ x: u.pos.x, y: u.pos.y }, ...suite] });
    } else if (acte.geste === "frapper") {
      const n = e.journal.length;
      e = jouer(e, acte);
      for (const coup of e.journal.slice(n)) {
        out.push({ genre: "coup", coup });
        if (coup.retiree) out.push({ genre: "chute", unite: coup.cible });
      }
    } else {
      e = jouer(e, acte);
      out.push({ genre: "passer", unite: acte.unite });
    }
  }
  return out;
}

function dureeDe(ev: Evenement): number {
  switch (ev.genre) {
    case "pas":
      return DUREES.parCase * Math.max(0, ev.parcours.length - 1);
    case "coup":
      return DUREES.coup;
    case "chute":
      return DUREES.chute;
    case "passer":
      return 0;
  }
}

/** Les événements bout à bout, chacun après le précédent. */
export function ligneDeTemps(evenements: readonly Evenement[]): LigneDeTemps {
  const etapes: Etape[] = [];
  let t = 0;
  for (const evenement of evenements) {
    const d = dureeDe(evenement);
    etapes.push({ debut: t, fin: t + d, evenement });
    t += d;
  }
  return { etapes, duree: t };
}

/** `0..1` : où l'on en est dans l'étape à l'instant `t`. Une étape sans durée est finie dès son début. */
function avancement(etape: Etape, t: number): number {
  if (etape.fin <= etape.debut) return 1;
  return Math.min(1, Math.max(0, (t - etape.debut) / (etape.fin - etape.debut)));
}

/** Triangle : `0` aux deux bouts, `1` au milieu. */
function pulsation(f: number): number {
  return f < 0.5 ? f * 2 : 2 - f * 2;
}

/**
 * La pose de chaque unité vivante dans `avant` à l'instant `t` (ms depuis le
 * début de la ligne). Avant `0`, l'échiquier d'avant ; après `duree`, celui
 * d'après. Une unité abattue reste dans la liste, sa `chute` dit où elle en est.
 */
export function posesA(avant: EtatBataille, ligne: LigneDeTemps, t: number): Pose[] {
  const poses = new Map<number, Pose>();
  for (const u of avant.unites) {
    if (!vivante(u)) continue;
    poses.set(u.id, {
      unite: u.id,
      x: u.pos.x,
      y: u.pos.y,
      tenue: u.tenue,
      frappe: 0,
      encaisse: 0,
      chute: 0,
    });
  }
  const poser = (id: number, patch: Partial<Pose>) => {
    const p = poses.get(id);
    if (p !== undefined) poses.set(id, { ...p, ...patch });
  };
  for (const etape of ligne.etapes) {
    if (t < etape.debut) break;
    const f = avancement(etape, t);
    const ev = etape.evenement;
    if (ev.genre === "pas") {
      const n = ev.parcours.length;
      if (n === 0) continue;
      const s = f * (n - 1);
      const i = Math.min(n - 1, Math.floor(s));
      const a = ev.parcours[i]!;
      const b = ev.parcours[Math.min(n - 1, i + 1)]!;
      const r = s - i;
      poser(ev.unite, { x: a.x + (b.x - a.x) * r, y: a.y + (b.y - a.y) * r });
    } else if (ev.genre === "coup") {
      const enCours = t < etape.fin;
      poser(ev.coup.attaquant, { frappe: enCours ? pulsation(f) : 0 });
      poser(ev.coup.cible, {
        encaisse: enCours ? pulsation(f) : 0,
        ...(f >= 0.5 ? { tenue: ev.coup.tenueApres } : {}),
      });
    } else if (ev.genre === "chute") {
      poser(ev.unite, { chute: f });
    }
  }
  return [...poses.values()];
}

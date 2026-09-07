/**
 * Son et haptique de la feuille — un son sec par geste, la dernière = silence.
 *
 * Bible de la veillée, §2.4 et §7 : « un son de feuille qui tombe par geste,
 * une vibration courte à la dixième dernière, longue à la dernière ; une
 * feuille = un son sec, jamais un jingle ; la dernière = silence » ; « une
 * danse par muse donne la signature sonore de la bande ».
 *
 * Deux parties.
 *
 * `motifRetour` est pure et testée : elle lit le compte de feuilles restantes
 * (après le geste), la fin éventuelle et la muse de la bande, et rend un
 * motif — son sec ou silence, vibration (aucune, courte, longue), hauteur en
 * hertz. Pas d'aléa : même compte, même muse, même motif.
 *
 *   son          sec tant qu'il reste une feuille ; silence à 0
 *   vibration    [] d'ordinaire ; [40] ms quand il reste 10 feuilles ou moins
 *                (la « dixième dernière » de la bible lue comme chacune des dix
 *                dernières, consigne du lot) ; [200] ms à 0, ou quand une fin
 *                tombe (sommet, porte, abandon, épuisé)
 *   hauteurHz    une par muse, table d'entiers (ci-dessous)
 *
 * La hauteur est une **table**, jamais un calcul : neuf entiers en hertz, un
 * par muse, dans l'ordre des SIGNATURES (Uranie au faîte, Thalie au sol), sur
 * une gamme descendante de la5 à sol4 — monter la Tour, c'est monter la
 * gamme. Chaque degré porte le nom de la danse de sa muse (reliques/danse.ts),
 * qu'il ne calcule pas : c'est une lecture des neuf danses, pas leur mesure.
 *
 *   rang  muse         danse (danse.ts)   Hz   note
 *   0     Uranie       nutation           880  la5   la plus aiguë : l'axe qui frissonne au faîte
 *   1     Polymnie     précession         784  sol5
 *   2     Euterpe      tempo              698  fa5
 *   3     Érato        culbute            659  mi5
 *   4     Melpomène    flamme             587  ré5
 *   5     Terpsichore  ronde              523  do5
 *   6     Calliope     vis sans fin       494  si4
 *   7     Clio         phases             440  la4
 *   8     Thalie       rebond             392  sol4  la plus grave : le pied qui frappe le sol
 *
 * `jouerRetour` joue le motif dans un navigateur : WebAudio (AudioContext ou
 * webkitAudioContext), un oscillateur triangle de 30 ms à la hauteur du
 * motif, enveloppe en décroissance, gain 0,15, contexte créé et fermé à chaque
 * appel ; vibration par `navigator.vibrate` quand il existe. Elle ne lève
 * jamais et rend true si une demande est partie vers l'API — son ou vibration —,
 * ce qui n'est pas la preuve qu'on l'a entendue : un contexte suspendu reste
 * muet, et `vibrate` répond true sans vibreur. Elle n'est pas testée dans un
 * navigateur ici : une fenêtre factice vérifie ce qu'elle demande à l'API.
 *
 * Figures, pas preuves : un son ne dit rien qu'un compteur ne dise déjà, et la
 * feuille est brûlée avant qu'on l'entende. Le silence de la dernière n'est
 * pas une garantie qu'elle est la dernière : c'est `feuillesRestantes` qui
 * le sait, et la preuve qui l'établit.
 *
 * LIMITE : un navigateur exige un geste utilisateur avant de sonner ; l'appel
 * vient d'un clic, c'est le cas. Sans WebAudio ni vibration, `jouerRetour`
 * rend false et se tait. Un contexte qui reste suspendu (onglet muet) est
 * fermé par un délai de secours quand la fenêtre a `setTimeout` ; `resume()`
 * n'est jamais appelé : un navigateur qui naît suspendu même sous un clic se
 * tait sans le dire. Une porte fermée ne brûle aucune feuille : le motif d'une
 * fin « porte » porte pourtant un son sec, que l'intégrateur peut ne pas jouer.
 * Le rendu réel n'a été écouté dans aucun navigateur.
 */

import { SIGNATURES, type SignatureId } from "./signatures.ts";
import type { Fin } from "./veillee.ts";

export type Son = "sec" | "silence";

export type MotifRetour = {
  son: Son;
  /** motif pour navigator.vibrate, en millisecondes ; [] = pas de vibration */
  vibration: number[];
  hauteurHz: number;
};

/** À dix feuilles ou moins, la vibration courte accompagne chaque geste. */
export const SEUIL_DERNIERES = 10;
export const VIBRATION_COURTE_MS = 40;
export const VIBRATION_LONGUE_MS = 200;
/** 30 ms : un son sec, jamais un jingle. */
export const DUREE_SON_S = 0.03;
export const GAIN_SON = 0.15;

/** Neuf hauteurs en hertz, une par muse : la table du cartouche, rien d'autre — gelée. */
export const HAUTEURS_HZ: Readonly<Record<SignatureId, number>> = Object.freeze({
  uranie: 880,
  saturne: 784,
  jupiter: 698,
  mars: 659,
  soleil: 587,
  venus: 523,
  mercure: 494,
  lune: 440,
  terre: 392,
});

/** Le motif d'un geste : ce que le compte, la fin et la muse disent — et rien de plus. */
export function motifRetour(feuillesRestantes: number, fin: Fin | null, muse: SignatureId): MotifRetour {
  // la table seule, jamais son prototype : « constructor » n'est pas une muse
  const hauteurHz = Object.hasOwn(HAUTEURS_HZ, muse) ? HAUTEURS_HZ[muse] : undefined;
  if (typeof hauteurHz !== "number") {
    throw new Error(`muse inconnue « ${String(muse)} » au lieu d'une des neuf : ${SIGNATURES.map((s) => s.id).join(", ")}`);
  }
  const n = Number.isFinite(feuillesRestantes) ? Math.max(0, Math.floor(feuillesRestantes)) : 0;
  const son: Son = n === 0 ? "silence" : "sec";
  let vibration: number[] = [];
  if (n === 0 || fin !== null) vibration = [VIBRATION_LONGUE_MS];
  else if (n <= SEUIL_DERNIERES) vibration = [VIBRATION_COURTE_MS];
  return { son, vibration, hauteurHz };
}

// ---------------------------------------------------------------------------
// Les effets : WebAudio et vibration, sans jamais lever
// ---------------------------------------------------------------------------
/** Le strict nécessaire d'un AudioContext, pour une fenêtre factice comme pour la vraie. */
export type ContexteAudioMin = {
  currentTime: number;
  destination: unknown;
  createOscillator(): {
    type: string;
    frequency: { value: number };
    connect(noeud: unknown): unknown;
    start(quand?: number): void;
    stop(quand?: number): void;
    onended: unknown;
  };
  createGain(): {
    gain: {
      setValueAtTime(valeur: number, quand: number): unknown;
      exponentialRampToValueAtTime(valeur: number, quand: number): unknown;
    };
    connect(noeud: unknown): unknown;
  };
  close(): unknown;
};

/** Ce que `jouerRetour` lit dans la fenêtre : tout est optionnel, tout peut manquer. */
export type FenetreSonore = {
  AudioContext?: unknown;
  webkitAudioContext?: unknown;
  navigator?: { vibrate?: (motif: number | number[]) => boolean } | null;
  setTimeout?: (fn: () => void, ms: number) => unknown;
};

function fermer(ctx: ContexteAudioMin, etat: { ferme: boolean }): void {
  if (etat.ferme) return;
  etat.ferme = true;
  try {
    const r = ctx.close();
    if (r && typeof (r as Promise<unknown>).catch === "function") (r as Promise<unknown>).catch(() => undefined);
  } catch {
    // un contexte déjà fermé : rien à faire
  }
}

/** Un oscillateur triangle de 30 ms, enveloppe en décroissance, gain 0,15 ; contexte fermé après. */
function sonner(fenetre: FenetreSonore, hauteurHz: number): boolean {
  const Ctor = (fenetre.AudioContext ?? fenetre.webkitAudioContext) as (new () => ContexteAudioMin) | undefined;
  if (typeof Ctor !== "function") return false;
  let ctx: ContexteAudioMin;
  try {
    ctx = new Ctor();
  } catch {
    return false;
  }
  const etat = { ferme: false };
  try {
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = hauteurHz;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(GAIN_SON, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + DUREE_SON_S);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.onended = () => fermer(ctx, etat);
    osc.start(t0);
    osc.stop(t0 + DUREE_SON_S);
    if (typeof fenetre.setTimeout === "function") {
      try {
        fenetre.setTimeout(() => fermer(ctx, etat), 250);
      } catch {
        // pas de délai de secours : onended fermera
      }
    }
    return true;
  } catch {
    fermer(ctx, etat);
    return false;
  }
}

function vibrer(fenetre: FenetreSonore, motif: number[]): boolean {
  if (motif.length === 0) return false;
  const nav = fenetre.navigator;
  if (!nav || typeof nav.vibrate !== "function") return false;
  try {
    // appelée sur navigator, jamais détachée : sinon « Illegal invocation »
    return nav.vibrate(motif) === true;
  } catch {
    return false;
  }
}

/** Joue le motif : son sec par WebAudio, vibration par navigator. Ne lève jamais ; true si une
 *  demande est partie (son ou vibration) — pas la preuve qu'on l'a entendue. */
export function jouerRetour(m: MotifRetour, fenetre: FenetreSonore = globalThis as FenetreSonore): boolean {
  let joue = false;
  try {
    if (m.son === "sec") joue = sonner(fenetre, m.hauteurHz) || joue;
    joue = vibrer(fenetre, m.vibration) || joue;
  } catch {
    // rien ne remonte au clic
  }
  return joue;
}

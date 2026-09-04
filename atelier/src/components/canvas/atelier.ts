/**
 * Contrats 3D partagés — coffre, inventaire, tour, reliques.
 * Aucun import de three en valeur : ce fichier est chargé par les hôtes qui
 * importent les scènes à la demande.
 */

import { useEffect, useState } from "react";
import type { ToneMapping } from "three";

export const ATELIER_DPR: [number, number] = [1, 1.75];

/**
 * Prop gl des quatre Canvas. R3F règle d'abord ACES par défaut puis applique
 * ces clés (applyProps) : la valeur ci-dessous l'emporte, pour les
 * MeshStandardMaterial comme pour le ShaderMaterial de la relique (toneMapped).
 */
export const ATELIER_GL = {
  antialias: true,
  alpha: false,
  powerPreference: "high-performance" as const,
  toneMapping:
    7 as ToneMapping /* THREE.NeutralToneMapping, constants.js l.482 — Khronos PBR Neutral : garde teinte et saturation de l'ambre 42° et de l'améthyste 275°, ce qu'ACES ne fait pas ; retirer cette clé ramène ACES partout, relique comprise */,
};

export const ATELIER_FOND = "#12151a";

// Lumière de l'atelier — jauge, hors feuille. Un seul air pour les scènes voxel :
// neutre (encre / creux de styles.css), le contre-jour porte la teinte de la scène.

/** Résidu ambiant : l'hémisphère fait le gros du remplissage. */
export const LUMIERE_AMB = 0.2;

export const LUMIERE_HEMI = {
  ciel: "#dde1e6",
  sol: "#0e1116",
  intensity: 1.0,
} as const;

export const LUMIERE_DIR = {
  position: [8, 18, 10] as [number, number, number],
  intensity: 0.85,
  color: "#dde1e6",
};

/** Direction et poids de la relique ; l'or n'est que la teinte par défaut : chaque scène passe la sienne. */
export const LUMIERE_CONTRE = {
  position: [-3, 2, -4] as [number, number, number],
  intensity: 0.38,
  color: "#c9a227",
};

/** scene.environmentIntensity quand l'environnement préfiltré est monté. */
export const ENV_INTENSITE = 0.6;

/**
 * Une seule couleur de brouillard pour l'atelier, les distances restent propres à
 * chaque caméra. three mélange le brouillard après tone mapping et OETF, avec
 * fogColor converti : un objet fondu à 100 % ressort #12151a exact.
 */
export function brouillard(proche: number, loin: number): [string, number, number] {
  return [ATELIER_FOND, proche, loin];
}

export function usePrefersReducedMotion(): boolean {
  const [v, setV] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setV(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return v;
}

export function useOngletVisible(): boolean {
  const [v, setV] = useState(true);
  useEffect(() => {
    const sync = () => setV(document.visibilityState !== "hidden");
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);
  return v;
}

export function webglDisponible(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const c = document.createElement("canvas");
    return c.getContext("webgl2") != null || c.getContext("webgl") != null;
  } catch {
    return false;
  }
}

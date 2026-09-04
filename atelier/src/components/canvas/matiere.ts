/**
 * Matières de l'atelier — jauge, hors feuille.
 * Importe three : réservé aux scènes (jamais aux hôtes, qui chargent atelier.ts seul).
 * Métal plafonné à 0,60 partout ; sans environnement flottant, repli « matière peinte ».
 */
import * as THREE from "three";
import type { NomAge } from "@/lib/eidos/types.ts";

export type Matiere = { readonly roughness: number; readonly metalness: number };

/** Par palier de butin (coffres.ts) : nu acier brut, garni vert-de-gris, orné ambre-or poli, précieux pierre polie. */
export const MATIERE_PALIER: readonly Matiere[] = [
  { roughness: 0.55, metalness: 0.3 },
  { roughness: 0.62, metalness: 0.28 },
  { roughness: 0.36, metalness: 0.6 },
  { roughness: 0.24, metalness: 0.08 },
];

/** Par âge : or, cuivre patiné, étain, fer. */
export const MATIERE_AGE: Record<NomAge, Matiere> = {
  Satya: { roughness: 0.32, metalness: 0.6 },
  Treta: { roughness: 0.52, metalness: 0.5 },
  Dvapara: { roughness: 0.42, metalness: 0.55 },
  Kali: { roughness: 0.62, metalness: 0.4 },
};

export const MATIERE_PIERRE: Matiere = { roughness: 0.72, metalness: 0.05 };

export const MATIERE_FERRURE: Matiere = { roughness: 0.38, metalness: 0.6 };

/** dithering_fragment de three : ±0,5 niveau/255 après tone mapping, OETF et brouillard. */
export const MATIERE_TRAMEE = { dithering: true } as const;

/** Le préfiltrage PMREM rend en HalfFloat : sans cible flottante, pas d'environnement. */
export function environnementDisponible(gl: THREE.WebGLRenderer): boolean {
  return (
    gl.extensions.has("EXT_color_buffer_float") || gl.extensions.has("EXT_color_buffer_half_float")
  );
}

/** Sans environnement, un métal n'a rien à réfléchir : on repasse en matière peinte. */
export function matiereEffective(m: Matiere, envOk: boolean): Matiere {
  return envOk
    ? m
    : { roughness: Math.max(m.roughness, 0.45), metalness: Math.min(m.metalness, 0.35) };
}

/** Triplet 0..255 déclaré sRGB (Color.setRGB(..., SRGBColorSpace)) : three fait la conversion en linéaire. */
export function couleurSRGB(r: number, g: number, b: number): THREE.Color {
  const k = (v: number) => Math.max(0, Math.min(255, v)) / 255;
  return new THREE.Color().setRGB(k(r), k(g), k(b), THREE.SRGBColorSpace);
}

/** Triplet 0..255 → "#rrggbb" (arrondi, borné). */
export function hexDe(r: number, g: number, b: number): string {
  const h = (v: number) =>
    Math.round(Math.max(0, Math.min(255, v)))
      .toString(16)
      .padStart(2, "0");
  return "#" + h(r) + h(g) + h(b);
}

/** R3F ne dispose pas les <primitive> : à appeler au démontage d'un InstancedMesh construit à la main. */
export function disposerInstance(inst: THREE.InstancedMesh): void {
  inst.geometry.dispose();
  (inst.material as THREE.Material).dispose();
  inst.dispose();
}

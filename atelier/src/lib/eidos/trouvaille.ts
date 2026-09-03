/**
 * Trouvaille — relique ASCII.
 * On mesure l'ellipse (axes a, b = a/2). Ce n'est pas un glyphe de plus.
 * La croix se déplace avec la phase du cosine d'émission : R = a + b·cos(θ).
 */

import { FIGURES } from "./constantes.ts";
import type { Lumen } from "./relique.ts";

export function asciiEllipse(
  a: number,
  b: number,
  phase = 0,
  W = 41,
  H = 21,
): string {
  const grid: string[][] = Array.from({ length: H }, () => Array(W).fill(" "));
  const cx = (W - 1) / 2;
  const cy = (H - 1) / 2;
  const sx = (W - 1) / (2 * a);
  const sy = (H - 1) / (2 * b);
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const x = (i - cx) / sx;
      const y = (cy - j) / sy;
      const r = (x * x) / (a * a) + (y * y) / (b * b);
      if (Math.abs(r - 1) < 0.14) grid[j]![i] = "\u00b7";
    }
  }
  const i = Math.round(cx + a * Math.cos(phase) * sx);
  const j = Math.round(cy - b * Math.sin(phase) * sy);
  if (j >= 0 && j < H && i >= 0 && i < W) grid[j]![i] = "\u271a";
  return grid.map((row) => row.join("")).join("\n");
}

export function asciiGlyphe(etages: [number, number, number]): string {
  return etages.map((k) => `  ${FIGURES[k]}`).join("\n");
}

export function asciiTrouvaille(lumen: Lumen, phase: number): string {
  const corps = asciiEllipse(lumen.a, lumen.b, phase);
  const pied =
    `${lumen.age.nomAffiche}  a=${lumen.a}  b=${lumen.b}  b/a=${lumen.ratio}` +
    `  πab=${lumen.aire.toFixed(1)}`;
  return `${corps}\n${pied}`;
}

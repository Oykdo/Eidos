/**
 * Trouvaille — relique ASCII.
 * La taille suit a. La croix suit R(θ) = a + b·cos(θ).
 */

import { FIGURES } from "./constantes.ts";
import type { Ionos } from "./relique.ts";

const FIG = ["\u00b7", "\u25cb", "\u263d", "\u271a"] as const;

export function dimensionsAscii(ionos: Ionos): { W: number; H: number } {
  const s = Math.max(0.35, ionos.a / 40);
  const W = 21 + Math.round(20 * s);
  const H = 9 + Math.round(12 * s);
  return { W: W % 2 === 1 ? W : W + 1, H: H % 2 === 1 ? H : H + 1 };
}

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
  const sx = a === 0 ? 1 : (W - 3) / (2 * a);
  const sy = b === 0 ? 1 : (H - 3) / (2 * b);

  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const x = (i - cx) / sx;
      const y = (cy - j) / sy;
      const r = (x * x) / (a * a) + (y * y) / (b * b);
      if (Math.abs(r - 1) < 0.16) grid[j]![i] = FIG[0];
      else if (r < 1 && Math.abs(j - cy) < 0.6 && i % 3 === 0) grid[j]![i] = FIG[1];
    }
  }

  const rx = a * Math.cos(phase);
  const ry = b * Math.sin(phase);
  const i = Math.round(cx + rx * sx);
  const j = Math.round(cy - ry * sy);
  if (j >= 0 && j < H && i >= 0 && i < W) grid[j]![i] = FIG[3];

  const ic = Math.round(cx);
  const jc = Math.round(cy);
  if (grid[jc] && grid[jc]![ic] === " ") grid[jc]![ic] = FIG[2];

  return grid.map((row) => row.join("")).join("\n");
}

export function asciiGlyphe(etages: [number, number, number]): string {
  return etages.map((k) => `  ${FIGURES[k]}`).join("\n");
}

export function asciiTrouvaille(ionos: Ionos, phase: number): string {
  const { W, H } = dimensionsAscii(ionos);
  const corps = asciiEllipse(ionos.a, ionos.b, phase, W, H);
  const r = ionos.recompense(phase);
  const pied =
    `${ionos.age.nomAffiche}  a=${ionos.a} b=${ionos.b}` +
    `  prix ${ionos.prix.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} eidôla` +
    `  R=${r.toFixed(2)}`;
  return `${corps}\n${pied}`;
}

/**
 * Forme des coffres 3D — constantes d'audit.
 * Les formules restent ici et dans docs/SPEC_AUDIT_COFFRES.md.
 * La scène n'affiche aucune équation.
 */

export const PALETTE_FOND = [
  "#FFFFFF",
  "#E8F4FF",
  "#C5E4FF",
  "#8FCBFF",
  "#4AA3F0",
  "#1E6FCB",
  "#0B4A96",
  "#062A5A",
] as const;

export const PALETTE_AVANT = [
  "#FFF4D4",
  "#F0D48A",
  "#C9A227",
  "#B8860B",
  "#8A5A12",
  "#6B3F0A",
  "#3D2408",
  "#1A1006",
] as const;

export type Palette8 = readonly [
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
];

export const COFFRE_AVANT = {
  id: "avant" as const,
  position: [0, 0.42, 1.55] as const,
  scale: 1,
  palette: PALETTE_AVANT,
};

export const COFFRE_FOND = {
  id: "fond" as const,
  position: [0, 1.12, -0.15] as const,
  scale: 0.62,
  palette: PALETTE_FOND,
};

/** z = exp(-(x² + y²)) — socle. */
export function gaussienne(x: number, y: number): number {
  return Math.exp(-(x * x + y * y));
}

export function cartesiens(r: number, theta: number, phi: number): {
  x: number;
  y: number;
  z: number;
} {
  const st = Math.sin(theta);
  return {
    x: r * st * Math.cos(phi),
    y: r * st * Math.sin(phi),
    z: r * Math.cos(theta),
  };
}

/**
 * Somme polaire de e^{-r²} r dr dθ.
 * Contrôle d'audit : tend vers π. N'apparaît pas à l'écran.
 */
export function integraleGaussienne(nr = 256, nphi = 256): number {
  const dr = 8 / nr;
  const dphi = (2 * Math.PI) / nphi;
  let s = 0;
  for (let i = 0; i < nr; i++) {
    const r = (i + 0.5) * dr;
    const anneau = Math.exp(-r * r) * r * dr * dphi * nphi;
    s += anneau;
  }
  return s;
}

export function teinte(palette: Palette8, index: number): string {
  const i = ((index % 8) + 8) % 8;
  return palette[i]!;
}

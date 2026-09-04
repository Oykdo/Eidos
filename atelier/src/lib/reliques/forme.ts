/**
 * Fonctions de forme — référence CPU du SDF.
 * Même topologie que le fragment shader, pour les tests.
 * Le GPU reste la source visuelle ; ici on fige les distances.
 */

import type { Genome } from "./genome.ts";
import { FAMILLE_ORDRE, rangFamille } from "./genome.ts";
import { danse, facteurDanse } from "./danse.ts";

export type Vec3 = readonly [number, number, number];

export function vlen(p: Vec3): number {
  return Math.hypot(p[0], p[1], p[2]);
}

export function sdSphere(p: Vec3, r: number): number {
  return vlen(p) - r;
}

export function sdTorus(p: Vec3, R: number, r: number): number {
  return Math.hypot(Math.hypot(p[0], p[2]) - R, p[1]) - r;
}

export function sdRoundBox(p: Vec3, b: Vec3, r: number): number {
  const qx = Math.abs(p[0]) - b[0];
  const qy = Math.abs(p[1]) - b[1];
  const qz = Math.abs(p[2]) - b[2];
  const outside = vlen([Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)]);
  return outside + Math.min(Math.max(qx, Math.max(qy, qz)), 0) - r;
}

export function sdCapsule(p: Vec3, a: Vec3, b: Vec3, r: number): number {
  const ab: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const ap: Vec3 = [p[0] - a[0], p[1] - a[1], p[2] - a[2]];
  const ab2 = ab[0] * ab[0] + ab[1] * ab[1] + ab[2] * ab[2];
  const t = ab2 === 0 ? 0 : Math.min(1, Math.max(0, (ap[0] * ab[0] + ap[1] * ab[1] + ap[2] * ab[2]) / ab2));
  return vlen([ap[0] - ab[0] * t, ap[1] - ab[1] * t, ap[2] - ab[2] * t]) - r;
}

export function sdHelix(p: Vec3, radius: number, tube: number, pitch: number): number {
  const ang = Math.atan2(p[2], p[0]);
  const y = p[1] - (ang / (Math.PI * 2)) * pitch;
  const h = y - pitch * Math.floor(y / pitch + 0.5);
  const radial = Math.hypot(p[0], p[2]) - radius;
  return Math.hypot(radial, h) - tube;
}

export function smin(a: number, b: number, k: number): number {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}

export function opSub(a: number, b: number): number {
  return Math.max(a, -b);
}

function twistY(p: Vec3, k: number): Vec3 {
  const a = p[1] * k;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [c * p[0] - s * p[2], p[1], s * p[0] + c * p[2]];
}

function pget(g: Genome, k: string): number {
  return g.params[k] ?? 0;
}

function mapFamille(p: Vec3, g: Genome): number {
  const fat = 0.08 + 0.14 * pget(g, "graisse") * (0.4 + 0.6 * pget(g, "sel"));
  const cut = 0.06 + 0.22 * pget(g, "coupe") * (0.3 + 0.7 * pget(g, "soufre"));
  const orb = pget(g, "orbite");
  const fus = pget(g, "fuseau");
  const fac = pget(g, "facette");
  const ann = pget(g, "anneau");
  const pic = pget(g, "pic");
  const idx = Math.round(pget(g, "famille") * 8);
  const fam = FAMILLE_ORDRE[idx] ?? g.famille;

  let d: number;
  switch (fam) {
    case "uranie": {
      d = sdSphere([p[0], p[1] - 0.55, p[2]], 0.16 + fat * 0.6);
      d = smin(d, sdSphere(p, 0.26 + fat), 0.08);
      d = smin(d, sdSphere([p[0], p[1] + 0.5, p[2]], 0.2 + fat * 0.5), 0.08);
      break;
    }
    case "saturne": {
      d = sdTorus(p, 0.42 + 0.14 * ann, 0.07 + fat * 0.5);
      d = smin(d, sdSphere(p, 0.2 + fat * 0.4), 0.05);
      d = smin(d, sdTorus([p[0], p[2], p[1]], 0.3 + 0.08 * ann, 0.03), 0.04);
      break;
    }
    case "jupiter": {
      const q: Vec3 = [p[0], p[1] * (1 + 0.35 * fus), p[2]];
      d = sdSphere(q, 0.46 + fat);
      d = opSub(d, sdSphere([p[0] - 0.32 - 0.18 * orb, p[1] - 0.08, p[2]], 0.26 + cut));
      break;
    }
    case "mars": {
      d = sdRoundBox(p, [0.3, 0.3, 0.3], 0.07 * (1 - fac));
      d = opSub(d, sdRoundBox(p, [0.5, 0.07 + cut * 0.4, 0.07], 0.01));
      d = opSub(d, sdRoundBox(p, [0.07, 0.5, 0.07], 0.01));
      break;
    }
    case "soleil": {
      d = sdSphere(p, 0.36 + fat * 0.4);
      d = smin(d, sdTorus(p, 0.48 + 0.1 * ann, 0.035 + fat * 0.25), 0.1);
      d = smin(d, sdSphere([p[0], p[1] - 0.5 - 0.12 * pic, p[2]], 0.08 + 0.05 * pic), 0.06);
      break;
    }
    case "venus": {
      d = sdSphere([p[0] - 0.2 - 0.08 * orb, p[1], p[2]], 0.3 + fat);
      d = smin(d, sdSphere([p[0] + 0.2 + 0.08 * orb, p[1], p[2]], 0.3 + fat), 0.12);
      break;
    }
    case "mercure": {
      d = sdCapsule(p, [0, -0.52, 0], [0, 0.52, 0], 0.1 + fat * 0.7);
      d = smin(d, sdHelix(p, 0.22 + 0.08 * ann, 0.04 + fat * 0.2, 0.26), 0.05);
      d = smin(d, sdSphere([p[0] - 0.24, p[1] - 0.18, p[2]], 0.15 + fat * 0.4), 0.06);
      d = smin(d, sdSphere([p[0] + 0.2, p[1] + 0.16, p[2] - 0.08], 0.13 + fat * 0.3), 0.06);
      break;
    }
    case "lune": {
      d = sdSphere(p, 0.44 + fat * 0.3);
      d = opSub(d, sdSphere([p[0] - 0.26 - 0.14 * orb, p[1] - 0.06, p[2] - 0.08], 0.38 + cut));
      break;
    }
    default: {
      d = sdRoundBox([p[0], p[1] + 0.22, p[2]], [0.38, 0.16, 0.38], 0.07);
      d = smin(d, sdSphere([p[0], p[1] - 0.18, p[2]], 0.26 + fat * 0.4), 0.1);
      d = opSub(d, sdSphere([p[0], p[1] + 0.05, p[2]], cut * 0.5));
      break;
    }
  }

  const nids = Math.floor(pget(g, "nids") * 6);
  const az = pget(g, "azimuth") * Math.PI * 2;
  for (let i = 0; i < nids; i++) {
    const a = (i / nids) * Math.PI * 2 + az;
    const c: Vec3 = [Math.cos(a) * (0.52 + 0.1 * orb), Math.sin(a) * 0.12, Math.sin(a) * (0.52 + 0.1 * orb)];
    d = smin(d, sdSphere([p[0] - c[0], p[1] - c[1], p[2] - c[2]], 0.04 + fat * 0.2), 0.04);
  }

  if (pget(g, "creux") > 0.45) {
    d = opSub(d, sdSphere(p, 0.12 + 0.1 * pget(g, "creux")));
  }
  d += pget(g, "strie") * 0.012 * Math.sin(p[1] * 28 + az);
  return d;
}

export function sdfRelique(p: Vec3, g: Genome, phase: number): number {
  const rho = 1 + 0.18 * Math.cos(phase);
  const s = rho * (0.72 + 0.3 * pget(g, "echelle"));
  const fam = Math.round(pget(g, "famille") * 8);
  const q = danse([p[0] / s, p[1] / s, p[2] / s], fam, phase);
  const k = pget(g, "twist") * (0.35 + 1.4 * pget(g, "mercure"));
  return mapFamille(twistY(q, k), g) * facteurDanse(fam);
}

export const POINTS_TEST: readonly Vec3[] = [
  [0, 0, 0],
  [0.3, 0.1, -0.2],
  [0, 0.5, 0],
  [0.4, -0.2, 0.15],
];

export function echantillonForme(g: Genome, phase = 0): number[] {
  return POINTS_TEST.map((p) => sdfRelique(p, g, phase));
}

export type ReliqueUniformValues = {
  metal: [number, number, number];
  p0: [number, number, number, number];
  p1: [number, number, number, number];
  p2: [number, number, number, number];
  p3: [number, number, number, number];
  p4: [number, number, number, number];
  famille: number;
  usure: number;
};

export function valeursUniforms(g: Genome): ReliqueUniformValues {
  const p = (k: string) => g.params[k] ?? 0;
  return {
    metal: [p("metalR"), p("metalG"), p("metalB")],
    p0: [p("twist"), p("graisse"), p("coupe"), p("nids")],
    p1: [p("grain"), p("orbite"), p("fuseau"), p("facette")],
    p2: [p("halo"), p("strie"), p("azimuth"), p("lean")],
    p3: [p("creux"), p("anneau"), p("pic"), p("echelle")],
    p4: [p("densite"), p("sel"), p("mercure"), p("soufre")],
    famille: rangFamille(g.famille),
    usure: p("usure"),
  };
}

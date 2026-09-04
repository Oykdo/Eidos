import Decimal from "decimal.js";
import { ATOMES } from "./constantes.ts";
import { concat, hexOf, sha256, sha256d, u64, utf8 } from "./hash.ts";
import { encoderGlyphes } from "./glyphs.ts";

Decimal.set({ precision: 60, rounding: Decimal.ROUND_FLOOR });

export const T = 1008;
export const H0 = 492;
const B_RATIO = new Decimal("0.5");
const PI = new Decimal(
  "3.14159265358979323846264338327950288419716939937510582097494459230782",
);

const AGES: { nom: string; a: number; epoques: number }[] = [
  { nom: "Satya", a: 40, epoques: 832 },
  { nom: "Treta", a: 30, epoques: 624 },
  { nom: "Dvapara", a: 20, epoques: 416 },
  { nom: "Kali", a: 10, epoques: 208 },
];

function dcos(x: Decimal): Decimal {
  const twoPi = PI.mul(2);
  x = x.minus(x.div(twoPi).toDecimalPlaces(0, Decimal.ROUND_FLOOR).mul(twoPi));
  if (x.gt(PI)) x = x.minus(twoPi);
  let term = new Decimal(1);
  let total = new Decimal(1);
  const x2 = x.mul(x);
  let n = 0;
  const lim = new Decimal(10).pow(-(Decimal.precision - 5));
  for (;;) {
    n += 2;
    term = term.neg().mul(x2).div(n * (n - 1));
    if (term.isZero() || term.abs().lt(lim)) break;
    total = total.plus(term);
  }
  return total;
}

export function buildEpochTable(aEidolon: number, t = T, h0 = H0): number[] {
  const totalAtomes = aEidolon * t * ATOMES;
  const a = new Decimal(aEidolon).mul(ATOMES);
  const b = a.mul(B_RATIO);
  const twoPiOverT = PI.mul(2).div(t);
  const exact: Decimal[] = [];
  const floors: number[] = [];
  for (let h = 0; h < t; h++) {
    const r = a.plus(b.mul(dcos(twoPiOverT.mul(h - h0))));
    exact.push(r);
    floors.push(r.toDecimalPlaces(0, Decimal.ROUND_FLOOR).toNumber());
  }
  const reste = totalAtomes - floors.reduce((s, n) => s + n, 0);
  const order = Array.from({ length: t }, (_, h) => h).sort((h1, h2) => {
    const f1 = exact[h1]!.minus(floors[h1]!);
    const f2 = exact[h2]!.minus(floors[h2]!);
    const c = f2.cmp(f1);
    if (c !== 0) return c;
    return h1 - h2;
  });
  for (let i = 0; i < reste; i++) floors[order[i]!]! += 1;
  const W = [0];
  for (const r of floors) W.push(W[W.length - 1]! + r);
  return W;
}

export function canonTable(W: number[]): Uint8Array {
  return utf8(W.map(String).join("\n") + "\n");
}

const tables = new Map<number, number[]>();

function tableOf(a: number): number[] {
  let W = tables.get(a);
  if (!W) {
    W = buildEpochTable(a);
    tables.set(a, W);
  }
  return W;
}

export function ageOf(
  height: number,
): { nom: string; a: number; start: number } | null {
  let start = 0;
  for (const age of AGES) {
    const span = age.epoques * T;
    if (height < start + span) return { nom: age.nom, a: age.a, start };
    start += span;
  }
  return null;
}

export function rewardAt(height: number): number {
  const age = ageOf(height);
  if (!age) return 0;
  const W = tableOf(age.a);
  const h = (height - age.start) % T;
  return W[h + 1]! - W[h]!;
}

export function header(
  height: number,
  prev: Uint8Array,
  merkle: Uint8Array,
  ts: number,
  nonce: number,
): Uint8Array {
  return concat(u64(height), prev, merkle, u64(ts), u64(nonce));
}

export function hashBloc0(message: string, ts: number, nonce: number): {
  merkle: Uint8Array;
  hash: Uint8Array;
  glyphes: string;
} {
  const merkle = sha256(utf8(message));
  const hash = sha256d(header(0, new Uint8Array(32), merkle, ts, nonce));
  return { merkle, hash, glyphes: encoderGlyphes(hash) };
}

export function empreinteTable(a: number): string {
  return hexOf(sha256(canonTable(tableOf(a))));
}

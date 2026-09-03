import { FIGURES } from "./constantes.ts";
import { fromHex, hexOf, sha256d } from "./hash.ts";

const INV: Record<string, number> = {
  "\u00b7": 0,
  "\u25cb": 1,
  "\u263d": 2,
  "\u271a": 3,
};

export function encoderGlyphes(data: Uint8Array): string {
  let bits = "";
  for (const b of data) bits += b.toString(2).padStart(8, "0");
  const pad = (6 - (bits.length % 6)) % 6;
  bits += "0".repeat(pad);
  const out: string[] = [];
  for (let i = 0; i < bits.length; i += 6) {
    const code = parseInt(bits.slice(i, i + 6), 2);
    let g = "";
    for (let e = 0; e < 3; e++) {
      g += FIGURES[(code >> (2 * (2 - e))) & 3];
    }
    out.push(g);
  }
  return out.join(" ");
}

function octetsDepuis(codes: number[], n: number): Uint8Array {
  let bits = "";
  for (const c of codes) bits += c.toString(2).padStart(6, "0");
  bits = bits.slice(0, n * 8);
  const o = new Uint8Array(n);
  for (let i = 0; i < n; i++) o[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
  return o;
}

export function decoderGlyphes(saisie: string): Uint8Array {
  const groupes = saisie
    .trim()
    .split(/\s+/)
    .filter((g) => g !== "|");
  if (groupes.length !== 31) {
    throw new Error(`${groupes.length} symboles au lieu de 31.`);
  }
  const codes: number[] = [];
  for (const g of groupes) {
    const f = [...g];
    if (f.length !== 3) throw new Error("Ce n'est pas une adresse Eidos.");
    let c = 0;
    for (const ch of f) {
      if (!(ch in INV)) throw new Error("Ce n'est pas une adresse Eidos.");
      c = (c << 2) | INV[ch]!;
    }
    codes.push(c);
  }
  return octetsDepuis(codes, 20);
}

export function encoderAdresse(a20: Uint8Array): string {
  if (a20.length !== 20) throw new Error("adresse de 20 octets attendue");
  const cs = sha256d(a20).slice(0, 3);
  return encoderGlyphes(a20) + "  |  " + encoderGlyphes(cs);
}

export function verifierAdresse(saisie: string): { a20: Uint8Array; hexa: string } {
  const groupes = saisie
    .trim()
    .split(/\s+/)
    .filter((g) => g !== "|");
  if (groupes.length !== 31) {
    throw new Error(`${groupes.length} symboles au lieu de 31.`);
  }
  const codes: number[] = [];
  for (const g of groupes) {
    const f = [...g];
    if (f.length !== 3) throw new Error("Ce n'est pas une adresse Eidos.");
    let c = 0;
    for (const ch of f) {
      if (!(ch in INV)) throw new Error("Ce n'est pas une adresse Eidos.");
      c = (c << 2) | INV[ch]!;
    }
    codes.push(c);
  }
  const a20 = octetsDepuis(codes.slice(0, 27), 20);
  const ctrl = octetsDepuis(codes.slice(27), 3);
  const attendu = sha256d(a20).slice(0, 3);
  if (hexOf(ctrl) !== hexOf(attendu)) {
    throw new Error("Adresse altérée — vérifiez-la.");
  }
  return { a20, hexa: hexOf(a20) };
}

export function etagesDe(groupe: string): [number, number, number] {
  const f = [...groupe];
  if (f.length !== 3) return [0, 0, 0];
  return [
    INV[f[0]!] ?? 0,
    INV[f[1]!] ?? 0,
    INV[f[2]!] ?? 0,
  ];
}

export function groupesUtiles(a20hex: string): string[] {
  return encoderGlyphes(fromHex(a20hex)).split(" ");
}

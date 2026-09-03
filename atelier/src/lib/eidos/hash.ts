import { sha256 as noble256 } from "@noble/hashes/sha2.js";

export function sha256(data: Uint8Array): Uint8Array {
  return noble256(data);
}

export function sha256d(data: Uint8Array): Uint8Array {
  return sha256(sha256(data));
}

const enc = new TextEncoder();

export function utf8(s: string): Uint8Array {
  return enc.encode(s);
}

export function hexOf(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += b.toString(16).padStart(2, "0");
  return s;
}

export function fromHex(hex: string): Uint8Array {
  const h = hex.replace(/^0x/, "");
  if (h.length % 2) throw new Error("hex impair");
  const o = new Uint8Array(h.length / 2);
  for (let i = 0; i < o.length; i++) {
    o[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16);
  }
  return o;
}

export function concat(...parts: Uint8Array[]): Uint8Array {
  let n = 0;
  for (const p of parts) n += p.length;
  const o = new Uint8Array(n);
  let i = 0;
  for (const p of parts) {
    o.set(p, i);
    i += p.length;
  }
  return o;
}

export function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a[i]! ^ b[i]!;
  return d === 0;
}

export function u16(n: number): Uint8Array {
  return new Uint8Array([(n >>> 8) & 255, n & 255]);
}

export function u32(n: number): Uint8Array {
  return new Uint8Array([
    (n >>> 24) & 255,
    (n >>> 16) & 255,
    (n >>> 8) & 255,
    n & 255,
  ]);
}

export function u64(n: number): Uint8Array {
  const hi = Math.floor(n / 0x1_0000_0000);
  const lo = n >>> 0;
  return concat(u32(hi), u32(lo));
}

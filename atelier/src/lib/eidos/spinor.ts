/**
 * Spinor public — lecture PSNX / Eidolon : 7 phases + 7 amplitudes
 * depuis un digest. On n'a pas la vault_key.
 *
 * INTERDIT : en faire une graine, un nonce, une clé Lamport.
 */

import { hexOf, sha256 } from "./hash.ts";

export type SpinorPublic = {
  digest: string;
  phases: number[];
  amplitudes: number[];
};

export function spinorDepuisOctets(octets: Uint8Array): SpinorPublic {
  const d = sha256(octets);
  return spinorDepuisDigest(d);
}

export function spinorDepuisDigest(digest: Uint8Array): SpinorPublic {
  const phases: number[] = [];
  const amplitudes: number[] = [];
  for (let i = 0; i < 7; i++) {
    const off = i * 4;
    const raw =
      ((digest[off] ?? 0) << 24) |
      ((digest[off + 1] ?? 0) << 16) |
      ((digest[off + 2] ?? 0) << 8) |
      (digest[off + 3] ?? 0);
    phases.push(((raw >>> 0) / 0xffffffff) * Math.PI * 2);
    const amp = (((digest[i] ?? 0) ^ (digest[(i + 7) % 32] ?? 0)) & 0xff) / 0xff;
    amplitudes.push(0.2 + amp * 0.8);
  }
  return { digest: hexOf(digest), phases, amplitudes };
}

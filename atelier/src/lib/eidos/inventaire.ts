/**
 * Inventaire du coffre — tirage local.
 *
 * Un objet par hauteur. La graine d'atelier est
 *   SHA-256d(tag ‖ (maître:n:hauteur) ‖ hash_bloc)
 * On-chain, le premier terme serait la sig Lamport de la nouvelle racine.
 * Ici on ne brûle pas une clé par tirage : une entrée = 24 Ko.
 */

import { ageOf } from "./eonis.ts";
import { fromHex, utf8 } from "./hash.ts";
import { objetDepuisGraine, graineTirage, racineObjets, type Objet } from "./objets.ts";
import { SIGNATURES, type SignatureId } from "./signatures.ts";
import type { Affixe, Coffre, NomAge, ObjetPorte } from "./types.ts";
import { AFFIXES, GENRES, habille } from "./equipement.ts";

export function estObjetPorte(x: unknown): x is ObjetPorte {
  if (!x || typeof x !== "object") return false;
  const o = x as ObjetPorte;
  if (typeof o.mot !== "number" || o.mot < 0 || o.mot > 0xffffffff) return false;
  if (!SIGNATURES.some((s) => s.id === o.archetype)) return false;
  if (o.age !== "Satya" && o.age !== "Treta" && o.age !== "Dvapara" && o.age !== "Kali") {
    return false;
  }
  if (typeof o.nonce !== "number" || o.nonce < 0 || o.nonce > 65535) return false;
  if (typeof o.hauteur !== "number" || o.hauteur < 0) return false;
  return true;
}

export function normaliserObjets(xs: unknown): ObjetPorte[] {
  if (!Array.isArray(xs)) return [];
  const out: ObjetPorte[] = [];
  const seen = new Set<number>();
  for (const x of xs) {
    if (!estObjetPorte(x)) continue;
    const mot = x.mot >>> 0;
    if (seen.has(mot)) continue;
    seen.add(mot);
    out.push(
      habille(
        {
          mot,
          archetype: x.archetype,
          age: x.age,
          nonce: x.nonce & 65535,
          hauteur: x.hauteur | 0,
        },
        mot,
        {
          genre: x.genre && (GENRES as readonly string[]).includes(x.genre) ? x.genre : "trouve",
          emplacement: x.emplacement,
          affixe: x.affixe && (AFFIXES as readonly string[]).includes(x.affixe) ? (x.affixe as Affixe) : null,
          sockets: x.sockets,
          gemmes: x.gemmes,
          nom: x.nom,
          palierLair: x.palierLair,
        },
      ),
    );
  }
  return out;
}

export function objetDePorte(p: ObjetPorte): Objet {
  return {
    mot: p.mot >>> 0,
    archetype: p.archetype as SignatureId,
    age: p.age,
  };
}

export function signatureDe(id: string) {
  return SIGNATURES.find((s) => s.id === id) ?? SIGNATURES[0]!;
}

export type TirageKo = { ok: false; code: "hauteur" | "hash" };
export type TirageOk = { ok: true; coffre: Coffre; objet: ObjetPorte };
export type Tirage = TirageOk | TirageKo;

export function tirerDansCoffre(c: Coffre): Tirage {
  const tip = c.chaine[c.chaine.length - 1];
  if (!tip) return { ok: false, code: "hash" };
  const objets = normaliserObjets(c.objets);
  if (objets.some((o) => o.hauteur === tip.hauteur)) return { ok: false, code: "hauteur" };
  let hash: Uint8Array;
  try {
    hash = fromHex(tip.hash);
    if (hash.length !== 32) return { ok: false, code: "hash" };
  } catch {
    return { ok: false, code: "hash" };
  }
  const ageNom = (ageOf(tip.hauteur)?.nom ?? "Satya") as NomAge;
  const sig = utf8(`${c.maitre}:${c.n}:${tip.hauteur}`);
  const graine = graineTirage(sig, hash);
  const o = objetDepuisGraine(graine, ageNom);
  const porte = habille(
    {
      mot: o.mot,
      archetype: o.archetype,
      age: o.age,
      nonce: ((graine[8]! << 8) | graine[9]!) & 65535,
      hauteur: tip.hauteur,
    },
    graine[10]!,
  );
  return {
    ok: true,
    objet: porte,
    coffre: { ...c, objets: [...objets, porte] },
  };
}

export function racineDuCoffre(c: Coffre): string {
  return racineObjets(normaliserObjets(c.objets).map(objetDePorte));
}

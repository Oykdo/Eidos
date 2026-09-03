/** Arbre de descendance — génération déterministe (rien n'est tiré au sort). */

export const PREMIERS = [
  2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71,
] as const;

export const TIERS = [
  { id: 0, nom: "Continuité", aide: "Universelle — ce qui ne se divise pas." },
  { id: 1, nom: "Organisation hydrodynamique", aide: "Premier régime physique." },
  { id: 2, nom: "Sélection de contrainte", aide: "Filtres d'admissibilité." },
  { id: 3, nom: "Émergence spectrale", aide: "Modes indexés par les premiers." },
  { id: 4, nom: "Structuration modale", aide: "Familles de réponses." },
  { id: 5, nom: "Différenciation des régimes", aide: "Les onze familles se séparent." },
  { id: 6, nom: "Architectures d'interaction", aide: "Liens entre régimes." },
  { id: 7, nom: "Organisation complexe", aide: "Compositions stables." },
  { id: 8, nom: "Systèmes composés", aide: "Agrégats gouvernés." },
  { id: 9, nom: "Autorités terminales", aide: "Feuilles : objets observés." },
] as const;

export const FAMILLES = [
  { id: 0, nom: "Réponse géométrique", couleur: "#5aa0b5" },
  { id: 1, nom: "Régime gravitationnel", couleur: "#6b7ea3" },
  { id: 2, nom: "Régime quantique", couleur: "#6e9a7a" },
  { id: 3, nom: "Régime de champ", couleur: "#3d9b8c" },
  { id: 4, nom: "Continuum", couleur: "#3e8e6e" },
  { id: 5, nom: "Thermodynamique", couleur: "#c9a227" },
  { id: 6, nom: "Matière", couleur: "#c48a4a" },
  { id: 7, nom: "Chimie", couleur: "#b06a48" },
  { id: 8, nom: "Organisation biologique", couleur: "#8a6a9a" },
  { id: 9, nom: "Organisation cognitive", couleur: "#c47a8a" },
  { id: 10, nom: "Registres observables", couleur: "#9aa3b2" },
] as const;

export const SECTEURS_PAR_FAMILLE = 3;
export const N_SECTEURS = FAMILLES.length * SECTEURS_PAR_FAMILLE; // 33
export const N_TIERS = TIERS.length; // 10

const SUFFIXE = ["α", "β", "γ"] as const;

export function nomSecteur(sid: number): string {
  const f = FAMILLES[Math.floor(sid / SECTEURS_PAR_FAMILLE)]!;
  const k = sid % SECTEURS_PAR_FAMILLE;
  return `${f.nom} ${SUFFIXE[k]}`;
}

export function couleurSecteur(sid: number): string {
  return FAMILLES[Math.floor(sid / SECTEURS_PAR_FAMILLE)]!.couleur;
}

export function yDuPalier(t: number): number {
  return 13.2 - t * 2.52;
}

export function rayonDuPalier(t: number): number {
  return 1.55 + t * 1.18;
}

export function noeudsAuPalier(t: number): number {
  if (t < 9) return 8 * (t + 1);
  return 65;
}

export const N_NOEUDS = Array.from({ length: N_TIERS }, (_, t) =>
  noeudsAuPalier(t),
).reduce((a, b) => a + b, 0);

function mix(n: number): number {
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  return (n ^ (n >>> 16)) >>> 0;
}

export type Noeud = {
  id: number;
  palier: number;
  secteur: number;
  famille: number;
  angle: number;
  x: number;
  y: number;
  z: number;
  parent: number | null;
  autorites: number;
  premier: number;
};

export type Autorite = {
  id: number;
  noeud: number;
  x: number;
  y: number;
  z: number;
  secteur: number;
};

export type Arbre = {
  noeuds: Noeud[];
  autorites: Autorite[];
  nAutorites: number;
};

function chargesAutorites(nNoeuds: number, cible: number): number[] {
  const base = Math.floor(cible / nNoeuds);
  const charges = Array.from({ length: nNoeuds }, () => base);
  let reste = cible - base * nNoeuds;
  for (let i = 0; i < reste; i++) {
    charges[i % nNoeuds]! += 1;
  }
  return charges;
}

export const N_AUTORITES = 4881;

export function construireArbre(): Arbre {
  const charges = chargesAutorites(N_NOEUDS, N_AUTORITES);
  const noeuds: Noeud[] = [];
  const parPalier: number[][] = Array.from({ length: N_TIERS }, () => []);
  let id = 0;
  for (let t = 0; t < N_TIERS; t++) {
    const n = noeudsAuPalier(t);
    const y = yDuPalier(t);
    const r = rayonDuPalier(t);
    const tour = (mix(t + 17) / 0xffffffff) * Math.PI * 2;
    for (let k = 0; k < n; k++) {
      const angle = tour + (k / n) * Math.PI * 2;
      const secteur = mix(id * 97 + t * 13 + k) % N_SECTEURS;
      const jitter = ((mix(id + 333) / 0xffffffff) - 0.5) * 0.08;
      const rr = r * (1 + jitter);
      noeuds.push({
        id,
        palier: t,
        secteur,
        famille: Math.floor(secteur / SECTEURS_PAR_FAMILLE),
        angle,
        x: Math.cos(angle) * rr,
        y,
        z: Math.sin(angle) * rr,
        parent: null,
        autorites: charges[id]!,
        premier: PREMIERS[t * 2 + (k % 2)] ?? PREMIERS[k % PREMIERS.length]!,
      });
      parPalier[t]!.push(id);
      id += 1;
    }
  }

  for (let t = 1; t < N_TIERS; t++) {
    const parents = parPalier[t - 1]!;
    for (const nid of parPalier[t]!) {
      const n = noeuds[nid]!;
      let best = parents[0]!;
      let bestD = Infinity;
      for (const pid of parents) {
        const p = noeuds[pid]!;
        let d = Math.abs(n.angle - p.angle);
        if (d > Math.PI) d = Math.PI * 2 - d;
        if (d < bestD) {
          bestD = d;
          best = pid;
        }
      }
      n.parent = best;
    }
  }

  const autorites: Autorite[] = [];
  let aid = 0;
  for (const n of noeuds) {
    for (let k = 0; k < n.autorites; k++) {
      const u = mix(n.id * 1009 + k * 17) / 0xffffffff;
      const v = mix(n.id * 2003 + k * 29) / 0xffffffff;
      const a = u * Math.PI * 2;
      const rad = 0.08 + v * 0.22;
      const lift = ((mix(n.id + k * 7) / 0xffffffff) - 0.5) * 0.16;
      autorites.push({
        id: aid,
        noeud: n.id,
        x: n.x + Math.cos(a) * rad,
        y: n.y + lift,
        z: n.z + Math.sin(a) * rad,
        secteur: n.secteur,
      });
      aid += 1;
    }
  }

  return { noeuds, autorites, nAutorites: autorites.length };
}

export type Selection =
  | { kind: "palier"; palier: number }
  | { kind: "premier"; p: number; index: number }
  | { kind: "noeud"; noeud: Noeud }
  | { kind: "famille"; famille: number }
  | null;

let cache: Arbre | null = null;
export function arbre(): Arbre {
  cache ??= construireArbre();
  return cache;
}

/**
 * Bataille — la dalle d'un étage, ses obstacles, deux camps, et ce que la
 * partie a lu (`partie.ts`, `lire`) : cases atteignables, chemin survolé,
 * zone de contrôle, menace annoncée, cibles frappables, tenue et points
 * d'action. La scène ne calcule rien : elle peint une `Lecture` entière, et
 * rend les clics (une case, une unité) à la page, qui seule décide.
 *
 * Même socle que la Tour (`components/canvas/`) : lumière du contrat, pierre
 * tramée, environnement et contre-jour dans la teinte du biome, rendu à la
 * demande — R3F invalide seul à chaque commit React et les attributs écrits
 * hors commit s'invalident à la main. **Une seule chose bouge** : ce qui
 * vient de se jouer (`Partie.avant`, `Partie.derniers`) s'anime depuis les
 * poses d'`animation.ts` — un pas glisse le long de son parcours, un coup
 * pulse, un contre répond, une stèle abattue s'enfonce — et pendant ce temps
 * seulement, chaque image en demande une autre ; la dernière jouée, la scène
 * se rendort. L'horloge est celle de la scène ; les poses, elles, sont pures.
 *
 * La télégraphie se dessine (`traits.ts`, lus dans la `Lecture`) : le
 * parcours annoncé en fer sourd, le coup annoncé en fer vif, de la case d'où
 * l'on frappe à la case de la cible. Ni traits ni menace pendant qu'une
 * phase s'anime : ce qu'on lit est l'échiquier d'après, pas celui qui bouge.
 *
 * La molette rapproche ou éloigne la caméra le long de son axe, entre
 * `ZOOM_MIN` et `ZOOM_MAX` ; elle regarde toujours le centre de la dalle.
 * Pas d'orbite, pas de dépendance : trois postes fixes seraient le pas
 * suivant, s'il est demandé.
 *
 * Le coffre entre par le bas (rangée 8, la plus proche de la caméra) ; les
 * Indéchiffrés se lisent en une matière sourde, sans teinte de biome : ce
 * qu'aucune forme ne range n'a pas de couleur. Une unité est une stèle dont
 * la hauteur suit la tenue ; ses points d'action sont des grains posés
 * dessus ; l'élue est en or poli, comme dans la Tour.
 *
 * Jauge, hors feuille. Figures ≠ preuves.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import {
  ATELIER_DPR,
  ATELIER_FOND,
  ATELIER_GL,
  brouillard,
  useOngletVisible,
} from "@/components/canvas/atelier.ts";
import { EnvironnementAtelier } from "@/components/canvas/Environnement.tsx";
import { Halo } from "@/components/canvas/Halo.tsx";
import { LumieresAtelier } from "@/components/canvas/Lumieres.tsx";
import {
  MATIERE_PIERRE,
  MATIERE_TRAMEE,
  type Matiere,
  couleurSRGB,
  disposerInstance,
  environnementDisponible,
  matiereEffective,
} from "@/components/canvas/matiere.ts";
import { seuilBayer } from "@/components/canvas/texel.ts";
import {
  evenementsDe,
  ligneDeTemps,
  posesA,
  type LigneDeTemps,
  type Pose,
} from "@/lib/eidos/tactique/animation.ts";
import type { Lecture, LectureCase, LectureUnite } from "@/lib/eidos/tactique/partie.ts";
import type { Trait } from "@/lib/eidos/tactique/traits.ts";
import {
  GRILLE_N,
  PA_PAR_TOUR,
  type Acte,
  type Case,
  type EtatBataille,
} from "@/lib/eidos/tactique/types.ts";
import { dalleDe } from "@/lib/eidos/tour.ts";

/** Sol (case vide) : la pierre du fond, deux clartés selon la trame. */
const CLARTE_SOL = [0.42, 0.36] as const;
/**
 * Case atteignable : le biome, plus clair à un pas qu'à trois. Le plancher
 * est haut exprès : vu en headless sur l'étage 40 (saturne, un biome terne),
 * 0,68 rendait (98, 97, 91) contre un sol à (33, 38, 42) — lisible, discret.
 */
const CLARTE_PAS = [1.0, 0.92, 0.84, 0.76] as const;
/** Sous contrôle adverse : la case s'assombrit, quelle que soit sa couleur. */
const FACTEUR_CONTROLE = 0.72;
/** Chemin survolé : or. */
const OR = "#c9a227";
/** Menace annoncée : le fer du contrat. */
const FER = "#a8332a";
/** Trait d'un pas annoncé : le même fer, sourd. */
const FER_SOURD = "#7a2a24";
/** Un Indéchiffré : sourd, sans biome. */
const SOURD = "#6e7581";
const SOURD_FRAPPABLE = "#8a5a52";

const MATIERE_ELUE: Matiere = { roughness: 0.3, metalness: 0.6 };
const MATIERE_UNITE: Matiere = { roughness: 0.45, metalness: 0.35 };
const MATIERE_INDECHIFFRE: Matiere = { roughness: 0.85, metalness: 0.0 };

/** Stèle : socle et plein, selon la tenue restante (entier lu, rendu flottant). */
const STELE_MIN = 0.35;
const STELE_MAX = 1.25;
/** Un coup porté gonfle la stèle d'autant ; un coup encaissé la fait reculer d'autant, en cases. */
const PULSATION = 0.18;
const RECUL = 0.16;
/** La caméra : sa distance au centre, bornée ; un cran de molette la change d'un facteur. */
const ZOOM_MIN = 9;
const ZOOM_MAX = 20;
const ZOOM_CRAN = 1.08;

const MID = (GRILLE_N - 1) / 2;

function posDe(c: Case): [number, number, number] {
  return [c.x - MID, 0, c.y - MID];
}

function casesDe(etage: number, pleine: boolean): Case[] {
  const dalle = dalleDe(etage);
  const out: Case[] = [];
  for (let y = 0; y < GRILLE_N; y++)
    for (let x = 0; x < GRILLE_N; x++) if (dalle[y]![x] === pleine) out.push({ x, y });
  return out;
}

const casesVides = (etage: number) => casesDe(etage, false);
const casesPleines = (etage: number) => casesDe(etage, true);

function teinteRGB(hex: string): { r: number; g: number; b: number } {
  const t = new THREE.Color(hex).getRGB(new THREE.Color(), THREE.SRGBColorSpace);
  return { r: t.r * 255, g: t.g * 255, b: t.b * 255 };
}

/** La couleur d'une case vide, par priorité : chemin, atteignable, sol ; puis le contrôle. */
function couleurCase(
  lc: LectureCase,
  biome: { r: number; g: number; b: number },
  fond: { r: number; g: number; b: number },
  or: { r: number; g: number; b: number },
  etage: number,
): THREE.Color {
  let r: number;
  let g: number;
  let b: number;
  if (lc.chemin) {
    ({ r, g, b } = or);
  } else if (lc.cout !== null) {
    const K = CLARTE_PAS[Math.min(CLARTE_PAS.length - 1, lc.cout)]!;
    r = biome.r * K;
    g = biome.g * K;
    b = biome.b * K;
  } else {
    const K = CLARTE_SOL[seuilBayer(lc.x, etage, lc.y) < 8 ? 0 : 1]!;
    r = fond.r * K;
    g = fond.g * K;
    b = fond.b * K;
  }
  const f = lc.controle ? FACTEUR_CONTROLE : 1;
  return couleurSRGB(r * f, g * f, b * f);
}

function Sol({
  lecture,
  teinte,
  onCase,
  onSurvol,
}: {
  lecture: Lecture;
  teinte: string;
  onCase: (c: Case) => void;
  onSurvol: (c: Case | null) => void;
}) {
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
  // La géométrie ne dépend que de l'étage : les cases vides de sa dalle.
  const vides = useMemo(() => casesVides(lecture.etage), [lecture.etage]);

  const inst = useMemo(() => {
    const geo = new THREE.BoxGeometry(0.92, 0.08, 0.92);
    const m = matiereEffective(MATIERE_PIERRE, environnementDisponible(gl));
    const mat = new THREE.MeshStandardMaterial({
      color: "#ffffff",
      roughness: m.roughness,
      metalness: m.metalness,
      envMapIntensity: 0.3,
      ...MATIERE_TRAMEE,
    });
    const mesh = new THREE.InstancedMesh(geo, mat, GRILLE_N * GRILLE_N);
    const dummy = new THREE.Object3D();
    vides.forEach((c, i) => {
      dummy.position.set(...posDe(c));
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.count = vides.length;
    mesh.instanceMatrix.needsUpdate = true;
    return mesh;
  }, [vides, gl]);

  // Les couleurs suivent la lecture : écrites hors commit, donc invalidées à la main.
  useEffect(() => {
    const biome = teinteRGB(teinte);
    const fond = teinteRGB("#c6cbd1");
    const or = teinteRGB(OR);
    vides.forEach((c, i) => {
      const lc = lecture.cases[c.y]?.[c.x];
      if (lc !== undefined) inst.setColorAt(i, couleurCase(lc, biome, fond, or, lecture.etage));
    });
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    invalidate();
  }, [inst, vides, teinte, lecture.cases, lecture.etage, invalidate]);

  useEffect(() => () => disposerInstance(inst), [inst]);

  const caseDe = (e: ThreeEvent<PointerEvent>): Case | null => {
    const i = e.instanceId;
    if (i === undefined) return null;
    const c = vides[i];
    return c === undefined ? null : { x: c.x, y: c.y };
  };

  return (
    <primitive
      object={inst}
      onPointerDown={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        const c = caseDe(e);
        if (c !== null) onCase(c);
      }}
      onPointerMove={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        onSurvol(caseDe(e));
      }}
      onPointerLeave={() => onSurvol(null)}
    />
  );
}

function Obstacles({ etage, teinte }: { etage: number; teinte: string }) {
  const gl = useThree((s) => s.gl);
  const pleines = useMemo(() => casesPleines(etage), [etage]);
  const inst = useMemo(() => {
    const geo = new THREE.BoxGeometry(0.92, 0.62, 0.92);
    const m = matiereEffective(MATIERE_PIERRE, environnementDisponible(gl));
    const mat = new THREE.MeshStandardMaterial({
      color: "#ffffff",
      roughness: m.roughness,
      metalness: m.metalness,
      envMapIntensity: 0.35,
      ...MATIERE_TRAMEE,
    });
    const mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, pleines.length));
    const dummy = new THREE.Object3D();
    const t = teinteRGB(teinte);
    pleines.forEach((c, i) => {
      dummy.position.set(c.x - MID, 0.27, c.y - MID);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      // Trame de Bayer décalée par l'étage : un quart des blocs plus sombre, comme la Tour.
      const K = seuilBayer(c.x, etage, c.y) < 4 ? 0.78 : 0.9;
      mesh.setColorAt(i, couleurSRGB(t.r * K, t.g * K, t.b * K));
    });
    mesh.count = pleines.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    return mesh;
  }, [pleines, teinte, etage, gl]);
  useEffect(() => () => disposerInstance(inst), [inst]);
  return <primitive object={inst} />;
}

/** La menace annoncée : une lame de fer posée sur la case, lisible sous une unité. */
function Menaces({ lecture }: { lecture: Lecture }) {
  const menacees = useMemo(
    () => lecture.cases.flat().filter((c) => c.menace && !c.pleine),
    [lecture.cases],
  );
  return (
    <>
      {menacees.map((c) => (
        <mesh key={`m-${c.x}-${c.y}`} position={[c.x - MID, 0.06, c.y - MID]}>
          <boxGeometry args={[0.72, 0.02, 0.72]} />
          <meshStandardMaterial
            color={FER}
            emissive={FER}
            emissiveIntensity={0.35}
            roughness={0.9}
            metalness={0}
            {...MATIERE_TRAMEE}
          />
        </mesh>
      ))}
    </>
  );
}

/** La télégraphie dessinée : un trait par case de pas annoncé, un par coup annoncé. */
function Traits({ traits }: { traits: readonly Trait[] }) {
  return (
    <>
      {traits.map((t, i) => {
        const dx = t.a.x - t.de.x;
        const dz = t.a.y - t.de.y;
        const longueur = Math.hypot(dx, dz);
        if (longueur === 0) return null;
        const coup = t.genre === "coup";
        return (
          <mesh
            key={`t-${i}`}
            position={[(t.de.x + t.a.x) / 2 - MID, 0.09, (t.de.y + t.a.y) / 2 - MID]}
            rotation={[0, -Math.atan2(dz, dx), 0]}
          >
            <boxGeometry args={[coup ? longueur - 0.3 : longueur, 0.02, coup ? 0.1 : 0.06]} />
            <meshStandardMaterial
              color={coup ? FER : FER_SOURD}
              emissive={coup ? FER : FER_SOURD}
              emissiveIntensity={coup ? 0.5 : 0.25}
              roughness={0.9}
              metalness={0}
              {...MATIERE_TRAMEE}
            />
          </mesh>
        );
      })}
    </>
  );
}

/**
 * L'horloge de la scène, et rien d'autre : elle lit sur `performance.now()`
 * l'instant `t` depuis le début de ce qui vient de se jouer, demande les
 * poses à `animation.ts`, et redemande une image tant que la ligne n'est pas
 * finie. Quand elle l'est, elle rend `null` et la scène se rendort.
 */
function Horloge({
  avant,
  derniers,
  instant,
  onPoses,
}: {
  avant: EtatBataille;
  derniers: readonly Acte[];
  /** Un instant fixe, en ms : la scène le rend et ne tourne pas. Pour voir, et pour capturer. */
  instant?: number;
  onPoses: (poses: readonly Pose[] | null) => void;
}) {
  const invalidate = useThree((s) => s.invalidate);
  const ligne: LigneDeTemps | null = useMemo(
    () => (derniers.length === 0 ? null : ligneDeTemps(evenementsDe(avant, derniers))),
    [avant, derniers],
  );
  const debut = useRef<number | null>(null);
  const finie = useRef(true);
  useEffect(() => {
    debut.current = null;
    finie.current = ligne === null || ligne.duree === 0 || instant !== undefined;
    if (ligne !== null && ligne.duree > 0 && instant !== undefined) {
      onPoses(posesA(avant, ligne, instant));
      invalidate();
    } else if (!finie.current && ligne !== null) {
      onPoses(posesA(avant, ligne, 0));
      invalidate();
    } else onPoses(null);
  }, [avant, ligne, instant, onPoses, invalidate]);
  useFrame(() => {
    if (finie.current || ligne === null) return;
    const maintenant = performance.now();
    if (debut.current === null) debut.current = maintenant;
    const t = maintenant - debut.current;
    if (t >= ligne.duree) {
      finie.current = true;
      onPoses(null);
      return;
    }
    onPoses(posesA(avant, ligne, t));
    invalidate();
  });
  return null;
}

/** La molette : la caméra glisse le long de son axe, bornée, le regard au centre. */
function Molette() {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    const el = gl.domElement;
    const surMolette = (e: WheelEvent) => {
      e.preventDefault();
      const d = camera.position.length();
      const k = e.deltaY > 0 ? d * ZOOM_CRAN : d / ZOOM_CRAN;
      camera.position.setLength(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, k)));
      camera.lookAt(0, 0, 0);
      invalidate();
    };
    el.addEventListener("wheel", surMolette, { passive: false });
    return () => el.removeEventListener("wheel", surMolette);
  }, [camera, gl, invalidate]);
  return null;
}

function Stele({
  u,
  pose,
  teinte,
  onCase,
}: {
  u: LectureUnite;
  pose: Pose | null;
  teinte: string;
  onCase: (c: Case) => void;
}) {
  const gl = useThree((s) => s.gl);
  const envOk = environnementDisponible(gl);
  const coffre = u.camp === "coffre";
  const tenue = pose === null ? u.tenue : pose.tenue;
  const h = STELE_MIN + ((STELE_MAX - STELE_MIN) * tenue) / Math.max(1, u.tenueMax);
  const couleur = coffre ? (u.elue ? OR : teinte) : u.coup !== null ? SOURD_FRAPPABLE : SOURD;
  const m = matiereEffective(
    coffre ? (u.elue ? MATIERE_ELUE : MATIERE_UNITE) : MATIERE_INDECHIFFRE,
    envOk,
  );
  const [x, , z] = posDe(pose === null ? u.pos : { x: pose.x, y: pose.y });
  // Un coup encaissé fait reculer, loin du centre de la dalle ; une chute
  // enfonce la stèle sous la dalle, jusqu'à disparaître.
  const recul = pose === null ? 0 : pose.encaisse * RECUL;
  const rayon = Math.hypot(x, z);
  const versX = rayon === 0 ? 0 : x / rayon;
  const versZ = rayon === 0 ? 0 : z / rayon;
  const enfoncement = pose === null ? 0 : pose.chute * (h + 0.2);
  const gonfle = pose === null ? 1 : 1 + pose.frappe * PULSATION;
  return (
    <group
      position={[x + versX * recul, -enfoncement, z + versZ * recul]}
      onPointerDown={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        onCase({ x: u.pos.x, y: u.pos.y });
      }}
    >
      <mesh position={[0, 0.04 + h / 2, 0]} scale={(u.elue ? 1.1 : 1) * gonfle}>
        <boxGeometry args={[0.62, h, 0.62]} />
        <meshStandardMaterial
          color={couleur}
          roughness={m.roughness}
          metalness={m.metalness}
          emissive={couleur}
          emissiveIntensity={u.elue ? 0.25 : u.coup !== null ? 0.3 : 0.1}
          {...MATIERE_TRAMEE}
        />
      </mesh>
      {/* Points d'action : un grain par PA restant, posé sur la stèle. */}
      {Array.from({ length: Math.min(PA_PAR_TOUR, u.pa) }, (_, i) => (
        <mesh
          key={i}
          position={[(i - (Math.min(PA_PAR_TOUR, u.pa) - 1) / 2) * 0.22, 0.04 + h + 0.1, 0]}
        >
          <boxGeometry args={[0.12, 0.12, 0.12]} />
          <meshStandardMaterial
            color="#dde1e6"
            emissive="#dde1e6"
            emissiveIntensity={0.4}
            roughness={0.5}
            metalness={0.2}
          />
        </mesh>
      ))}
    </group>
  );
}

export default function BatailleCanvas({
  lecture,
  avant,
  derniers,
  instant,
  teinte,
  onCase,
  onSurvol,
}: {
  lecture: Lecture;
  /** L'état sur lequel `derniers` s'appliquent, et ces actes : ce qui s'anime. Rien si absents. */
  avant?: EtatBataille;
  derniers?: readonly Acte[];
  /** Un instant fixe de l'animation, en ms, au lieu de l'horloge. Pour voir, et pour capturer. */
  instant?: number;
  teinte: string;
  onCase: (c: Case) => void;
  onSurvol: (c: Case | null) => void;
}) {
  const visible = useOngletVisible();
  const [poses, setPoses] = useState<readonly Pose[] | null>(null);
  const anime = poses !== null;
  const poseDe = (id: number) => (poses === null ? null : (poses.find((p) => p.unite === id) ?? null));
  // Pendant l'animation, les stèles vivantes d'avant ; sinon, celles d'après.
  const montrees = lecture.unites.filter((u) => (anime ? poseDe(u.id) !== null : u.vivante));
  return (
    <Canvas
      className="absolute inset-0 h-full w-full touch-none"
      style={{ position: "absolute", inset: 0, touchAction: "none" }}
      dpr={ATELIER_DPR}
      gl={ATELIER_GL}
      frameloop={visible ? "demand" : "never"}
      camera={{ position: [0, 10.5, 9.5], fov: 40 }}
      onCreated={({ gl }) => gl.setClearColor(ATELIER_FOND, 1)}
    >
      <Molette />
      <Halo teinte={teinte} force={0.05} />
      <fog attach="fog" args={brouillard(14, 32)} />
      <LumieresAtelier contre={teinte} />
      <EnvironnementAtelier teinte={teinte} />
      <Sol lecture={lecture} teinte={teinte} onCase={onCase} onSurvol={onSurvol} />
      <Obstacles etage={lecture.etage} teinte={teinte} />
      {anime ? null : <Menaces lecture={lecture} />}
      {anime ? null : <Traits traits={lecture.traits} />}
      {avant !== undefined && derniers !== undefined ? (
        <Horloge avant={avant} derniers={derniers} instant={instant} onPoses={setPoses} />
      ) : null}
      {montrees.map((u) => (
        <Stele key={u.id} u={u} pose={poseDe(u.id)} teinte={teinte} onCase={onCase} />
      ))}
    </Canvas>
  );
}

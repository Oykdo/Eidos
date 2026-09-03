import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import {
  FAMILLES,
  N_SECTEURS,
  PREMIERS,
  TIERS,
  arbre,
  couleurSecteur,
  nomSecteur,
  type Noeud,
  type Selection,
} from "@/lib/arbre/modele.ts";
import {
  R_HORIZON,
  R_PHOTON,
  calculerChamp,
  palierLePlusProche,
  poser,
  type Operateur,
  type Plongement,
  type Vue,
} from "@/lib/arbre/champ.ts";
import { ancreDe } from "@/lib/arbre/ancre.ts";
import {
  PREMIER_CULMINATION,
  chromaNoeud,
  poserLumen,
  poserPalierLumen,
  type LumenScene,
} from "@/lib/arbre/lumen.ts";
import { chargerEtat, sceneOuVide, type EtatReseau } from "@/lib/arbre/etat.ts";
import { Nav } from "@/components/Nav";
import { Langue } from "@/components/Langue";
import { Bandeau } from "@/components/Mark";
import { cn } from "@/lib/utils";
import { useI18n, t } from "@/lib/i18n.ts";
import { useCoffre } from "@/lib/store.ts";
import { formaterAtomes } from "@/lib/eidos/coinselect.ts";

function yPremier(i: number, mode: Plongement, scene: LumenScene): number {
  const t = (i / (PREMIERS.length - 1)) * 9;
  return poserPalierLumen(t, mode, scene.lumen).y;
}

function Paliers({
  filtre,
  mode,
  scene,
  onPalier,
}: {
  filtre: number | null;
  mode: Plongement;
  scene: LumenScene;
  onPalier: (t: number) => void;
}) {
  return (
    <group>
      {TIERS.map((t) => {
        const { y, r } = poserPalierLumen(t.id, mode, scene.lumen);
        const mute = filtre != null;
        return (
          <group key={t.id}>
            <mesh
              rotation={[-Math.PI / 2, 0, 0]}
              position={[0, y, 0]}
              onClick={(e) => {
                e.stopPropagation();
                onPalier(t.id);
              }}
            >
              <ringGeometry args={[r * 0.22, r, 96]} />
              <meshBasicMaterial
                color="#c6cbd1"
                transparent
                opacity={mute ? 0.04 : 0.08}
                side={THREE.DoubleSide}
                depthWrite={false}
              />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]}>
              <ringGeometry args={[r - 0.015, r + 0.015, 96]} />
              <meshBasicMaterial
                color={scene.lumen.culmination ? "#dde1e6" : scene.lumen.metal}
                transparent
                opacity={mute ? 0.18 : 0.42}
                side={THREE.DoubleSide}
                depthWrite={false}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function Echelles({ mode }: { mode: Plongement }) {
  if (mode !== "puits") return null;
  const yH = poser({ x: R_HORIZON, y: 0, z: 0 }, mode).y;
  const yP = poser({ x: R_PHOTON, y: 0, z: 0 }, mode).y;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, yH, 0]}>
        <ringGeometry args={[R_HORIZON - 0.04, R_HORIZON + 0.04, 96]} />
        <meshBasicMaterial
          color="#a8332a"
          transparent
          opacity={0.85}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, yP, 0]}>
        <ringGeometry args={[R_PHOTON - 0.035, R_PHOTON + 0.035, 96]} />
        <meshBasicMaterial
          color="#3a6ea5"
          transparent
          opacity={0.8}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <Html position={[R_HORIZON + 0.5, yH, 0]} pointerEvents="none" zIndexRange={[1, 0]}>
        <span className="whitespace-nowrap font-mono text-[10px] text-fer">horizon · r_s</span>
      </Html>
      <Html position={[R_PHOTON + 0.5, yP, 0]} pointerEvents="none" zIndexRange={[1, 0]}>
        <span className="whitespace-nowrap font-mono text-[10px] text-etain">photon · 3/2 r_s</span>
      </Html>
    </group>
  );
}

function Spine({
  selected,
  mode,
  scene,
  onPick,
}: {
  selected: Selection;
  mode: Plongement;
  scene: LumenScene;
  onPick: (s: Selection) => void;
}) {
  const top = yPremier(0, mode, scene);
  const bot = yPremier(PREMIERS.length - 1, mode, scene);
  const h = Math.abs(top - bot);
  const mid = (top + bot) / 2;
  return (
    <group>
      <mesh position={[0, mid, 0]}>
        <cylinderGeometry args={[0.045, 0.045, h + 1.2, 12]} />
        <meshStandardMaterial
          color="#c9a227"
          emissive="#c9a227"
          emissiveIntensity={scene.lumen.culmination ? 0.7 : 0.35}
          roughness={0.4}
        />
      </mesh>
      {PREMIERS.map((p, i) => {
        const actif = selected?.kind === "premier" && selected.p === p;
        const pic = p === PREMIER_CULMINATION && scene.lumen.culmination;
        const y = yPremier(i, mode, scene);
        return (
          <group key={p}>
            <mesh
              position={[0, y, 0]}
              onClick={(e) => {
                e.stopPropagation();
                onPick({ kind: "premier", p, index: i });
              }}
            >
              <sphereGeometry args={[pic ? 0.28 : actif ? 0.22 : 0.16, 16, 16]} />
              <meshStandardMaterial
                color={pic || actif ? "#dde1e6" : "#c9a227"}
                emissive="#c9a227"
                emissiveIntensity={pic ? 1.15 : actif ? 0.8 : 0.45}
                roughness={0.35}
              />
            </mesh>
            <Html
              position={[0.38, y, 0]}
              pointerEvents="none"
              zIndexRange={[1, 0]}
              style={{ transform: "translateY(-50%)", pointerEvents: "none" }}
            >
              <span
                className={
                  pic || actif
                    ? "font-mono text-[11px] text-encre"
                    : "font-mono text-[11px] text-or"
                }
              >
                {p}
              </span>
            </Html>
          </group>
        );
      })}
    </group>
  );
}

const FER = new THREE.Color("#a8332a");
const CUIVRE = new THREE.Color("#3e8e6e");
const ARGENT = new THREE.Color("#c6cbd1");
const ETAIN = new THREE.Color("#3a6ea5");

function Noeuds({
  filtre,
  selected,
  mode,
  operateur,
  scene,
  onPick,
}: {
  filtre: number | null;
  selected: Selection;
  mode: Plongement;
  operateur: Operateur | null;
  scene: LumenScene;
  onPick: (s: Selection) => void;
}) {
  const data = useMemo(() => arbre(), []);
  const champ = useMemo(() => calculerChamp(data, mode), [data, mode]);
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);

  const paint = () => {
    const mesh = ref.current;
    if (!mesh) return;
    const selId = selected?.kind === "noeud" ? selected.noeud.id : -1;
    const { lumen, charges, chargeMax, chaudNoeud, chaudSecteur } = scene;
    data.noeuds.forEach((n, i) => {
      const mute = filtre != null && n.famille !== filtre && selId !== n.id;
      const charge = charges.get(n.id) ?? 0;
      const p = poserLumen(n, n, mode, lumen, charge, chargeMax);
      dummy.position.set(p.x, p.y, p.z);
      const gros = selId === n.id || chaudNoeud === n.id;
      dummy.scale.setScalar(
        gros ? 0.22 : mute ? 0.07 : 0.12 * (1 + 0.7 * (chargeMax > 0 ? charge / chargeMax : 0)),
      );
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      const c = champ.noeuds[n.id]!;
      if (operateur === "div" || operateur === "lap") {
        const t = Math.min(1, Math.max(0, (c.div + 1) / 6));
        color.copy(FER).lerp(CUIVRE, t);
      } else if (operateur === "curl") {
        const a = Math.min(1, Math.abs(c.curlAzim) * 10);
        color.copy(ARGENT).lerp(FER, a);
      } else if (operateur === "grad") {
        color.copy(ETAIN);
      } else {
        color.set(chromaNoeud(n, lumen, { chaudNoeud, chaudSecteur }));
      }
      if (mute) color.multiplyScalar(0.18);
      mesh.setColorAt(i, color);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  };

  useEffect(() => {
    paint();
  });

  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, data.noeuds.length]}
      onClick={(e) => {
        e.stopPropagation();
        const id = e.instanceId;
        if (id == null) return;
        const n = data.noeuds[id];
        if (n) onPick({ kind: "noeud", noeud: n });
      }}
    >
      <sphereGeometry args={[1, 10, 10]} />
      <meshStandardMaterial vertexColors roughness={0.45} metalness={0.12} />
    </instancedMesh>
  );
}

function Autorites({
  filtre,
  mode,
  scene,
}: {
  filtre: number | null;
  mode: Plongement;
  scene: LumenScene;
}) {
  const data = useMemo(() => arbre(), []);
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);

  useEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const { lumen, charges, chargeMax, chaudNoeud, chaudSecteur } = scene;
    data.autorites.forEach((a, i) => {
      const n = data.noeuds[a.noeud]!;
      const mute = filtre != null && n.famille !== filtre;
      const charge = charges.get(n.id) ?? 0;
      const p = poserLumen(a, n, mode, lumen, charge, chargeMax);
      dummy.position.set(p.x, p.y, p.z);
      dummy.scale.setScalar(mute ? 0.015 : 0.028);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      color.set(chromaNoeud(n, lumen, { chaudNoeud, chaudSecteur }));
      if (mute) color.multiplyScalar(0.15);
      mesh.setColorAt(i, color);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [data, filtre, dummy, color, mode, scene]);

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, data.autorites.length]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial vertexColors transparent opacity={0.7} depthWrite={false} />
    </instancedMesh>
  );
}

function Liens({
  filtre,
  mode,
  scene,
}: {
  filtre: number | null;
  mode: Plongement;
  scene: LumenScene;
}) {
  const geo = useMemo(() => {
    const data = arbre();
    const pos: number[] = [];
    const col: number[] = [];
    const c = new THREE.Color();
    const { lumen, charges, chargeMax, chaudNoeud, chaudSecteur } = scene;
    for (const n of data.noeuds) {
      if (n.parent == null) continue;
      const par = data.noeuds[n.parent]!;
      const p = poserLumen(par, par, mode, lumen, charges.get(par.id) ?? 0, chargeMax);
      const q = poserLumen(n, n, mode, lumen, charges.get(n.id) ?? 0, chargeMax);
      pos.push(p.x, p.y, p.z, q.x, q.y, q.z);
      c.set(chromaNoeud(n, lumen, { chaudNoeud, chaudSecteur }));
      col.push(c.r, c.g, c.b, c.r, c.g, c.b);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    return g;
  }, [mode, scene]);

  useEffect(() => () => geo.dispose(), [geo]);

  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial vertexColors transparent opacity={filtre == null ? 0.22 : 0.08} />
    </lineSegments>
  );
}

function Gradients({
  mode,
  visible,
  scene,
}: {
  mode: Plongement;
  visible: boolean;
  scene: LumenScene;
}) {
  const geo = useMemo(() => {
    const data = arbre();
    const champ = calculerChamp(data, mode);
    const pos: number[] = [];
    const { lumen, charges, chargeMax } = scene;
    for (const n of data.noeuds) {
      const p = poserLumen(n, n, mode, lumen, charges.get(n.id) ?? 0, chargeMax);
      const g = champ.noeuds[n.id]!.grad;
      const mag = Math.hypot(g.x, g.y, g.z) || 1;
      const s = 0.55 / mag;
      pos.push(p.x, p.y, p.z, p.x + g.x * s, p.y + g.y * s, p.z + g.z * s);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    return g;
  }, [mode, scene]);

  useEffect(() => () => geo.dispose(), [geo]);
  if (!visible) return null;
  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial color="#c9a227" transparent opacity={0.7} />
    </lineSegments>
  );
}

function SortiesAncrees({
  mode,
  ids,
  scene,
}: {
  mode: Plongement;
  ids: Map<number, number>;
  scene: LumenScene;
}) {
  const data = useMemo(() => arbre(), []);
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const list = useMemo(() => [...ids.keys()], [ids]);

  useEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const { lumen, charges, chargeMax } = scene;
    list.forEach((id, i) => {
      const n = data.noeuds[id];
      if (!n) return;
      const p = poserLumen(n, n, mode, lumen, charges.get(n.id) ?? 0, chargeMax);
      dummy.position.set(p.x, p.y, p.z);
      dummy.scale.setScalar(0.28);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.count = list.length;
  }, [data, dummy, list, mode, scene]);

  if (list.length === 0) return null;
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, 64]}>
      <sphereGeometry args={[1, 12, 12]} />
      <meshStandardMaterial
        color="#c9a227"
        emissive="#c9a227"
        emissiveIntensity={0.55}
        roughness={0.3}
      />
    </instancedMesh>
  );
}

function CameraRig({ vue, mode }: { vue: Vue; mode: Plongement }) {
  const camera = useThree((s) => s.camera);
  const key = `${vue}:${mode}`;
  const applied = useRef("");

  useFrame((state) => {
    const raw = state.controls;
    if (!raw || applied.current === key) return;
    const controls = raw as unknown as { target: THREE.Vector3; update: () => void };
    if (vue === "axiale") {
      camera.position.set(0.2, mode === "puits" ? 28 : 34, 0.2);
      controls.target.set(0, mode === "puits" ? 6 : 2.2, 0);
    } else if (mode === "puits") {
      camera.position.set(16, 9, 14);
      controls.target.set(0, 5, 0);
    } else {
      camera.position.set(14, 7.5, 18);
      controls.target.set(0, 2.2, 0);
    }
    controls.update();
    applied.current = key;
  });
  return null;
}

function SceneInner({
  filtre,
  selected,
  onPick,
  reduced,
  mode,
  operateur,
  vue,
  ancrages,
  scene,
}: {
  filtre: number | null;
  selected: Selection;
  onPick: (s: Selection) => void;
  reduced: boolean;
  mode: Plongement;
  operateur: Operateur | null;
  vue: Vue;
  ancrages: Map<number, number>;
  scene: LumenScene;
}) {
  return (
    <>
      <color attach="background" args={["#12151a"]} />
      <fog attach="fog" args={["#12151a", 22, 58]} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[8, 18, 10]} intensity={0.85} color="#dde1e6" />
      <pointLight
        position={[0, 14, 0]}
        intensity={scene.lumen.culmination ? 1.9 : 1.4}
        color="#c9a227"
        distance={28}
      />
      <Paliers
        filtre={filtre}
        mode={mode}
        scene={scene}
        onPalier={(t) => onPick({ kind: "palier", palier: t })}
      />
      <Echelles mode={mode} />
      <Liens filtre={filtre} mode={mode} scene={scene} />
      <Gradients mode={mode} visible={operateur === "grad"} scene={scene} />
      <Autorites filtre={filtre} mode={mode} scene={scene} />
      <Noeuds
        filtre={filtre}
        selected={selected}
        mode={mode}
        operateur={operateur}
        scene={scene}
        onPick={onPick}
      />
      <SortiesAncrees mode={mode} ids={ancrages} scene={scene} />
      <Spine selected={selected} mode={mode} scene={scene} onPick={onPick} />
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        autoRotate={!reduced && selected == null && vue !== "axiale"}
        autoRotateSpeed={0.35}
        minDistance={7}
        maxDistance={46}
        maxPolarAngle={Math.PI * 0.84}
        minPolarAngle={0.02}
        target={[0, 2.2, 0]}
      />
      <CameraRig vue={vue} mode={mode} />
    </>
  );
}

function Fiche({
  selected,
  onClose,
  operateur,
  ancrages,
  montants,
  scene,
}: {
  selected: Selection;
  onClose: () => void;
  operateur: Operateur | null;
  ancrages: Map<number, number>;
  montants: Map<number, number>;
  scene: LumenScene;
}) {
  const { t: tr } = useI18n();
  const data = arbre();
  const champ = useMemo(() => calculerChamp(data, "cone"), [data]);
  if (!selected) return null;
  let titre = "";
  let corps: string[] = [];
  let secteurs: string[] | null = null;
  if (selected.kind === "premier") {
    titre = `p = ${selected.p}`;
    corps = [
      `Épine · rang ${selected.index + 1} / ${PREMIERS.length}`,
      `x_p = log ${selected.p}`,
      tr("arbre.premier"),
    ];
  } else if (selected.kind === "palier") {
    const t = TIERS[selected.palier]!;
    const n = data.noeuds.filter((x) => x.palier === selected.palier).length;
    titre = `D${t.id} · ${t.nom}`;
    corps = [t.aide, `${n} nœuds à ce palier.`, tr("arbre.palier")];
    secteurs = Array.from({ length: N_SECTEURS }, (_, i) => nomSecteur(i));
  } else if (selected.kind === "famille") {
    const f = FAMILLES[selected.famille]!;
    const n = data.noeuds.filter((x) => x.famille === selected.famille).length;
    titre = f.nom;
    corps = [
      `Trois secteurs (${N_SECTEURS / FAMILLES.length} par famille).`,
      `${n} nœuds dans cette famille.`,
      nomSecteur(f.id * 3),
      nomSecteur(f.id * 3 + 1),
      nomSecteur(f.id * 3 + 2),
    ];
  } else {
    const n: Noeud = selected.noeud;
    const parent = n.parent != null ? data.noeuds[n.parent] : null;
    const c = champ.noeuds[n.id]!;
    titre = `Nœud ${n.id}`;
    corps = [
      `D${n.palier} · ${TIERS[n.palier]!.nom}`,
      nomSecteur(n.secteur),
      `${n.autorites} autorités terminales`,
      parent ? tr("arbre.parent", { id: parent.id, p: parent.palier }) : tr("arbre.racine"),
      `Φ = ${c.phi}`,
      `∇·v = ${c.div}  ·  ∇²Φ = ${c.laplacien}  ·  ∇×v_θ = ${c.curlAzim.toFixed(3)}`,
    ];
    const nb = ancrages.get(n.id) ?? 0;
    if (nb > 0) {
      corps.push(
        `${nb} sortie${nb > 1 ? "s" : ""} du coffre · ${formaterAtomes(montants.get(n.id) ?? 0)}`,
      );
    }
    if (operateur === "curl") {
      corps.push(tr("arbre.curl"));
    }
    const charge = scene.charges.get(n.id) ?? 0;
    if (charge > 0) {
      corps.push(tr("arbre.charge", { m: formaterAtomes(charge) }));
    }
    if (scene.chaudNoeud === n.id) {
      corps.push(tr("arbre.chaud"));
    }
  }
  return (
    <aside className="pointer-events-auto rounded-lg bg-carte/95 p-4 shadow-[0_0_0_1px_rgb(198_203_209_/_0.14)] backdrop-blur-sm">
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-display text-xl font-light text-or">{titre}</h2>
        <button
          type="button"
          className="font-mono text-[11px] text-sourd hover:text-encre"
          onClick={onClose}
        >
          {tr("arbre.fermer")}
        </button>
      </div>
      <ul className="mt-2 flex flex-col gap-1">
        {corps.map((l) => (
          <li key={l} className="font-mono text-[12.5px] leading-relaxed text-encre">
            {l}
          </li>
        ))}
      </ul>
      {secteurs ? (
        <ul className="mt-3 flex max-h-28 flex-wrap gap-1 overflow-y-auto">
          {secteurs.map((nom, i) => (
            <li
              key={nom}
              className="rounded-sm px-1.5 py-0.5 font-mono text-[10px] text-encre"
              style={{ boxShadow: `inset 2px 0 0 ${couleurSecteur(i)}` }}
            >
              {nom}
            </li>
          ))}
        </ul>
      ) : null}
    </aside>
  );
}

const OPS: { id: Operateur; glyph: string; nom: string }[] = [
  { id: "grad", glyph: "∇", nom: "gradient" },
  { id: "div", glyph: "∇·", nom: "divergence" },
  { id: "curl", glyph: "∇×", nom: "rotationnel" },
  { id: "lap", glyph: "∇²", nom: "laplacien" },
];

function lecture(op: Operateur | null, mode: Plongement, vue: Vue, scene: LumenScene): string {
  if (vue === "axiale") {
    return t("arbre.axial");
  }
  if (mode === "puits") {
    const pal = palierLePlusProche(R_PHOTON);
    return `Plongement puits — D0 au fond (analogue d'horizon), D9 à la lèvre. r_ph = 3/2 r_s ne tombe sur aucun palier (le plus proche est D${pal}). Ce n'est pas 2GM/c².`;
  }
  if (op === "grad") {
    return "∇Φ pointe vers le parent : la plus grande pente de continuité. Φ = 9 − palier.";
  }
  if (op === "div") {
    return "∇·v : sources en D0, puits en D9. La descendance se conserve (somme nulle).";
  }
  if (op === "curl") {
    return "∇×v = 0 : la descendance est une forêt, aucun cycle. Le rotationnel d'un fluide (et le Higgs) n'ont rien à signer ici.";
  }
  if (op === "lap") {
    return "∇²Φ mesure le branchement. Feuille = −1, nœud à k enfants = k − 1.";
  }
  return t("arbre.souffle", {
    rho: scene.lumen.rho.toFixed(3),
    h: scene.lumen.h,
    age: scene.lumen.age,
  });
}

export function ArbreView({ noeudCible }: { noeudCible?: number }) {
  const { t } = useI18n();
  const [ready, setReady] = useState(false);
  const [filtre, setFiltre] = useState<number | null>(null);
  const [selected, setSelected] = useState<Selection>(null);
  const [reduced, setReduced] = useState(false);
  const [mode, setMode] = useState<Plongement>("cone");
  const [operateur, setOperateur] = useState<Operateur | null>(null);
  const [vue, setVue] = useState<Vue>("orbite");
  const [open, setOpen] = useState(false);
  const [etat, setEtat] = useState<EtatReseau | null>(null);

  const coffre = useCoffre((s) => s.coffre);
  const hydrater = useCoffre((s) => s.hydrater);

  useEffect(() => {
    hydrater();
  }, [hydrater]);

  useEffect(() => {
    let cancel = false;
    chargerEtat().then((e) => {
      if (!cancel) setEtat(e);
    });
    return () => {
      cancel = true;
    };
  }, []);

  const scene = useMemo(() => sceneOuVide(etat), [etat]);

  useEffect(() => {
    if (noeudCible == null) return;
    const n = arbre().noeuds[noeudCible];
    if (n) setSelected({ kind: "noeud", noeud: n });
  }, [noeudCible]);

  const { ancrages, montants } = useMemo(() => {
    const ids = new Map<number, number>();
    const m = new Map<number, number>();
    for (const s of coffre.sorties) {
      const a = ancreDe(s.adresse || s.ref);
      ids.set(a.noeud, (ids.get(a.noeud) ?? 0) + 1);
      m.set(a.noeud, (m.get(a.noeud) ?? 0) + s.montant);
    }
    return { ancrages: ids, montants: m };
  }, [coffre.sorties]);

  useEffect(() => {
    setReady(true);
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const fn = () => setReduced(mq.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-fond">
      {ready ? (
        <Canvas
          className="h-full w-full touch-none"
          dpr={[1, 1.75]}
          camera={{ position: [14, 7.5, 18], fov: 42, near: 0.1, far: 120 }}
          gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
          onPointerMissed={() => setSelected(null)}
        >
          <SceneInner
            filtre={filtre}
            selected={selected}
            onPick={setSelected}
            reduced={reduced}
            mode={mode}
            operateur={operateur}
            vue={vue}
            ancrages={ancrages}
            scene={scene}
          />
        </Canvas>
      ) : (
        <div className="flex h-full items-center justify-center font-mono text-sm text-sourd">
          {t("arbre.ouv")}
        </div>
      )}

      <div className="pointer-events-none absolute inset-0 flex flex-col">
        <header className="pointer-events-auto flex flex-col items-center gap-2 px-4 pt-[max(12px,env(safe-area-inset-top))] pb-1">
          <Bandeau className="[&_img]:h-10" />
          <Nav actuel="arbre" />
          <Langue />
        </header>

        <div className="mt-auto flex flex-col gap-3 px-3 pb-[max(12px,env(safe-area-inset-bottom))] sm:px-5">
          {selected ? (
            <div className="mx-auto w-full max-w-[420px]">
              <Fiche
                selected={selected}
                onClose={() => setSelected(null)}
                operateur={operateur}
                ancrages={ancrages}
                montants={montants}
                scene={scene}
              />
            </div>
          ) : null}

          <div className="pointer-events-auto mx-auto w-full max-w-[560px] rounded-lg bg-carte/90 p-3 shadow-[0_0_0_1px_rgb(198_203_209_/_0.12)] backdrop-blur-sm">
            <div className="mb-2 flex flex-wrap items-center justify-center gap-1">
              {OPS.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setOperateur((cur) => (cur === o.id ? null : o.id))}
                  className={cn(
                    "h-8 rounded-sm px-2.5 font-mono text-[11px] tracking-wide",
                    operateur === o.id
                      ? "bg-or text-or-fg"
                      : "text-encre shadow-[0_0_0_1px_rgb(198_203_209_/_0.24)]",
                  )}
                  title={o.nom}
                >
                  {o.glyph}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setMode((m) => (m === "cone" ? "puits" : "cone"))}
                className={cn(
                  "h-8 rounded-sm px-2.5 font-mono text-[11px] tracking-wide",
                  mode === "puits"
                    ? "bg-or text-or-fg"
                    : "text-encre shadow-[0_0_0_1px_rgb(198_203_209_/_0.24)]",
                )}
              >
                puits
              </button>
              <button
                type="button"
                onClick={() => setVue((v) => (v === "axiale" ? "orbite" : "axiale"))}
                className={cn(
                  "h-8 rounded-sm px-2.5 font-mono text-[11px] tracking-wide",
                  vue === "axiale"
                    ? "bg-or text-or-fg"
                    : "text-encre shadow-[0_0_0_1px_rgb(198_203_209_/_0.24)]",
                )}
              >
                axiale
              </button>
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className={cn(
                  "h-8 rounded-sm px-2.5 font-mono text-[11px] tracking-wide",
                  open
                    ? "bg-or text-or-fg"
                    : "text-sourd shadow-[0_0_0_1px_rgb(198_203_209_/_0.24)]",
                )}
              >
                {open ? "régimes −" : "régimes"}
              </button>
            </div>
            <p className="text-center font-mono text-[11px] leading-relaxed text-sourd text-pretty">
              {lecture(operateur, mode, vue, scene)}
            </p>
            {open ? (
              <>
                <div className="mt-2 flex flex-wrap justify-center gap-1">
                  {TIERS.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelected({ kind: "palier", palier: t.id })}
                      className={cn(
                        "h-8 min-w-8 rounded-sm px-2 font-mono text-[11px] tracking-wide",
                        selected?.kind === "palier" && selected.palier === t.id
                          ? "bg-or text-or-fg"
                          : "text-encre shadow-[0_0_0_1px_rgb(198_203_209_/_0.18)]",
                      )}
                    >
                      D{t.id}
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex flex-wrap justify-center gap-1">
                  {FAMILLES.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() =>
                        setFiltre((cur) => {
                          const next = cur === f.id ? null : f.id;
                          setSelected(next == null ? null : { kind: "famille", famille: f.id });
                          return next;
                        })
                      }
                      className={cn(
                        "h-8 rounded-sm px-2 font-mono text-[10px] tracking-wide",
                        filtre === f.id
                          ? "text-or-fg"
                          : "text-encre shadow-[0_0_0_1px_rgb(198_203_209_/_0.18)]",
                      )}
                      style={
                        filtre === f.id
                          ? { background: f.couleur }
                          : filtre == null
                            ? { boxShadow: `inset 3px 0 0 ${f.couleur}` }
                            : undefined
                      }
                    >
                      {f.nom}
                    </button>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

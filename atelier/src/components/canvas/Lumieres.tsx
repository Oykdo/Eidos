/**
 * Lumières de l'atelier — un seul air pour les scènes voxel.
 * La lumière est neutre (encre), le contre-jour porte la teinte de la scène.
 * Fichier .tsx séparé : atelier.ts n'a pas de JSX et n'importe pas three.
 */
import {
  LUMIERE_AMB,
  LUMIERE_CONTRE,
  LUMIERE_DIR,
  LUMIERE_HEMI,
} from "@/components/canvas/atelier.ts";

export function LumieresAtelier({ contre }: { contre?: string }) {
  return (
    <>
      <ambientLight intensity={LUMIERE_AMB} />
      <hemisphereLight
        color={LUMIERE_HEMI.ciel}
        groundColor={LUMIERE_HEMI.sol}
        intensity={LUMIERE_HEMI.intensity}
      />
      <directionalLight
        position={LUMIERE_DIR.position}
        intensity={LUMIERE_DIR.intensity}
        color={LUMIERE_DIR.color}
      />
      <directionalLight
        position={LUMIERE_CONTRE.position}
        intensity={LUMIERE_CONTRE.intensity}
        color={contre ?? LUMIERE_CONTRE.color}
      />
    </>
  );
}

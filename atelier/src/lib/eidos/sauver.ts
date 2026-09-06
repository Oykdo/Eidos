/**
 * Proposer eidos.carnet à l'appareil, après que le coffre existe.
 * 1. showSaveFilePicker — l'appareil demande où écrire.
 * 2. feuille de partage (iOS : Enregistrer dans Fichiers).
 * 3. téléchargement, repli bureau.
 */

import { NOM_CARNET } from "./carnet.ts";

export type IssueSauver = "fichier" | "partage" | "telechargement" | "presse-papiers" | "annule";

export function fichierCarnet(raw: string, nom = NOM_CARNET): File {
  return new File([raw], nom, { type: "application/json" });
}

type Picker = {
  showSaveFilePicker?: (o: {
    suggestedName?: string;
    types?: { description: string; accept: Record<string, string[]> }[];
  }) => Promise<{
    createWritable: () => Promise<{
      write: (data: BlobPart) => Promise<void>;
      close: () => Promise<void>;
    }>;
  }>;
};

/** Demande un emplacement pour eidos.carnet. Absent si l'API n'est pas là. */
export async function enregistrerSous(raw: string): Promise<"fichier" | "annule" | "absent"> {
  const w = globalThis as typeof globalThis & Picker;
  if (typeof w.showSaveFilePicker !== "function") return "absent";
  try {
    const h = await w.showSaveFilePicker({
      suggestedName: NOM_CARNET,
      types: [{ description: NOM_CARNET, accept: { "application/json": [".carnet"] } }],
    });
    const wr = await h.createWritable();
    await wr.write(raw);
    await wr.close();
    return "fichier";
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") return "annule";
    return "absent";
  }
}

function peutPartager(file: File): boolean {
  const n = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  return typeof navigator.share === "function" && (n.canShare?.({ files: [file] }) ?? false);
}

function estAppleTactile(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function telecharger(file: File): void {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export async function proposerCarnet(raw: string): Promise<IssueSauver> {
  const sous = await enregistrerSous(raw);
  if (sous === "fichier" || sous === "annule") return sous;

  const principal = fichierCarnet(raw);
  const json = fichierCarnet(raw, "eidos.carnet.json");

  for (const file of [principal, json]) {
    if (!peutPartager(file)) continue;
    try {
      await navigator.share({ files: [file], title: NOM_CARNET });
      return "partage";
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return "annule";
    }
  }

  if (!estAppleTactile()) {
    telecharger(principal);
    return "telechargement";
  }

  try {
    await navigator.clipboard.writeText(raw);
    return "presse-papiers";
  } catch {
    telecharger(principal);
    return "telechargement";
  }
}

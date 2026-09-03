/**
 * Proposer eidos.carnet à l'appareil.
 * iOS ignore <a download> (surtout en PWA). La feuille de partage
 * mène à Enregistrer dans Fichiers. Le téléchargement reste le repli bureau.
 */

import { NOM_CARNET } from "./carnet.ts";

export type IssueSauver = "partage" | "telechargement" | "presse-papiers" | "annule";

export function fichierCarnet(raw: string, nom = NOM_CARNET): File {
  return new File([raw], nom, { type: "application/json" });
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
